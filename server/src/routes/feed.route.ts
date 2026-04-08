import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const feedRouter = Router();

const createPostSchema = z.object({
  body: z.string().min(1).max(2000),
});

feedRouter.get("/", async (_req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      body: true,
      createdAt: true,
      mediaUrl: true,
      mediaType: true,
      author: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
          shares: true,
        },
      },
    },
  });

  res.json({ posts });
});

feedRouter.post("/", requireAuth, async (req, res) => {
  const input = createPostSchema.parse(req.body);

  const post = await prisma.post.create({
    data: {
      authorId: req.auth!.sub,
      body: input.body.trim(),
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
          shares: true,
        },
      },
    },
  });

  res.status(201).json({ post });
});
