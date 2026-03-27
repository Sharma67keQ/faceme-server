import {
  ExploreHubResponse,
  FriendRequestResponse,
  GroupResponse,
  LaunchResponse,
  PageResponse,
  RelationshipResponse,
} from "@/types/api";
import { User } from "@/types/domain";
import { api } from "./api";

export const socialService = {
  async getFriends() {
    const { data } = await api.get<User[]>("/social/friends");
    return data;
  },
  async getFriendRequests() {
    const { data } = await api.get<FriendRequestResponse>("/social/friend-requests");
    return data;
  },
  async sendFriendRequest(userId: string) {
    const { data } = await api.post(`/social/friends/${userId}/request`);
    return data;
  },
  async respondToFriendRequest(requestId: string, action: "accept" | "reject") {
    const { data } = await api.post(`/social/friend-requests/${requestId}/respond`, { action });
    return data;
  },
  async removeFriend(userId: string) {
    const { data } = await api.delete(`/social/friends/${userId}`);
    return data;
  },
  async getRelationship(userId: string) {
    const { data } = await api.get<RelationshipResponse>(`/social/relationship/${userId}`);
    return data;
  },
  async getPeopleYouMayKnow() {
    const { data } = await api.get<User[]>("/social/people-you-may-know");
    return data;
  },
  async getPages() {
    const { data } = await api.get<PageResponse>("/social/pages");
    return data;
  },
  async getPage(slug: string) {
    const { data } = await api.get(`/social/pages/${slug}`);
    return data;
  },
  async createPage(payload: { name: string; slug: string; description?: string; logoUrl?: string }) {
    const { data } = await api.post("/social/pages", payload);
    return data;
  },
  async togglePageFollow(pageId: string) {
    const { data } = await api.post(`/social/pages/${pageId}/follow`);
    return data;
  },
  async updatePage(pageId: string, payload: { name?: string; description?: string; logoUrl?: string; coverImageUrl?: string }) {
    const { data } = await api.patch(`/social/pages/${pageId}`, payload);
    return data;
  },
  async deletePage(pageId: string) {
    const { data } = await api.delete(`/social/pages/${pageId}`);
    return data;
  },
  async getGroups() {
    const { data } = await api.get<GroupResponse>("/social/groups");
    return data;
  },
  async getGroup(slug: string) {
    const { data } = await api.get(`/social/groups/${slug}`);
    return data;
  },
  async createGroup(payload: {
    name: string;
    slug: string;
    description?: string;
    privacy?: "PUBLIC" | "PRIVATE";
  }) {
    const { data } = await api.post("/social/groups", payload);
    return data;
  },
  async joinGroup(groupId: string) {
    const { data } = await api.post(`/social/groups/${groupId}/join`);
    return data;
  },
  async updateGroup(groupId: string, payload: { name?: string; description?: string; privacy?: "PUBLIC" | "PRIVATE" }) {
    const { data } = await api.patch(`/social/groups/${groupId}`, payload);
    return data;
  },
  async deleteGroup(groupId: string) {
    const { data } = await api.delete(`/social/groups/${groupId}`);
    return data;
  },
  async getLaunchSummary() {
    const { data } = await api.get<LaunchResponse>("/social/launch");
    return data;
  },
  async getExploreHub() {
    const { data } = await api.get<ExploreHubResponse>("/social/explore");
    return data;
  },
  async createInvite(message?: string) {
    const { data } = await api.post("/social/invites", { message });
    return data;
  },
  async redeemInvite(code: string) {
    const { data } = await api.post(`/social/invites/${code}/redeem`);
    return data;
  },
  async sendFeedback(payload: { subject: string; body: string; rating?: number }) {
    const { data } = await api.post("/social/feedback", payload);
    return data;
  },
};
