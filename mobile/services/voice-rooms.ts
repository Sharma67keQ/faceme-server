import { VoiceRoomResponse } from "@/types/api";
import { api } from "./api";

export const voiceRoomService = {
  async list() {
    const { data } = await api.get<VoiceRoomResponse>("/voice-rooms");
    return data;
  },
  async create(payload: { title: string; topic?: string }) {
    const { data } = await api.post("/voice-rooms", payload);
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
};
