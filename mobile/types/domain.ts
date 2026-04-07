export type User = {
  id: string;
  username: string;
  firstName: string;
  lastName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  email?: string;
  coverImageUrl?: string | null;
  location?: string | null;
  website?: string | null;
  accountType?: "PERSONAL" | "CREATOR" | "BUSINESS";
  preferredLanguage?: "SO" | "EN" | "AR";
  role?: "USER" | "MODERATOR" | "ADMIN";
  isOnboardingComplete?: boolean;
  isPrivateAccount?: boolean;
  profileVisibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  suspendedAt?: string | null;
  bannedAt?: string | null;
  isFollowing?: boolean;
  isFriend?: boolean;
  canViewPosts?: boolean;
  friendCount?: number;
  mutualFriendsCount?: number;
  _count?: {
    posts: number;
    followers: number;
    following: number;
  };
};

export type Relationship = {
  isFriend: boolean;
  hasSentRequest: boolean;
  hasIncomingRequest: boolean;
  friendRequestId?: string | null;
  mutualFriendsCount: number;
  mutualFriends: User[];
};

export type FriendRequestItem = {
  id: string;
  createdAt: string;
  user: User;
};

export type FriendRequestState = {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
};

export type Page = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  owner: User;
  followersCount: number;
  postsCount: number;
  isFollowing: boolean;
  createdAt: string;
};

export type SocialGroup = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  privacy: "PUBLIC" | "PRIVATE";
  owner: User;
  membersCount: number;
  postsCount: number;
  discussionCount: number;
  isMember: boolean;
  membershipStatus?: "PENDING" | "ACTIVE" | "REMOVED" | null;
  chatId?: string | null;
  createdAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  parentCommentId?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  author: User;
  reactionSummary: {
    likes: number;
    dislikes: number;
    emojis: Array<{
      emoji: string;
      count: number;
      reacted: boolean;
    }>;
  };
  viewerReactions: {
    like: boolean;
    dislike: boolean;
    emojis: string[];
  };
  replies: Comment[];
};

export type Post = {
  id: string;
  body: string;
  mediaUrl?: string | null;
  mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | null;
  visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  kind?: "STANDARD" | "QUICK" | "SHARE";
  shareSlug?: string | null;
  createdAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
  isSaved?: boolean;
  discussionLabel?: string | null;
  scoreReason?: string | null;
  author: User;
  page?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  } | null;
  group?: {
    id: string;
    name: string;
    slug: string;
    privacy: "PUBLIC" | "PRIVATE";
  } | null;
  sharedPost?: {
    id: string;
    body: string;
    author: User;
  } | null;
  comments?: Comment[];
  _count: {
    likes: number;
    comments: number;
  };
};

export type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP" | "COMMUNITY";
  title?: string | null;
  description?: string | null;
  updatedAt: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
  participants: Array<{
    user: User & {
      presenceStatus?: "ONLINE" | "OFFLINE" | "AWAY";
    };
  }>;
  lastMessage?: {
    id: string;
    text?: string | null;
    createdAt: string;
  } | null;
};

export type Community = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isMember?: boolean;
  conversationId?: string | null;
  memberCount?: number;
  owner: User;
};

export type LaunchSummary = {
  betaAccess: {
    isBetaUser: boolean;
    cohort?: string | null;
  };
  featureFlags: Array<{
    id: string;
    key: string;
    name: string;
    description?: string | null;
    isEnabled: boolean;
    rollout: number;
  }>;
  invite?: {
    id: string;
    code: string;
    message?: string | null;
    link: string;
  } | null;
  onboarding: {
    suggestedUsers: User[];
    suggestedPages: Page[];
    suggestedGroups: SocialGroup[];
  };
  friendRequests: FriendRequestState;
};

export type ExploreHub = {
  trendingPosts: Post[];
  suggestedUsers: User[];
  suggestedPages: Page[];
  suggestedGroups: SocialGroup[];
  activeDiscussions: Array<{
    id: string;
    body: string;
    commentsCount: number;
    likesCount: number;
    author: User;
    page?: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
    } | null;
    group?: {
      id: string;
      name: string;
      slug: string;
      privacy: "PUBLIC" | "PRIVATE";
    } | null;
  }>;
};

