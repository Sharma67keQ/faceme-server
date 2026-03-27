import { Router } from "express";
import { moderationController } from "../controllers/moderation.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const moderationRouter = Router();

moderationRouter.use(requireAuth);
moderationRouter.use(requireRoles("ADMIN", "MODERATOR"));
moderationRouter.get("/overview", asyncHandler(moderationController.overview));
moderationRouter.get("/reports", asyncHandler(moderationController.listReports));
moderationRouter.get("/logs", asyncHandler(moderationController.listLogs));
moderationRouter.patch("/reports/:reportId", asyncHandler(moderationController.updateReport));
moderationRouter.post("/posts/:postId/action", asyncHandler(moderationController.moderatePost));
moderationRouter.post("/comments/:commentId/action", asyncHandler(moderationController.moderateComment));
moderationRouter.post("/reels/:reelId/action", asyncHandler(moderationController.moderateReel));
moderationRouter.post("/statuses/:statusId/action", asyncHandler(moderationController.moderateStatus));
moderationRouter.post("/users/:userId/action", requireRoles("ADMIN"), asyncHandler(moderationController.moderateUser));
moderationRouter.post("/groups/:groupId/action", requireRoles("ADMIN"), asyncHandler(moderationController.moderateGroup));
moderationRouter.post("/pages/:pageId/action", requireRoles("ADMIN"), asyncHandler(moderationController.moderatePage));
