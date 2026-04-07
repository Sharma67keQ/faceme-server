import { StatusCodes } from "http-status-codes";
import { AccessToken } from "livekit-server-sdk";
import type { ParticipantInfo, TrackInfo, TrackSource } from "@livekit/protocol";
import { env } from "../lib/env.js";
import { isLiveKitConfigured, liveKitRoomClient } from "../lib/livekit.js";
import { prisma } from "../lib/prisma.js";
import { emitRealtime, emitRealtimeToRoom, emitRealtimeToUser } from "../lib/realtime.js";
import { ApiError } from "../utils/api-error.js";

const userSelect = {
  id: true,
  username: true,
  firstName: true,
  avatarUrl: true,
} as const;

const roomInclude = {
  host: {
    select: userSelect,
  },
  participants: {
    include: {
      user: {
        select: userSelect,
      },
    },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
  },
} as const;

type RoomPrivacy = "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY";
type RoomTheme = "SUNSET" | "AURORA" | "LOUNGE" | "PARTY";
type ParticipantRole = "OWNER" | "ADMIN" | "MEMBER";
type ParticipantState = "LISTENING" | "SPEAKING" | "MUTED";
type RoomRecord = Awaited<ReturnType<typeof prisma.voiceRoom.findUniqueOrThrow>>;

const getRoomName = (roomId: string) => roomId;

const getLiveKitClient = () => {
  if (!liveKitRoomClient) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Live voice transport is not configured");
  }

  return liveKitRoomClient;
};

const getMicrophoneTrack = (participant?: ParticipantInfo | null) =>
  participant?.tracks.find((track: TrackInfo) => track.source === 2 as TrackSource) ?? null;

const buildRoomMetadata = (room: any) =>
  JSON.stringify({
    roomId: room.id,
    title: room.title,
    description: room.description ?? room.topic ?? null,
    privacy: room.privacy,
    theme: room.theme,
    ownerId: room.hostId,
    status: room.status,
  });

const syncLiveKitRoom = async (room: any) => {
  if (!isLiveKitConfigured()) {
    return;
  }

  const client = getLiveKitClient();

  try {
    await client.createRoom({
      name: getRoomName(room.id),
      departureTimeout: 120,
      emptyTimeout: 10,
      maxParticipants: 100,
      metadata: buildRoomMetadata(room),
    });
  } catch {
    await client.updateRoomMetadata(getRoomName(room.id), buildRoomMetadata(room));
  }
};

const deleteLiveKitRoom = async (roomId: string) => {
  if (!isLiveKitConfigured()) {
    return;
  }

  try {
    await getLiveKitClient().deleteRoom(getRoomName(roomId));
  } catch {
    // The room may already be gone in LiveKit. That should not block ending it in Faceme.
  }
};

const emitRoomRealtime = (roomId: string, payload: Record<string, unknown>) => {
  emitRealtime("voice-rooms:changed", payload);
  emitRealtimeToRoom(`voice-room:${roomId}`, "voice-room:changed", payload);
};

const listLiveParticipants = async (roomId: string) => {
  if (!isLiveKitConfigured()) {
    return new Map<string, ParticipantInfo>();
  }

  try {
    const participants = await getLiveKitClient().listParticipants(getRoomName(roomId));
    return new Map(participants.map((participant) => [participant.identity, participant]));
  } catch {
    return new Map<string, ParticipantInfo>();
  }
};

const syncLiveParticipantPermissions = async (
  roomId: string,
  participant: {
    userId: string;
    role: ParticipantRole;
    isMutedByModerator: boolean;
    user: {
      firstName?: string | null;
      username: string;
    };
  },
) => {
  if (!isLiveKitConfigured()) {
    return;
  }

  try {
    await getLiveKitClient().updateParticipant(getRoomName(roomId), participant.userId, {
      name: participant.user.firstName ?? participant.user.username,
      metadata: JSON.stringify({
        roomId,
        role: participant.role,
        isMutedByModerator: participant.isMutedByModerator,
      }),
      attributes: {
        facemeRoomId: roomId,
        facemeRole: participant.role,
        facemeMutedByModerator: String(participant.isMutedByModerator),
      },
      permission: {
        canSubscribe: true,
        canPublish: !participant.isMutedByModerator,
        canPublishData: true,
        hidden: false,
      },
    });
  } catch {
    // If the participant is not currently connected to LiveKit, there is nothing to update yet.
  }
};

