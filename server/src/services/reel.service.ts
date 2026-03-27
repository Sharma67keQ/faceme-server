import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { moderationService } from "./moderation.service.js";
import { ApiError } from "../utils/api-error.js";

const authorSelect = {
  id: true,
  username: true,
  firstName: true,
  avatarUrl: true,
} as const;

const replyInclude = {
  author: {
    select: authorSelect,
  },
} as const;

const commentInclude = {
  author: {
    select: authorSelect,
  },
  replies: {
    where: {
      hiddenAt: null,
    },
    include: replyInclude,
    orderBy: {
      createdAt: "asc",
    },
  },
} as const;

const serializeComment = (comment: any, viewerId: string) => ({
  id: comment.id,
  reelId: comment.reelId,
  body: comment.body,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  parentCommentId: comment.parentCommentId,
  canEdit: comment.author.id === viewerId,
  canDelete: comment.author.id === viewerId,
  author: comment.author,
  replies: (comment.replies ?? []).map((reply: any) =>
    serializeComment(
      {
        ...reply,
        replies: [],
      },
      viewerId,
    ),
  ),
});

const serializeReel = (reel: any, userId: string) => ({
  ...reel,
  likesCount: reel.likes.length,
  commentsCount: reel.comments.filter((comment: any) => !comment.parentCommentId).length,
  isLiked: reel.likes.some((like: { userId: string }) => like.userId === userId),
  scoreReason: reel.likes.length > 3 ? "Trending video" : "Recommended video",
  canEdit: reel.author.id === userId,
  canDelete: reel.author.id === userId,
  comments: reel.comments
    .filter((comment: any) => !comment.parentCommentId)
    .map((comment: any) => serializeComment(comment, userId)),
});

export const reelService = {
  async list(userId: string) {
    const reels = await prisma.reel.findMany({
      where: {
        hiddenAt: null,
      },
      include: {
        author: {
          select: authorSelect,
        },
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          where: {
            hiddenAt: null,
          },
          include: commentInclude,
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
    });

    return reels.map((reel: any) => serializeReel(reel, userId));
  },

  async create(
    userId: string,
    payload: { videoUrl: string; caption?: string; visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS" },
  ) {
    const reel = await prisma.reel.create({
      data: {
        authorId: userId,
        videoUrl: payload.videoUrl,
        caption: payload.caption,
        visibility: payload.visibility ?? "PUBLIC",
        shareSlug: `reel-${Math.random().toString(36).slice(2, 10)}`,
      },
      include: {
        author: {
          select: authorSelect,
        },
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          where: {
            hiddenAt: null,
          },
          include: commentInclude,
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return serializeReel(reel, userId);
  },

  async update(
    userId: string,
    reelId: string,
    payload: { videoUrl: string; caption?: string; visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS" },
  ) {
    const reel = await prisma.reel.findUniqueOrThrow({
      where: { id: reelId },
      select: { authorId: true },
    });

    if (reel.authorId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can edit this reel");
    }

    const updated = await prisma.reel.update({
      where: { id: reelId },
      data: {
        videoUrl: payload.videoUrl,
        caption: payload.caption,
        visibility: payload.visibility,
      },
      include: {
        author: {
          select: authorSelect,
        },
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          where: {
            hiddenAt: null,
          },
          include: commentInclude,
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return serializeReel(updated, userId);
  },

  async delete(userId: string, reelId: string) {
    const reel = await prisma.reel.findUniqueOrThrow({
      where: { id: reelId },
      select: { authorId: true },
    });

    if (reel.authorId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can delete this reel");
    }

    await prisma.reel.delete({
      where: { id: reelId },
    });

    return { deleted: true };
  },

  async toggleLike(userId: string, reelId: string) {
    const existing = await prisma.reelLike.findUnique({
      where: {
        reelId_userId: {
          reelId,
          userId,
        },
      },
    });

    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
      select: { hiddenAt: true, authorId: true },
    });

    if (!reel || reel.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Reel not found");
    }

    if (existing) {
      await prisma.reelLike.delete({
        where: {
          reelId_userId: {
            reelId,
            userId,
          },
        },
      });

      return { isLiked: false };
    }

    await prisma.reelLike.create({
      data: {
        reelId,
        userId,
      },
    });

    if (reel.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: reel.authorId,
          actorId: userId,
          type: "POST_LIKED",
          title: "Your reel was liked",
          entityType: "reel",
          entityId: reelId,
        },
      });
    }

    return { isLiked: true };
  },

  async commentOnReel(userId: string, reelId: string, body: string, parentCommentId?: string) {
    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
      select: {
        id: true,
        authorId: true,
        hiddenAt: true,
      },
    });

    if (!reel || reel.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Reel not found");
    }

    if (parentCommentId) {
      const parentComment = await prisma.reelComment.findUniqueOrThrow({
        where: { id: parentCommentId },
        select: {
          reelId: true,
          parentCommentId: true,
          hiddenAt: true,
          authorId: true,
        },
      });

      if (parentComment.hiddenAt || parentComment.reelId !== reelId) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Comment not found");
      }

      if (parentComment.parentCommentId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Nested replies are limited to one level");
      }
    }

    const comment = await prisma.reelComment.create({
      data: {
        reelId,
        authorId: userId,
        body,
        parentCommentId,
      },
      include: {
        ...commentInclude,
        replies: false,
      },
    });

    if (reel.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: reel.authorId,
          actorId: userId,
          type: "POST_COMMENTED",
          title: "New comment on your reel",
          entityType: "reel",
          entityId: reelId,
          body,
        },
      });
    }

    return serializeComment({ ...comment, replies: [] }, userId);
  },

  async share(reelId: string) {
    const reel = await prisma.reel.findUniqueOrThrow({
      where: { id: reelId },
      select: {
        id: true,
        shareSlug: true,
      },
    });

    return {
      shared: true,
      shareSlug: reel.shareSlug,
      path: reel.shareSlug ? `/reels?share=${reel.shareSlug}` : null,
    };
  },

  async report(userId: string, reelId: string, reason: string) {
    return moderationService.createReport(userId, {
      targetType: "REEL",
      targetId: reelId,
      reason,
    });
  },
};
