import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { authService } from "../services/auth.service.js";
import {
  humanNameSchema,
  passwordSchema,
  usernameSchema,
} from "../utils/validation.js";

const registerSchema = z.object({
  email: z.string().trim().email(),
  username: usernameSchema,
  password: passwordSchema,
  firstName: humanNameSchema,
  lastName: humanNameSchema.optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10).max(72),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response) {
    const payload = registerSchema.parse(req.body);
    const result = await authService.register(payload);

    return res.status(StatusCodes.CREATED).json(result);
  },

  async login(req: Request, res: Response) {
    const payload = loginSchema.parse(req.body);
    const result = await authService.login(payload);

    return res.status(StatusCodes.OK).json(result);
  },

  async refresh(req: Request, res: Response) {
    const payload = refreshSchema.parse(req.body);
    const result = await authService.refresh(payload.refreshToken);

    return res.status(StatusCodes.OK).json(result);
  },

  async logout(req: Request, res: Response) {
    const payload = refreshSchema.parse(req.body);
    await authService.logout(payload.refreshToken);

    return res.status(StatusCodes.OK).json({ message: "Logged out" });
  },
};
