import * as ImagePicker from "expo-image-picker";
import { api } from "./api";
import { MediaUploadResponse } from "@/types/api";

type PickMediaKind = "image" | "video" | "mixed";

const getMediaTypeOption = (kind: PickMediaKind) => {
  switch (kind) {
    case "image":
      return ImagePicker.MediaTypeOptions.Images;
    case "video":
      return ImagePicker.MediaTypeOptions.Videos;
    default:
      return ImagePicker.MediaTypeOptions.All;
  }
};

const getFallbackMimeType = (kind: PickMediaKind) => {
  if (kind === "video") {
    return "video/mp4";
  }

  return "image/jpeg";
};

const getFallbackFilename = (kind: PickMediaKind, mimeType: string) => {
  const extension = mimeType.split("/")[1] ?? (kind === "video" ? "mp4" : "jpg");
  return `faceme-${Date.now()}.${extension}`;
};

export const mediaService = {
  async pickFromLibrary(kind: PickMediaKind) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new Error("Media library permission is required to attach photos or videos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: getMediaTypeOption(kind),
      quality: 0.85,
      videoMaxDuration: 90,
    });

    if (result.canceled || !result.assets.length) {
      return null;
    }

    return result.assets[0];
  },

  async uploadAsset(asset: ImagePicker.ImagePickerAsset, kind: PickMediaKind = "mixed") {
    const mimeType = asset.mimeType ?? getFallbackMimeType(kind);
    const name = asset.fileName ?? getFallbackFilename(kind, mimeType);
    const formData = new FormData();

    formData.append("file", {
      uri: asset.uri,
      name,
      type: mimeType,
    } as any);

    const { data } = await api.post<MediaUploadResponse>("/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      ...data,
      mediaKind: mimeType.startsWith("video/") ? "VIDEO" : mimeType.startsWith("audio/") ? "AUDIO" : "IMAGE",
    } as MediaUploadResponse & { mediaKind: "IMAGE" | "VIDEO" | "AUDIO" };
  },
};
