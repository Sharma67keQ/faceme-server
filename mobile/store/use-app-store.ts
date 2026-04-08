import { create } from "zustand";
import {
  demoActivities,
  demoConversations,
  demoStories,
  type DemoActivity,
  type DemoConversation,
  type DemoStory,
} from "@/data/demo-data";
import type { AppLanguage } from "@/lib/i18n";

export type AppTab = "home" | "discover" | "inbox" | "profile";

export type SessionProfile = {
  id?: string;
  name: string;
  username: string;
  bio: string;
  location: string;
  email?: string;
  role?: "USER" | "MODERATOR" | "ADMIN";
};

export type FeedPost = {
  id: string;
  author: string;
  handle: string;
  age: string;
  body: string;
  mood: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
};

type AppState = {
  activeTab: AppTab;
  profile: SessionProfile;
  accessToken: string | null;
  language: AppLanguage;
  hasEntered: boolean;
  likedPostIds: string[];
  savedPostIds: string[];
  stories: DemoStory[];
  posts: FeedPost[];
  conversations: DemoConversation[];
  activities: DemoActivity[];
  setActiveTab: (tab: AppTab) => void;
  setLanguage: (language: AppLanguage) => void;
  setSession: (input: { accessToken: string; profile: SessionProfile }) => void;
  setPosts: (posts: FeedPost[]) => void;
  setProfile: (profile: Partial<SessionProfile>) => void;
  logout: () => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
};

const defaultProfile: SessionProfile = {
  name: "Guest User",
  username: "@guest",
  bio: "New to FaceMe.",
  location: "Johannesburg",
};

export const useAppStore = create<AppState>((set) => ({
  activeTab: "home",
  profile: defaultProfile,
  accessToken: null,
  language: "so",
  hasEntered: false,
  likedPostIds: [],
  savedPostIds: [],
  stories: demoStories,
  posts: [],
  conversations: demoConversations,
  activities: demoActivities,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLanguage: (language) => set({ language }),
  setSession: ({ accessToken, profile }) =>
    set({
      accessToken,
      profile,
      hasEntered: true,
    }),
  setPosts: (posts) => set({ posts }),
  setProfile: (profile) =>
    set((state) => ({
      profile: {
        ...state.profile,
        ...profile,
      },
    })),
  logout: () =>
    set({
      accessToken: null,
      hasEntered: false,
      activeTab: "home",
      posts: [],
      likedPostIds: [],
      savedPostIds: [],
      profile: defaultProfile,
    }),
  toggleLike: (postId) =>
    set((state) => ({
      likedPostIds: state.likedPostIds.includes(postId)
        ? state.likedPostIds.filter((id) => id !== postId)
        : [...state.likedPostIds, postId],
    })),
  toggleSave: (postId) =>
    set((state) => ({
      savedPostIds: state.savedPostIds.includes(postId)
        ? state.savedPostIds.filter((id) => id !== postId)
        : [...state.savedPostIds, postId],
    })),
}));
