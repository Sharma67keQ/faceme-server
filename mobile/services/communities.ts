import { CommunityResponse } from "@/types/api";
import { api } from "./api";

export const communityService = {
  async listCommunities() {
    const { data } = await api.get<CommunityResponse>("/communities");
    return data;
  },
  async createCommunity(payload: { name: string; slug: string; description?: string }) {
    const { data } = await api.post("/communities", payload);
    return data;
  },
  async joinCommunity(communityId: string) {
    const { data } = await api.post(`/communities/${communityId}/join`);
    return data;
  },
  async updateCommunity(
    communityId: string,
    payload: { name?: string; description?: string; avatarUrl?: string; coverImageUrl?: string },
  ) {
    const { data } = await api.patch(`/communities/${communityId}`, payload);
    return data;
  },
  async deleteCommunity(communityId: string) {
    const { data } = await api.delete(`/communities/${communityId}`);
    return data;
  },
};
