import { Router } from "express";
import { monetizationController } from "../controllers/monetization.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const monetizationRouter = Router();

monetizationRouter.use(requireAuth);
monetizationRouter.get("/wallet", asyncHandler(monetizationController.wallet));
monetizationRouter.get("/gift-catalog", asyncHandler(monetizationController.giftCatalog));
monetizationRouter.post("/payment-intents/top-up", asyncHandler(monetizationController.createTopUpIntent));

monetizationRouter.get(
  "/admin/overview",
  requireRoles("ADMIN", "MODERATOR"),
  asyncHandler(monetizationController.adminOverview),
);
monetizationRouter.get(
  "/admin/activity",
  requireRoles("ADMIN", "MODERATOR"),
  asyncHandler(monetizationController.adminActivity),
);
monetizationRouter.post(
  "/admin/payment-intents/:intentId/verify",
  requireRoles("ADMIN", "MODERATOR"),
  asyncHandler(monetizationController.verifyTopUpIntent),
);
monetizationRouter.patch(
  "/admin/users/:userId",
  requireRoles("ADMIN", "MODERATOR"),
  asyncHandler(monetizationController.updateUserMonetization),
);
