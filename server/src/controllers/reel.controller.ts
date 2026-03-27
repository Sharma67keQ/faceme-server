import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { reelService } from "../services/reel.service.js";
import { trimmedString } from "../utils/validation.js";

const createReelSchema = z.object({
  videoUrl: z.string().url(),
  caption: z.string().max(600).optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "FRIENDS"]).optional(),
});

const commentSchema = z.object({
  body: trimmedString(1, 600),
  parentCommentId: z.string().min(1).optional(),
});

const reportSchema = z.object({
  reason: trimmedString(3, 500),
});

export const reelController = {
  async list(req: Request, res: Response) {
    const reels = await reelService.list(req.user!.id);
    return res.status(StatusCodes.OK).json(reels);
  },

  async create(req: Request, res: Response) {
    const payload = createReelSchema.parse(req.body);
    const reel = await reelService.create(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(reel);
  },

  async update(req: Request, res: Response) {
    const reelId = z.string().min(1).parse(req.params.reelId);
    const payload = createReelSchema.parse(req.body);
    const reel = await reelService.update(req.user!.id, reelId, payload);
    return res.status(StatusCodes.OK).json(reel);
  },

  async remove(req: Request, res: Response) {
    const reelId = z.string().min(1).parse(req.params.reelId);
    const result = await reelService.delete(req.user!.id, reelId);
    return res.status(StatusCodes.OK).json(result);
  },

  async like(req: Request, res: Response) {
    const reelId = z.string().min(1).parse(req.params.reelId);
    const result = await reelService.toggleLike(req.user!.id, reelId);
    return res.status(StatusCodes.OK).json(result);
  },

  async report(req: Request, res: Response) {
    const reelId = z.string().min(1).parse(req.params.reelId);
    const payload = reportSchema.parse(req.body);
    const result = await reelService.report(req.user!.id, reelId, payload.reason);
    return res.status(StatusCodes.CREATED).json(result);
  },

  async comment(req: Request, res: Response) {
    const reelId = z.string().min(1).parse(req.params.reelId);
    const payload = commentSchema.parse(req.body);
    const result = await reelService.commentOnReel(req.user!.id, reelId, payload.body, payload.parentCommentId);
    return res.status(StatusCodes.CREATED).json(result);
  },

  async share(req: Request, res: Response) {
    const reelId = z.string().min(1).parse(req.params.reelId);
    const result = await reelService.share(reelId);
    return res.status(StatusCodes.OK).json(result);
  },
};
