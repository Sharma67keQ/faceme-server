import { VoiceRoomResponse } from "@/types/api";
import { api } from "./api";

export const voiceRoomService = {
  async list() {
    const { data } = await api.get<VoiceRoomResponse>("/voice-rooms");
    return data;
  },
  async getById(roomId: string) {
    const { data } = await api.get(`/voice-rooms/${roomId}`);
    return data;
  },
  async create(payload: {
    title: string;
    topic?: string;
    description?: string;
    privacy?: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY";
    theme?: "SUNSET" | "AURORA" | "LOUNGE" | "PARTY";
  }) {
    const { data } = await api.post("/voice-rooms", payload);
    return data;
  },
  async update(
    roomId: string,
    payload: {
      title?: string;
      topic?: string | null;
      description?: string | null;
      privacy?: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY";
      theme?: "SUNSET" | "AURORA" | "LOUNGE" | "PARTY";
    },
  ) {
    const { data } = await api.patch(`/voice-rooms/${roomId}`, payload);
    return data;
  },
  async join(roomId: string) {
    const { data } = await api.post(`/voice-rooms/${roomId}/join`);
    return data;
  },
  async leave(roomId: string) {
    const { data } = await api.post(`/voice-rooms/${roomId}/leave`);
    return data;
  },
  async setState(roomId: string, state: "LISTENING" | "SPEAKING" | "MUTED") {
    const { data } = await api.post(`/voice-rooms/${roomId}/state`, { state });
    return data;
  },
  async setRole(roomId: string, userId: string, role: "ADMIN" | "MEMBER") {
    const { data } = await api.post(`/voice-rooms/${roomId}/participants/${userId}/role`, { role });
    return data;
  },
  async setModeration(roomId: string, userId: string, muted: boolean) {
    const { data } = await api.post(`/voice-rooms/${roomId}/participants/${userId}/moderation`, { muted });
    return data;
  },
  async issueAudioToken(roomId: string) {
    const { data } = await api.post(`/voice-rooms/${roomId}/audio-token`);
    return data as { serverUrl: string; token: string; roomName: string };
  },
  async removeParticipant(roomId: string, userId: string) {
    const { data } = await api.delete(`/voice-rooms/${roomId}/participants/${userId}`);
    return data;
  },
  async endRoom(roomId: string) {
    const { data } = await api.post(`/voice-rooms/${roomId}/end`);
    return data;
  },
};
