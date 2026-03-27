import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { storyController } from "../controllers/story.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const storyRouter = Router();

storyRouter.use(requireAuth);
storyRouter.get("/following", asyncHandler(storyController.listFollowing));
storyRouter.post("/", asyncHandler(storyController.create));
storyRouter.post("/:storyId/view", asyncHandler(storyController.view));
