import { Router } from "express";
import { postController } from "../controllers/post.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const postRouter = Router();

postRouter.get("/shared/:shareSlug", asyncHandler(postController.shared));

postRouter.use(requireAuth);
postRouter.get("/feed", asyncHandler(postController.feed));
postRouter.get("/explore", asyncHandler(postController.explore));
postRouter.get("/page/:pageId", asyncHandler(postController.byPage));
postRouter.get("/group/:groupId", asyncHandler(postController.byGroup));
postRouter.get("/saved", asyncHandler(postController.saved));
postRouter.post("/", asyncHandler(postController.create));
postRouter.patch("/:postId", asyncHandler(postController.update));
postRouter.delete("/:postId", asyncHandler(postController.remove));
postRouter.post("/:postId/like", asyncHandler(postController.like));
postRouter.post("/:postId/comments", asyncHandler(postController.comment));
postRouter.patch("/comments/:commentId", asyncHandler(postController.updateComment));
postRouter.delete("/comments/:commentId", asyncHandler(postController.removeComment));
postRouter.post("/comments/:commentId/reactions", asyncHandler(postController.reactToComment));
postRouter.post("/comments/:commentId/report", asyncHandler(postController.reportComment));
postRouter.post("/:postId/save", asyncHandler(postController.save));
postRouter.post("/:postId/share", asyncHandler(postController.share));
postRouter.post("/:postId/report", asyncHandler(postController.report));
