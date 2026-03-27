import { Router } from "express";
import { mediaController, mediaUploadErrorHandler } from "../controllers/media.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadSingleMedia } from "../middleware/upload.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const mediaRouter = Router();

mediaRouter.use(requireAuth);
mediaRouter.post(
  "/upload",
  (req, res, next) => {
    uploadSingleMedia(req, res, (error) => {
      if (error) {
        try {
          mediaUploadErrorHandler(error);
        } catch (handledError) {
          next(handledError);
          return;
        }
      }

      next();
    });
  },
  asyncHandler(mediaController.upload),
);
