import { Router } from "express";
import { reelController } from "../controllers/reel.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const reelRouter = Router();

reelRouter.use(requireAuth);
reelRouter.get("/", asyncHandler(reelController.list));
reelRouter.post("/", asyncHandler(reelController.create));
reelRouter.patch("/:reelId", asyncHandler(reelController.update));
reelRouter.delete("/:reelId", asyncHandler(reelController.remove));
reelRouter.post("/:reelId/like", asyncHandler(reelController.like));
reelRouter.post("/:reelId/comments", asyncHandler(reelController.comment));
reelRouter.post("/:reelId/share", asyncHandler(reelController.share));
reelRouter.post("/:reelId/report", asyncHandler(reelController.report));
