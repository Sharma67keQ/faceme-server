import { create } from "zustand";
import { authService } from "@/services/auth";
import { registerAuthSessionHandlers } from "@/services/auth-session";
import { chatService } from "@/services/chat";
import { tokenStorage } from "@/utils/storage";
import { User } from "@/types/domain";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isHydrated: boolean;
  isRefreshing: boolean;
  setUser: (user: User) => void;
  setSession: (payload: { user: User; accessToken: string }) => void;
  refreshSession: () => Promise<string | null>;
  clearSession: () => Promise<void>;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: {
    email: string;
    username: string;
    password: string;
    firstName: string;
  }) => Promise<void>;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,
  isRefreshing: false,
  setUser(user) {
    set({ user });
  },
  setSession({ user, accessToken }) {
    set({ user, accessToken, isHydrated: true });
  },
  async signIn(payload) {
    const result = await authService.login(payload);
    await tokenStorage.setTokens(result.accessToken, result.refreshToken);
    set({ user: result.user, accessToken: result.accessToken, isHydrated: true });
  },
  async signUp(payload) {
    const result = await authService.register(payload);
    await tokenStorage.setTokens(result.accessToken, result.refreshToken);
    set({ user: result.user, accessToken: result.accessToken, isHydrated: true });
  },
  async hydrate() {
    try {
      const accessToken = await tokenStorage.getAccessToken();

      if (!accessToken) {
        set({ isHydrated: true });
        return;
      }

      try {
        const user = await authService.fetchMe();
        set({ user, accessToken, isHydrated: true });
      } catch {
        const nextAccessToken = await useAuthStore.getState().refreshSession();

        if (!nextAccessToken) {
          await useAuthStore.getState().clearSession();
          set({ isHydrated: true });
          return;
        }

        try {
          const user = await authService.fetchMe();
          set({ user, accessToken: nextAccessToken, isHydrated: true });
        } catch {
          await useAuthStore.getState().clearSession();
          set({ isHydrated: true });
        }
      }
    } catch {
      await useAuthStore.getState().clearSession();
      set({ isHydrated: true });
    }
  },
  async refreshSession() {
    const state = useAuthStore.getState();

    if (state.isRefreshing) {
      return new Promise((resolve) => {
        const poll = async () => {
          const nextState = useAuthStore.getState();

          if (!nextState.isRefreshing) {
            resolve(nextState.accessToken);
            return;
          }

          setTimeout(poll, 100);
        };

        void poll();
      });
    }

    const refreshToken = await tokenStorage.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    set({ isRefreshing: true });

    try {
      const result = await authService.refresh(refreshToken);
      await tokenStorage.setTokens(result.accessToken, result.refreshToken);
      set({ accessToken: result.accessToken, isRefreshing: false });
      return result.accessToken;
    } catch {
      await useAuthStore.getState().clearSession();
      set({ isRefreshing: false });
      return null;
    }
  },
  async clearSession() {
    chatService.disconnect();
    await tokenStorage.clear();
    set({ user: null, accessToken: null, isRefreshing: false });
  },
  async signOut() {
    const refreshToken = await tokenStorage.getRefreshToken();

    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Local sign-out should still complete if the session is already invalid server-side.
    } finally {
      await useAuthStore.getState().clearSession();
    }

    set({ isHydrated: true });
  },
}));

registerAuthSessionHandlers({
  refreshSession: () => useAuthStore.getState().refreshSession(),
  clearSession: () => useAuthStore.getState().clearSession(),
});
