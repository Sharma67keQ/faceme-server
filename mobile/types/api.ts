import {
  Comment,
  Community,
  Conversation,
  ExploreHub,
  FriendRequestState,
  LaunchSummary,
  Message,
  ModerationLog,
  ModerationOverview,
  ModerationReport,
  NotificationItem,
  Page,
  Post,
  Reel,
  Relationship,
  SocialGroup,
  Status,
  Story,
  User,
  VoiceRoom,
} from "./domain";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type FeedResponse = Post[];
export type CommentResponse = Comment;
export type ChatListResponse = Conversation[];
export type MessageListResponse = Message[];
export type NotificationResponse = NotificationItem[];
export type StoryResponse = Story[];
export type CommunityResponse = Community[];
export type RelationshipResponse = Relationship;
export type FriendRequestResponse = FriendRequestState;
export type PageResponse = Page[];
export type GroupResponse = SocialGroup[];
export type LaunchResponse = LaunchSummary;
export type ExploreHubResponse = ExploreHub;
export type StatusResponse = Status[];
export type ReelResponse = Reel[];
export type VoiceRoomResponse = VoiceRoom[];
export type ModerationReportResponse = ModerationReport[];
export type ModerationLogResponse = ModerationLog[];
export type ModerationOverviewResponse = ModerationOverview;
