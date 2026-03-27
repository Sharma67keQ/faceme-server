import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { storyService } from "../services/story.service.js";
import { secureUrlSchema, trimmedString } from "../utils/validation.js";

const createStorySchema = z.object({
  mediaUrl: secureUrlSchema,
  caption: trimmedString(1, 280).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
});

export const storyController = {
  async listFollowing(req: Request, res: Response) {
    const stories = await storyService.listFollowingStories(req.user!.id);
    return res.status(StatusCodes.OK).json(stories);
  },

  async create(req: Request, res: Response) {
    const payload = createStorySchema.parse(req.body);
    const story = await storyService.createStory(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(story);
  },

  async view(req: Request, res: Response) {
    const storyId = z.string().min(1).parse(req.params.storyId);
    const result = await storyService.markViewed(req.user!.id, storyId);
    return res.status(StatusCodes.OK).json(result);
  },
};
