import { prisma } from "../lib/prisma.js";

const userSelect = {
  id: true,
  username: true,
  firstName: true,
  avatarUrl: true,
} as const;

export const voiceRoomService = {
  async list() {
    const rooms = await prisma.voiceRoom.findMany({
      include: {
        host: {
          select: userSelect,
        },
        participants: {
          include: {
            user: {
              select: userSelect,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    });

    return rooms.map((room: any) => ({
      ...room,
      participantsCount: room.participants.length,
    }));
  },

  async create(userId: string, payload: { title: string; topic?: string }) {
    return prisma.voiceRoom.create({
      data: {
        hostId: userId,
        title: payload.title,
        topic: payload.topic,
        participants: {
          create: {
            userId,
            state: "SPEAKING",
          },
        },
      },
      include: {
        host: {
          select: userSelect,
        },
        participants: {
          include: {
            user: {
              select: userSelect,
            },
          },
        },
      },
    });
  },

  async join(userId: string, roomId: string) {
    const room = await prisma.voiceRoom.findUniqueOrThrow({
      where: { id: roomId },
      select: { hostId: true },
    });

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
        state: "LISTENING",
      },
    });

    await prisma.voiceRoom.update({
      where: { id: roomId },
      data: {
        isLive: true,
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

    return participant;
  },

  async leave(userId: string, roomId: string) {
    const room = await prisma.voiceRoom.findUnique({
      where: { id: roomId },
      select: {
        hostId: true,
      },
    });

    await prisma.voiceParticipant.deleteMany({
      where: {
        roomId,
        userId,
      },
    });

    const remainingParticipants = await prisma.voiceParticipant.count({
      where: { roomId },
    });

    if (room?.hostId === userId || remainingParticipants === 0) {
      await prisma.voiceRoom.update({
        where: { id: roomId },
        data: {
          isLive: remainingParticipants > 0,
        },
      });
    }

    return { left: true };
  },
};
