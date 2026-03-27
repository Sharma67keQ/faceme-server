import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);
notificationRouter.get("/", asyncHandler(notificationController.list));
notificationRouter.patch("/:notificationId/read", asyncHandler(notificationController.markRead));
