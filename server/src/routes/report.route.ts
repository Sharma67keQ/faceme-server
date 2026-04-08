import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const createReportSchema = z.object({
  targetType: z.enum(["USER", "POST", "COMMENT", "MESSAGE", "STORY", "COMMUNITY"]),
  targetId: z.string().min(1),
  reason: z.string().min(5).max(500),
  subjectUserId: z.string().optional(),
});

export const reportRouter = Router();

reportRouter.post("/", requireAuth, async (req, res) => {
  const input = createReportSchema.parse(req.body);

  const report = await prisma.report.create({
    data: {
      reporterId: req.auth!.sub,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason.trim(),
      subjectUserId: input.subjectUserId,
    },
  });

  res.status(201).json({ report });
});
