import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { monetizationService } from "../services/monetization.service.js";
import { voiceRoomService } from "../services/voice-room.service.js";

const roomPrivacyEnum = z.enum(["PUBLIC", "FOLLOWERS", "FRIENDS", "INVITE_ONLY"]);
const participantStateEnum = z.enum(["LISTENING", "SPEAKING", "MUTED"]);
const participantRoleEnum = z.enum(["ADMIN", "MEMBER"]);
const roomThemeEnum = z.enum(["SUNSET", "AURORA", "LOUNGE", "PARTY"]);

const createRoomSchema = z.object({
  title: z.string().min(2).max(80),
  topic: z.string().max(240).optional(),
  description: z.string().max(500).optional(),
  privacy: roomPrivacyEnum.optional(),
  theme: roomThemeEnum.optional(),
});

const updateRoomSchema = z.object({
  title: z.string().min(2).max(80).optional(),
  topic: z.string().max(240).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  privacy: roomPrivacyEnum.optional(),
  theme: roomThemeEnum.optional(),
});

const sendGiftSchema = z.object({
  giftId: z.string().min(1),
  quantity: z.number().int().min(1).max(100).optional(),
  receiverId: z.string().min(1).optional(),
  clientRequestId: z.string().min(1),
  message: z.string().max(180).optional(),
});

export const voiceRoomController = {
  async list(req: Request, res: Response) {
    const rooms = await voiceRoomService.list(req.user!.id);
    return res.status(StatusCodes.OK).json(rooms);
  },

  async getById(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const room = await voiceRoomService.getById(req.user!.id, roomId);
    return res.status(StatusCodes.OK).json(room);
  },

  async create(req: Request, res: Response) {
    const payload = createRoomSchema.parse(req.body);
    const room = await voiceRoomService.create(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(room);
  },

  async update(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const payload = updateRoomSchema.parse(req.body);
    const room = await voiceRoomService.updateRoom(req.user!.id, roomId, payload);
    return res.status(StatusCodes.OK).json(room);
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

  async setState(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const payload = z.object({ state: participantStateEnum }).parse(req.body);
    const result = await voiceRoomService.setParticipantState(req.user!.id, roomId, payload.state);
    return res.status(StatusCodes.OK).json(result);
  },

  async setRole(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const participantUserId = z.string().min(1).parse(req.params.userId);
    const payload = z.object({ role: participantRoleEnum }).parse(req.body);
    const result = await voiceRoomService.setParticipantRole(req.user!.id, roomId, participantUserId, payload.role);
    return res.status(StatusCodes.OK).json(result);
  },

  async removeParticipant(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const participantUserId = z.string().min(1).parse(req.params.userId);
    const result = await voiceRoomService.removeParticipant(req.user!.id, roomId, participantUserId);
    return res.status(StatusCodes.OK).json(result);
  },

  async setParticipantModeration(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const participantUserId = z.string().min(1).parse(req.params.userId);
    const payload = z.object({ muted: z.boolean() }).parse(req.body);
    const result = await voiceRoomService.setParticipantModeration(req.user!.id, roomId, participantUserId, payload.muted);
    return res.status(StatusCodes.OK).json(result);
  },

  async endRoom(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const room = await voiceRoomService.endRoom(req.user!.id, roomId);
    return res.status(StatusCodes.OK).json(room);
  },

  async issueAudioToken(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const token = await voiceRoomService.issueAudioToken(req.user!.id, roomId);
    return res.status(StatusCodes.OK).json(token);
  },

  async giftSnapshot(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const snapshot = await monetizationService.getRoomGiftSnapshot(roomId);
    return res.status(StatusCodes.OK).json(snapshot);
  },

  async sendGift(req: Request, res: Response) {
    const roomId = z.string().min(1).parse(req.params.roomId);
    const payload = sendGiftSchema.parse(req.body);
    const result = await monetizationService.sendRoomGift(req.user!.id, roomId, payload);
    return res.status(StatusCodes.CREATED).json(result);
  },
};
