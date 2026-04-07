import axios from "axios";
import { AxiosError, InternalAxiosRequestConfig } from "axios";
import { authSession } from "@/services/auth-session";
import { runtimeConfig } from "@/services/runtime-config";
import { tokenStorage } from "@/utils/storage";

export const api = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    console.error("API request failed", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    const status = error.response?.status;
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      throw error;
    }

    if (originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/register")) {
      throw error;
    }

    if (originalRequest.url?.includes("/auth/refresh")) {
      await authSession.clearSession();
      throw error;
    }

    originalRequest._retry = true;

    const nextAccessToken = await authSession.refreshSession();

    if (!nextAccessToken) {
      throw error;
    }

    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return api(originalRequest);
  },
);
