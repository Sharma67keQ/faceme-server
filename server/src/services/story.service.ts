import { prisma } from "../lib/prisma.js";

const storyInclude = {
  author: {
    select: {
      id: true,
      username: true,
      firstName: true,
      avatarUrl: true,
    },
  },
  views: {
    select: {
      viewerId: true,
    },
  },
} as const;

export const storyService = {
  async listFollowingStories(userId: string) {
    const stories = await prisma.story.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
        OR: [
          { authorId: userId },
          {
            author: {
              followers: {
                some: {
                  followerId: userId,
                },
              },
            },
          },
        ],
      },
      include: storyInclude,
      orderBy: [{ createdAt: "desc" }],
      take: 50,
    });

    return stories.map((story: (typeof stories)[number]) => ({
      ...story,
      isViewed: story.views.some((view: (typeof story.views)[number]) => view.viewerId === userId),
    }));
  },

  createStory(
    userId: string,
    payload: { mediaUrl: string; caption?: string; mediaType: "IMAGE" | "VIDEO" },
  ) {
    return prisma.$transaction(async (tx: typeof prisma) => {
      const story = await tx.story.create({
        data: {
          authorId: userId,
          mediaUrl: payload.mediaUrl,
          caption: payload.caption,
          mediaType: payload.mediaType,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
        include: {
          author: storyInclude.author,
        },
      });

      const followers = await tx.follow.findMany({
        where: {
          followingId: userId,
        },
        select: {
          followerId: true,
        },
      });

      if (followers.length > 0) {
        await tx.notification.createMany({
          data: followers.map((follower: (typeof followers)[number]) => ({
            recipientId: follower.followerId,
            actorId: userId,
            type: "STORY_REACTION",
            title: "A new story is live",
            body: payload.caption ?? "Someone you follow published a story.",
            entityType: "story",
            entityId: story.id,
          })),
        });
      }

      return story;
    });
  },

  async markViewed(userId: string, storyId: string) {
    await prisma.storyView.upsert({
      where: {
        storyId_viewerId: {
          storyId,
          viewerId: userId,
        },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        storyId,
        viewerId: userId,
      },
    });

    return { viewed: true };
  },
};
