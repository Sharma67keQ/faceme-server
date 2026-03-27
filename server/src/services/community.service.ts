import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { StatusCodes } from "http-status-codes";

const communityInclude = {
  owner: {
    select: {
      id: true,
      username: true,
      firstName: true,
      avatarUrl: true,
    },
  },
  members: {
    select: {
      userId: true,
      role: true,
      status: true,
    },
  },
  conversation: {
    select: {
      id: true,
    },
  },
} as const;

export const communityService = {
  async list(userId: string) {
    const communities = await prisma.community.findMany({
      include: communityInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return communities.map((community: (typeof communities)[number]) => ({
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      avatarUrl: community.avatarUrl,
      coverImageUrl: community.coverImageUrl,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt,
      owner: community.owner,
      conversationId: community.conversation?.id ?? null,
      memberCount: community.members.filter(
        (member: (typeof community.members)[number]) => member.status === "ACTIVE",
      ).length,
      isMember: community.members.some(
        (member: (typeof community.members)[number]) =>
          member.userId === userId && member.status === "ACTIVE",
      ),
    }));
  },

  async create(userId: string, payload: { name: string; slug: string; description?: string }) {
    return prisma.$transaction(async (tx: typeof prisma) => {
      const community = await tx.community.create({
        data: {
          ownerId: userId,
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          members: {
            create: {
              userId,
              role: "OWNER",
              status: "ACTIVE",
            },
          },
        },
        include: communityInclude,
      });

      const conversation = await tx.conversation.create({
        data: {
          type: "COMMUNITY",
          title: payload.name,
          description: payload.description,
          communityId: community.id,
          participants: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
      });

      return {
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        avatarUrl: community.avatarUrl,
        coverImageUrl: community.coverImageUrl,
        createdAt: community.createdAt,
        updatedAt: community.updatedAt,
        owner: community.owner,
        isMember: true,
        conversationId: conversation.id,
        memberCount: 1,
      };
    });
  },

  async join(userId: string, communityId: string) {
    await prisma.communityMember.upsert({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      update: {
        status: "ACTIVE",
      },
      create: {
        communityId,
        userId,
        status: "ACTIVE",
      },
    });

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        conversation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (community?.conversation?.id) {
      await prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: community.conversation.id,
            userId,
          },
        },
        update: {},
        create: {
          conversationId: community.conversation.id,
          userId,
        },
      });
    }

    return { joined: true, conversationId: community?.conversation?.id ?? null };
  },

  async update(
    userId: string,
    communityId: string,
    payload: { name?: string; description?: string; avatarUrl?: string; coverImageUrl?: string },
  ) {
    const community = await prisma.community.findUniqueOrThrow({
      where: { id: communityId },
      select: {
        ownerId: true,
        conversation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (community.ownerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the community owner can update this community");
    }

    const updated = await prisma.community.update({
      where: { id: communityId },
      data: payload,
      include: communityInclude,
    });

    if (community.conversation?.id && (payload.name || payload.description)) {
      await prisma.conversation.update({
        where: { id: community.conversation.id },
        data: {
          title: payload.name,
          description: payload.description,
        },
      });
    }

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      avatarUrl: updated.avatarUrl,
      coverImageUrl: updated.coverImageUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      owner: updated.owner,
      isMember: true,
      conversationId: updated.conversation?.id ?? null,
      memberCount: updated.members.filter((member: any) => member.status === "ACTIVE").length,
    };
  },

  async remove(userId: string, communityId: string) {
    const community = await prisma.community.findUniqueOrThrow({
      where: { id: communityId },
      select: {
        ownerId: true,
      },
    });

    if (community.ownerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the community owner can delete this community");
    }

    await prisma.community.delete({
      where: { id: communityId },
    });

    return { deleted: true };
  },
};
