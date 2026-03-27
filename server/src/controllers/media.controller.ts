import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import multer from "multer";
import { mediaService } from "../services/media.service.js";
import { ApiError } from "../utils/api-error.js";

export const mediaController = {
  async upload(req: Request, res: Response) {
    if (!req.file) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "A media file is required");
    }

    const uploadedAsset = await mediaService.uploadFile(req.file, req.user!.id);
    return res.status(StatusCodes.CREATED).json(uploadedAsset);
  },
};

export const mediaUploadErrorHandler = (error: unknown) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Uploaded file exceeds the allowed size limit");
  }

  throw error;
};
