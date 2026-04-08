import axios from "axios";
import type { FeedPost, SessionProfile } from "@/store/use-app-store";

const api = axios.create({
  baseURL: "https://faceme-server.onrender.com/api",
  timeout: 20000,
});

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string | null;
    role: "USER" | "MODERATOR" | "ADMIN";
  };
};

type FeedResponse = {
  posts: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: {
      id: string;
      username: string;
      firstName: string;
      lastName: string | null;
      avatarUrl: string | null;
    };
    _count: {
      comments: number;
      likes: number;
      shares: number;
    };
  }>;
};

type ProfileResponse = {
  profile: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    location: string | null;
    website: string | null;
    role: "USER" | "MODERATOR" | "ADMIN";
    _count?: {
      followers: number;
      following: number;
      posts: number;
    };
  } | null;
};

type AdminDashboardResponse = {
  metrics: {
    users: number;
    posts: number;
    openReports: number;
    conversations: number;
  };
};

type AdminReportsResponse = {
  reports: Array<{
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    status: "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";
    createdAt: string;
    reporter: {
      username: string;
      firstName: string;
      lastName: string | null;
    };
  }>;
};

type DiscoverResponse = {
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    _count: { members: number };
  }>;
  creators: Array<{
    id: string;
    username: string;
    firstName: string;
    lastName: string | null;
    bio: string | null;
    _count: { followers: number; posts: number };
  }>;
  posts: Array<{
    id: string;
    body: string;
    author: {
      username: string;
      firstName: string;
      lastName: string | null;
    };
  }>;
};

type ConversationsResponse = {
  conversations: Array<{
    id: string;
    title: string;
    updatedAt: string;
    lastMessage: string;
  }>;
};

type MessagesResponse = {
  messages: Array<{
    id: string;
    text: string | null;
    createdAt: string;
    senderId: string;
    sender: {
      firstName: string;
      lastName: string | null;
      username: string;
    };
  }>;
};

export async function register(input: {
  email: string;
  username: string;
  password: string;
  firstName: string;
}) {
  const { data } = await api.post<AuthResponse>("/auth/register", input);
  return data;
}

export async function login(input: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>("/auth/login", input);
  return data;
}

export async function fetchFeed() {
  const { data } = await api.get<FeedResponse>("/feed");

  return data.posts.map<FeedPost>((post) => ({
    id: post.id,
    author: [post.author.firstName, post.author.lastName].filter(Boolean).join(" "),
    handle: `@${post.author.username}`,
    age: formatRelative(post.createdAt),
    body: post.body,
    mood: "Live",
    tags: ["render", "social", "live"],
    likes: post._count.likes,
    comments: post._count.comments,
    shares: post._count.shares,
  }));
}

export async function createPost(input: { accessToken: string; body: string }) {
  const { data } = await api.post<{ post: FeedResponse["posts"][number] }>(
    "/feed",
    { body: input.body },
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );

  return {
    id: data.post.id,
    author: [data.post.author.firstName, data.post.author.lastName].filter(Boolean).join(" "),
    handle: `@${data.post.author.username}`,
    age: formatRelative(data.post.createdAt),
    body: data.post.body,
    mood: "New",
    tags: ["live", "fresh", "post"],
    likes: data.post._count.likes,
    comments: data.post._count.comments,
    shares: data.post._count.shares,
  };
}

export async function fetchProfile(accessToken: string) {
  const { data } = await api.get<ProfileResponse>("/profile/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data.profile ? mapProfile(data.profile) : null;
}

export async function fetchDiscover() {
  const { data } = await api.get<DiscoverResponse>("/discover");
  return data;
}

export async function fetchAdminDashboard(accessToken: string) {
  const { data } = await api.get<AdminDashboardResponse>("/admin/dashboard", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data.metrics;
}

export async function fetchAdminReports(accessToken: string) {
  const { data } = await api.get<AdminReportsResponse>("/admin/reports", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data.reports;
}

export async function updateReportStatus(input: {
  accessToken: string;
  reportId: string;
  status: "REVIEWING" | "RESOLVED" | "REJECTED";
}) {
  const { data } = await api.patch<{ report: AdminReportsResponse["reports"][number] }>(
    `/admin/reports/${input.reportId}`,
    { status: input.status },
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );

  return data.report;
}

export async function fetchConversations(accessToken: string) {
  const { data } = await api.get<ConversationsResponse>("/inbox/conversations", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data.conversations;
}

export async function fetchMessages(accessToken: string, conversationId: string) {
  const { data } = await api.get<MessagesResponse>(
    `/inbox/conversations/${conversationId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return data.messages;
}

export async function sendMessage(input: {
  accessToken: string;
  conversationId: string;
  text: string;
}) {
  const { data } = await api.post<{ message: MessagesResponse["messages"][number] }>(
    `/inbox/conversations/${input.conversationId}/messages`,
    { text: input.text },
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );

  return data.message;
}

function mapProfile(profile: NonNullable<ProfileResponse["profile"]>): SessionProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    username: `@${profile.username}`,
    bio: profile.bio ?? "Welcome to FaceMe.",
    location: profile.location ?? "Unknown",
    role: profile.role,
  };
}

function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.floor(hours / 24)}d`;
}
