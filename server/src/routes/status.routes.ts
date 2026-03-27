import { Router } from "express";
import { statusController } from "../controllers/status.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const statusRouter = Router();

statusRouter.use(requireAuth);
statusRouter.get("/", asyncHandler(statusController.list));
statusRouter.post("/", asyncHandler(statusController.create));
statusRouter.get("/:statusId", asyncHandler(statusController.getById));
statusRouter.delete("/:statusId", asyncHandler(statusController.remove));
statusRouter.post("/:statusId/view", asyncHandler(statusController.markViewed));
statusRouter.post("/:statusId/react", asyncHandler(statusController.react));
statusRouter.post("/:statusId/report", asyncHandler(statusController.report));
