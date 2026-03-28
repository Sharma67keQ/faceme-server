import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MediaAttachmentPreview } from "@/components/media-attachment-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { mediaService } from "@/services/media";
import { postService } from "@/services/posts";
import { reelService } from "@/services/reels";
import { socialService } from "@/services/social";
import { statusService } from "@/services/status";
import { colors, radius, spacing } from "@/utils/theme";

type ComposerMode = "POST" | "STATUS" | "REEL";
type Attachment = {
  localUri: string;
  remoteUrl: string;
  kind: "IMAGE" | "VIDEO";
};

const modes: ComposerMode[] = ["POST", "STATUS", "REEL"];

export default function CreatePostScreen() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ComposerMode>("POST");
  const [body, setBody] = useState("");
  const [postKind, setPostKind] = useState<"STANDARD" | "QUICK">("STANDARD");
  const [target, setTarget] = useState<{ type: "PROFILE" | "PAGE" | "GROUP"; id?: string }>({ type: "PROFILE" });
  const [postAttachment, setPostAttachment] = useState<Attachment | null>(null);
  const [isUploadingPost, setIsUploadingPost] = useState(false);
  const [statusKind, setStatusKind] = useState<"TEXT" | "IMAGE" | "VIDEO">("TEXT");
  const [statusText, setStatusText] = useState("");
  const [statusVisibility, setStatusVisibility] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS">("PUBLIC");
  const [statusAttachment, setStatusAttachment] = useState<Attachment | null>(null);
  const [isUploadingStatus, setIsUploadingStatus] = useState(false);
  const [reelCaption, setReelCaption] = useState("");
  const [reelVisibility, setReelVisibility] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS">("PUBLIC");
  const [reelAttachment, setReelAttachment] = useState<Attachment | null>(null);
  const [isUploadingReel, setIsUploadingReel] = useState(false);

  const { data: pages = [] } = useQuery({
    queryKey: ["pages"],
    queryFn: socialService.getPages,
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: socialService.getGroups,
  });

  const createPostMutation = useMutation({
    mutationFn: () =>
      postService.createPost({
        body: body.trim(),
        mediaUrl: postAttachment?.remoteUrl,
        mediaType: postAttachment?.kind,
        kind: postKind,
        pageId: target.type === "PAGE" ? target.id : undefined,
        groupId: target.type === "GROUP" ? target.id : undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-hub"] }),
      ]);
      setBody("");
      setPostAttachment(null);
      router.replace("/(tabs)");
    },
  });

  const createStatusMutation = useMutation({
    mutationFn: () =>
      statusService.create({
        kind: statusKind,
        text: statusKind === "TEXT" ? statusText.trim() : undefined,
        mediaUrl: statusKind !== "TEXT" ? statusAttachment?.remoteUrl : undefined,
        visibility: statusVisibility,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["status"] });
      setStatusText("");
      setStatusAttachment(null);
      setStatusKind("TEXT");
      router.replace("/(tabs)");
    },
  });

  const createReelMutation = useMutation({
    mutationFn: () =>
      reelService.create({
        videoUrl: reelAttachment!.remoteUrl,
        caption: reelCaption.trim() || undefined,
        visibility: reelVisibility,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
      setReelCaption("");
      setReelAttachment(null);
      router.replace("/reels");
    },
  });

  const handlePickAttachment = async (kind: "image" | "video", targetMode: "post" | "status" | "reel") => {
    try {
      if (targetMode === "post") {
        setIsUploadingPost(true);
      } else if (targetMode === "status") {
        setIsUploadingStatus(true);
      } else {
        setIsUploadingReel(true);
      }

      const asset = await mediaService.pickFromLibrary(kind);

      if (!asset) {
        return;
      }

      const uploaded = await mediaService.uploadAsset(asset, kind);
      const nextAttachment: Attachment = {
        localUri: asset.uri,
        remoteUrl: uploaded.secureUrl,
        kind: uploaded.mediaKind === "VIDEO" ? "VIDEO" : "IMAGE",
      };

      if (targetMode === "post") {
        setPostAttachment(nextAttachment);
      } else if (targetMode === "status") {
        setStatusAttachment(nextAttachment);
        setStatusKind(nextAttachment.kind);
      } else {
        setReelAttachment({ ...nextAttachment, kind: "VIDEO" });
      }
    } finally {
      if (targetMode === "post") {
        setIsUploadingPost(false);
      } else if (targetMode === "status") {
        setIsUploadingStatus(false);
      } else {
        setIsUploadingReel(false);
      }
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Studio</Text>
        <Text style={styles.title}>Create something that feels native to the feed.</Text>
        <Text style={styles.subtitle}>
          Move between posts, 24-hour status, and reels without switching into a developer form.
        </Text>
      </View>

      <View style={styles.modeRow}>
        {modes.map((value) => (
          <Pressable
            key={value}
            onPress={() => setMode(value)}
            style={[styles.modeChip, mode === value ? styles.modeChipActive : null]}
          >
            <Text style={[styles.modeChipLabel, mode === value ? styles.modeChipLabelActive : null]}>{value}</Text>
          </Pressable>
        ))}
      </View>

      {mode === "POST" ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Post to your network</Text>
            <Text style={styles.sectionMeta}>Feed / page / group</Text>
          </View>
          <View style={styles.segmentRow}>
            {(["STANDARD", "QUICK"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.segment, postKind === value ? styles.segmentActive : null]}
                onPress={() => setPostKind(value)}
              >
                <Text style={[styles.segmentLabel, postKind === value ? styles.segmentLabelActive : null]}>
                  {value === "STANDARD" ? "Standard post" : "Quick thought"}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.segmentRow}>
            {(["PROFILE", "PAGE", "GROUP"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.segment, target.type === value ? styles.segmentActive : null]}
                onPress={() => setTarget({ type: value })}
              >
                <Text style={[styles.segmentLabel, target.type === value ? styles.segmentLabelActive : null]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          {target.type === "PAGE" ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectionWrap}>
              {pages.map((page) => (
                <Pressable
                  key={page.id}
                  style={[styles.selectionChip, target.id === page.id ? styles.selectionChipActive : null]}
                  onPress={() => setTarget({ type: "PAGE", id: page.id })}
                >
                  <Text
                    style={[styles.selectionChipLabel, target.id === page.id ? styles.selectionChipLabelActive : null]}
                  >
                    {page.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {target.type === "GROUP" ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectionWrap}>
              {groups.filter((group) => group.isMember).map((group) => (
                <Pressable
                  key={group.id}
                  style={[styles.selectionChip, target.id === group.id ? styles.selectionChipActive : null]}
                  onPress={() => setTarget({ type: "GROUP", id: group.id })}
                >
                  <Text
                    style={[styles.selectionChipLabel, target.id === group.id ? styles.selectionChipLabelActive : null]}
                  >
                    {group.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <Input
            label="What is happening?"
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Share a thought, update, photo, or video moment"
          />
          <View style={styles.attachmentBar}>
            <Pressable style={styles.attachmentButton} onPress={() => void handlePickAttachment("image", "post")}>
              <Ionicons name="image-outline" color={colors.primaryDark} size={18} />
              <Text style={styles.attachmentLabel}>{isUploadingPost ? "Uploading photo..." : "Add photo"}</Text>
            </Pressable>
            <Pressable style={styles.attachmentButton} onPress={() => void handlePickAttachment("video", "post")}>
              <Ionicons name="videocam-outline" color={colors.primaryDark} size={18} />
              <Text style={styles.attachmentLabel}>{isUploadingPost ? "Uploading video..." : "Add video"}</Text>
            </Pressable>
          </View>
          {postAttachment ? (
            <View style={styles.previewWrap}>
              <MediaAttachmentPreview
                uri={postAttachment.localUri}
                kind={postAttachment.kind}
                label={postAttachment.kind === "VIDEO" ? "Video ready" : "Photo ready"}
              />
              <Pressable style={styles.clearButton} onPress={() => setPostAttachment(null)}>
                <Text style={styles.clearLabel}>Remove attachment</Text>
              </Pressable>
            </View>
          ) : null}
          <Button
            disabled={createPostMutation.isPending || isUploadingPost || !body.trim()}
            label={createPostMutation.isPending ? "Publishing..." : "Publish post"}
            onPress={() => createPostMutation.mutate()}
          />
        </View>
      ) : null}

      {mode === "STATUS" ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>24-hour status</Text>
            <Text style={styles.sectionMeta}>WhatsApp / Facebook energy</Text>
          </View>
          <View style={styles.segmentRow}>
            {(["TEXT", "IMAGE", "VIDEO"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.segment, statusKind === value ? styles.segmentActive : null]}
                onPress={() => {
                  setStatusKind(value);
                  if (value === "TEXT") {
                    setStatusAttachment(null);
                  }
                }}
              >
                <Text style={[styles.segmentLabel, statusKind === value ? styles.segmentLabelActive : null]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.segmentRow}>
            {(["PUBLIC", "FOLLOWERS", "FRIENDS"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.segment, statusVisibility === value ? styles.segmentActive : null]}
                onPress={() => setStatusVisibility(value)}
              >
                <Text style={[styles.segmentLabel, statusVisibility === value ? styles.segmentLabelActive : null]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          {statusKind === "TEXT" ? (
            <Input
              label="Status text"
              value={statusText}
              onChangeText={setStatusText}
              multiline
              placeholder="Share what is happening right now"
            />
          ) : (
            <>
              <Input
                label={statusKind === "IMAGE" ? "Caption" : "Video note"}
                value={statusText}
                onChangeText={setStatusText}
                multiline
                placeholder="Add context to your status"
              />
              <View style={styles.attachmentBar}>
                <Pressable
                  style={styles.attachmentButton}
                  onPress={() => void handlePickAttachment(statusKind === "VIDEO" ? "video" : "image", "status")}
                >
                  <Ionicons
                    name={statusKind === "VIDEO" ? "videocam-outline" : "image-outline"}
                    color={colors.primaryDark}
                    size={18}
                  />
                  <Text style={styles.attachmentLabel}>
                    {isUploadingStatus
                      ? statusKind === "VIDEO"
                        ? "Uploading video..."
                        : "Uploading photo..."
                      : statusKind === "VIDEO"
                        ? "Pick video"
                        : "Pick photo"}
                  </Text>
                </Pressable>
              </View>
              {statusAttachment ? (
                <View style={styles.previewWrap}>
                  <MediaAttachmentPreview uri={statusAttachment.localUri} kind={statusAttachment.kind} />
                  <Pressable style={styles.clearButton} onPress={() => setStatusAttachment(null)}>
                    <Text style={styles.clearLabel}>Remove attachment</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
          <Button
            disabled={
              createStatusMutation.isPending ||
              isUploadingStatus ||
              (statusKind === "TEXT" ? !statusText.trim() : !statusAttachment?.remoteUrl)
            }
            label={createStatusMutation.isPending ? "Publishing..." : "Publish status"}
            onPress={() => createStatusMutation.mutate()}
            variant="secondary"
          />
        </View>
      ) : null}

      {mode === "REEL" ? (
        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Short-form reel</Text>
            <Text style={styles.sectionMeta}>Vertical video</Text>
          </View>
          <View style={styles.segmentRow}>
            {(["PUBLIC", "FOLLOWERS", "FRIENDS"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.segment, reelVisibility === value ? styles.segmentActive : null]}
                onPress={() => setReelVisibility(value)}
              >
                <Text style={[styles.segmentLabel, reelVisibility === value ? styles.segmentLabelActive : null]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <Input
            label="Caption"
            value={reelCaption}
            onChangeText={setReelCaption}
            multiline
            placeholder="Write a short hook for your reel"
          />
          <View style={styles.attachmentBar}>
            <Pressable style={styles.attachmentButton} onPress={() => void handlePickAttachment("video", "reel")}>
              <Ionicons name="play-circle-outline" color={colors.primaryDark} size={18} />
              <Text style={styles.attachmentLabel}>{isUploadingReel ? "Uploading reel..." : "Pick reel video"}</Text>
            </Pressable>
          </View>
          {reelAttachment ? (
            <View style={styles.previewWrap}>
              <MediaAttachmentPreview uri={reelAttachment.localUri} kind="VIDEO" height={300} autoPlay />
              <Pressable style={styles.clearButton} onPress={() => setReelAttachment(null)}>
                <Text style={styles.clearLabel}>Remove reel</Text>
              </Pressable>
            </View>
          ) : null}
          <Button
            disabled={createReelMutation.isPending || isUploadingReel || !reelAttachment?.remoteUrl}
            label={createReelMutation.isPending ? "Publishing..." : "Publish reel"}
            onPress={() => createReelMutation.mutate()}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  modeChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  modeChipLabel: {
    color: colors.text,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  modeChipLabelActive: {
    color: colors.surface,
  },
  panel: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionMeta: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.energySoft,
    borderColor: colors.accent,
  },
  segmentLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  segmentLabelActive: {
    color: colors.primaryDark,
  },
  selectionWrap: {
    gap: spacing.sm,
  },
  selectionChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectionChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  selectionChipLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  selectionChipLabelActive: {
    color: colors.surface,
  },
  attachmentBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  attachmentButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachmentLabel: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  previewWrap: {
    gap: spacing.sm,
  },
  clearButton: {
    alignSelf: "flex-start",
  },
  clearLabel: {
    color: colors.danger,
    fontWeight: "700",
  },
});
