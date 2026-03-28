import { Router } from "express";
import { voiceRoomController } from "../controllers/voice-room.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const voiceRoomRouter = Router();

voiceRoomRouter.use(requireAuth);
voiceRoomRouter.get("/", asyncHandler(voiceRoomController.list));
voiceRoomRouter.get("/:roomId", asyncHandler(voiceRoomController.getById));
voiceRoomRouter.post("/", asyncHandler(voiceRoomController.create));
voiceRoomRouter.patch("/:roomId", asyncHandler(voiceRoomController.update));
voiceRoomRouter.post("/:roomId/join", asyncHandler(voiceRoomController.join));
voiceRoomRouter.post("/:roomId/leave", asyncHandler(voiceRoomController.leave));
voiceRoomRouter.post("/:roomId/state", asyncHandler(voiceRoomController.setState));
voiceRoomRouter.post("/:roomId/participants/:userId/role", asyncHandler(voiceRoomController.setRole));
voiceRoomRouter.delete("/:roomId/participants/:userId", asyncHandler(voiceRoomController.removeParticipant));
voiceRoomRouter.post("/:roomId/audio-token", asyncHandler(voiceRoomController.issueAudioToken));
voiceRoomRouter.post("/:roomId/end", asyncHandler(voiceRoomController.endRoom));
