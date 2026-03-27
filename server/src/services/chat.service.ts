import { PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";

const conversationListInclude = {
  participants: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          avatarUrl: true,
          presenceStatus: true,
        },
      },
    },
  },
  lastMessage: {
    select: {
      id: true,
      text: true,
      mediaUrl: true,
      type: true,
      createdAt: true,
      senderId: true,
    },
  },
} as const;

export const chatService = {
  async getOrCreateDirectConversation(userId: string, peerId: string) {
    const existing = await prisma.conversation.findMany({
      where: {
        type: "DIRECT",
        participants: {
          some: { userId },
        },
      },
      include: conversationListInclude,
    });

    const matchedConversation = existing.find((conversation: (typeof existing)[number]) => {
      const participantIds = conversation.participants.map(
        (participant: (typeof conversation.participants)[number]) => participant.userId,
      );
      return participantIds.length === 2 && participantIds.includes(userId) && participantIds.includes(peerId);
    });

    if (matchedConversation) {
      return matchedConversation;
    }

    return prisma.conversation.create({
      data: {
        type: "DIRECT",
        participants: {
          create: [{ userId }, { userId: peerId }],
        },
      },
      include: conversationListInclude,
    });
  },

  listConversations(userId: string) {
    return prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      include: conversationListInclude,
    }).then(async (conversations: any[]) => {
      const unreadCounts = await prisma.messageStatus.groupBy({
        by: ["messageId"],
        where: {
          userId,
          status: {
            in: ["SENT", "DELIVERED"],
          },
          message: {
            senderId: {
              not: userId,
            },
            conversationId: {
              in: conversations.map((conversation: any) => conversation.id),
            },
          },
        },
        _count: {
          messageId: true,
        },
      });

      const messageIds = unreadCounts.map((item: any) => item.messageId);
      const messages = messageIds.length
        ? await prisma.message.findMany({
            where: {
              id: {
                in: messageIds,
              },
            },
            select: {
              id: true,
              conversationId: true,
            },
          })
        : [];

      const unreadByConversation = new Map<string, number>();

      messages.forEach((message: any) => {
        unreadByConversation.set(
          message.conversationId,
          (unreadByConversation.get(message.conversationId) ?? 0) + 1,
        );
      });

      return conversations.map((conversation: any) => ({
        ...conversation,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
      }));
    });
  },

  createGroupConversation(userId: string, payload: { title: string; participantIds: string[] }) {
    const participantIds = [...new Set([userId, ...payload.participantIds])];

    return prisma.conversation.create({
      data: {
        type: "GROUP",
        title: payload.title,
        participants: {
          create: participantIds.map((participantId) => ({
            userId: participantId,
            role: participantId === userId ? "OWNER" : "MEMBER",
          })),
        },
      },
      include: conversationListInclude,
    });
  },

  async getMessages(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);

    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    await prisma.messageStatus.updateMany({
      where: {
        userId,
        status: {
          in: ["SENT", "DELIVERED"],
        },
        message: {
          conversationId,
          senderId: {
            not: userId,
          },
        },
      },
      data: {
        status: "SEEN",
      },
    });

    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatarUrl: true,
          },
        },
        statuses: {
          where: {
            userId,
          },
          select: {
            status: true,
          },
          take: 1,
        },
      },
    });
  },

  async createMessage(
    db: PrismaClient,
    userId: string,
    conversationId: string,
    payload: {
      text?: string;
      mediaUrl?: string;
      type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
      replyToMessageId?: string;
    },
  ) {
    await this.ensureParticipant(userId, conversationId);

    const message = await db.message.create({
      data: {
        conversationId,
        senderId: userId,
        text: payload.text,
        mediaUrl: payload.mediaUrl,
        type: payload.type ?? (payload.mediaUrl ? "IMAGE" : "TEXT"),
        mediaType:
          payload.type === "AUDIO"
            ? "AUDIO"
            : payload.type === "VIDEO"
              ? "VIDEO"
              : payload.mediaUrl
                ? "IMAGE"
                : undefined,
        replyToMessageId: payload.replyToMessageId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      },
    });

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { participants: { select: { userId: true } } },
    });

    const participants =
      conversation?.participants ?? (await db.conversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      }));

    await db.messageStatus.createMany({
      data: participants.map((participant: (typeof participants)[number]) => ({
        messageId: message.id,
        userId: participant.userId,
        status: participant.userId === userId ? "SEEN" : "SENT",
      })),
    });

    const recipientIds = participants
      .map((participant: (typeof participants)[number]) => participant.userId)
      .filter((participantId: string) => participantId !== userId);

    if (recipientIds.length) {
      await db.notification.createMany({
        data: recipientIds.map((recipientId: string) => ({
          recipientId,
          actorId: userId,
          type: "MESSAGE_RECEIVED",
          title: "New message",
          body: payload.text ?? `${(payload.type ?? "IMAGE").toLowerCase()} message`,
          entityType: "conversation",
          entityId: conversationId,
        })),
      });
    }

    return message;
  },

  async ensureParticipant(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ApiError(StatusCodes.FORBIDDEN, "You are not part of this conversation");
    }
  },
};
