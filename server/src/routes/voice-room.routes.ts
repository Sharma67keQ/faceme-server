import { Router } from "express";
import { voiceRoomController } from "../controllers/voice-room.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const voiceRoomRouter = Router();

voiceRoomRouter.use(requireAuth);
voiceRoomRouter.get("/", asyncHandler(voiceRoomController.list));
voiceRoomRouter.post("/", asyncHandler(voiceRoomController.create));
voiceRoomRouter.post("/:roomId/join", asyncHandler(voiceRoomController.join));
voiceRoomRouter.post("/:roomId/leave", asyncHandler(voiceRoomController.leave));
