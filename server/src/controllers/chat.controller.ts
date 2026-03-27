import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { chatService } from "../services/chat.service.js";
import { secureUrlSchema, trimmedString } from "../utils/validation.js";

const directConversationSchema = z.object({
  peerId: z.string().min(1),
});

const groupConversationSchema = z.object({
  title: trimmedString(2, 80),
  participantIds: z.array(z.string().min(1)).min(1).max(20),
});

const createMessageSchema = z
  .object({
    text: trimmedString(1, 4000).optional(),
    mediaUrl: secureUrlSchema.optional(),
    type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO"]).optional(),
    replyToMessageId: z.string().min(1).optional(),
  })
  .refine((value) => value.text || value.mediaUrl, "Message content is required");

export const chatController = {
  async createDirectConversation(req: Request, res: Response) {
    const payload = directConversationSchema.parse(req.body);
    const conversation = await chatService.getOrCreateDirectConversation(
      req.user!.id,
      payload.peerId,
    );

    return res.status(StatusCodes.CREATED).json(conversation);
  },

  async listConversations(req: Request, res: Response) {
    const conversations = await chatService.listConversations(req.user!.id);
    return res.status(StatusCodes.OK).json(conversations);
  },

  async createGroupConversation(req: Request, res: Response) {
    const payload = groupConversationSchema.parse(req.body);
    const conversation = await chatService.createGroupConversation(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(conversation);
  },

  async listMessages(req: Request, res: Response) {
    const conversationId = z.string().min(1).parse(req.params.conversationId);
    const messages = await chatService.getMessages(req.user!.id, conversationId);
    return res.status(StatusCodes.OK).json(messages);
  },

  async createMessage(req: Request, res: Response) {
    const conversationId = z.string().min(1).parse(req.params.conversationId);
    const payload = createMessageSchema.parse(req.body);
    const message = await chatService.createMessage(prisma, req.user!.id, conversationId, payload);
    return res.status(StatusCodes.CREATED).json(message);
  },
};
