import { prisma } from "../lib/prisma.js";
import { postService } from "./post.service.js";
import { moderationService } from "./moderation.service.js";

const privateProfileSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  bio: true,
  avatarUrl: true,
  coverImageUrl: true,
  location: true,
  website: true,
  isOnboardingComplete: true,
  accountType: true,
  preferredLanguage: true,
  isPrivateAccount: true,
  profileVisibility: true,
  role: true,
  suspendedAt: true,
  bannedAt: true,
  _count: {
    select: {
      posts: true,
      followers: true,
      following: true,
    },
  },
} as const;

const publicProfileSelect = (viewerId: string) =>
  ({
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    bio: true,
    avatarUrl: true,
    coverImageUrl: true,
    location: true,
    website: true,
    accountType: true,
    preferredLanguage: true,
    isPrivateAccount: true,
    profileVisibility: true,
    role: true,
    suspendedAt: true,
    bannedAt: true,
    _count: {
      select: {
        posts: true,
        followers: true,
        following: true,
      },
    },
    followers: {
      where: {
        followerId: viewerId,
      },
      select: {
        id: true,
      },
      take: 1,
    },
  }) as const;

const userListSelect = (viewerId: string) =>
  ({
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
    bio: true,
    accountType: true,
    preferredLanguage: true,
    profileVisibility: true,
    role: true,
    _count: {
      select: {
        posts: true,
        followers: true,
        following: true,
      },
    },
    followers: {
      where: {
        followerId: viewerId,
      },
      select: {
        id: true,
      },
      take: 1,
    },
  }) as const;

const mapPublicProfile = <
  T extends {
    followers: Array<{ id: string }>;
    profileVisibility: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
    id: string;
  },
>(
  user: T,
  viewerId: string,
  friendCount: number,
  isFriend: boolean,
) => {
  const isOwner = user.id === viewerId;
  const isFollowing = user.followers.length > 0;
  const canViewPosts =
    isOwner ||
    user.profileVisibility === "PUBLIC" ||
    (user.profileVisibility === "FOLLOWERS" && isFollowing) ||
    (user.profileVisibility === "FRIENDS" && isFriend);

  return {
    ...user,
    isPrivateAccount: user.profileVisibility !== "PUBLIC",
    isFollowing,
    isFriend,
    canViewPosts,
    friendCount,
    followers: undefined,
  };
};

const countFriends = async (userId: string) =>
  prisma.friendship.count({
    where: { userId },
  });

const isFriendWithViewer = async (viewerId: string, targetId: string) => {
  if (viewerId === targetId) {
    return true;
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      userId: viewerId,
      friendId: targetId,
    },
    select: { id: true },
  });

  return Boolean(friendship);
};

