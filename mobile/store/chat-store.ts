import { create } from "zustand";
import { Message } from "@/types/domain";

type ChatState = {
  activeConversationId: string | null;
  messagesByConversation: Record<string, Message[]>;
  setActiveConversation: (conversationId: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  appendMessage: (conversationId: string, message: Message) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  messagesByConversation: {},
  setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),
  appendMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: state.messagesByConversation[conversationId]?.some(
          (existingMessage) => existingMessage.id === message.id,
        )
          ? (state.messagesByConversation[conversationId] ?? [])
          : [...(state.messagesByConversation[conversationId] ?? []), message],
      },
    })),
}));
