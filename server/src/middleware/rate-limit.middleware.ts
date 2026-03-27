import rateLimit from "express-rate-limit";
import { env } from "../lib/env.js";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.APP_ENV === "production" ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests, please try again later.",
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.APP_ENV === "production" ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    message: "Too many authentication attempts, please try again later.",
  },
});
