import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);
chatRouter.get("/conversations", asyncHandler(chatController.listConversations));
chatRouter.post("/conversations/direct", asyncHandler(chatController.createDirectConversation));
chatRouter.post("/conversations/group", asyncHandler(chatController.createGroupConversation));
chatRouter.get("/conversations/:conversationId/messages", asyncHandler(chatController.listMessages));
chatRouter.post("/conversations/:conversationId/messages", asyncHandler(chatController.createMessage));
