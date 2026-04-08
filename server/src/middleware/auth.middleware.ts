import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { verifyAccessToken } from "../lib/tokens.js";

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
};
