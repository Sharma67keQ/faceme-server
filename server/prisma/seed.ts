import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_IN_PRODUCTION !== "true") {
  throw new Error("Seeding is disabled in production unless ALLOW_SEED_IN_PRODUCTION=true");
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "InviteRedemption",
      "Invite",
      "ProductFeedback",
      "BetaAccess",
      "FeatureFlag",
      "MessageStatus",
      "Message",
      "ConversationParticipant",
      "Conversation",
      "Notification",
      "CommentReaction",
      "PostComment",
      "PostLike",
      "SavedPost",
      "StoryView",
      "Story",
      "ReelLike",
      "Reel",
      "StatusReaction",
      "StatusView",
      "Status",
      "VoiceParticipant",
      "VoiceRoom",
      "Post",
      "GroupMember",
      "Group",
      "PageFollower",
      "Page",
      "FriendRequest",
      "Friendship",
      "Follow",
      "Block",
      "ModerationLog",
      "Report",
      "CommunityMember",
      "Community",
      "Profile",
      "RefreshToken",
      "User"
    RESTART IDENTITY CASCADE
  `);

  const [amina, david, zuri, lindiwe] = await Promise.all([
    prisma.user.create({
      data: {
        email: "amina@faceme.app",
        username: "amina",
        passwordHash,
        firstName: "Amina",
        lastName: "Khan",
        bio: "Building calm communities and real conversations.",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        role: "ADMIN",
        isOnboardingComplete: true,
        profile: {
          create: {
            displayName: "Amina Khan",
            bio: "Building calm communities and real conversations.",
            location: "Johannesburg",
          },
        },
        betaAccess: {
          create: {
            isBetaUser: true,
            cohort: "Founding Circle",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "david@faceme.app",
        username: "david",
        passwordHash,
        firstName: "David",
        lastName: "Cole",
        bio: "Product designer. Coffee first, then opinions.",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        role: "MODERATOR",
        isOnboardingComplete: true,
        profile: {
          create: {
            displayName: "David Cole",
            bio: "Product designer. Coffee first, then opinions.",
            location: "Cape Town",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "zuri@faceme.app",
        username: "zuri",
        passwordHash,
        firstName: "Zuri",
        lastName: "Ndlovu",
        bio: "Creator mode loading. Stories and short updates coming soon.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        isOnboardingComplete: true,
        accountType: "CREATOR",
        profile: {
          create: {
            displayName: "Zuri Ndlovu",
            bio: "Creator mode loading. Stories and short updates coming soon.",
            location: "Durban",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "lindiwe@faceme.app",
        username: "lindiwe",
        passwordHash,
        firstName: "Lindiwe",
        lastName: "Maseko",
        bio: "Hosting community-first groups and real-time chats.",
        avatarUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df",
        isOnboardingComplete: false,
      },
    }),
  ]);

  await prisma.featureFlag.createMany({
    data: [
      {
        key: "beta-onboarding",
        name: "Beta onboarding",
        description: "Shows onboarding setup recommendations.",
        isEnabled: true,
        rollout: 100,
      },
      {
        key: "invite-links",
        name: "Invite links",
        description: "Enables natural invite growth loop.",
        isEnabled: true,
        rollout: 100,
      },
      {
        key: "group-chat",
        name: "Group chat",
        description: "Enables group-linked messaging rooms.",
        isEnabled: true,
        rollout: 100,
      },
    ],
  });

  await prisma.follow.createMany({
    data: [
      { followerId: amina.id, followingId: david.id },
      { followerId: amina.id, followingId: zuri.id },
      { followerId: david.id, followingId: amina.id },
      { followerId: zuri.id, followingId: amina.id },
    ],
  });

  await prisma.friendship.createMany({
    data: [
      { userId: amina.id, friendId: david.id },
      { userId: david.id, friendId: amina.id },
      { userId: amina.id, friendId: zuri.id },
      { userId: zuri.id, friendId: amina.id },
    ],
  });

  await prisma.friendRequest.create({
    data: {
      senderId: lindiwe.id,
      receiverId: amina.id,
    },
  });

  const [designPage, growthPage] = await Promise.all([
    prisma.page.create({
      data: {
        ownerId: david.id,
        name: "Faceme Design Notes",
        slug: "faceme-design-notes",
        description: "Product design decisions, visual system notes, and premium UI thinking.",
        logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
      },
    }),
    prisma.page.create({
      data: {
        ownerId: zuri.id,
        name: "Creator Growth Lab",
        slug: "creator-growth-lab",
        description: "Healthy creator growth strategies and launch-ready content loops.",
        logoUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
      },
    }),
  ]);

  await prisma.pageFollower.createMany({
    data: [
      { pageId: designPage.id, userId: amina.id },
      { pageId: designPage.id, userId: zuri.id },
      { pageId: growthPage.id, userId: amina.id },
    ],
  });

  const buildersChat = await prisma.conversation.create({
    data: {
      type: "GROUP",
      title: "Faceme Builders Circle",
      description: "Realtime product and launch discussion.",
      participants: {
        create: [
          { userId: amina.id, role: "OWNER" },
          { userId: david.id },
          { userId: zuri.id },
        ],
      },
    },
  });

  const buildersGroup = await prisma.group.create({
    data: {
      ownerId: amina.id,
      name: "Faceme Builders",
      slug: "faceme-builders",
      description: "Public product discussion for early builders and testers.",
      privacy: "PUBLIC",
      chatId: buildersChat.id,
      members: {
        create: [
          { userId: amina.id, role: "OWNER", status: "ACTIVE" },
          { userId: david.id, status: "ACTIVE" },
          { userId: zuri.id, status: "ACTIVE" },
        ],
      },
    },
  });

  const betaGroupChat = await prisma.conversation.create({
    data: {
      type: "GROUP",
      title: "Private Beta Feedback",
      description: "Invite-only feedback channel.",
      participants: {
        create: [{ userId: david.id, role: "OWNER" }, { userId: amina.id }],
      },
    },
  });

  await prisma.group.create({
    data: {
      ownerId: david.id,
      name: "Private Beta Feedback",
      slug: "private-beta-feedback",
      description: "Private group for structured launch feedback.",
      privacy: "PRIVATE",
      chatId: betaGroupChat.id,
      members: {
        create: [
          { userId: david.id, role: "OWNER", status: "ACTIVE" },
          { userId: amina.id, status: "ACTIVE" },
          { userId: lindiwe.id, status: "PENDING" },
        ],
      },
    },
  });

  const [postOne, postTwo, postThree, quickPost] = await Promise.all([
    prisma.post.create({
      data: {
        authorId: amina.id,
        body: "Faceme now blends friends, groups, pages, chat, and discovery into one social graph.",
        shareSlug: "faceme-core-social-graph",
      },
    }),
    prisma.post.create({
      data: {
        authorId: david.id,
        body: "Design note: premium does not mean cluttered. Clean hierarchy wins.",
        shareSlug: "design-clean-hierarchy",
      },
    }),
    prisma.post.create({
      data: {
        authorId: david.id,
        body: "Publishing as a page keeps creator, brand, and product voices distinct without fragmenting identity.",
        pageId: designPage.id,
        shareSlug: "page-publishing-voice",
      },
    }),
    prisma.post.create({
      data: {
        authorId: zuri.id,
        body: "Quick take: active discussions should outrank passive scrolling.",
        kind: "QUICK",
        groupId: buildersGroup.id,
        shareSlug: "quick-discussion-ranking",
      },
    }),
  ]);

  await prisma.postLike.createMany({
    data: [
      { postId: postOne.id, userId: david.id },
      { postId: postOne.id, userId: zuri.id },
      { postId: postTwo.id, userId: amina.id },
      { postId: quickPost.id, userId: amina.id },
      { postId: quickPost.id, userId: david.id },
    ],
  });

  const mainComment = await prisma.postComment.create({
    data: {
      postId: postOne.id,
      authorId: david.id,
      body: "That keeps identity, discovery, and conversation in one loop.",
    },
  });

  await prisma.postComment.createMany({
    data: [
      {
        postId: postTwo.id,
        authorId: amina.id,
        body: "Exactly. The interface feels better when the system is disciplined.",
      },
      {
        postId: quickPost.id,
        authorId: amina.id,
        body: "And the feed should reward replies, not just taps.",
      },
      {
        postId: quickPost.id,
        authorId: david.id,
        body: "That is the right ranking direction for launch.",
      },
      {
        postId: postThree.id,
        authorId: zuri.id,
        body: "Pages should feel native to the same graph, not bolted on.",
      },
    ],
  });

  await prisma.postComment.create({
    data: {
      postId: postOne.id,
      authorId: zuri.id,
      body: "Agree. This is also better for onboarding.",
      parentCommentId: mainComment.id,
    },
  });

  await prisma.commentReaction.createMany({
    data: [
      {
        commentId: mainComment.id,
        userId: amina.id,
        type: "LIKE",
        reactionKey: "LIKE",
      },
      {
        commentId: mainComment.id,
        userId: zuri.id,
        type: "EMOJI",
        emoji: "🔥",
        reactionKey: "EMOJI:🔥",
      },
    ],
  });

  const directConversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      participants: {
        create: [{ userId: amina.id }, { userId: david.id }],
      },
    },
  });

  const [messageOne, messageTwo, messageThree] = await Promise.all([
    prisma.message.create({
      data: {
        conversationId: directConversation.id,
        senderId: amina.id,
        text: "Server foundation is ready. Want realistic social seeds next?",
        type: "TEXT",
      },
    }),
    prisma.message.create({
      data: {
        conversationId: directConversation.id,
        senderId: david.id,
        mediaUrl: "https://example.com/walkthrough.mp4",
        type: "VIDEO",
        mediaType: "VIDEO",
      },
    }),
    prisma.message.create({
      data: {
        conversationId: directConversation.id,
        senderId: amina.id,
        mediaUrl: "https://example.com/voice-note.mp3",
        type: "AUDIO",
        mediaType: "AUDIO",
      },
    }),
  ]);

  await prisma.conversation.update({
    where: { id: directConversation.id },
    data: {
      lastMessageId: messageThree.id,
      lastMessageAt: messageThree.createdAt,
    },
  });

  await prisma.messageStatus.createMany({
    data: [
      { messageId: messageOne.id, userId: amina.id, status: "SEEN" },
      { messageId: messageOne.id, userId: david.id, status: "SEEN" },
      { messageId: messageTwo.id, userId: amina.id, status: "DELIVERED" },
      { messageId: messageTwo.id, userId: david.id, status: "SEEN" },
      { messageId: messageThree.id, userId: amina.id, status: "SEEN" },
      { messageId: messageThree.id, userId: david.id, status: "SENT" },
    ],
  });

  const invite = await prisma.invite.create({
    data: {
      userId: amina.id,
      code: "faceme-join-now",
      message: "Join me on Faceme",
    },
  });

  await prisma.inviteRedemption.create({
    data: {
      inviteId: invite.id,
      userId: david.id,
    },
  });

  await prisma.productFeedback.create({
    data: {
      userId: amina.id,
      subject: "Feed feels alive",
      body: "The combination of friend requests, suggestions, and active discussion labels makes the app feel populated immediately.",
      rating: 5,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        recipientId: amina.id,
        actorId: lindiwe.id,
        type: "FRIEND_REQUEST",
        title: "New friend request",
        entityType: "friend-request",
      },
      {
        recipientId: david.id,
        actorId: amina.id,
        type: "POST_COMMENTED",
        title: "Amina commented on your post",
        body: "Exactly. The interface feels better when the system is disciplined.",
        entityType: "post",
        entityId: postTwo.id,
      },
      {
        recipientId: david.id,
        actorId: amina.id,
        type: "PAGE_FOLLOWED",
        title: "Your page has a new follower",
        entityType: "page",
        entityId: designPage.id,
      },
      {
        recipientId: amina.id,
        actorId: zuri.id,
        type: "GROUP_ACTIVITY",
        title: "Your group is active",
        body: "People are replying now in Faceme Builders.",
        entityType: "group",
        entityId: buildersGroup.id,
      },
    ],
  });

  console.log("Faceme seed complete");
  console.log("Users:");
  console.log("- amina@faceme.app / Password123! (ADMIN)");
  console.log("- david@faceme.app / Password123! (MODERATOR)");
  console.log("- zuri@faceme.app / Password123!");
  console.log("- lindiwe@faceme.app / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
