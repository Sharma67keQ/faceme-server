import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { userService } from "../services/user.service.js";

const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(40).optional(),
  lastName: z.string().max(40).nullable().optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  location: z.string().max(80).nullable().optional(),
  website: z.string().url().nullable().optional(),
  accountType: z.enum(["PERSONAL", "CREATOR", "BUSINESS"]).optional(),
  profileVisibility: z.enum(["PUBLIC", "FOLLOWERS", "FRIENDS"]).optional(),
  isOnboardingComplete: z.boolean().optional(),
});

const reportSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const userController = {
  async me(req: Request, res: Response) {
    const user = await userService.getMe(req.user!.id);
    return res.status(StatusCodes.OK).json(user);
  },

  async search(req: Request, res: Response) {
    const query = z.string().min(1).parse(req.query.q);
    const users = await userService.searchUsers(query, req.user!.id);
    return res.status(StatusCodes.OK).json(users);
  },

  async suggestions(req: Request, res: Response) {
    const users = await userService.getSuggestedProfiles(req.user!.id);
    return res.status(StatusCodes.OK).json(users);
  },

  async getByUsername(req: Request, res: Response) {
    const username = z.string().min(1).parse(req.params.username);
    const user = await userService.getPublicProfile(req.user!.id, username);
    return res.status(StatusCodes.OK).json(user);
  },

  async getById(req: Request, res: Response) {
    const id = z.string().min(1).parse(req.params.id);
    const user = await userService.getPublicProfileById(req.user!.id, id);
    return res.status(StatusCodes.OK).json(user);
  },

  async postsByUsername(req: Request, res: Response) {
    const username = z.string().min(1).parse(req.params.username);
    const posts = await userService.getPublicProfilePosts(req.user!.id, username);
    return res.status(StatusCodes.OK).json(posts);
  },

  async followers(req: Request, res: Response) {
    const username = z.string().min(1).parse(req.params.username);
    const followers = await userService.listFollowers(req.user!.id, username);
    return res.status(StatusCodes.OK).json(followers);
  },

  async following(req: Request, res: Response) {
    const username = z.string().min(1).parse(req.params.username);
    const following = await userService.listFollowing(req.user!.id, username);
    return res.status(StatusCodes.OK).json(following);
  },

  async updateProfile(req: Request, res: Response) {
    const payload = updateProfileSchema.parse(req.body);
    const user = await userService.updateProfile(req.user!.id, payload);
    return res.status(StatusCodes.OK).json(user);
  },

  async toggleFollow(req: Request, res: Response) {
    const targetId = z.string().min(1).parse(req.params.id);

    if (targetId === req.user!.id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "You cannot follow yourself" });
    }

    const result = await userService.toggleFollow(req.user!.id, targetId);
    return res.status(StatusCodes.OK).json(result);
  },

  async block(req: Request, res: Response) {
    const targetId = z.string().min(1).parse(req.params.id);

    if (targetId === req.user!.id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "You cannot block yourself" });
    }

    const result = await userService.toggleBlock(req.user!.id, targetId);
    return res.status(StatusCodes.OK).json(result);
  },

  async report(req: Request, res: Response) {
    const targetId = z.string().min(1).parse(req.params.id);
    const payload = reportSchema.parse(req.body);

    if (targetId === req.user!.id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "You cannot report yourself" });
    }

    const result = await userService.reportUser(req.user!.id, targetId, payload.reason);
    return res.status(StatusCodes.CREATED).json(result);
  },
};
