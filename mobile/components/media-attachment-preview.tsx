import { type ComponentType, memo, useEffect } from "react";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer, type VideoViewProps } from "expo-video";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/utils/theme";

type MediaAttachmentPreviewProps = {
  uri: string;
  kind: "IMAGE" | "VIDEO";
  height?: number;
  autoPlay?: boolean;
  label?: string | null;
};

const ManagedVideoView = VideoView as ComponentType<VideoViewProps>;

export const MediaAttachmentPreview = memo(
  ({ uri, kind, height = 240, autoPlay = false, label }: MediaAttachmentPreviewProps) => {
    const player = useVideoPlayer(kind === "VIDEO" ? uri : null, (videoPlayer) => {
      videoPlayer.loop = true;
      videoPlayer.muted = true;
    });

    useEffect(() => {
      if (kind !== "VIDEO") {
        return;
      }

      if (autoPlay) {
        player.play();
        return;
      }

      player.pause();
    }, [autoPlay, kind, player]);

    useEffect(() => () => player.pause(), [player]);

    return (
      <View style={[styles.frame, { minHeight: height }]}>
        {kind === "IMAGE" ? (
          <Image source={uri} contentFit="cover" style={StyleSheet.absoluteFillObject} />
        ) : (
          <ManagedVideoView
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            contentFit="cover"
            nativeControls={false}
            player={player}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {label ? (
          <View style={styles.label}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        ) : null}
      </View>
    );
  },
);

MediaAttachmentPreview.displayName = "MediaAttachmentPreview";

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#101820",
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  label: {
    backgroundColor: "rgba(9, 18, 28, 0.68)",
    borderRadius: radius.pill,
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
  },
  labelText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
