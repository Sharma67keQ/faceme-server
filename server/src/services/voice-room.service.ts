import { StatusCodes } from "http-status-codes";
import { AccessToken } from "livekit-server-sdk";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
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

const canAccessRoom = async (
  viewerId: string,
  ownerId: string,
  privacy: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY",
) => {
  if (viewerId === ownerId || privacy === "PUBLIC") {
    return true;
  }

  if (privacy === "FOLLOWERS") {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: ownerId,
        },
      },
    });

    return Boolean(follow);
  }

  if (privacy === "FRIENDS") {
    const friendship = await prisma.friendship.findFirst({
      where: {
        userId: viewerId,
        friendId: ownerId,
      },
    });

    return Boolean(friendship);
  }

  return false;
};

const serializeRoom = (room: any, viewerId: string) => {
  const viewerParticipant = room.participants.find((participant: any) => participant.userId === viewerId) ?? null;
  const viewerRole = viewerParticipant?.role ?? null;
  const isOwner = viewerRole === "OWNER";
  const isAdmin = viewerRole === "ADMIN";

  return {
    ...room,
    participantsCount: room.participants.length,
    owner: room.host,
    viewerRole,
    canJoin: room.status === "LIVE" && !viewerParticipant,
    canEdit: isOwner,
    canModerate: isOwner || isAdmin,
    participants: room.participants.map((participant: any) => ({
      ...participant,
      canBeRemoved:
        (isOwner && participant.role !== "OWNER" && participant.userId !== viewerId) ||
        (isAdmin && participant.role === "MEMBER" && participant.userId !== viewerId),
      canPromote:
        isOwner && participant.role === "MEMBER" && participant.userId !== viewerId,
      canDemote:
        isOwner && participant.role === "ADMIN" && participant.userId !== viewerId,
    })),
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
  });

const requireRoomAccess = async (viewerId: string, roomId: string) => {
  const room = await prisma.voiceRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: roomInclude,
  });

  const hasAccess = await canAccessRoom(viewerId, room.hostId, room.privacy);

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
      if (await canAccessRoom(userId, room.hostId, room.privacy)) {
        visibleRooms.push(serializeRoom(room, userId));
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
      privacy?: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY";
      theme?: "SUNSET" | "AURORA" | "LOUNGE" | "PARTY";
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
            state: "SPEAKING",
          },
        },
      },
      include: roomInclude,
    });

    return serializeRoom(room, userId);
  },

  async updateRoom(
    userId: string,
    roomId: string,
    payload: {
      title?: string;
      topic?: string | null;
      description?: string | null;
      privacy?: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY";
      theme?: "SUNSET" | "AURORA" | "LOUNGE" | "PARTY";
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

    return serializeRoom(room, userId);
  },

  async join(userId: string, roomId: string) {
    const room = await requireRoomAccess(userId, roomId);

    if (room.status !== "LIVE") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This room has already ended");
    }

    await prisma.voiceParticipant.upsert({
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
    });

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
    }

    return this.getById(userId, roomId);
  },

  async leave(userId: string, roomId: string) {
    const participant = await getParticipant(roomId, userId);

    if (!participant) {
      return { left: true };
    }

    if (participant.role === "OWNER") {
      await prisma.voiceRoom.update({
        where: { id: roomId },
        data: {
          status: "ENDED",
          isLive: false,
          endedAt: new Date(),
        },
      });

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

    return { left: true };
  },

  async setParticipantState(userId: string, roomId: string, state: "LISTENING" | "SPEAKING" | "MUTED") {
    const participant = await getParticipant(roomId, userId);

    if (!participant) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Join the room before updating your state");
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
    });

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

    return prisma.voiceParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId: participantUserId,
        },
      },
      data: {
        role,
      },
    });
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

    return serializeRoom(room, userId);
  },

  async issueAudioToken(userId: string, roomId: string) {
    if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
      throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Live voice transport is not configured");
    }

    const room = await requireRoomAccess(userId, roomId);

    if (room.status !== "LIVE") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This room is no longer live");
    }

    const participant = room.participants.find((entry: any) => entry.userId === userId);

    if (!participant) {
      await this.join(userId, roomId);
    }

    const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: userId,
      name: room.participants.find((entry: any) => entry.userId === userId)?.user.firstName ?? room.host.firstName ?? "Faceme user",
      ttl: "2h",
      metadata: JSON.stringify({
        roomId,
        role: participant?.role ?? "MEMBER",
      }),
      attributes: {
        facemeRoomId: roomId,
        facemeRole: participant?.role ?? "MEMBER",
      },
    });

    accessToken.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: participant?.role === "OWNER" || participant?.role === "ADMIN",
    });

    return {
      serverUrl: env.LIVEKIT_URL,
      token: await accessToken.toJwt(),
      roomName: roomId,
    };
  },
};