const removeLiveParticipant = async (roomId: string, userId: string) => {
  if (!isLiveKitConfigured()) {
    return;
  }

  try {
    await getLiveKitClient().removeParticipant(getRoomName(roomId), userId);
  } catch {
    // Removing a participant that is already disconnected should be treated as a no-op.
  }
};

const canAccessRoom = async (
  viewerId: string,
  room: {
    id: string;
    hostId: string;
    privacy: RoomPrivacy;
    participants?: Array<{ userId: string }>;
  },
) => {
  if (viewerId === room.hostId || room.privacy === "PUBLIC") {
    return true;
  }

  if (room.participants?.some((participant) => participant.userId === viewerId)) {
    return true;
  }

  if (room.privacy === "FOLLOWERS") {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: room.hostId,
        },
      },
    });

    return Boolean(follow);
  }

  if (room.privacy === "FRIENDS") {
    const friendship = await prisma.friendship.findFirst({
      where: {
        userId: viewerId,
        friendId: room.hostId,
      },
    });

    return Boolean(friendship);
  }

  return false;
};

const serializeRoom = async (room: any, viewerId: string) => {
  const liveParticipants = await listLiveParticipants(room.id);
  const viewerParticipant = room.participants.find((participant: any) => participant.userId === viewerId) ?? null;
  const viewerRole = viewerParticipant?.role ?? null;
  const isOwner = viewerRole === "OWNER";
  const isAdmin = viewerRole === "ADMIN";

  const participants = room.participants.map((participant: any) => {
    const liveParticipant = liveParticipants.get(participant.userId);
    const microphoneTrack = getMicrophoneTrack(liveParticipant);
    const liveState: ParticipantState | null =
      participant.isMutedByModerator || microphoneTrack?.muted
        ? "MUTED"
        : liveParticipant?.isPublisher
          ? "SPEAKING"
          : liveParticipant
            ? "LISTENING"
            : null;

    return {
      ...participant,
      state: liveState ?? participant.state,
      isConnected: Boolean(liveParticipant),
      isSpeakingLive: Boolean(liveParticipant?.isPublisher && microphoneTrack && !microphoneTrack.muted),
      isMicEnabled: Boolean(microphoneTrack && !microphoneTrack.muted && !participant.isMutedByModerator),
      isMutedByModerator: participant.isMutedByModerator,
      canBeRemoved:
        (isOwner && participant.role !== "OWNER" && participant.userId !== viewerId) ||
        (isAdmin && participant.role === "MEMBER" && participant.userId !== viewerId),
      canPromote: isOwner && participant.role === "MEMBER" && participant.userId !== viewerId,
      canDemote: isOwner && participant.role === "ADMIN" && participant.userId !== viewerId,
      canMute:
        (isOwner && participant.role !== "OWNER" && participant.userId !== viewerId) ||
        (isAdmin && participant.role === "MEMBER" && participant.userId !== viewerId),
      canUnmute:
        participant.isMutedByModerator &&
        ((isOwner && participant.role !== "OWNER" && participant.userId !== viewerId) ||
          (isAdmin && participant.role === "MEMBER" && participant.userId !== viewerId)),
    };
  });

  return {
    ...room,
    participantsCount: liveParticipants.size || participants.length,
    owner: room.host,
    viewerRole,
    canJoin: room.status === "LIVE" && !viewerParticipant,
    canEdit: isOwner,
    canModerate: isOwner || isAdmin,
    participants,
  };
};

const getParticipant = async (roomId: string, userId: string) =>
  prisma.voiceParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    include: {
      user: {
        select: userSelect,
      },
    },
  });

const requireRoomAccess = async (viewerId: string, roomId: string) => {
  const room = await prisma.voiceRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: roomInclude,
  });

  const hasAccess = await canAccessRoom(viewerId, room);

  if (!hasAccess) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have access to this room");
  }

  return room;
};

const requireModerationRights = async (actorId: string, roomId: string) => {
  const room = await prisma.voiceRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: roomInclude,
  });
  const actorParticipant = room.participants.find((participant: any) => participant.userId === actorId);

  if (!actorParticipant || (actorParticipant.role !== "OWNER" && actorParticipant.role !== "ADMIN")) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have moderation access for this room");
  }

  return { room, actorParticipant };
};

