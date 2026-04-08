import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().max(50).nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  website: z.string().url().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const profileRouter = Router();

profileRouter.get("/me", requireAuth, async (req, res) => {
  const profile = await prisma.user.findUnique({
    where: { id: req.auth!.sub },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      bio: true,
      avatarUrl: true,
      location: true,
      website: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });

  res.json({ profile });
});

profileRouter.patch("/me", requireAuth, async (req, res) => {
  const input = updateProfileSchema.parse(req.body);

  const profile = await prisma.user.update({
    where: { id: req.auth!.sub },
    data: input,
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      bio: true,
      avatarUrl: true,
      location: true,
      website: true,
      role: true,
      updatedAt: true,
    },
  });

  res.json({ profile });
});
