import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";

const userSummarySelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  bio: true,
  _count: {
    select: {
      posts: true,
      followers: true,
      following: true,
    },
  },
} as const;

const pageSummaryInclude = {
  hiddenAt: true,
  owner: {
    select: {
      id: true,
      username: true,
      firstName: true,
      avatarUrl: true,
    },
  },
  followers: {
    select: {
      userId: true,
    },
  },
  _count: {
    select: {
      followers: true,
      posts: true,
    },
  },
} as const;

const groupSummaryInclude = {
  hiddenAt: true,
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
      status: true,
      role: true,
    },
  },
  posts: {
    select: {
      id: true,
      createdAt: true,
      _count: {
        select: {
          comments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  },
  chat: {
    select: {
      id: true,
    },
  },
} as const;

const postSummaryInclude = {
  author: {
    select: {
      id: true,
      username: true,
      firstName: true,
      avatarUrl: true,
    },
  },
  page: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  },
  group: {
    select: {
      id: true,
      name: true,
      slug: true,
      privacy: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} as const;

const mapPageSummary = (page: any, userId: string) => ({
  id: page.id,
  name: page.name,
  slug: page.slug,
  description: page.description,
  logoUrl: page.logoUrl,
  coverImageUrl: page.coverImageUrl,
  owner: page.owner,
  followersCount: page._count.followers,
  postsCount: page._count.posts,
  isFollowing: page.followers.some((follower: { userId: string }) => follower.userId === userId),
  createdAt: page.createdAt,
});

const mapGroupSummary = (group: any, userId: string) => ({
  id: group.id,
  name: group.name,
  slug: group.slug,
  description: group.description,
  logoUrl: group.logoUrl,
  coverImageUrl: group.coverImageUrl,
  privacy: group.privacy,
  owner: group.owner,
  membersCount: group.members.filter((member: { status: string }) => member.status === "ACTIVE").length,
  postsCount: group.posts.length,
  discussionCount: group.posts.reduce(
    (total: number, post: { _count: { comments: number } }) => total + post._count.comments,
    0,
  ),
  isMember: group.members.some(
    (member: { userId: string; status: string }) => member.userId === userId && member.status === "ACTIVE",
  ),
  membershipStatus:
    group.members.find((member: { userId: string }) => member.userId === userId)?.status ?? null,
  chatId: group.chat?.id ?? null,
  createdAt: group.createdAt,
});

const normalizeUser = (user: any) => ({
  ...user,
  friendCount: 0,
});

const createInviteCode = () => `faceme-${Math.random().toString(36).slice(2, 10)}`;

export const socialService = {
  async getRelationship(viewerId: string, targetId: string) {
    const [friendship, outgoing, incoming, viewerFriends, targetFriends] = await Promise.all([
      prisma.friendship.findFirst({
        where: {
          userId: viewerId,
          friendId: targetId,
        },
      }),
      prisma.friendRequest.findFirst({
        where: {
          senderId: viewerId,
          receiverId: targetId,
          status: "PENDING",
        },
      }),
      prisma.friendRequest.findFirst({
        where: {
          senderId: targetId,
          receiverId: viewerId,
          status: "PENDING",
        },
      }),
      prisma.friendship.findMany({
        where: { userId: viewerId },
        select: { friendId: true },
      }),
      prisma.friendship.findMany({
        where: { userId: targetId },
        select: {
          friendId: true,
          friend: {
            select: userSummarySelect,
          },
        },
      }),
    ]);

    const viewerFriendIds = new Set(
      viewerFriends.map((item: { friendId: string }) => item.friendId),
    );
    const mutualFriends = targetFriends
      .filter((item: { friendId: string; friend: unknown }) => viewerFriendIds.has(item.friendId))
      .slice(0, 6)
      .map((item: { friend: unknown }) => normalizeUser(item.friend));

    return {
      isFriend: Boolean(friendship),
      hasSentRequest: Boolean(outgoing),
      hasIncomingRequest: Boolean(incoming),
      friendRequestId: outgoing?.id ?? incoming?.id ?? null,
      mutualFriendsCount: mutualFriends.length,
      mutualFriends,
    };
  },

  async listFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: userSummarySelect,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return friendships.map((friendship: { friend: unknown }) => normalizeUser(friendship.friend));
  },

  async listFriendRequests(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      prisma.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
        include: {
          sender: {
            select: userSummarySelect,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.friendRequest.findMany({
        where: {
          senderId: userId,
          status: "PENDING",
        },
        include: {
          receiver: {
            select: userSummarySelect,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return {
      incoming: incoming.map((item: { id: string; createdAt: Date; sender: unknown }) => ({
        id: item.id,
        createdAt: item.createdAt,
        user: normalizeUser(item.sender),
      })),
      outgoing: outgoing.map((item: { id: string; createdAt: Date; receiver: unknown }) => ({
        id: item.id,
        createdAt: item.createdAt,
        user: normalizeUser(item.receiver),
      })),
    };
  },

  async sendFriendRequest(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot send a friend request to yourself");
    }

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        userId,
        friendId: targetId,
      },
    });

    if (existingFriendship) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "You are already friends");
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetId, status: "PENDING" },
          { senderId: targetId, receiverId: userId, status: "PENDING" },
        ],
      },
    });

    if (existingRequest) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "A pending friend request already exists");
    }

    const request = await prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: targetId,
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: targetId,
        actorId: userId,
        type: "FRIEND_REQUEST",
        title: "New friend request",
        entityType: "friend-request",
        entityId: request.id,
      },
    });

    return request;
  },

  async respondToFriendRequest(userId: string, requestId: string, action: "accept" | "reject") {
    const request = await prisma.friendRequest.findFirstOrThrow({
      where: {
        id: requestId,
        receiverId: userId,
        status: "PENDING",
      },
    });

    return prisma.$transaction(async (tx: any) => {
      const updated = await tx.friendRequest.update({
        where: { id: requestId },
        data: {
          status: action === "accept" ? "ACCEPTED" : "REJECTED",
        },
      });

      if (action === "accept") {
        await tx.friendship.createMany({
          data: [
            {
              userId,
              friendId: request.senderId,
            },
            {
              userId: request.senderId,
              friendId: userId,
            },
          ],
          skipDuplicates: true,
        });

        await tx.notification.create({
          data: {
            recipientId: request.senderId,
            actorId: userId,
            type: "FRIEND_ACCEPTED",
            title: "Friend request accepted",
            entityType: "user",
            entityId: userId,
          },
        });
      }

      return updated;
    });
  },

  async removeFriend(userId: string, targetId: string) {
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId: targetId },
          { userId: targetId, friendId: userId },
        ],
      },
    });

    return { removed: true };
  },

  async getPeopleYouMayKnow(userId: string) {
    const viewerFriends = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const viewerFriendIds = viewerFriends.map((item: { friendId: string }) => item.friendId);
    const excludedFollowing = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const users = await prisma.user.findMany({
      where: {
        id: {
          notIn: [
            userId,
            ...viewerFriendIds,
            ...excludedFollowing.map((item: { followingId: string }) => item.followingId),
          ],
        },
      },
      select: userSummarySelect,
      take: 10,
    });

    const mutuals = await prisma.friendship.findMany({
      where: {
        userId: {
          in: users.map((item: { id: string }) => item.id),
        },
        friendId: {
          in: viewerFriendIds,
        },
      },
      select: {
        userId: true,
      },
    });

    return users.map((user: any) => ({
      ...normalizeUser(user),
      mutualFriendsCount: mutuals.filter((item: { userId: string }) => item.userId === user.id).length,
    }));
  },

  async listPages(userId: string) {
    const pages = await prisma.page.findMany({
      where: {
        hiddenAt: null,
      },
      include: pageSummaryInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return pages.map((page: any) => mapPageSummary(page, userId));
  },

  async getPageBySlug(userId: string, slug: string) {
    const page = await prisma.page.findUniqueOrThrow({
      where: { slug },
      include: pageSummaryInclude,
    });

    if (page.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Page not found");
    }

    return mapPageSummary(page, userId);
  },

  async createPage(userId: string, payload: { name: string; slug: string; description?: string; logoUrl?: string }) {
    const page = await prisma.page.create({
      data: {
        ownerId: userId,
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        logoUrl: payload.logoUrl,
      },
      include: pageSummaryInclude,
    });

    return mapPageSummary(page, userId);
  },

  async updatePage(
    userId: string,
    pageId: string,
    payload: { name?: string; description?: string; logoUrl?: string; coverImageUrl?: string },
  ) {
    const page = await prisma.page.findUniqueOrThrow({
      where: { id: pageId },
      select: { ownerId: true },
    });

    if (page.ownerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the page owner can update this page");
    }

    const updated = await prisma.page.update({
      where: { id: pageId },
      data: payload,
      include: pageSummaryInclude,
    });

    return mapPageSummary(updated, userId);
  },

  async deletePage(userId: string, pageId: string) {
    const page = await prisma.page.findUniqueOrThrow({
      where: { id: pageId },
      select: { ownerId: true },
    });

    if (page.ownerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the page owner can delete this page");
    }

    await prisma.page.delete({
      where: { id: pageId },
    });

    return { deleted: true };
  },

  async togglePageFollow(userId: string, pageId: string) {
    const existing = await prisma.pageFollower.findUnique({
      where: {
        pageId_userId: {
          pageId,
          userId,
        },
      },
    });

    if (existing) {
      await prisma.pageFollower.delete({
        where: {
          pageId_userId: {
            pageId,
            userId,
          },
        },
      });

      return { isFollowing: false };
    }

    const page = await prisma.page.findUniqueOrThrow({
      where: { id: pageId },
      select: { ownerId: true, hiddenAt: true },
    });

    if (page.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Page not found");
    }

    await prisma.pageFollower.create({
      data: {
        pageId,
        userId,
      },
    });

    if (page.ownerId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: page.ownerId,
          actorId: userId,
          type: "PAGE_FOLLOWED",
          title: "Your page has a new follower",
          entityType: "page",
          entityId: pageId,
        },
      });
    }

    return { isFollowing: true };
  },

  async listGroups(userId: string) {
    const groups = await prisma.group.findMany({
      where: {
        hiddenAt: null,
      },
      include: groupSummaryInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return groups.map((group: any) => mapGroupSummary(group, userId));
  },

  async getGroupBySlug(userId: string, slug: string) {
    const group = await prisma.group.findUniqueOrThrow({
      where: { slug },
      include: groupSummaryInclude,
    });

    if (group.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Group not found");
    }

    return mapGroupSummary(group, userId);
  },

  async createGroup(
    userId: string,
    payload: { name: string; slug: string; description?: string; privacy?: "PUBLIC" | "PRIVATE" },
  ) {
    return prisma.$transaction(async (tx: any) => {
      const conversation = await tx.conversation.create({
        data: {
          type: "GROUP",
          title: payload.name,
          description: payload.description,
          participants: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
      });

      const group = await tx.group.create({
        data: {
          ownerId: userId,
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          privacy: payload.privacy ?? "PUBLIC",
          chatId: conversation.id,
          members: {
            create: {
              userId,
              role: "OWNER",
              status: "ACTIVE",
            },
          },
        },
        include: groupSummaryInclude,
      });

      return mapGroupSummary(group, userId);
    });
  },

  async updateGroup(
    userId: string,
    groupId: string,
    payload: { name?: string; description?: string; privacy?: "PUBLIC" | "PRIVATE" },
  ) {
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { ownerId: true, chatId: true },
    });

    if (group.ownerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the group owner can update this group");
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: payload,
      include: groupSummaryInclude,
    });

    if (group.chatId && (payload.name || payload.description)) {
      await prisma.conversation.update({
        where: { id: group.chatId },
        data: {
          title: payload.name,
          description: payload.description,
        },
      });
    }

    return mapGroupSummary(updated, userId);
  },

  async deleteGroup(userId: string, groupId: string) {
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { ownerId: true },
    });

    if (group.ownerId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the group owner can delete this group");
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return { deleted: true };
  },

  async joinGroup(userId: string, groupId: string) {
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      select: {
        privacy: true,
        ownerId: true,
        chatId: true,
        hiddenAt: true,
      },
    });

    if (group.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Group not found");
    }

    const status = group.privacy === "PUBLIC" ? "ACTIVE" : "PENDING";

    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      update: {
        status,
      },
      create: {
        groupId,
        userId,
        status,
      },
    });

    if (status === "ACTIVE" && group.chatId) {
      await prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: group.chatId,
            userId,
          },
        },
        update: {},
        create: {
          conversationId: group.chatId,
          userId,
        },
      });

      if (group.ownerId !== userId) {
        await prisma.notification.create({
          data: {
            recipientId: group.ownerId,
            actorId: userId,
            type: "GROUP_JOINED",
            title: "A new member joined your group",
            entityType: "group",
            entityId: groupId,
          },
        });
      }
    }

    return { joined: status === "ACTIVE", status };
  },

  async createInvite(userId: string, message?: string) {
    const invite = await prisma.invite.create({
      data: {
        userId,
        code: createInviteCode(),
        message: message ?? "Join me on Faceme",
      },
    });

    return {
      ...invite,
      link: `faceme://invite/${invite.code}`,
      fallbackUrl: `https://faceme.app/invite/${invite.code}`,
    };
  },

  async redeemInvite(userId: string, code: string) {
    const invite = await prisma.invite.findUniqueOrThrow({
      where: { code },
      select: {
        id: true,
        userId: true,
      },
    });

    if (invite.userId === userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot redeem your own invite");
    }

    await prisma.inviteRedemption.upsert({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId,
        },
      },
      update: {},
      create: {
        inviteId: invite.id,
        userId,
      },
    });

    return { redeemed: true };
  },

  async submitFeedback(userId: string, payload: { subject: string; body: string; rating?: number }) {
    return prisma.productFeedback.create({
      data: {
        userId,
        subject: payload.subject,
        body: payload.body,
        rating: payload.rating,
      },
    });
  },

  async getLaunchSummary(userId: string) {
    const [betaAccess, featureFlags, invite, suggestions, pages, groups, friendRequests] = await Promise.all([
      prisma.betaAccess.findUnique({
        where: { userId },
      }),
      prisma.featureFlag.findMany({
        orderBy: {
          key: "asc",
        },
      }),
      prisma.invite.findFirst({
        where: { userId },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.getPeopleYouMayKnow(userId),
      prisma.page.findMany({
        where: {
          hiddenAt: null,
        },
        include: pageSummaryInclude,
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      prisma.group.findMany({
        where: {
          hiddenAt: null,
        },
        include: groupSummaryInclude,
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      this.listFriendRequests(userId),
    ]);

    return {
      betaAccess: betaAccess ?? { isBetaUser: false, cohort: null },
      featureFlags,
      invite: invite
        ? {
            ...invite,
            link: `faceme://invite/${invite.code}`,
          }
        : null,
      onboarding: {
        suggestedUsers: suggestions.slice(0, 5),
        suggestedPages: pages.map((page: any) => mapPageSummary(page, userId)),
        suggestedGroups: groups.map((group: any) => mapGroupSummary(group, userId)),
      },
      friendRequests,
    };
  },

  async getExploreHub(userId: string) {
    const [trendingPosts, suggestedUsers, suggestedPages, suggestedGroups] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorId: {
            not: userId,
          },
        },
        include: postSummaryInclude,
        orderBy: [
          {
            comments: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: 8,
      }),
      this.getPeopleYouMayKnow(userId),
      prisma.page.findMany({
        where: {
          hiddenAt: null,
        },
        include: pageSummaryInclude,
        orderBy: [
          {
            followers: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: 8,
      }),
      prisma.group.findMany({
        where: {
          hiddenAt: null,
        },
        include: groupSummaryInclude,
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),
    ]);

    const activeDiscussions = trendingPosts
      .map((post: any) => ({
        id: post.id,
        body: post.body,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        author: post.author,
        page: post.page,
        group: post.group,
      }))
      .sort(
        (
          left: { commentsCount: number },
          right: { commentsCount: number },
        ) => right.commentsCount - left.commentsCount,
      )
      .slice(0, 6);

    return {
      trendingPosts,
      suggestedUsers,
      suggestedPages: suggestedPages.map((page: any) => mapPageSummary(page, userId)),
      suggestedGroups: suggestedGroups.map((group: any) => mapGroupSummary(group, userId)),
      activeDiscussions,
    };
  },
};
