import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { communityController } from "../controllers/community.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const communityRouter = Router();

communityRouter.use(requireAuth);
communityRouter.get("/", asyncHandler(communityController.list));
communityRouter.post("/", asyncHandler(communityController.create));
communityRouter.post("/:communityId/join", asyncHandler(communityController.join));
communityRouter.patch("/:communityId", asyncHandler(communityController.update));
communityRouter.delete("/:communityId", asyncHandler(communityController.remove));
