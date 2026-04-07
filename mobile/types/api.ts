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
  GiftCatalogItem,
  Relationship,
  RoomGiftSnapshot,
  SocialGroup,
  Status,
  Story,
  User,
  VoiceRoom,
  WalletSummary,
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
export type WalletSummaryResponse = WalletSummary;
export type GiftCatalogResponse = GiftCatalogItem[];
export type RoomGiftSnapshotResponse = RoomGiftSnapshot;

export type MediaUploadResponse = {
  publicId: string;
  secureUrl: string;
  width?: number | null;
  height?: number | null;
  bytes: number;
  format?: string | null;
  resourceType: string;
  originalFilename: string;
};
