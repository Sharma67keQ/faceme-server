import { StatusCodes } from "http-status-codes";
import { isCloudinaryConfigured, uploadBuffer } from "../lib/cloudinary.js";
import { env } from "../lib/env.js";
import { ApiError } from "../utils/api-error.js";

const getResourceType = (mimeType: string) => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("audio/")) {
    return "video";
  }

  throw new ApiError(StatusCodes.BAD_REQUEST, "Unsupported media type");
};

const getAssetKind = (mimeType: string) => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "audio";
};

export const mediaService = {
  async uploadFile(file: Express.Multer.File, userId: string) {
    if (!isCloudinaryConfigured()) {
      throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Media uploads are not configured");
    }

    const resourceType = getResourceType(file.mimetype);
    const assetKind = getAssetKind(file.mimetype);
    const folder = `${env.CLOUDINARY_FOLDER}/${assetKind}`;

    const uploadResult = await uploadBuffer(file.buffer, {
      folder,
      resource_type: resourceType,
      public_id: `${userId}-${Date.now()}`,
      overwrite: false,
      unique_filename: true,
      use_filename: false,
      invalidate: true,
    });

    return {
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      width: uploadResult.width ?? null,
      height: uploadResult.height ?? null,
      bytes: uploadResult.bytes,
      format: uploadResult.format ?? null,
      resourceType: uploadResult.resource_type,
      originalFilename: file.originalname,
    };
  },
};
