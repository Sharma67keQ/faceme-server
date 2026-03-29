import { RoomServiceClient } from "livekit-server-sdk";
import { env } from "./env.js";

const createLiveKitRoomClient = () => {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return null;
  }

  return new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
};

export const liveKitRoomClient = createLiveKitRoomClient();

export const isLiveKitConfigured = () => Boolean(liveKitRoomClient);
