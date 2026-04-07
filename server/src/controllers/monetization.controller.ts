import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { monetizationService } from "../services/monetization.service.js";
import { trimmedString } from "../utils/validation.js";

const createTopUpIntentSchema = z.object({
  provider: z.enum(["MANUAL_REVIEW", "CARD", "MOBILE_MONEY", "APP_STORE"]).optional(),
  coinsAmount: z.number().int().min(1).max(100000),
  currency: z.string().min(3).max(8).optional(),
  fiatAmount: z.number().positive().optional(),
});

const verifyTopUpIntentSchema = z.object({
  providerReference: z.string().min(1).max(191).optional(),
  notes: trimmedString(3, 500).optional(),
});

const updateUserMonetizationSchema = z.object({
  monetizationSuspended: z.boolean().optional(),
  suspensionReason: trimmedString(3, 500).optional(),
  payoutEligibilityStatus: z.enum(["INELIGIBLE", "REVIEW", "ELIGIBLE", "RESTRICTED"]).optional(),
  payoutEligibilityReason: z.string().max(500).nullable().optional(),
  premiumDisabled: z.boolean().optional(),
});

export const monetizationController = {
  async wallet(req: Request, res: Response) {
    const result = await monetizationService.getWalletSummary(req.user!.id);
    return res.status(StatusCodes.OK).json(result);
  },

  async giftCatalog(_req: Request, res: Response) {
    const result = await monetizationService.listGiftCatalog();
    return res.status(StatusCodes.OK).json(result);
  },

  async createTopUpIntent(req: Request, res: Response) {
    const payload = createTopUpIntentSchema.parse(req.body);
    const result = await monetizationService.createWalletTopUpIntent(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(result);
  },

  async adminOverview(_req: Request, res: Response) {
    const result = await monetizationService.getAdminOverview();
    return res.status(StatusCodes.OK).json(result);
  },

  async adminActivity(_req: Request, res: Response) {
    const result = await monetizationService.getAdminActivity();
    return res.status(StatusCodes.OK).json(result);
  },

  async verifyTopUpIntent(req: Request, res: Response) {
    const intentId = z.string().min(1).parse(req.params.intentId);
    const payload = verifyTopUpIntentSchema.parse(req.body);
    const result = await monetizationService.verifyWalletTopUpIntent(req.user!.id, intentId, payload);
    return res.status(StatusCodes.OK).json(result);
  },

  async updateUserMonetization(req: Request, res: Response) {
    const userId = z.string().min(1).parse(req.params.userId);
    const payload = updateUserMonetizationSchema.parse(req.body);
    const result = await monetizationService.updateUserMonetizationState(userId, payload);
    return res.status(StatusCodes.OK).json(result);
  },
};
