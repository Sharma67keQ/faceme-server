import { io, Socket } from "socket.io-client";
import { ChatListResponse, MessageListResponse } from "@/types/api";
import { api } from "./api";
import { runtimeConfig } from "./runtime-config";

let socket: Socket | null = null;

export const chatService = {
  async getConversations() {
    const { data } = await api.get<ChatListResponse>("/chat/conversations");
    return data;
  },
  async getMessages(conversationId: string) {
    const { data } = await api.get<MessageListResponse>(
      `/chat/conversations/${conversationId}/messages`,
    );
    return data;
  },
  async createDirectConversation(peerId: string) {
    const { data } = await api.post("/chat/conversations/direct", { peerId });
    return data;
  },
  async createGroupConversation(payload: { title: string; participantIds: string[] }) {
    const { data } = await api.post("/chat/conversations/group", payload);
    return data;
  },
  async sendMessage(
    conversationId: string,
    payload: {
      text?: string;
      mediaUrl?: string;
      type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
      replyToMessageId?: string;
    },
  ) {
    const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, payload);
    return data;
  },
  connect(token: string) {
    if (socket) {
      return socket;
    }

    socket = io(runtimeConfig.socketUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    return socket;
  },
  onPresenceUpdate(listener: (payload: { userId: string; status: "ONLINE" | "OFFLINE" | "AWAY" }) => void) {
    socket?.on("presence:update", listener);
  },
  offPresenceUpdate(listener: (payload: { userId: string; status: "ONLINE" | "OFFLINE" | "AWAY" }) => void) {
    socket?.off("presence:update", listener);
  },
  disconnect() {
    socket?.disconnect();
    socket = null;
  },
};