export type Status = {
  id: string;
  kind: "TEXT" | "IMAGE" | "VIDEO";
  text?: string | null;
  mediaUrl?: string | null;
  visibility: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  expiresAt: string;
  createdAt: string;
  viewersCount?: number;
  isViewed?: boolean;
  viewers?: Array<{
    id: string;
    viewedAt: string;
    viewer: User;
  }>;
  author: User;
  reactions?: Array<{
    id: string;
    emoji: string;
    replyText?: string | null;
    user: User;
  }>;
};

export type Reel = {
  id: string;
  videoUrl: string;
  caption?: string | null;
  visibility: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
  shareSlug?: string | null;
  createdAt: string;
  author: User;
  likesCount: number;
  commentsCount?: number;
  isLiked: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  scoreReason?: string | null;
  comments?: ReelComment[];
};

export type ReelComment = {
  id: string;
  reelId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  parentCommentId?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  author: User;
  replies: ReelComment[];
};

export type VoiceRoom = {
  id: string;
  title: string;
  topic?: string | null;
  description?: string | null;
  theme: "SUNSET" | "AURORA" | "LOUNGE" | "PARTY";
  privacy: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY";
  status: "LIVE" | "ENDED";
  isLive: boolean;
  endedAt?: string | null;
  createdAt: string;
  participantsCount?: number;
  host: User;
  owner?: User;
  viewerRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
  canJoin?: boolean;
  canEdit?: boolean;
  canModerate?: boolean;
  participants: Array<{
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    state: "LISTENING" | "SPEAKING" | "MUTED";
    isConnected?: boolean;
    isSpeakingLive?: boolean;
    isMicEnabled?: boolean;
    isMutedByModerator?: boolean;
    canBeRemoved?: boolean;
    canPromote?: boolean;
    canDemote?: boolean;
    canMute?: boolean;
    canUnmute?: boolean;
    user: User;
  }>;
};

export type GiftCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  iconKey: string;
  assetUrl?: string | null;
  coinCost: number;
  accentColor?: string | null;
};

export type WalletTransaction = {
  id: string;
  type: "TOP_UP" | "GIFT_SPEND" | "GIFT_RECEIPT" | "ADJUSTMENT" | "REFUND" | "HOLD" | "RELEASE";
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELED";
  amountCoins: number;
  balanceAfterCoins: number;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

export type WalletSummary = {
  balanceCoins: number;
  heldCoins: number;
  transactions: WalletTransaction[];
  premium: {
    status: string;
    expiresAt?: string | null;
    badgeVisible: boolean;
    plan?: {
      id: string;
      slug: string;
      name: string;
    } | null;
  };
  premiumPlans: Array<{
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    interval: "MONTHLY" | "YEARLY";
    priceLabel: string;
    badgeLabel?: string | null;
  }>;
};

export type RoomGiftEvent = {
  id: string;
  roomId: string;
  quantity: number;
  totalCoinCost: number;
  platformCommissionCoins: number;
  creatorNetCoins: number;
  message?: string | null;
  createdAt: string;
  gift: GiftCatalogItem;
  sender: User & { isPremium?: boolean };
  receiver: User & { isPremium?: boolean };
};

export type RoomGiftSnapshot = {
  recentEvents: RoomGiftEvent[];
  topSupporters: Array<{
    user: (User & { isPremium?: boolean }) | null;
    totalCoins: number;
    giftsSent: number;
  }>;
  roomEarnings: {
    grossCoins: number;
    platformCommissionCoins: number;
    creatorNetCoins: number;
  };
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | null;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "SYSTEM";
  createdAt: string;
  statuses?: Array<{
    status: "SENT" | "DELIVERED" | "SEEN";
  }>;
  sender: User;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: User | null;
};

export type Story = {
  id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string | null;
  createdAt: string;
  expiresAt: string;
  isViewed?: boolean;
  author: User;
};

export type ModerationReport = {
  id: string;
  targetType: "USER" | "POST" | "COMMENT" | "REEL" | "STATUS" | "GROUP" | "PAGE";
  targetId: string;
  reason: string;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";
  resolutionNotes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reporter: User;
  subjectUser?: User | null;
  reviewedBy?: User | null;
  moderationLogs?: ModerationLog[];
};

export type ModerationLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  createdAt: string;
  actor: User;
};

export type ModerationOverview = {
  reports: {
    open: number;
    reviewing: number;
    resolved: number;
    rejected: number;
  };
  hiddenContent: {
    posts: number;
    comments: number;
    reels: number;
    statuses: number;
    groups: number;
    pages: number;
  };
  users: {
    suspended: number;
    banned: number;
  };
};
