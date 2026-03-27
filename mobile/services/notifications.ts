import { NotificationResponse } from "@/types/api";
import { api } from "./api";

export const notificationService = {
  async getNotifications() {
    const { data } = await api.get<NotificationResponse>("/notifications");
    return data;
  },
  async markRead(notificationId: string) {
    const { data } = await api.patch(`/notifications/${notificationId}/read`);
    return data;
  },
};
