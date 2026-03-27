import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get("/me", asyncHandler(userController.me));
userRouter.get("/search", asyncHandler(userController.search));
userRouter.get("/suggestions", asyncHandler(userController.suggestions));
userRouter.get("/id/:id", asyncHandler(userController.getById));
userRouter.get("/:username/posts", asyncHandler(userController.postsByUsername));
userRouter.get("/:username/followers", asyncHandler(userController.followers));
userRouter.get("/:username/following", asyncHandler(userController.following));
userRouter.get("/:username", asyncHandler(userController.getByUsername));
userRouter.patch("/me", asyncHandler(userController.updateProfile));
userRouter.post("/:id/follow", asyncHandler(userController.toggleFollow));
userRouter.post("/:id/block", asyncHandler(userController.block));
userRouter.post("/:id/report", asyncHandler(userController.report));
