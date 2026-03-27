import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { moderationService } from "../services/moderation.service.js";
import { trimmedString } from "../utils/validation.js";

const reportStatusSchema = z.object({
  status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "REJECTED"]),
  resolutionNotes: trimmedString(3, 500).optional(),
});

const actionReasonSchema = z.object({
  reason: trimmedString(3, 500),
  reportId: z.string().min(1).optional(),
});

const contentActionSchema = actionReasonSchema.extend({
  action: z.enum(["remove", "restore", "remove-media"]),
});

const commentActionSchema = actionReasonSchema.extend({
  action: z.enum(["remove", "restore"]),
});

const userActionSchema = actionReasonSchema.extend({
  action: z.enum(["suspend", "unsuspend", "ban", "unban"]),
});

export const moderationController = {
  async overview(_req: Request, res: Response) {
    const overview = await moderationService.getOverview();
    return res.status(StatusCodes.OK).json(overview);
  },

  async listReports(req: Request, res: Response) {
    const filters = z
      .object({
        status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "REJECTED"]).optional(),
        targetType: z.string().min(1).optional(),
      })
      .parse(req.query);

    const reports = await moderationService.listReports(filters);
    return res.status(StatusCodes.OK).json(reports);
  },

  async listLogs(_req: Request, res: Response) {
    const logs = await moderationService.listLogs();
    return res.status(StatusCodes.OK).json(logs);
  },

  async updateReport(req: Request, res: Response) {
    const reportId = z.string().min(1).parse(req.params.reportId);
    const payload = reportStatusSchema.parse(req.body);
    const report = await moderationService.updateReport(req.user!.id, reportId, payload);
    return res.status(StatusCodes.OK).json(report);
  },

  async moderatePost(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const payload = contentActionSchema.parse(req.body);
    const result = await moderationService.moderatePost(req.user!.id, postId, payload);
    return res.status(StatusCodes.OK).json(result);
  },

  async moderateComment(req: Request, res: Response) {
    const commentId = z.string().min(1).parse(req.params.commentId);
    const payload = commentActionSchema.parse(req.body);
    const result = await moderationService.moderateComment(req.user!.id, commentId, payload);
    return res.status(StatusCodes.OK).json(result);
  },

  async moderateReel(req: Request, res: Response) {
    const reelId = z.string().min(1).parse(req.params.reelId);
    const payload = commentActionSchema.parse(req.body);
    const result = await moderationService.moderateReel(req.user!.id, reelId, payload);
    return res.status(StatusCodes.OK).json(result);
  },

  async moderateStatus(req: Request, res: Response) {
    const statusId = z.string().min(1).parse(req.params.statusId);
    const payload = contentActionSchema.parse(req.body);
    const result = await moderationService.moderateStatus(req.user!.id, statusId, payload);
    return res.status(StatusCodes.OK).json(result);
  },

  async moderateUser(req: Request, res: Response) {
    const userId = z.string().min(1).parse(req.params.userId);
    const payload = userActionSchema.parse(req.body);
    const result = await moderationService.moderateUser(req.user!.id, userId, payload);
    return res.status(StatusCodes.OK).json(result);
  },

  async moderateGroup(req: Request, res: Response) {
    const groupId = z.string().min(1).parse(req.params.groupId);
    const payload = contentActionSchema.parse(req.body);
    const result = await moderationService.moderateGroup(req.user!.id, groupId, payload);
    return res.status(StatusCodes.OK).json(result);
  },

  async moderatePage(req: Request, res: Response) {
    const pageId = z.string().min(1).parse(req.params.pageId);
    const payload = contentActionSchema.parse(req.body);
    const result = await moderationService.moderatePage(req.user!.id, pageId, payload);
    return res.status(StatusCodes.OK).json(result);
  },
};
