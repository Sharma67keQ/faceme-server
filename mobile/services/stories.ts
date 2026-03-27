import { StoryResponse } from "@/types/api";
import { api } from "./api";

export const storyService = {
  async getFollowingStories() {
    const { data } = await api.get<StoryResponse>("/stories/following");
    return data;
  },
  async createStory(payload: { mediaUrl: string; caption?: string; mediaType?: "IMAGE" | "VIDEO" }) {
    const { data } = await api.post("/stories", payload);
    return data;
  },
  async markViewed(storyId: string) {
    const { data } = await api.post(`/stories/${storyId}/view`);
    return data;
  },
};
