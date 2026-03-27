import { StatusResponse } from "@/types/api";
import { api } from "./api";

export const statusService = {
  async list() {
    const { data } = await api.get<StatusResponse>("/status");
    return data;
  },
  async getById(statusId: string) {
    const { data } = await api.get(`/status/${statusId}`);
    return data;
  },
  async create(payload: {
    kind: "TEXT" | "IMAGE" | "VIDEO";
    text?: string;
    mediaUrl?: string;
    visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  }) {
    const { data } = await api.post("/status", payload);
    return data;
  },
  async markViewed(statusId: string) {
    const { data } = await api.post(`/status/${statusId}/view`);
    return data;
  },
  async react(statusId: string, payload: { emoji: string; replyText?: string }) {
    const { data } = await api.post(`/status/${statusId}/react`, payload);
    return data;
  },
  async delete(statusId: string) {
    const { data } = await api.delete(`/status/${statusId}`);
    return data;
  },
  async report(statusId: string, reason: string) {
    const { data } = await api.post(`/status/${statusId}/report`, { reason });
    return data;
  },
};
