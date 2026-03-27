import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { env } from "../lib/env.js";
import { ApiError } from "../utils/api-error.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
]);

export const uploadSingleMedia = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MEDIA_MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          "Unsupported file type. Allowed types: JPEG, PNG, WebP, MP4, MOV, MP3, M4A, WAV, WEBM",
        ),
      );
      return;
    }

    callback(null, true);
  },
}).single("file");
