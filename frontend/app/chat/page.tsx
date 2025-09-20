"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Plus,
  MoreVertical,
  Loader2,
  AlertCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, Conversation, HARDCODED_USER_ID } from "@/lib/api";
import useApiError from "@/hooks/useApiError";
import { useConversationManager } from "@/hooks/useConversationManager";
import { formatMessageTime } from "@/lib/utils";
import { useUserTimezone } from "@/hooks/useUserTimezone";

// ---------- Main Chat UI ----------
export default function ChatUI() {
  const queryClient = useQueryClient();
  const { handleApiError } = useApiError();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { timezone, abbreviation } = useUserTimezone();

  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    setConversationsState,
    getCurrentConversation,
  } = useConversationManager();

  const [inputMessage, setInputMessage] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // 🔹 Load all conversations for user
  const conversationsQuery = useQuery({
    queryKey: ["conversations", HARDCODED_USER_ID],
    queryFn: () => api.getConversations(HARDCODED_USER_ID),
    enabled:
      !isInitialized &&
      !!HARDCODED_USER_ID &&
      HARDCODED_USER_ID !== "PUT-YOUR-USER-ID-HERE",
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle conversations query result
  useEffect(() => {
    if (
      conversationsQuery.isSuccess &&
      conversationsQuery.data &&
      !isInitialized
    ) {
      const data = conversationsQuery.data;
      if (data.length > 0) {
        setConversationsState(data);
        setCurrentConversationId(data[0].id);
        setIsInitialized(true);
      } else {
        startConversationMutation.mutate(HARDCODED_USER_ID);
      }
    }
  }, [conversationsQuery.isSuccess, conversationsQuery.data, isInitialized]);

  // 🔹 Load chat history for current conversation
  const {
    data: messages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ["chatHistory", currentConversationId],
    queryFn: () => api.getChatHistory(currentConversationId!),
    enabled: !!currentConversationId,
    retry: 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // 🔹 Start a new conversation
  const startConversationMutation = useMutation({
    mutationFn: api.startConversation,
    onSuccess: (data) => {
      const newConversation: Conversation = {
        id: data.conversationId,
        status: "active",
        startedAt: new Date().toISOString(),
      };
      addConversation(newConversation);
      setCurrentConversationId(newConversation.id);
      setIsInitialized(true);
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      console.error("Failed to start conversation:", apiError);
      // Could show user notification here
    },
  });

  // 🔹 Send a message
  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      text,
    }: {
      conversationId: string;
      text: string;
    }) => api.sendMessage(conversationId, text),
    onMutate: async ({ conversationId, text }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: ["chatHistory", conversationId],
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData([
        "chatHistory",
        conversationId,
      ]);

      // Optimistically update to the new value - add user message immediately
      const optimisticUserMessage = {
        id: `temp-${Date.now()}`, // Temporary ID
        text,
        sender: "user" as const,
        timestamp: new Date().toISOString(),
      };

      queryClient.setQueryData(["chatHistory", conversationId], (old: any) => [
        ...(old || []),
        optimisticUserMessage,
      ]);

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch chat history to get the real messages from server
      queryClient.invalidateQueries({
        queryKey: ["chatHistory", variables.conversationId],
      });

      // Update conversation with last message
      const currentConv = getCurrentConversation();
      if (currentConv) {
        addConversation({
          ...currentConv,
          lastMessage: data.userMessage.text,
          startedAt: new Date().toISOString(), // Update timestamp for sorting
        });
      }
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["chatHistory", variables.conversationId],
          context.previousMessages
        );
      }

      const apiError = handleApiError(error);
      console.error("Failed to send message:", apiError);
      // Could show user notification here
    },
  });

  // 🔹 Switch conversations
  const switchToConversation = useCallback(
    (conversationId: string) => {
      if (conversationId !== currentConversationId) {
        setCurrentConversationId(conversationId);
        setInputMessage("");
      }
    },
    [currentConversationId]
  );

  // 🔹 Handle form submission
  const handleSendMessage = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedMessage = inputMessage.trim();

      if (
        trimmedMessage &&
        currentConversationId &&
        !sendMessageMutation.isPending
      ) {
        sendMessageMutation.mutate({
          conversationId: currentConversationId,
          text: trimmedMessage,
        });
        setInputMessage("");
      }
    },
    [inputMessage, currentConversationId, sendMessageMutation]
  );

  // 🔹 Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Memoized conversation list to prevent unnecessary re-renders
  const conversationList = useMemo(
    () =>
      conversations.map((conv) => (
        <div
          key={conv.id}
          className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
            conv.id === currentConversationId
              ? "bg-blue-100 border border-blue-200"
              : "hover:bg-gray-100"
          }`}
          onClick={() => switchToConversation(conv.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              switchToConversation(conv.id);
            }
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">
              {conv.title || "New Chat"}
            </span>
            <MoreVertical size={14} className="text-gray-400" />
          </div>
          <div className="text-xs text-gray-500 truncate">
            {conv.lastMessage || "No messages yet"}
          </div>
        </div>
      )),
    [conversations, currentConversationId, switchToConversation]
  );

  // Show configuration error if user ID is not set
  if (HARDCODED_USER_ID === "PUT-YOUR-USER-ID-HERE") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">Configuration Required</h2>
          <p className="text-gray-600">
            Please set your user ID in the environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <nav
        className={`
        bg-gray-950 border-r border-gray-800 flex flex-col
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? "w-0" : "w-64"}
        h-full
      `}
      >
        {!sidebarCollapsed && (
          <>
            {/* Sidebar Header - Fixed */}
            <div className="p-4 border-b border-gray-800 flex-shrink-0">
              <button
                onClick={() =>
                  startConversationMutation.mutate(HARDCODED_USER_ID)
                }
                disabled={startConversationMutation.isPending}
                className="w-full flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-100 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {startConversationMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {startConversationMutation.isPending
                    ? "Creating..."
                    : "New Chat"}
                </span>
              </button>
            </div>

            {/* Conversations List - Scrollable */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 min-h-0">
              <div className="p-2 space-y-1">
                {conversationsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                  </div>
                ) : conversationsQuery.isError ? (
                  <div className="text-center py-8">
                    <AlertCircle
                      className="mx-auto mb-2 text-red-500"
                      size={24}
                    />
                    <p className="text-sm text-red-400">
                      Failed to load conversations
                    </p>
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No conversations yet
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`relative group rounded-lg transition-colors ${
                        conv.id === currentConversationId
                          ? "bg-gray-800"
                          : "hover:bg-gray-800/50"
                      }`}
                    >
                      <button
                        onClick={() => switchToConversation(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            switchToConversation(conv.id);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          conv.id === currentConversationId
                            ? "text-gray-100"
                            : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        <div className="flex items-start space-x-3 pr-8">
                          <div className="w-4 h-4 mt-0.5 flex-shrink-0 text-current opacity-60">
                            <MoreVertical size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {conv.title || "New Chat"}
                            </p>
                            {conv.lastMessage && (
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {conv.lastMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar - Fixed */}
        <header className="bg-gray-900 border-b border-gray-800 p-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
            <h1 className="text-gray-100 font-medium">
              {getCurrentConversation()?.title || "New Chat"}
            </h1>
          </div>
        </header>

        {/* Error Banner */}
        {messagesError && (
          <div className="bg-red-900/50 border-b border-red-800 p-4 flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-200">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  Failed to load chat history:{" "}
                  {messagesError.message || "Unknown error"}
                </span>
              </div>
              <button
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["chatHistory", currentConversationId],
                  })
                }
                className="text-sm bg-red-800 hover:bg-red-700 text-red-100 px-3 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Chat Content - Scrollable Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Empty State */}
          {messages.length === 0 &&
            !messagesLoading &&
            currentConversationId &&
            isInitialized && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-8 bg-white rounded-full flex items-center justify-center">
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Start a new conversation
                  </p>
                </div>
              </div>
            )}

          {/* Messages Container - Scrollable */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto px-4 py-8">
              <div className="max-w-3xl mx-auto space-y-6">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-2xl px-4 py-3 rounded-2xl relative ${
                          msg.sender === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-100 border border-gray-700"
                        } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p
                            className={`text-xs ${
                              msg.sender === "user"
                                ? "text-blue-200"
                                : "text-gray-500"
                            }`}
                          >
                            <time
                              dateTime={msg.timestamp}
                              aria-label={`Sent at ${msg.timestamp} (${abbreviation})`}
                              title={`${new Date(msg.timestamp).toLocaleString(
                                "en-US",
                                {
                                  timeZone: timezone,
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }
                              )} ${abbreviation}`}
                            >
                              {formatMessageTime(msg.timestamp, timezone)}
                            </time>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing Indicator */}
                {sendMessageMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Input Area - Fixed */}
          {currentConversationId && isInitialized && (
            <div className="p-4 flex-shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end space-x-3"
                  >
                    <div className="flex-1">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Send a message"
                        className="w-full bg-transparent text-gray-100 placeholder-gray-400 resize-none focus:outline-none text-sm leading-relaxed max-h-32 overflow-y-auto rounded"
                        rows={1}
                        style={{ minHeight: "24px" }}
                        disabled={sendMessageMutation.isPending}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="submit"
                        disabled={
                          !inputMessage.trim() || sendMessageMutation.isPending
                        }
                        className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          inputMessage.trim() && !sendMessageMutation.isPending
                            ? "bg-gray-600 hover:bg-gray-500 text-white"
                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {sendMessageMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
