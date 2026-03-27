import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { voiceRoomService } from "../services/voice-room.service.js";

const createRoomSchema = z.object({
  title: z.string().min(2).max(80),
  topic: z.string().max(240).optional(),
});

export const voiceRoomController = {
  async list(_req: Request, res: Response) {
    const rooms = await voiceRoomService.list();
    return res.status(StatusCodes.OK).json(rooms);
  },

  async create(req: Request, res: Response) {
    const payload = createRoomSchema.parse(req.body);
    const room = await voiceRoomService.create(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(room);
  },

  async join(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const result = await voiceRoomService.join(req.user!.id, roomId);
    return res.status(StatusCodes.OK).json(result);
  },

  async leave(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const result = await voiceRoomService.leave(req.user!.id, roomId);
    return res.status(StatusCodes.OK).json(result);
  },
};
