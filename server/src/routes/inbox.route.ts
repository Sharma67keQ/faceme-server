import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/app-error.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const createDirectSchema = z.object({
  username: z.string().min(3),
});

const sendMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const inboxRouter = Router();

inboxRouter.use(requireAuth);

inboxRouter.get("/conversations", async (req, res) => {
  const conversations = await prisma.conversationParticipant.findMany({
    where: { userId: req.auth!.sub },
    orderBy: { conversation: { updatedAt: "desc" } },
    select: {
      conversation: {
        select: {
          id: true,
          title: true,
          updatedAt: true,
          participants: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              text: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  type ConversationEntry = {
    conversation: {
      id: string;
      title: string | null;
      updatedAt: Date;
      participants: Array<{
        user: {
          id: string;
          username: string;
          firstName: string;
          lastName: string | null;
        };
      }>;
      messages: Array<{
        text: string | null;
        createdAt: Date;
      }>;
    };
  };

  res.json({
    conversations: (conversations as ConversationEntry[]).map((entry) => {
      const participants = entry.conversation.participants.map((participant) => participant.user);
      const otherUsers = participants.filter((user) => user.id !== req.auth!.sub);

      return {
        id: entry.conversation.id,
        title:
          entry.conversation.title ??
          otherUsers.map((user) => [user.firstName, user.lastName].filter(Boolean).join(" ")).join(", "),
        updatedAt: entry.conversation.updatedAt,
        lastMessage: entry.conversation.messages[0]?.text ?? "No messages yet",
      };
    }),
  });
});

inboxRouter.post("/conversations/direct", async (req, res) => {
  const input = createDirectSchema.parse(req.body);

  const recipient = await prisma.user.findUnique({
    where: { username: input.username.replace(/^@/, "") },
  });

  if (!recipient) {
    throw new AppError("Recipient not found", 404);
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      type: "DIRECT",
      participants: {
        every: {
          userId: {
            in: [req.auth!.sub, recipient.id],
          },
        },
      },
    },
    select: { id: true },
  });

  if (existing) {
    return res.json({ conversationId: existing.id });
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      participants: {
        create: [{ userId: req.auth!.sub }, { userId: recipient.id }],
      },
    },
    select: { id: true },
  });

  res.status(201).json({ conversationId: conversation.id });
});

inboxRouter.get("/conversations/:conversationId/messages", async (req, res) => {
  const conversationId = req.params.conversationId;

  const membership = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: req.auth!.sub,
      },
    },
  });

  if (!membership) {
    throw new AppError("Conversation not found", 404);
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      text: true,
      createdAt: true,
      senderId: true,
      sender: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  });

  res.json({ messages });
});

inboxRouter.post("/conversations/:conversationId/messages", async (req, res) => {
  const conversationId = req.params.conversationId;
  const input = sendMessageSchema.parse(req.body);

  const membership = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: req.auth!.sub,
      },
    },
  });

  if (!membership) {
    throw new AppError("Conversation not found", 404);
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: req.auth!.sub,
      text: input.text.trim(),
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      senderId: true,
      sender: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: message.createdAt,
      updatedAt: message.createdAt,
    },
  });

  res.status(201).json({ message });
});
