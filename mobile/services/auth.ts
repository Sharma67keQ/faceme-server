import { api } from "./api";
import { AuthResponse } from "@/types/api";
import { User } from "@/types/domain";

export const authService = {
  async register(payload: {
    email: string;
    username: string;
    password: string;
    firstName: string;
  }) {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    return data;
  },
  async login(payload: { email: string; password: string }) {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    return data;
  },
  async fetchMe() {
    const { data } = await api.get<User>("/users/me");
    return data;
  },
  async refresh(refreshToken: string) {
    const { data } = await api.post<Pick<AuthResponse, "accessToken" | "refreshToken">>("/auth/refresh", {
      refreshToken,
    });
    return data;
  },
  async logout(refreshToken: string) {
    await api.post("/auth/logout", { refreshToken });
  },
};
