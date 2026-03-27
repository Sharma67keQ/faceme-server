import { FeedResponse } from "@/types/api";
import { Comment } from "@/types/domain";
import { api } from "./api";

export const postService = {
  async getFeed() {
    const { data } = await api.get<FeedResponse>("/posts/feed");
    return data;
  },
  async getExplore() {
    const { data } = await api.get<FeedResponse>("/posts/explore");
    return data;
  },
  async getSharedPost(shareSlug: string) {
    const { data } = await api.get(`/posts/shared/${shareSlug}`);
    return data;
  },
  async getPostsByPage(pageId: string) {
    const { data } = await api.get<FeedResponse>(`/posts/page/${pageId}`);
    return data;
  },
  async getPostsByGroup(groupId: string) {
    const { data } = await api.get<FeedResponse>(`/posts/group/${groupId}`);
    return data;
  },
  async getSavedPosts() {
    const { data } = await api.get<FeedResponse>("/posts/saved");
    return data;
  },
  async createPost(payload: {
    body: string;
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO";
    kind?: "STANDARD" | "QUICK" | "SHARE";
    pageId?: string;
    groupId?: string;
    visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  }) {
    const { data } = await api.post("/posts", payload);
    return data;
  },
  async updatePost(postId: string, payload: {
    body: string;
    mediaUrl?: string | null;
    mediaType?: "IMAGE" | "VIDEO" | null;
    visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  }) {
    const { data } = await api.patch(`/posts/${postId}`, payload);
    return data;
  },
  async deletePost(postId: string) {
    const { data } = await api.delete(`/posts/${postId}`);
    return data;
  },
  async likePost(postId: string) {
    const { data } = await api.post(`/posts/${postId}/like`);
    return data;
  },
  async commentOnPost(postId: string, body: string) {
    const { data } = await api.post<Comment>(`/posts/${postId}/comments`, { body });
    return data;
  },
  async replyToComment(postId: string, parentCommentId: string, body: string) {
    const { data } = await api.post<Comment>(`/posts/${postId}/comments`, { body, parentCommentId });
    return data;
  },
  async reactToComment(commentId: string, payload: { type: "LIKE" | "DISLIKE" | "EMOJI"; emoji?: string }) {
    const { data } = await api.post<Comment>(`/posts/comments/${commentId}/reactions`, payload);
    return data;
  },
  async updateComment(commentId: string, body: string) {
    const { data } = await api.patch<Comment>(`/posts/comments/${commentId}`, { body });
    return data;
  },
  async deleteComment(commentId: string) {
    const { data } = await api.delete(`/posts/comments/${commentId}`);
    return data;
  },
  async toggleSavedPost(postId: string) {
    const { data } = await api.post<{ isSaved: boolean }>(`/posts/${postId}/save`);
    return data;
  },
  async sharePost(postId: string) {
    const { data } = await api.post(`/posts/${postId}/share`);
    return data;
  },
  async reportPost(postId: string, reason: string) {
    const { data } = await api.post(`/posts/${postId}/report`, { reason });
    return data;
  },
  async reportComment(commentId: string, reason: string) {
    const { data } = await api.post(`/posts/comments/${commentId}/report`, { reason });
    return data;
  },
};
