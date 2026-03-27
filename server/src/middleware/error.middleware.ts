import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";
import { ApiError } from "../utils/api-error.js";

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    logger.warn("request.validation_failed", {
      requestId: _req.requestId,
      path: _req.originalUrl,
      issues: error.flatten(),
    });

    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      issues: error.flatten(),
      requestId: _req.requestId,
    });
  }

  if (error instanceof ApiError) {
    logger.warn("request.api_error", {
      requestId: _req.requestId,
      path: _req.originalUrl,
      statusCode: error.statusCode,
      message: error.message,
    });

    return res.status(error.statusCode).json({
      message: error.message,
      requestId: _req.requestId,
    });
  }

  logger.error("request.unhandled_error", {
    requestId: _req.requestId,
    path: _req.originalUrl,
    message: error.message,
    stack: error.stack,
  });

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: "Internal server error",
    requestId: _req.requestId,
  });
};
