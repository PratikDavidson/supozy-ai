import z from "zod";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const HARDCODED_USER_ID =
  process.env.NEXT_PUBLIC_USER_ID || "PUT-YOUR-USER-ID-HERE";

// ---------- Base Schemas ----------
export const MessageSchema = z.object({
  id: z.uuid("Message ID must be a valid UUID"),
  text: z
    .string()
    .min(1, "Message text cannot be empty")
    .max(10000, "Message text too long"),
  sender: z
    .enum(["user", "assistant"])
    .refine(
      (val) => ["user", "assistant"].includes(val),
      "Sender must be either 'user' or 'assistant'"
    ),
  timestamp: z.iso.datetime("Invalid timestamp format"),
  status: z.string().min(1, "Status cannot be empty"),
});

export const ConversationSchema = z.object({
  id: z.uuid("Conversation ID must be a valid UUID"),
  status: z
    .enum(["active", "closed", "escalated"])
    .refine(
      (val) => ["active", "closed", "escalated"].includes(val),
      "Status must be either 'active' or 'closed' or 'escalated'"
    ),
  startedAt: z.iso.datetime("Invalid startedAt timestamp"),
  title: z.string().optional(),
  lastMessage: z.string().optional(),
});

// ---------- API Request/Response Schemas ----------

// Start Conversation Request
export const StartConversationRequestSchema = z.object({
  user_id: z.uuid("User ID must be a valid UUID"),
});

// Start Conversation Response
export const StartConversationResponseSchema = z.object({
  conversationId: z.uuid("Conversation ID must be a valid UUID"),
});

// Send Message Request
export const SendMessageRequestSchema = z.object({
  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message is too long")
    .trim(),
});

// Send Message Response
export const SendMessageResponseSchema = z.object({
  userMessage: MessageSchema,
  assistantMessage: MessageSchema,
});

// Get Conversations Response
export const GetConversationsResponseSchema = z.array(ConversationSchema);

// Get Chat History Response
export const GetChatHistoryResponseSchema = z.array(MessageSchema);

// ---------- Type Exports ----------
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type StartConversationRequest = z.infer<
  typeof StartConversationRequestSchema
>;
export type StartConversationResponse = z.infer<
  typeof StartConversationResponseSchema
>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type GetConversationsResponse = z.infer<
  typeof GetConversationsResponseSchema
>;
export type GetChatHistoryResponse = z.infer<
  typeof GetChatHistoryResponseSchema
>;

// ---------- API ----------
export const api = {
  getChatHistory: async (conversationId: string): Promise<Message[]> => {
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/${conversationId}/history`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      if (!res.ok) {
        throw new Error(
          `Failed to fetch chat history: ${res.status} ${res.statusText}`
        );
      }
      return await res.json();
    } catch (error) {
      console.error("Error fetching chat history:", error);
      throw error;
    }
  },

  sendMessage: async (
    conversationId: string,
    text: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/${conversationId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        throw new Error(
          `Failed to send message: ${res.status} ${res.statusText}`
        );
      }
      const response = await res.json();
      console.log(response);
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  startConversation: async (
    userId: string
  ): Promise<{ conversationId: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        throw new Error(
          `Failed to start conversation: ${res.status} ${res.statusText}`
        );
      }
      return await res.json();
    } catch (error) {
      console.error("Error starting conversation:", error);
      throw error;
    }
  },

  getConversations: async (userId: string): Promise<Conversation[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/user/${userId}/conversations`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(
          `Failed to fetch conversations: ${res.status} ${res.statusText}`
        );
      }
      return await res.json();
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  },
};
