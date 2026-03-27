import { User } from "@/types/domain";
import { api } from "./api";

export const userService = {
  async getMe() {
    const { data } = await api.get<User>("/users/me");
    return data;
  },
  async searchUsers(query: string) {
    const { data } = await api.get<User[]>("/users/search", {
      params: { q: query },
    });
    return data;
  },
  async getSuggestedProfiles() {
    const { data } = await api.get<User[]>("/users/suggestions");
    return data;
  },
  async getUserByUsername(username: string) {
    const { data } = await api.get<User>(`/users/${username}`);
    return data;
  },
  async getUserById(userId: string) {
    const { data } = await api.get<User>(`/users/id/${userId}`);
    return data;
  },
  async getUserPostsByUsername(username: string) {
    const { data } = await api.get("/users/" + username + "/posts");
    return data;
  },
  async getFollowers(username: string) {
    const { data } = await api.get<User[]>(`/users/${username}/followers`);
    return data;
  },
  async getFollowing(username: string) {
    const { data } = await api.get<User[]>(`/users/${username}/following`);
    return data;
  },
  async toggleFollow(userId: string) {
    const { data } = await api.post<{ isFollowing: boolean }>(`/users/${userId}/follow`);
    return data;
  },
  async toggleBlock(userId: string) {
    const { data } = await api.post<{ isBlocked: boolean }>(`/users/${userId}/block`);
    return data;
  },
  async reportUser(userId: string, reason: string) {
    const { data } = await api.post(`/users/${userId}/report`, { reason });
    return data;
  },
  async updateMe(payload: Partial<User> & { isOnboardingComplete?: boolean }) {
    const { data } = await api.patch<User>("/users/me", payload);
    return data;
  },
};
