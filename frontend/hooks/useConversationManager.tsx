import { Conversation } from "@/lib/api";
import { useCallback, useState } from "react";

// ---------- Conversation Manager ----------
export function useConversationManager() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);

  const addConversation = useCallback((conversation: Conversation) => {
    setConversations((prev) => {
      // Check if conversation already exists
      const existingIndex = prev.findIndex((c) => c.id === conversation.id);
      let updated: Conversation[];

      if (existingIndex >= 0) {
        // Update existing conversation
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...conversation };
      } else {
        // Add new conversation
        updated = [conversation, ...prev];
      }

      return updated.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    });
  }, []);

  const setConversationsState = useCallback(
    (newConversations: Conversation[]) => {
      const sortedConversations = [...newConversations].sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      setConversations(sortedConversations);
    },
    []
  );

  const removeConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    // If removing current conversation, switch to another or null
    setCurrentConversationId((current) =>
      current === conversationId ? null : current
    );
  }, []);

  const getCurrentConversation = useCallback(() => {
    return conversations.find((c) => c.id === currentConversationId) || null;
  }, [conversations, currentConversationId]);

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    removeConversation,
    getCurrentConversation,
    setConversationsState,
  };
}
