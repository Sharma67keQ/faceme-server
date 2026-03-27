import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, asyncHandler(authController.login));
authRouter.post("/refresh", authRateLimiter, asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
