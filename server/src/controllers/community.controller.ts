import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { communityService } from "../services/community.service.js";
import { slugSchema, trimmedString } from "../utils/validation.js";

const createCommunitySchema = z.object({
  name: trimmedString(2, 80),
  slug: slugSchema,
  description: trimmedString(1, 280).optional(),
});

const updateCommunitySchema = z.object({
  name: trimmedString(2, 80).optional(),
  description: trimmedString(1, 280).optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const communityController = {
  async list(req: Request, res: Response) {
    const communities = await communityService.list(req.user!.id);
    return res.status(StatusCodes.OK).json(communities);
  },

  async create(req: Request, res: Response) {
    const payload = createCommunitySchema.parse(req.body);
    const community = await communityService.create(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(community);
  },

  async join(req: Request, res: Response) {
    const communityId = z.string().min(1).parse(req.params.communityId);
    const result = await communityService.join(req.user!.id, communityId);
    return res.status(StatusCodes.OK).json(result);
  },

  async update(req: Request, res: Response) {
    const communityId = z.string().min(1).parse(req.params.communityId);
    const payload = updateCommunitySchema.parse(req.body);
    const community = await communityService.update(req.user!.id, communityId, payload);
    return res.status(StatusCodes.OK).json(community);
  },

  async remove(req: Request, res: Response) {
    const communityId = z.string().min(1).parse(req.params.communityId);
    const result = await communityService.remove(req.user!.id, communityId);
    return res.status(StatusCodes.OK).json(result);
  },
};
