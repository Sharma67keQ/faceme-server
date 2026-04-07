import { io, Socket } from "socket.io-client";
import { ChatListResponse, MessageListResponse } from "@/types/api";
import { api } from "./api";
import { runtimeConfig } from "./runtime-config";

let socket: Socket | null = null;

export const chatService = {
  async getConversations() {
    try {
      const { data } = await api.get<ChatListResponse>("/chat/conversations");
      return data;
    } catch (error) {
      console.error("Failed to load conversations", error);
      throw error;
    }
  },
  async getMessages(conversationId: string) {
    try {
      const { data } = await api.get<MessageListResponse>(
        `/chat/conversations/${conversationId}/messages`,
      );
      return data;
    } catch (error) {
      console.error("Failed to load messages", { conversationId, error });
      throw error;
    }
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

    try {
      socket = io(runtimeConfig.socketUrl, {
        auth: { token },
        transports: ["websocket"],
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error", error);
      });

      socket.on("disconnect", (reason) => {
        console.error("Socket disconnected", reason);
      });
    } catch (error) {
      console.error("Failed to initialize socket", error);
      socket = null;
    }

    return socket;
  },
  on(event: string, listener: (...args: any[]) => void) {
    socket?.on(event, listener);
  },
  off(event: string, listener: (...args: any[]) => void) {
    socket?.off(event, listener);
  },
  joinVoiceRoom(roomId: string) {
    socket?.emit("voice-room:join", roomId);
  },
  leaveVoiceRoom(roomId: string) {
    socket?.emit("voice-room:leave", roomId);
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