export const userService = {
  getMe(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: privateProfileSelect,
    }).then(async (user: any) => ({
      ...user,
      friendCount: await countFriends(user.id),
      isPrivateAccount: user.profileVisibility !== "PUBLIC",
    }));
  },

  async getPublicProfile(viewerId: string, username: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { username },
      select: publicProfileSelect(viewerId),
    });

    const [friendCount, isFriend] = await Promise.all([
      countFriends(user.id),
      isFriendWithViewer(viewerId, user.id),
    ]);

    return mapPublicProfile(user, viewerId, friendCount, isFriend);
  },

  async getPublicProfileById(viewerId: string, id: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: publicProfileSelect(viewerId),
    });

    const [friendCount, isFriend] = await Promise.all([
      countFriends(user.id),
      isFriendWithViewer(viewerId, user.id),
    ]);

    return mapPublicProfile(user, viewerId, friendCount, isFriend);
  },

  async getPublicProfilePosts(viewerId: string, username: string) {
    const profile = await this.getPublicProfile(viewerId, username);

    if (!profile.canViewPosts) {
      return [];
    }

    return postService.getPostsByAuthor(viewerId, profile.id);
  },

  async searchUsers(query: string, viewerId: string) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: userListSelect(viewerId),
    });

    const friendIds = new Set(
      (
        await prisma.friendship.findMany({
          where: { userId: viewerId },
          select: { friendId: true },
        })
      ).map((item: any) => item.friendId),
    );

    const friendCounts = await prisma.friendship.groupBy({
      by: ["userId"],
      _count: {
        userId: true,
      },
      where: {
        userId: {
          in: users.map((user: any) => user.id),
        },
      },
    });

    const friendCountMap = new Map<string, number>(
      friendCounts.map((item: any) => [item.userId, item._count.userId as number]),
    );

    return users.map((user: any) =>
      mapPublicProfile(user, viewerId, friendCountMap.get(user.id) ?? 0, friendIds.has(user.id)),
    );
  },

  async getSuggestedProfiles(viewerId: string) {
    const interactedPostIds = await prisma.postComment.findMany({
      where: { authorId: viewerId },
      select: { postId: true },
      take: 100,
    });
    const excludedUserIds = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });

    const users = await prisma.user.findMany({
      where: {
        id: {
          notIn: [viewerId, ...excludedUserIds.map((item: any) => item.followingId)],
        },
        OR: [
          {
            comments: {
              some: {
                postId: {
                  in: interactedPostIds.map((item: any) => item.postId),
                },
              },
            },
          },
          {
            followers: {
              some: {
                follower: {
                  following: {
                    some: { followingId: viewerId },
                  },
                },
              },
            },
          },
          {
            posts: {
              some: {},
            },
          },
        ],
      },
      take: 12,
      orderBy: [{ followers: { _count: "desc" } }, { posts: { _count: "desc" } }],
      select: userListSelect(viewerId),
    });

    const friendIds = new Set(
      (
        await prisma.friendship.findMany({
          where: { userId: viewerId },
          select: { friendId: true },
        })
      ).map((item: any) => item.friendId),
    );

    const friendCounts = await prisma.friendship.groupBy({
      by: ["userId"],
      _count: {
        userId: true,
      },
      where: {
        userId: {
          in: users.map((user: any) => user.id),
        },
      },
    });

    const friendCountMap = new Map<string, number>(
      friendCounts.map((item: any) => [item.userId, item._count.userId as number]),
    );

    return users.map((user: any) =>
      mapPublicProfile(user, viewerId, friendCountMap.get(user.id) ?? 0, friendIds.has(user.id)),
    );
  },

  async listFollowers(viewerId: string, username: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { username },
      select: {
        followers: {
          orderBy: { createdAt: "desc" },
          include: {
            follower: {
              select: userListSelect(viewerId),
            },
          },
        },
      },
    });

    const followerIds = user.followers.map((item: any) => item.follower.id);
    const friendIds = new Set(
      (
        await prisma.friendship.findMany({
          where: { userId: viewerId, friendId: { in: followerIds } },
          select: { friendId: true },
        })
      ).map((item: any) => item.friendId),
    );
    const friendCounts = await prisma.friendship.groupBy({
      by: ["userId"],
      _count: {
        userId: true,
      },
      where: {
        userId: {
          in: followerIds,
        },
      },
    });
    const friendCountMap = new Map<string, number>(
      friendCounts.map((item: any) => [item.userId, item._count.userId as number]),
    );

    return user.followers.map((item: any) =>
      mapPublicProfile(
        item.follower,
        viewerId,
        friendCountMap.get(item.follower.id) ?? 0,
        friendIds.has(item.follower.id),
      ),
    );
  },

  async listFollowing(viewerId: string, username: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { username },
      select: {
        following: {
          orderBy: { createdAt: "desc" },
          include: {
            following: {
              select: userListSelect(viewerId),
            },
          },
        },
      },
    });

    const followingIds = user.following.map((item: any) => item.following.id);
    const friendIds = new Set(
      (
        await prisma.friendship.findMany({
          where: { userId: viewerId, friendId: { in: followingIds } },
          select: { friendId: true },
        })
      ).map((item: any) => item.friendId),
    );
    const friendCounts = await prisma.friendship.groupBy({
      by: ["userId"],
      _count: {
        userId: true,
      },
      where: {
        userId: {
          in: followingIds,
        },
      },
    });
    const friendCountMap = new Map<string, number>(
      friendCounts.map((item: any) => [item.userId, item._count.userId as number]),
    );

    return user.following.map((item: any) =>
      mapPublicProfile(
        item.following,
        viewerId,
        friendCountMap.get(item.following.id) ?? 0,
        friendIds.has(item.following.id),
      ),
    );
  },

  updateProfile(
    userId: string,
    data: Record<
      string,
      string | boolean | null | undefined | "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "SO" | "EN" | "AR"
    >,
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        isPrivateAccount:
          data.profileVisibility && typeof data.profileVisibility === "string"
            ? data.profileVisibility !== "PUBLIC"
            : undefined,
      },
      select: privateProfileSelect,
    }).then(async (user: any) => ({
      ...user,
      friendCount: await countFriends(user.id),
      isPrivateAccount: user.profileVisibility !== "PUBLIC",
    }));
  },

  async toggleFollow(viewerId: string, targetId: string) {
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: targetId,
        },
      },
    });

    if (existing) {
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: targetId,
          },
        },
      });

      return { isFollowing: false };
    }

    await prisma.follow.create({
      data: {
        followerId: viewerId,
        followingId: targetId,
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: targetId,
        actorId: viewerId,
        type: "FOLLOWED",
        title: "You have a new follower",
        entityType: "user",
        entityId: viewerId,
      },
    });

    return { isFollowing: true };
  },

  async toggleBlock(viewerId: string, targetId: string) {
    const existing = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: viewerId,
          blockedId: targetId,
        },
      },
    });

    if (existing) {
      await prisma.block.delete({
        where: {
          blockerId_blockedId: {
            blockerId: viewerId,
            blockedId: targetId,
          },
        },
      });

      return { isBlocked: false };
    }

    await prisma.block.create({
      data: {
        blockerId: viewerId,
        blockedId: targetId,
      },
    });

    return { isBlocked: true };
  },

  async reportUser(viewerId: string, targetId: string, reason: string) {
    return moderationService.createReport(viewerId, {
      targetType: "USER",
      targetId,
      reason,
    });
  },
};
