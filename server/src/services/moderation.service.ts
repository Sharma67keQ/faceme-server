import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";

type ModerationStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";
type ReportTargetType = "USER" | "POST" | "COMMENT" | "REEL" | "STATUS" | "GROUP" | "PAGE";
type ModerationActionType =
  | "REPORT_STATUS_UPDATED"
  | "CONTENT_HIDDEN"
  | "CONTENT_RESTORED"
  | "MEDIA_REMOVED"
  | "USER_SUSPENDED"
  | "USER_UNSUSPENDED"
  | "USER_BANNED"
  | "USER_UNBANNED"
  | "GROUP_HIDDEN"
  | "GROUP_RESTORED"
  | "PAGE_HIDDEN"
  | "PAGE_RESTORED";

const moderatorSelect = {
  id: true,
  username: true,
  firstName: true,
  avatarUrl: true,
  role: true,
} as const;

type ReportListItem = {
  status: ModerationStatus;
  _count: {
    _all: number;
  };
};

const serializeReport = (report: any) => ({
  ...report,
  moderationLogs: report.logs ?? [],
  logs: undefined,
});

const ensureReportTargetType = (targetType: string): ReportTargetType => {
  if (
    targetType !== "USER" &&
    targetType !== "POST" &&
    targetType !== "COMMENT" &&
    targetType !== "REEL" &&
    targetType !== "STATUS" &&
    targetType !== "GROUP" &&
    targetType !== "PAGE"
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Unsupported report target");
  }

  return targetType;
};

const resolveTarget = async (targetType: ReportTargetType, targetId: string) => {
  switch (targetType) {
    case "USER":
      return prisma.user.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          username: true,
          role: true,
          suspendedAt: true,
          bannedAt: true,
        },
      });
    case "POST":
      return prisma.post.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          authorId: true,
          hiddenAt: true,
          mediaUrl: true,
          mediaType: true,
        },
      });
    case "COMMENT":
      return prisma.postComment.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          authorId: true,
          hiddenAt: true,
        },
      });
    case "REEL":
      return prisma.reel.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          authorId: true,
          hiddenAt: true,
          videoUrl: true,
        },
      });
    case "STATUS":
      return prisma.status.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          authorId: true,
          hiddenAt: true,
          mediaUrl: true,
        },
      });
    case "GROUP":
      return prisma.group.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          ownerId: true,
          hiddenAt: true,
          logoUrl: true,
          coverImageUrl: true,
        },
      });
    case "PAGE":
      return prisma.page.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          ownerId: true,
          hiddenAt: true,
          logoUrl: true,
          coverImageUrl: true,
        },
      });
  }
};

const getSubjectUserId = (targetType: ReportTargetType, target: any) => {
  if (!target) {
    return null;
  }

  if (targetType === "USER") {
    return target.id;
  }

  if ("authorId" in target) {
    return target.authorId;
  }

  if ("ownerId" in target) {
    return target.ownerId;
  }

  return null;
};

const logAction = async (input: {
  actorId: string;
  action: ModerationActionType;
  targetType: ReportTargetType;
  targetId: string;
  reason?: string;
  reportId?: string;
  details?: Record<string, unknown>;
}) =>
  prisma.moderationLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      reportId: input.reportId,
      details: input.details,
    },
  });

const resolveReportIfLinked = async (
  actorId: string,
  reportId: string | undefined,
  resolutionNotes: string | undefined,
) => {
  if (!reportId) {
    return;
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "RESOLVED",
      reviewedById: actorId,
      reviewedAt: new Date(),
      resolutionNotes,
    },
  });
};

