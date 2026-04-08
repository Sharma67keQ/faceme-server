import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../lib/app-error.js";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null,
    });
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      details: (error as z.ZodError).flatten(),
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "Internal server error",
  });
};
