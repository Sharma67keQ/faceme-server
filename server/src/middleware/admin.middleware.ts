import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/app-error.js";

export const requireAdmin = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth?.sub) {
    return next(new AppError("Authentication required", 401));
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    select: { role: true },
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    return next(new AppError("Admin access required", 403));
  }

  return next();
};
