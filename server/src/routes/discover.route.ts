import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const discoverRouter = Router();

discoverRouter.get("/", async (_req, res) => {
  const [communities, creators, posts] = await Promise.all([
    prisma.community.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        _count: { select: { followers: true, posts: true } },
      },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        body: true,
        author: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  res.json({
    communities,
    creators,
    posts,
  });
});
