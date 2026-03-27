import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { socialService } from "../services/social.service.js";

const pageSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
});

const pageUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

const groupSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(600).optional(),
  privacy: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

const groupUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(600).optional(),
  privacy: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

const friendResponseSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

const feedbackSchema = z.object({
  subject: z.string().min(2).max(120),
  body: z.string().min(10).max(1500),
  rating: z.number().int().min(1).max(5).optional(),
});

const inviteSchema = z.object({
  message: z.string().min(3).max(180).optional(),
});

export const socialController = {
  async friends(req: Request, res: Response) {
    const friends = await socialService.listFriends(req.user!.id);
    return res.status(StatusCodes.OK).json(friends);
  },

  async friendRequests(req: Request, res: Response) {
    const requests = await socialService.listFriendRequests(req.user!.id);
    return res.status(StatusCodes.OK).json(requests);
  },

  async sendFriendRequest(req: Request, res: Response) {
    const targetId = z.string().min(1).parse(req.params.userId);
    const request = await socialService.sendFriendRequest(req.user!.id, targetId);
    return res.status(StatusCodes.CREATED).json(request);
  },

  async respondToFriendRequest(req: Request, res: Response) {
    const requestId = z.string().min(1).parse(req.params.requestId);
    const payload = friendResponseSchema.parse(req.body);
    const request = await socialService.respondToFriendRequest(req.user!.id, requestId, payload.action);
    return res.status(StatusCodes.OK).json(request);
  },

  async removeFriend(req: Request, res: Response) {
    const targetId = z.string().min(1).parse(req.params.userId);
    const result = await socialService.removeFriend(req.user!.id, targetId);
    return res.status(StatusCodes.OK).json(result);
  },

  async relationship(req: Request, res: Response) {
    const targetId = z.string().min(1).parse(req.params.userId);
    const relationship = await socialService.getRelationship(req.user!.id, targetId);
    return res.status(StatusCodes.OK).json(relationship);
  },

  async peopleYouMayKnow(req: Request, res: Response) {
    const users = await socialService.getPeopleYouMayKnow(req.user!.id);
    return res.status(StatusCodes.OK).json(users);
  },

  async pages(req: Request, res: Response) {
    const pages = await socialService.listPages(req.user!.id);
    return res.status(StatusCodes.OK).json(pages);
  },

  async page(req: Request, res: Response) {
    const slug = z.string().min(1).parse(req.params.slug);
    const page = await socialService.getPageBySlug(req.user!.id, slug);
    return res.status(StatusCodes.OK).json(page);
  },

  async createPage(req: Request, res: Response) {
    const payload = pageSchema.parse(req.body);
    const page = await socialService.createPage(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(page);
  },

  async togglePageFollow(req: Request, res: Response) {
    const pageId = z.string().min(1).parse(req.params.pageId);
    const result = await socialService.togglePageFollow(req.user!.id, pageId);
    return res.status(StatusCodes.OK).json(result);
  },

  async updatePage(req: Request, res: Response) {
    const pageId = z.string().min(1).parse(req.params.pageId);
    const payload = pageUpdateSchema.parse(req.body);
    const page = await socialService.updatePage(req.user!.id, pageId, payload);
    return res.status(StatusCodes.OK).json(page);
  },

  async deletePage(req: Request, res: Response) {
    const pageId = z.string().min(1).parse(req.params.pageId);
    const result = await socialService.deletePage(req.user!.id, pageId);
    return res.status(StatusCodes.OK).json(result);
  },

  async groups(req: Request, res: Response) {
    const groups = await socialService.listGroups(req.user!.id);
    return res.status(StatusCodes.OK).json(groups);
  },

  async group(req: Request, res: Response) {
    const slug = z.string().min(1).parse(req.params.slug);
    const group = await socialService.getGroupBySlug(req.user!.id, slug);
    return res.status(StatusCodes.OK).json(group);
  },

  async createGroup(req: Request, res: Response) {
    const payload = groupSchema.parse(req.body);
    const group = await socialService.createGroup(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(group);
  },

  async joinGroup(req: Request, res: Response) {
    const groupId = z.string().min(1).parse(req.params.groupId);
    const result = await socialService.joinGroup(req.user!.id, groupId);
    return res.status(StatusCodes.OK).json(result);
  },

  async updateGroup(req: Request, res: Response) {
    const groupId = z.string().min(1).parse(req.params.groupId);
    const payload = groupUpdateSchema.parse(req.body);
    const group = await socialService.updateGroup(req.user!.id, groupId, payload);
    return res.status(StatusCodes.OK).json(group);
  },

  async deleteGroup(req: Request, res: Response) {
    const groupId = z.string().min(1).parse(req.params.groupId);
    const result = await socialService.deleteGroup(req.user!.id, groupId);
    return res.status(StatusCodes.OK).json(result);
  },

  async launch(req: Request, res: Response) {
    const summary = await socialService.getLaunchSummary(req.user!.id);
    return res.status(StatusCodes.OK).json(summary);
  },

  async explore(req: Request, res: Response) {
    const explore = await socialService.getExploreHub(req.user!.id);
    return res.status(StatusCodes.OK).json(explore);
  },

  async createInvite(req: Request, res: Response) {
    const payload = inviteSchema.parse(req.body ?? {});
    const invite = await socialService.createInvite(req.user!.id, payload.message);
    return res.status(StatusCodes.CREATED).json(invite);
  },

  async redeemInvite(req: Request, res: Response) {
    const code = z.string().min(3).parse(req.params.code);
    const result = await socialService.redeemInvite(req.user!.id, code);
    return res.status(StatusCodes.OK).json(result);
  },

  async createFeedback(req: Request, res: Response) {
    const payload = feedbackSchema.parse(req.body);
    const feedback = await socialService.submitFeedback(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(feedback);
  },
};
