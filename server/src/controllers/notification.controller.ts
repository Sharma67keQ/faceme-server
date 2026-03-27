import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { notificationService } from "../services/notification.service.js";

export const notificationController = {
  async list(req: Request, res: Response) {
    const notifications = await notificationService.listNotifications(req.user!.id);
    return res.status(StatusCodes.OK).json(notifications);
  },

  async markRead(req: Request, res: Response) {
    const notificationId = z.string().min(1).parse(req.params.notificationId);
    await notificationService.markAsRead(req.user!.id, notificationId);
    return res.status(StatusCodes.OK).json({ message: "Notification marked as read" });
  },
};