export const voiceRoomService = {
  async list(userId: string) {
    const rooms = await prisma.voiceRoom.findMany({
      include: roomInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
    });

    const visibleRooms = [];

    for (const room of rooms) {
      if (await canAccessRoom(userId, room)) {
        visibleRooms.push(await serializeRoom(room, userId));
      }
    }

    return visibleRooms;
  },

  async getById(userId: string, roomId: string) {
    const room = await requireRoomAccess(userId, roomId);
    return serializeRoom(room, userId);
  },

  async create(
    userId: string,
    payload: {
      title: string;
      topic?: string;
      description?: string;
      privacy?: RoomPrivacy;
      theme?: RoomTheme;
    },
  ) {
    const room = await prisma.voiceRoom.create({
      data: {
        hostId: userId,
        title: payload.title,
        topic: payload.topic,
        description: payload.description,
        theme: payload.theme ?? "SUNSET",
        privacy: payload.privacy ?? "PUBLIC",
        participants: {
          create: {
            userId,
            role: "OWNER",
            state: "LISTENING",
          },
        },
      },
      include: roomInclude,
    });

    await syncLiveKitRoom(room);
    emitRoomRealtime(room.id, { reason: "room_created", roomId: room.id, actorId: userId });
    return serializeRoom(room, userId);
  },

  async updateRoom(
    userId: string,
    roomId: string,
    payload: {
      title?: string;
      topic?: string | null;
      description?: string | null;
      privacy?: RoomPrivacy;
      theme?: RoomTheme;
    },
  ) {
    const participant = await getParticipant(roomId, userId);

    if (participant?.role !== "OWNER") {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the room owner can edit room settings");
    }

    const room = await prisma.voiceRoom.update({
      where: { id: roomId },
      data: {
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.topic !== undefined ? { topic: payload.topic } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.privacy ? { privacy: payload.privacy } : {}),
        ...(payload.theme ? { theme: payload.theme } : {}),
      },
      include: roomInclude,
    });

    await syncLiveKitRoom(room);
    emitRoomRealtime(room.id, { reason: "room_updated", roomId: room.id, actorId: userId });
    return serializeRoom(room, userId);
  },

  async join(userId: string, roomId: string) {
    const room = await requireRoomAccess(userId, roomId);

    if (room.status !== "LIVE") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This room has already ended");
    }

    const participant = await prisma.voiceParticipant.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      update: {
        state: "LISTENING",
      },
      create: {
        roomId,
        userId,
        role: "MEMBER",
        state: "LISTENING",
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    await syncLiveParticipantPermissions(roomId, participant);

    if (room.hostId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: room.hostId,
          actorId: userId,
          type: "VOICE_ROOM_ACTIVITY",
          title: "Someone joined your voice room",
          entityType: "voice-room",
          entityId: roomId,
        },
      });
      emitRealtimeToUser(room.hostId, "notifications:changed", { reason: "voice_room_joined", entityId: roomId });
    }

    emitRoomRealtime(roomId, { reason: "participant_joined", roomId, actorId: userId });
    return this.getById(userId, roomId);
  },

  async leave(userId: string, roomId: string) {
    const participant = await getParticipant(roomId, userId);

    if (!participant) {
      return { left: true };
    }

    await removeLiveParticipant(roomId, userId);

    if (participant.role === "OWNER") {
      await prisma.voiceRoom.update({
        where: { id: roomId },
        data: {
          status: "ENDED",
          isLive: false,
          endedAt: new Date(),
        },
      });
      await deleteLiveKitRoom(roomId);
      emitRoomRealtime(roomId, { reason: "room_ended", roomId, actorId: userId });

      return { left: true, roomEnded: true };
    }

    await prisma.voiceParticipant.delete({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    emitRoomRealtime(roomId, { reason: "participant_left", roomId, actorId: userId });
    return { left: true };
  },

  async setParticipantState(userId: string, roomId: string, state: ParticipantState) {
    const participant = await getParticipant(roomId, userId);

    if (!participant) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Join the room before updating your state");
    }

    if (participant.isMutedByModerator && state !== "MUTED") {
      throw new ApiError(StatusCodes.FORBIDDEN, "A moderator has muted your microphone");
    }

    const updated = await prisma.voiceParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      data: {
        state,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    await syncLiveParticipantPermissions(roomId, updated);
    emitRoomRealtime(roomId, { reason: "participant_state_changed", roomId, actorId: userId });
    return updated;
  },

  async setParticipantRole(userId: string, roomId: string, participantUserId: string, role: "ADMIN" | "MEMBER") {
    const actor = await getParticipant(roomId, userId);

    if (actor?.role !== "OWNER") {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can change room roles");
    }

    const participant = await getParticipant(roomId, participantUserId);

    if (!participant) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Participant not found");
    }

    if (participant.role === "OWNER") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "The owner role cannot be reassigned here");
    }

    const updated = await prisma.voiceParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId: participantUserId,
        },
      },
      data: {
        role,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    await syncLiveParticipantPermissions(roomId, updated);
    emitRoomRealtime(roomId, { reason: "participant_role_changed", roomId, actorId: userId, targetUserId: participantUserId });
    return updated;
  },

  async setParticipantModeration(userId: string, roomId: string, participantUserId: string, muted: boolean) {
    const { room, actorParticipant } = await requireModerationRights(userId, roomId);
    const participant = room.participants.find((entry: any) => entry.userId === participantUserId);

    if (!participant) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Participant not found");
    }

    if (participant.role === "OWNER") {
      throw new ApiError(StatusCodes.FORBIDDEN, "The owner cannot be moderated by room staff");
    }

    if (actorParticipant.role === "ADMIN" && participant.role !== "MEMBER") {
      throw new ApiError(StatusCodes.FORBIDDEN, "Admins can only moderate members");
    }

    const updated = await prisma.voiceParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId: participantUserId,
        },
      },
      data: {
        isMutedByModerator: muted,
        state: muted ? "MUTED" : "LISTENING",
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    await syncLiveParticipantPermissions(roomId, updated);
    emitRoomRealtime(roomId, { reason: muted ? "participant_muted" : "participant_unmuted", roomId, actorId: userId, targetUserId: participantUserId });
    return updated;
  },

  async removeParticipant(userId: string, roomId: string, participantUserId: string) {
    const { room, actorParticipant } = await requireModerationRights(userId, roomId);
    const participant = room.participants.find((entry: any) => entry.userId === participantUserId);

    if (!participant) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Participant not found");
    }

    if (participant.role === "OWNER") {
      throw new ApiError(StatusCodes.FORBIDDEN, "The owner cannot be removed from the room");
    }

    if (actorParticipant.role === "ADMIN" && participant.role !== "MEMBER") {
      throw new ApiError(StatusCodes.FORBIDDEN, "Admins can only remove members");
    }

    await prisma.voiceParticipant.delete({
      where: {
        roomId_userId: {
          roomId,
          userId: participantUserId,
        },
      },
    });
    await removeLiveParticipant(roomId, participantUserId);

    emitRoomRealtime(roomId, { reason: "participant_removed", roomId, actorId: userId, targetUserId: participantUserId });
    return { removed: true };
  },

  async endRoom(userId: string, roomId: string) {
    const participant = await getParticipant(roomId, userId);

    if (participant?.role !== "OWNER") {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can end the room");
    }

    const room = await prisma.voiceRoom.update({
      where: { id: roomId },
      data: {
        status: "ENDED",
        isLive: false,
        endedAt: new Date(),
      },
      include: roomInclude,
    });

    await deleteLiveKitRoom(roomId);
    emitRoomRealtime(roomId, { reason: "room_ended", roomId, actorId: userId });
    return serializeRoom(room, userId);
  },

  async issueAudioToken(userId: string, roomId: string) {
    if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
      throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Live voice transport is not configured");
    }

    let room = await requireRoomAccess(userId, roomId);

    if (room.status !== "LIVE") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This room is no longer live");
    }

    let participant = room.participants.find((entry: any) => entry.userId === userId);

    if (!participant) {
      await this.join(userId, roomId);
      room = await requireRoomAccess(userId, roomId);
      participant = room.participants.find((entry: any) => entry.userId === userId);
    }

    if (!participant) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Unable to attach you to the voice room");
    }

    await syncLiveKitRoom(room);

    const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: userId,
      name: participant.user.firstName ?? participant.user.username ?? room.host.firstName ?? "Faceme user",
      ttl: "2h",
      metadata: JSON.stringify({
        roomId,
        role: participant.role,
        isMutedByModerator: participant.isMutedByModerator,
      }),
      attributes: {
        facemeRoomId: roomId,
        facemeRole: participant.role,
        facemeMutedByModerator: String(participant.isMutedByModerator),
      },
    });

    accessToken.addGrant({
      roomJoin: true,
      room: getRoomName(roomId),
      canPublish: !participant.isMutedByModerator,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: participant.role === "OWNER" || participant.role === "ADMIN",
    });

    return {
      serverUrl: env.LIVEKIT_URL,
      token: await accessToken.toJwt(),
      roomName: getRoomName(roomId),
    };
  },
};
