import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { moderationService } from "./moderation.service.js";
import { ApiError } from "../utils/api-error.js";

const userPreviewSelect = {
  id: true,
  username: true,
  firstName: true,
  avatarUrl: true,
} as const;

const commentReactionSelect = {
  userId: true,
  type: true,
  emoji: true,
} as const;

const replyInclude = {
  author: {
    select: userPreviewSelect,
  },
  reactions: {
    orderBy: { createdAt: "asc" },
    select: commentReactionSelect,
  },
} as const;

const commentInclude = {
  author: {
    select: userPreviewSelect,
  },
  reactions: {
    orderBy: { createdAt: "asc" },
    select: commentReactionSelect,
  },
  replies: {
    where: {
      hiddenAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: replyInclude,
  },
} as const;

const postInclude = {
  author: {
    select: userPreviewSelect,
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
  comments: {
    where: {
      parentCommentId: null,
    },
    orderBy: { createdAt: "asc" },
    include: commentInclude,
  },
  sharedPost: {
    include: {
      author: {
        select: userPreviewSelect,
      },
    },
  },
  savedBy: {
    select: {
      userId: true,
    },
  },
  _count: {
    select: { likes: true, comments: true },
  },
} as const;

const serializeReactionSummary = (
  reactions: Array<{ userId: string; type: "LIKE" | "DISLIKE" | "EMOJI"; emoji: string | null }>,
  viewerId: string,
) => {
  const emojiMap = new Map<string, { emoji: string; count: number; reacted: boolean }>();

  reactions
    .filter((reaction) => reaction.type === "EMOJI" && reaction.emoji)
    .forEach((reaction) => {
      const current = emojiMap.get(reaction.emoji!);

      emojiMap.set(reaction.emoji!, {
        emoji: reaction.emoji!,
        count: (current?.count ?? 0) + 1,
        reacted: current?.reacted ?? reaction.userId === viewerId,
      });
    });

  return {
    likes: reactions.filter((reaction) => reaction.type === "LIKE").length,
    dislikes: reactions.filter((reaction) => reaction.type === "DISLIKE").length,
    emojis: Array.from(emojiMap.values()),
  };
};

const serializeComment = (comment: any, viewerId: string): any => ({
  id: comment.id,
  postId: comment.postId,
  body: comment.body,
  createdAt: comment.createdAt,
  updatedAt: (comment as any).updatedAt,
  parentCommentId: comment.parentCommentId,
  author: comment.author,
  reactionSummary: serializeReactionSummary(comment.reactions, viewerId),
  viewerReactions: {
    like: comment.reactions.some((reaction: any) => reaction.userId === viewerId && reaction.type === "LIKE"),
    dislike: comment.reactions.some(
      (reaction: any) => reaction.userId === viewerId && reaction.type === "DISLIKE",
    ),
    emojis: comment.reactions
      .filter(
        (reaction: any) => reaction.userId === viewerId && reaction.type === "EMOJI" && reaction.emoji,
      )
      .map((reaction: any) => reaction.emoji!) ?? [],
  },
  replies:
    comment.replies?.map((reply: any) =>
      serializeComment(
        {
          ...reply,
          replies: [],
        },
        viewerId,
      ),
    ) ?? [],
});

const serializePost = (post: any, viewerId: string): any => ({
  ...post,
  canEdit: post.author.id === viewerId,
  canDelete: post.author.id === viewerId,
  isSaved: post.savedBy.some((item: any) => item.userId === viewerId),
  discussionLabel:
    post._count.comments >= 8 ? "Active discussion" : post._count.comments >= 3 ? "People are replying now" : null,
  comments: post.comments.map((comment: any) => serializeComment(comment, viewerId)),
});

const buildPostVisibilityWhere = (viewerId: string, authorId?: string) => ({
  hiddenAt: null,
  ...(authorId ? { authorId } : {}),
  OR: [
    { authorId: viewerId },
    {
      visibility: "PUBLIC",
    },
    {
      visibility: "FOLLOWERS",
      author: {
        followers: {
          some: {
            followerId: viewerId,
          },
        },
      },
    },
    {
      visibility: "FRIENDS",
      author: {
        initiatedFriendships: {
          some: {
            friendId: viewerId,
          },
        },
      },
    },
  ],
});

const scorePost = (
  post: {
    authorId: string;
    createdAt: Date;
    kind: "STANDARD" | "QUICK" | "SHARE";
    comments: Array<{ replies: Array<unknown> }>;
    _count: { comments: number; likes: number };
  },
  interactedAuthorIds: Set<string>,
) => {
  const ageHours = Math.max(1, (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60));
  const discussionScore =
    post._count.comments * 4 +
    post.comments.reduce((sum, comment) => sum + comment.replies.length * 3, 0) +
    post._count.likes;
  const interactionBoost = interactedAuthorIds.has(post.authorId) ? 12 : 0;
  const freshnessScore = Math.max(0, 24 - ageHours);
  const quickPostBoost = post.kind === "QUICK" ? 4 : 0;

  return discussionScore + interactionBoost + freshnessScore + quickPostBoost;
};

const getReactionKey = (input: { type: "LIKE" | "DISLIKE" | "EMOJI"; emoji?: string }) =>
  input.type === "EMOJI" ? `EMOJI:${input.emoji}` : input.type;

export const postService = {
  async getSharedPost(shareSlug: string, viewerId?: string) {
    const post = await prisma.post.findUniqueOrThrow({
      where: { shareSlug },
      include: postInclude,
    });

    if (post.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");
    }

    return serializePost(post as any, viewerId ?? "");
  },

  async createPost(
    userId: string,
    input: {
      body: string;
      mediaUrl?: string;
      mediaType?: "IMAGE" | "VIDEO";
      kind?: "STANDARD" | "QUICK" | "SHARE";
      pageId?: string;
      groupId?: string;
      visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
    },
  ) {
    if (input.pageId) {
      const page = await prisma.page.findUniqueOrThrow({
        where: { id: input.pageId },
        select: { ownerId: true },
      });

      if (page.ownerId !== userId) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only the page owner can publish page posts");
      }
    }

    if (input.groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId,
          },
        },
        select: { status: true },
      });

      if (membership?.status !== "ACTIVE") {
        throw new ApiError(StatusCodes.FORBIDDEN, "You must be an active member to post in this group");
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        body: input.body,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaUrl ? input.mediaType ?? "IMAGE" : undefined,
        kind: input.kind ?? "STANDARD",
        visibility: input.visibility ?? "PUBLIC",
        pageId: input.pageId,
        groupId: input.groupId,
        shareSlug: `post-${Math.random().toString(36).slice(2, 10)}`,
      },
      include: postInclude,
    });

    return serializePost(post, userId);
  },

  async updatePost(
    userId: string,
    postId: string,
    input: {
      body: string;
      mediaUrl?: string | null;
      mediaType?: "IMAGE" | "VIDEO" | null;
      visibility?: "PUBLIC" | "FOLLOWERS" | "FRIENDS";
    },
  ) {
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (post.authorId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can edit this post");
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        body: input.body,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaUrl ? input.mediaType ?? "IMAGE" : null,
        visibility: input.visibility,
      },
      include: postInclude,
    });

    return serializePost(updated, userId);
  },

  async deletePost(userId: string, postId: string) {
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (post.authorId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can delete this post");
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return { deleted: true };
  },

  async getFeed(userId: string) {
    const interactions = await prisma.postComment.findMany({
      where: { authorId: userId },
      select: {
        post: {
          select: {
            authorId: true,
          },
        },
      },
      take: 100,
    });
    const interactedAuthorIds = new Set<string>(
      interactions.map((item: any) => item.post.authorId),
    );

    const friendIds = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const followedPageIds = await prisma.pageFollower.findMany({
      where: { userId },
      select: { pageId: true },
    });

    const posts = await prisma.post.findMany({
      where: {
        AND: [
          { OR: buildPostVisibilityWhere(userId).OR },
          {
            OR: [
              { authorId: userId },
              {
                authorId: {
                  in: friendIds.map((item: { friendId: string }) => item.friendId),
                },
              },
              {
                author: {
                  followers: {
                    some: { followerId: userId },
                  },
                },
              },
              {
                pageId: {
                  in: followedPageIds.map((item: { pageId: string }) => item.pageId),
                },
              },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: postInclude,
    });

    return posts
      .sort(
        (left: any, right: any) =>
          scorePost(right, interactedAuthorIds) - scorePost(left, interactedAuthorIds),
      )
      .slice(0, 30)
      .map((post: any) => ({
        ...serializePost(post, userId),
        scoreReason:
          post.authorId === userId
            ? "Your activity"
            : followedPageIds.some((item: { pageId: string }) => item.pageId === post.pageId)
              ? "Followed page"
              : friendIds.some((item: { friendId: string }) => item.friendId === post.authorId)
                ? "Friend network"
                : "Trending discussion",
      }));
  },

  async getSavedPosts(userId: string) {
    const savedPosts = await prisma.savedPost.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: postInclude,
        },
      },
    });

    return savedPosts.map((savedPost: any) => serializePost(savedPost.post, userId));
  },

  async getExplore(userId: string) {
    const posts = await prisma.post.findMany({
      where: {
        authorId: {
          not: userId,
        },
        OR: buildPostVisibilityWhere(userId).OR,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 60,
      include: postInclude,
    });

    return posts
      .sort(
        (left: any, right: any) =>
          scorePost(right, new Set<string>()) - scorePost(left, new Set<string>()),
      )
      .slice(0, 30)
      .map((post: any) => ({
        ...serializePost(post, userId),
        scoreReason: post._count.comments > 4 ? "Conversation focus" : "Trending now",
      }));
  },

  async getPostsByAuthor(userId: string, authorId: string) {
    const posts = await prisma.post.findMany({
      where: buildPostVisibilityWhere(userId, authorId),
      orderBy: { createdAt: "desc" },
      take: 50,
      include: postInclude,
    });

    return posts.map((post: any) => serializePost(post, userId));
  },

  async getPostsByPage(userId: string, pageId: string) {
    const posts = await prisma.post.findMany({
      where: {
        pageId,
        hiddenAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: postInclude,
    });

    return posts.map((post: any) => serializePost(post, userId));
  },

  async getPostsByGroup(userId: string, groupId: string) {
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      select: { status: true },
    });
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { privacy: true },
    });

    if (group.privacy === "PRIVATE" && membership?.status !== "ACTIVE") {
      throw new ApiError(StatusCodes.FORBIDDEN, "You must join this group to view posts");
    }

    const posts = await prisma.post.findMany({
      where: {
        groupId,
        hiddenAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: postInclude,
    });

    return posts.map((post: any) => serializePost(post, userId));
  },

  async likePost(userId: string, postId: string) {
    const like = await prisma.postLike.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, hiddenAt: true },
    });

    if (!post || post.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");
    }

    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: "POST_LIKED",
          title: "Your post was liked",
          entityType: "post",
          entityId: postId,
        },
      });
    }

    return like;
  },

  async commentOnPost(userId: string, postId: string, body: string, parentCommentId?: string) {
    const targetPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, hiddenAt: true },
    });

    if (!targetPost || targetPost.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");
    }

    if (parentCommentId) {
      const parentComment = await prisma.postComment.findUniqueOrThrow({
        where: { id: parentCommentId },
        select: {
          id: true,
          postId: true,
          parentCommentId: true,
          authorId: true,
          hiddenAt: true,
        },
      });

      if (parentComment.postId !== postId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Reply must belong to the same post");
      }

      if (parentComment.parentCommentId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Nested replies are limited to one level");
      }

      if (parentComment.hiddenAt) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Comment not found");
      }
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        authorId: userId,
        body,
        parentCommentId,
      },
      include: {
        ...commentInclude,
        replies: false,
      },
    });

    if (targetPost.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: targetPost.authorId,
          actorId: userId,
          type: parentCommentId ? "COMMENT_REPLIED" : "POST_COMMENTED",
          title: parentCommentId ? "New reply on your post" : "New comment on your post",
          entityType: "post",
          entityId: postId,
          body,
        },
      });
    }

    if (parentCommentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: parentCommentId },
        select: { authorId: true },
      });

      if (parentComment?.authorId && parentComment.authorId !== userId) {
        await prisma.notification.create({
          data: {
            recipientId: parentComment.authorId,
            actorId: userId,
            type: "COMMENT_REPLIED",
            title: "New reply to your comment",
            entityType: "comment",
            entityId: parentCommentId,
            body,
          },
        });
      }
    }

    return serializeComment({ ...comment, replies: [] }, userId);
  },

  async toggleCommentReaction(
    userId: string,
    commentId: string,
    input: { type: "LIKE" | "DISLIKE" | "EMOJI"; emoji?: string },
  ) {
    const targetComment = await prisma.postComment.findUniqueOrThrow({
      where: { id: commentId },
      select: { id: true, authorId: true, hiddenAt: true },
    });

    if (targetComment.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Comment not found");
    }

    const reactionKey = getReactionKey(input);

    if (input.type === "LIKE" || input.type === "DISLIKE") {
      await prisma.commentReaction.deleteMany({
        where: {
          commentId,
          userId,
          reactionKey: input.type === "LIKE" ? "DISLIKE" : "LIKE",
        },
      });
    }

    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_reactionKey: {
          commentId,
          userId,
          reactionKey,
        },
      },
    });

    if (existing) {
      await prisma.commentReaction.delete({
        where: {
          commentId_userId_reactionKey: {
            commentId,
            userId,
            reactionKey,
          },
        },
      });
    } else {
      await prisma.commentReaction.create({
        data: {
          commentId,
          userId,
          type: input.type,
          emoji: input.type === "EMOJI" ? input.emoji : null,
          reactionKey,
        },
      });
    }

    if (targetComment.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: targetComment.authorId,
          actorId: userId,
          type: "COMMENT_REACTED",
          title: "Someone reacted to your comment",
          entityType: "comment",
          entityId: commentId,
          body:
            input.type === "EMOJI"
              ? `${input.emoji} reaction on your comment`
              : `${input.type.toLowerCase()} reaction on your comment`,
        },
      });
    }

    const comment = await prisma.postComment.findUniqueOrThrow({
      where: { id: commentId },
      include: {
        ...commentInclude,
        replies: false,
      },
    });

    return serializeComment({ ...comment, replies: [] }, userId);
  },

  async updateComment(userId: string, commentId: string, body: string) {
    const comment = await prisma.postComment.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        hiddenAt: true,
      },
    });

    if (comment.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Comment not found");
    }

    if (comment.authorId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can edit this comment");
    }

    const updated = await prisma.postComment.update({
      where: { id: commentId },
      data: { body },
      include: {
        ...commentInclude,
        replies: false,
      },
    });

    return serializeComment({ ...updated, replies: [] }, userId);
  },

  async deleteComment(userId: string, commentId: string) {
    const comment = await prisma.postComment.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (comment.authorId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only the owner can delete this comment");
    }

    await prisma.postComment.delete({
      where: { id: commentId },
    });

    return { deleted: true };
  },

  async toggleSavedPost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { hiddenAt: true },
    });

    if (!post || post.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");
    }

    const existing = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existing) {
      await prisma.savedPost.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

      return { isSaved: false };
    }

    await prisma.savedPost.create({
      data: {
        userId,
        postId,
      },
    });

    return { isSaved: true };
  },

  async sharePost(userId: string, postId: string) {
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        body: true,
        hiddenAt: true,
      },
    });

    if (post.hiddenAt) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");
    }

    const sharedPost = await prisma.post.create({
      data: {
        authorId: userId,
        body: `Shared: ${post.body}`,
        sharedPostId: post.id,
        kind: "SHARE",
        shareSlug: `post-${Math.random().toString(36).slice(2, 10)}`,
      },
      include: postInclude,
    });

    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: "SYSTEM",
          title: "Your post was shared",
          body: "Someone shared one of your posts.",
          entityType: "post",
          entityId: post.id,
        },
      });
    }

    return serializePost(sharedPost, userId);
  },

  async reportPost(userId: string, postId: string, reason: string) {
    return moderationService.createReport(userId, {
      targetType: "POST",
      targetId: postId,
      reason,
    });
  },

  async reportComment(userId: string, commentId: string, reason: string) {
    return moderationService.createReport(userId, {
      targetType: "COMMENT",
      targetId: commentId,
      reason,
    });
  },
};
