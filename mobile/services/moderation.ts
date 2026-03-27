import {
  ModerationLogResponse,
  ModerationOverviewResponse,
  ModerationReportResponse,
} from "@/types/api";
import { api } from "./api";

type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";
type ContentAction = "remove" | "restore" | "remove-media";
type CommentAction = "remove" | "restore";
type UserAction = "suspend" | "unsuspend" | "ban" | "unban";

export const moderationService = {
  async getOverview() {
    const { data } = await api.get<ModerationOverviewResponse>("/moderation/overview");
    return data;
  },
  async getReports() {
    const { data } = await api.get<ModerationReportResponse>("/moderation/reports");
    return data;
  },
  async getLogs() {
    const { data } = await api.get<ModerationLogResponse>("/moderation/logs");
    return data;
  },
  async updateReport(reportId: string, status: ReportStatus, resolutionNotes?: string) {
    const { data } = await api.patch(`/moderation/reports/${reportId}`, { status, resolutionNotes });
    return data;
  },
  async moderatePost(postId: string, action: ContentAction, reason: string, reportId?: string) {
    const { data } = await api.post(`/moderation/posts/${postId}/action`, { action, reason, reportId });
    return data;
  },
  async moderateComment(commentId: string, action: CommentAction, reason: string, reportId?: string) {
    const { data } = await api.post(`/moderation/comments/${commentId}/action`, { action, reason, reportId });
    return data;
  },
  async moderateReel(reelId: string, action: CommentAction, reason: string, reportId?: string) {
    const { data } = await api.post(`/moderation/reels/${reelId}/action`, { action, reason, reportId });
    return data;
  },
  async moderateStatus(statusId: string, action: ContentAction, reason: string, reportId?: string) {
    const { data } = await api.post(`/moderation/statuses/${statusId}/action`, { action, reason, reportId });
    return data;
  },
  async moderateUser(userId: string, action: UserAction, reason: string, reportId?: string) {
    const { data } = await api.post(`/moderation/users/${userId}/action`, { action, reason, reportId });
    return data;
  },
  async moderateGroup(groupId: string, action: ContentAction, reason: string, reportId?: string) {
    const { data } = await api.post(`/moderation/groups/${groupId}/action`, { action, reason, reportId });
    return data;
  },
  async moderatePage(pageId: string, action: ContentAction, reason: string, reportId?: string) {
    const { data } = await api.post(`/moderation/pages/${pageId}/action`, { action, reason, reportId });
    return data;
  },
};
