import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

const forbiddenResponse = (
  res: Response,
  reason: "suspended" | "banned",
  message: string,
) => res.status(StatusCodes.FORBIDDEN).json({ message, reason });

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);

    if (payload.tokenType !== "access") {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        role: true,
        suspendedAt: true,
        bannedAt: true,
      },
    });

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    if (user.bannedAt) {
      return forbiddenResponse(res, "banned", "This account has been banned");
    }

    if (user.suspendedAt) {
      return forbiddenResponse(res, "suspended", "This account is suspended");
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      bannedAt: user.bannedAt?.toISOString() ?? null,
    };
    return next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
  }
};

export const requireRoles =
  (...roles: Array<"ADMIN" | "MODERATOR">) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role === "USER" || !roles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Forbidden" });
    }

    return next();
  };
