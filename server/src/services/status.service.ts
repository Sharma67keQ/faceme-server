import { prisma } from "../lib/prisma.js";
import { moderationService } from "./moderation.service.js";
import { ApiError } from "../utils/api-error.js";
import { StatusCodes } from "http-status-codes";

const authorSelect = {
  id: true,
  username: true,
  firstName: true,
  avatarUrl: true,
} as const;

const canViewByVisibility = async (
  viewerId: string,
  authorId: string,
  visibility: "PUBLIC" | "FOLLOWERS" | "FRIENDS",
) => {
  if (viewerId === authorId || visibility === "PUBLIC") {
    return true;
  }

  if (visibility === "FOLLOWERS") {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: authorId,
        },
      },
    });

    return Boolean(follow);
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      userId: viewerId,
      friendId: authorId,
    },
  });

  return Boolean(friendship);
};

export const statusService = {
  async listVisibleStatuses(userId: string) {
    const statuses = await prisma.status.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
        hiddenAt: null,
      },
      include: {
        author: {
          select: authorSelect,
        },
        views: {
          include: {
            viewer: {
              select: authorSelect,
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: authorSelect,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
    });

    const visibleStatuses = [];

    for (const status of statuses) {
      if (await canViewByVisibility(userId, status.authorId, status.visibility)) {
        visibleStatuses.push({
          ...status,
          isViewed: status.views.some((view: { viewerId: string }) => view.viewerId === userId),
          viewersCount: status.views.length,
          viewers:
            status.authorId === userId
              ? status.views
                  .filter((view: any) => view.viewerId !== userId)
                  .map((view: any) => view.viewerId)
              : [],
        });
      }
    }

    return visibleStatuses;
  },

  async createStatus(
    userId: string,
    payload: {
      kind: "TEXT" | "IMAGE" | "VIDEO";
      text?: string;
      mediaUrl?: string;
      visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
    },
  ) {
    return prisma.status.create({
      data: {
        authorId: userId,
        kind: payload.kind,
        text: payload.text,
        mediaUrl: payload.mediaUrl,
        visibility: payload.visibility ?? "PUBLIC",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      include: {
        author: {
          select: authorSelect,
        },
      },
    });
  },

  async markViewed(userId: string, statusId: string) {
    const status = await prisma.status.findUniqueOrThrow({
      where: { id: statusId },
      select: { authorId: true, visibility: true, hiddenAt: true },
    });

    if (status.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Status not found");
    }

    const allowed = await canViewByVisibility(userId, status.authorId, status.visibility);

    if (!allowed) {
      throw new Error("Forbidden");
    }

    return prisma.statusView.upsert({
      where: {
        statusId_viewerId: {
          statusId,
          viewerId: userId,
        },
      },
      update: {},
      create: {
        statusId,
        viewerId: userId,
      },
    });
  },

  async react(userId: string, statusId: string, payload: { emoji: string; replyText?: string }) {
    const status = await prisma.status.findUniqueOrThrow({
      where: { id: statusId },
      select: { authorId: true, hiddenAt: true },
    });

    if (status.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Status not found");
    }

    const reaction = await prisma.statusReaction.create({
      data: {
        statusId,
        userId,
        emoji: payload.emoji,
        replyText: payload.replyText,
      },
      include: {
        user: {
          select: authorSelect,
        },
      },
    });

    if (status.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: status.authorId,
          actorId: userId,
          type: "STATUS_REPLIED",
          title: "Someone replied to your status",
          body: payload.replyText ?? `${payload.emoji} reacted to your status`,
          entityType: "status",
          entityId: statusId,
        },
      });
    }

    return reaction;
  },

  async getById(userId: string, statusId: string) {
    const status = await prisma.status.findUniqueOrThrow({
      where: { id: statusId },
      include: {
        author: {
          select: authorSelect,
        },
        views: {
          include: {
            viewer: {
              select: authorSelect,
            },
          },
          orderBy: {
            viewedAt: "desc",
          },
        },
        reactions: {
          include: {
            user: {
              select: authorSelect,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (status.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Status not found");
    }

    const allowed = await canViewByVisibility(userId, status.authorId, status.visibility);

    if (!allowed) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Forbidden");
    }

    return {
      ...status,
      isViewed: status.views.some((view: any) => view.viewerId === userId),
      viewersCount: status.views.length,
      viewers:
        status.authorId === userId
          ? status.views.map((view: any) => ({
              id: view.viewer.id,
              viewedAt: view.viewedAt,
              viewer: view.viewer,
            }))
          : [],
    };
  },

  async deleteStatus(userId: string, statusId: string) {
    const status = await prisma.status.findUniqueOrThrow({
      where: { id: statusId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (status.authorId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can delete this status");
    }

    await prisma.status.delete({
      where: { id: statusId },
    });

    return { deleted: true };
  },

  async report(userId: string, statusId: string, reason: string) {
    return moderationService.createReport(userId, {
      targetType: "STATUS",
      targetId: statusId,
      reason,
    });
  },
};