export const moderationService = {
  async createReport(
    reporterId: string,
    input: {
      targetType: ReportTargetType;
      targetId: string;
      reason: string;
    },
  ) {
    const target = await resolveTarget(input.targetType, input.targetId);

    if (!target) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Report target not found");
    }

    const subjectUserId = getSubjectUserId(input.targetType, target);

    if (subjectUserId && subjectUserId === reporterId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot report your own content");
    }

    const existing = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: {
          in: ["OPEN", "REVIEWING"],
        },
      },
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.report.create({
      data: {
        reporterId,
        subjectUserId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        status: true,
        reason: true,
        createdAt: true,
      },
    });
  },

  async getOverview() {
    const [reportCounts, hiddenCounts, userCounts] = await Promise.all([
      prisma.report.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),
      Promise.all([
        prisma.post.count({ where: { hiddenAt: { not: null } } }),
        prisma.postComment.count({ where: { hiddenAt: { not: null } } }),
        prisma.reel.count({ where: { hiddenAt: { not: null } } }),
        prisma.status.count({ where: { hiddenAt: { not: null } } }),
        prisma.group.count({ where: { hiddenAt: { not: null } } }),
        prisma.page.count({ where: { hiddenAt: { not: null } } }),
      ]),
      Promise.all([
        prisma.user.count({ where: { suspendedAt: { not: null } } }),
        prisma.user.count({ where: { bannedAt: { not: null } } }),
      ]),
    ]);

    return {
      reports: {
        open: reportCounts.find((entry: ReportListItem) => entry.status === "OPEN")?._count._all ?? 0,
        reviewing:
          reportCounts.find((entry: ReportListItem) => entry.status === "REVIEWING")?._count._all ?? 0,
        resolved:
          reportCounts.find((entry: ReportListItem) => entry.status === "RESOLVED")?._count._all ?? 0,
        rejected:
          reportCounts.find((entry: ReportListItem) => entry.status === "REJECTED")?._count._all ?? 0,
      },
      hiddenContent: {
        posts: hiddenCounts[0],
        comments: hiddenCounts[1],
        reels: hiddenCounts[2],
        statuses: hiddenCounts[3],
        groups: hiddenCounts[4],
        pages: hiddenCounts[5],
      },
      users: {
        suspended: userCounts[0],
        banned: userCounts[1],
      },
    };
  },

  async listReports(filters?: { status?: ModerationStatus; targetType?: string }) {
    return prisma.report.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.targetType ? { targetType: ensureReportTargetType(filters.targetType) } : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        reporter: {
          select: moderatorSelect,
        },
        subjectUser: {
          select: moderatorSelect,
        },
        reviewedBy: {
          select: moderatorSelect,
        },
        logs: {
          orderBy: { createdAt: "desc" },
          include: {
            actor: {
              select: moderatorSelect,
            },
          },
          take: 10,
        },
      },
      take: 100,
    }).then((reports: any[]) => reports.map(serializeReport));
  },

  async listLogs() {
    return prisma.moderationLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: moderatorSelect,
        },
        report: {
          select: {
            id: true,
            status: true,
            targetType: true,
            targetId: true,
          },
        },
      },
      take: 150,
    });
  },

  async updateReport(
    actorId: string,
    reportId: string,
    payload: { status: ModerationStatus; resolutionNotes?: string },
  ) {
    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: payload.status,
        reviewedById: actorId,
        reviewedAt: new Date(),
        resolutionNotes: payload.resolutionNotes,
      },
      include: {
        reporter: {
          select: moderatorSelect,
        },
        subjectUser: {
          select: moderatorSelect,
        },
        reviewedBy: {
          select: moderatorSelect,
        },
      },
    });

    await logAction({
      actorId,
      action: "REPORT_STATUS_UPDATED",
      targetType: report.targetType as ReportTargetType,
      targetId: report.targetId,
      reportId: report.id,
      reason: payload.resolutionNotes,
      details: { status: payload.status },
    });

    return report;
  },

  async moderatePost(
    actorId: string,
    postId: string,
    payload: { action: "remove" | "restore" | "remove-media"; reason: string; reportId?: string },
  ) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, hiddenAt: true },
    });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");
    }

    if (payload.action === "remove-media") {
      const updated = await prisma.post.update({
        where: { id: postId },
        data: {
          mediaUrl: null,
          mediaType: null,
        },
      });

      await logAction({
        actorId,
        action: "MEDIA_REMOVED",
        targetType: "POST",
        targetId: postId,
        reportId: payload.reportId,
        reason: payload.reason,
      });
      await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
      return updated;
    }

    const isRemoving = payload.action === "remove";
    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        hiddenAt: isRemoving ? new Date() : null,
        hiddenReason: isRemoving ? payload.reason : null,
      },
    });

    await logAction({
      actorId,
      action: isRemoving ? "CONTENT_HIDDEN" : "CONTENT_RESTORED",
      targetType: "POST",
      targetId: postId,
      reportId: payload.reportId,
      reason: payload.reason,
    });
    await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
    return updated;
  },

  async moderateComment(
    actorId: string,
    commentId: string,
    payload: { action: "remove" | "restore"; reason: string; reportId?: string },
  ) {
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Comment not found");
    }

    const isRemoving = payload.action === "remove";
    const updated = await prisma.postComment.update({
      where: { id: commentId },
      data: {
        hiddenAt: isRemoving ? new Date() : null,
        hiddenReason: isRemoving ? payload.reason : null,
      },
    });

    await logAction({
      actorId,
      action: isRemoving ? "CONTENT_HIDDEN" : "CONTENT_RESTORED",
      targetType: "COMMENT",
      targetId: commentId,
      reportId: payload.reportId,
      reason: payload.reason,
    });
    await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
    return updated;
  },

  async moderateReel(
    actorId: string,
    reelId: string,
    payload: { action: "remove" | "restore"; reason: string; reportId?: string },
  ) {
    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
      select: { id: true },
    });

    if (!reel) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Reel not found");
    }

    const isRemoving = payload.action === "remove";
    const updated = await prisma.reel.update({
      where: { id: reelId },
      data: {
        hiddenAt: isRemoving ? new Date() : null,
        hiddenReason: isRemoving ? payload.reason : null,
      },
    });

    await logAction({
      actorId,
      action: isRemoving ? "CONTENT_HIDDEN" : "CONTENT_RESTORED",
      targetType: "REEL",
      targetId: reelId,
      reportId: payload.reportId,
      reason: payload.reason,
    });
    await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
    return updated;
  },

  async moderateStatus(
    actorId: string,
    statusId: string,
    payload: { action: "remove" | "restore" | "remove-media"; reason: string; reportId?: string },
  ) {
    const status = await prisma.status.findUnique({
      where: { id: statusId },
      select: { id: true },
    });

    if (!status) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Status not found");
    }

    if (payload.action === "remove-media") {
      const updated = await prisma.status.update({
        where: { id: statusId },
        data: {
          mediaUrl: null,
          kind: "TEXT",
        },
      });

      await logAction({
        actorId,
        action: "MEDIA_REMOVED",
        targetType: "STATUS",
        targetId: statusId,
        reportId: payload.reportId,
        reason: payload.reason,
      });
      await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
      return updated;
    }

    const isRemoving = payload.action === "remove";
    const updated = await prisma.status.update({
      where: { id: statusId },
      data: {
        hiddenAt: isRemoving ? new Date() : null,
        hiddenReason: isRemoving ? payload.reason : null,
      },
    });

    await logAction({
      actorId,
      action: isRemoving ? "CONTENT_HIDDEN" : "CONTENT_RESTORED",
      targetType: "STATUS",
      targetId: statusId,
      reportId: payload.reportId,
      reason: payload.reason,
    });
    await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
    return updated;
  },

  async moderateGroup(
    actorId: string,
    groupId: string,
    payload: { action: "remove" | "restore" | "remove-media"; reason: string; reportId?: string },
  ) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!group) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Group not found");
    }

    if (payload.action === "remove-media") {
      const updated = await prisma.group.update({
        where: { id: groupId },
        data: {
          logoUrl: null,
          coverImageUrl: null,
        },
      });

      await logAction({
        actorId,
        action: "MEDIA_REMOVED",
        targetType: "GROUP",
        targetId: groupId,
        reportId: payload.reportId,
        reason: payload.reason,
      });
      await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
      return updated;
    }

    const isRemoving = payload.action === "remove";
    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        hiddenAt: isRemoving ? new Date() : null,
        hiddenReason: isRemoving ? payload.reason : null,
      },
    });

    await logAction({
      actorId,
      action: isRemoving ? "GROUP_HIDDEN" : "GROUP_RESTORED",
      targetType: "GROUP",
      targetId: groupId,
      reportId: payload.reportId,
      reason: payload.reason,
    });
    await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
    return updated;
  },

  async moderatePage(
    actorId: string,
    pageId: string,
    payload: { action: "remove" | "restore" | "remove-media"; reason: string; reportId?: string },
  ) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true },
    });

    if (!page) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Page not found");
    }

    if (payload.action === "remove-media") {
      const updated = await prisma.page.update({
        where: { id: pageId },
        data: {
          logoUrl: null,
          coverImageUrl: null,
        },
      });

      await logAction({
        actorId,
        action: "MEDIA_REMOVED",
        targetType: "PAGE",
        targetId: pageId,
        reportId: payload.reportId,
        reason: payload.reason,
      });
      await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
      return updated;
    }

    const isRemoving = payload.action === "remove";
    const updated = await prisma.page.update({
      where: { id: pageId },
      data: {
        hiddenAt: isRemoving ? new Date() : null,
        hiddenReason: isRemoving ? payload.reason : null,
      },
    });

    await logAction({
      actorId,
      action: isRemoving ? "PAGE_HIDDEN" : "PAGE_RESTORED",
      targetType: "PAGE",
      targetId: pageId,
      reportId: payload.reportId,
      reason: payload.reason,
    });
    await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
    return updated;
  },

  async moderateUser(
    actorId: string,
    userId: string,
    payload: { action: "suspend" | "unsuspend" | "ban" | "unban"; reason: string; reportId?: string },
  ) {
    if (actorId === userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot moderate your own account");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (user.role === "ADMIN") {
      throw new ApiError(StatusCodes.FORBIDDEN, "Admin accounts cannot be moderated here");
    }

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: userId },
      data:
        payload.action === "suspend"
          ? {
              suspendedAt: now,
              suspensionReason: payload.reason,
            }
          : payload.action === "unsuspend"
            ? {
                suspendedAt: null,
                suspensionReason: null,
              }
            : payload.action === "ban"
              ? {
                  bannedAt: now,
                  banReason: payload.reason,
                }
              : {
                  bannedAt: null,
                  banReason: null,
                },
      select: {
        id: true,
        username: true,
        role: true,
        suspendedAt: true,
        suspensionReason: true,
        bannedAt: true,
        banReason: true,
      },
    });

    if (payload.action === "suspend" || payload.action === "ban") {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    }

    const actionMap: Record<typeof payload.action, ModerationActionType> = {
      suspend: "USER_SUSPENDED",
      unsuspend: "USER_UNSUSPENDED",
      ban: "USER_BANNED",
      unban: "USER_UNBANNED",
    };

    await logAction({
      actorId,
      action: actionMap[payload.action],
      targetType: "USER",
      targetId: userId,
      reportId: payload.reportId,
      reason: payload.reason,
    });
    await resolveReportIfLinked(actorId, payload.reportId, payload.reason);
    return updated;
  },
};
