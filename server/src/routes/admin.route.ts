import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const resolveReportSchema = z.object({
  status: z.enum(["REVIEWING", "RESOLVED", "REJECTED"]),
});

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/dashboard", async (_req, res) => {
  const [users, posts, reports, conversations] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.conversation.count(),
  ]);

  res.json({
    metrics: {
      users,
      posts,
      openReports: reports,
      conversations,
    },
  });
});

adminRouter.get("/reports", async (_req, res) => {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      status: true,
      createdAt: true,
      reporter: {
        select: {
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  res.json({ reports });
});

adminRouter.patch("/reports/:reportId", async (req, res) => {
  const input = resolveReportSchema.parse(req.body);

  const report = await prisma.report.update({
    where: { id: req.params.reportId },
    data: { status: input.status },
  });

  res.json({ report });
});
