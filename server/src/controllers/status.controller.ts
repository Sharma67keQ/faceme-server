import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { statusService } from "../services/status.service.js";
import { secureUrlSchema, trimmedString } from "../utils/validation.js";

const createStatusSchema = z
  .object({
    kind: z.enum(["TEXT", "IMAGE", "VIDEO"]),
    text: trimmedString(1, 600).optional(),
    mediaUrl: secureUrlSchema.optional(),
    visibility: z.enum(["PUBLIC", "FOLLOWERS", "FRIENDS"]).optional(),
  })
  .refine((value) => value.kind === "TEXT" ? Boolean(value.text) : Boolean(value.mediaUrl), {
    message: "Status content is required",
  });

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
  replyText: trimmedString(1, 280).optional(),
});

const reportSchema = z.object({
  reason: trimmedString(3, 500),
});

export const statusController = {
  async list(req: Request, res: Response) {
    const statuses = await statusService.listVisibleStatuses(req.user!.id);
    return res.status(StatusCodes.OK).json(statuses);
  },

  async create(req: Request, res: Response) {
    const payload = createStatusSchema.parse(req.body);
    const status = await statusService.createStatus(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(status);
  },

  async markViewed(req: Request, res: Response) {
    const statusId = z.string().min(1).parse(req.params.statusId);
    const result = await statusService.markViewed(req.user!.id, statusId);
    return res.status(StatusCodes.OK).json(result);
  },

  async react(req: Request, res: Response) {
    const statusId = z.string().min(1).parse(req.params.statusId);
    const payload = reactionSchema.parse(req.body);
    const result = await statusService.react(req.user!.id, statusId, payload);
    return res.status(StatusCodes.CREATED).json(result);
  },

  async report(req: Request, res: Response) {
    const statusId = z.string().min(1).parse(req.params.statusId);
    const payload = reportSchema.parse(req.body);
    const result = await statusService.report(req.user!.id, statusId, payload.reason);
    return res.status(StatusCodes.CREATED).json(result);
  },

  async getById(req: Request, res: Response) {
    const statusId = z.string().min(1).parse(req.params.statusId);
    const result = await statusService.getById(req.user!.id, statusId);
    return res.status(StatusCodes.OK).json(result);
  },

  async remove(req: Request, res: Response) {
    const statusId = z.string().min(1).parse(req.params.statusId);
    const result = await statusService.deleteStatus(req.user!.id, statusId);
    return res.status(StatusCodes.OK).json(result);
  },
};
