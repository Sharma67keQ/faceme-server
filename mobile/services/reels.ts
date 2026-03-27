import { ReelResponse } from "@/types/api";
import { api } from "./api";

export const reelService = {
  async list() {
    const { data } = await api.get<ReelResponse>("/reels");
    return data;
  },
  async create(payload: {
    videoUrl: string;
    caption?: string;
    visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  }) {
    const { data } = await api.post("/reels", payload);
    return data;
  },
  async update(reelId: string, payload: {
    videoUrl: string;
    caption?: string;
    visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  }) {
    const { data } = await api.patch(`/reels/${reelId}`, payload);
    return data;
  },
  async delete(reelId: string) {
    const { data } = await api.delete(`/reels/${reelId}`);
    return data;
  },
  async like(reelId: string) {
    const { data } = await api.post(`/reels/${reelId}/like`);
    return data;
  },
  async comment(reelId: string, body: string, parentCommentId?: string) {
    const { data } = await api.post(`/reels/${reelId}/comments`, { body, parentCommentId });
    return data;
  },
  async share(reelId: string) {
    const { data } = await api.post(`/reels/${reelId}/share`);
    return data;
  },
  async report(reelId: string, reason: string) {
    const { data } = await api.post(`/reels/${reelId}/report`, { reason });
    return data;
  },
};
