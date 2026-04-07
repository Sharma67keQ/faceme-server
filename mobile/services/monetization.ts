import { GiftCatalogResponse, RoomGiftSnapshotResponse, WalletSummaryResponse } from "@/types/api";
import { api } from "./api";

export const monetizationService = {
  async getWallet() {
    const { data } = await api.get<WalletSummaryResponse>("/monetization/wallet");
    return data;
  },
  async getGiftCatalog() {
    const { data } = await api.get<GiftCatalogResponse>("/monetization/gift-catalog");
    return data;
  },
  async createTopUpIntent(payload: {
    provider?: "MANUAL_REVIEW" | "CARD" | "MOBILE_MONEY" | "APP_STORE";
    coinsAmount: number;
    currency?: string;
    fiatAmount?: number;
  }) {
    const { data } = await api.post("/monetization/payment-intents/top-up", payload);
    return data;
  },
  async getRoomGiftSnapshot(roomId: string) {
    const { data } = await api.get<RoomGiftSnapshotResponse>(`/voice-rooms/${roomId}/gifts`);
    return data;
  },
  async sendRoomGift(
    roomId: string,
    payload: {
      giftId: string;
      quantity?: number;
      receiverId?: string;
      clientRequestId: string;
      message?: string;
    },
  ) {
    const { data } = await api.post(`/voice-rooms/${roomId}/gifts`, payload);
    return data as {
      wallet: {
        balanceCoins: number;
        heldCoins: number;
      };
      event: RoomGiftSnapshotResponse["recentEvents"][number];
    };
  },
};
