import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VideoView, useVideoPlayer, type VideoViewProps } from "expo-video";
import { router } from "expo-router";
import { type ComponentType, useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View, ViewToken } from "react-native";
import { MediaAttachmentPreview } from "@/components/media-attachment-preview";
import { ScreenState } from "@/components/screen-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { mediaService } from "@/services/media";
import { reelService } from "@/services/reels";
import { userService } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { Reel } from "@/types/domain";
import { colors, radius, spacing } from "@/utils/theme";

const ManagedVideoView = VideoView as unknown as ComponentType<VideoViewProps>;

export default function ReelsScreen() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { height } = useWindowDimensions();
  const [videoAttachment, setVideoAttachment] = useState<{ localUri: string; remoteUrl: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });

  const { data: reels = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["reels"],
    queryFn: reelService.list,
  });

  useEffect(() => {
    if (!reels.length) {
      setActiveReelId(null);
      return;
    }

    setActiveReelId((current) => (current && reels.some((reel) => reel.id === current) ? current : reels[0].id));
  }, [reels]);

  const createMutation = useMutation({
    mutationFn: () => reelService.create({ videoUrl: videoAttachment!.remoteUrl, caption: caption.trim() || undefined }),
    onError: (error) => {
      console.error("Failed to create reel", error);
      setScreenError("Could not publish this reel.");
    },
    onSuccess: async () => {
      setScreenError(null);
      setVideoAttachment(null);
      setCaption("");
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: (reelId: string) => reelService.like(reelId),
    onError: (error) => {
      console.error("Failed to like reel", error);
      setScreenError("Could not update reel reaction.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => userService.toggleFollow(userId),
    onError: (error) => {
      console.error("Failed to follow reel creator", error);
      setScreenError("Could not update follow state.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
      await queryClient.invalidateQueries({ queryKey: ["public-profile"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ reelId, body }: { reelId: string; body: string }) => reelService.comment(reelId, body),
    onError: (error) => {
      console.error("Failed to comment on reel", error);
      setScreenError("Could not post reel comment.");
    },
    onSuccess: async (_, variables) => {
      setScreenError(null);
      setCommentDrafts((current) => ({ ...current, [variables.reelId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: (reelId: string) => reelService.share(reelId),
    onError: (error) => {
      console.error("Failed to share reel", error);
      setScreenError("Could not prepare reel share link.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reelId: string) => reelService.delete(reelId),
    onError: (error) => {
      console.error("Failed to delete reel", error);
      setScreenError("Could not delete this reel.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    const nextVisible = viewableItems.find((item) => item.isViewable)?.item as Reel | undefined;
    if (nextVisible) {
      setActiveReelId(nextVisible.id);
    }
  }, []);

  const handlePickReel = async () => {
    try {
      setIsUploading(true);
      setScreenError(null);
      const asset = await mediaService.pickFromLibrary("video");

      if (!asset) {
        return;
      }

      const uploaded = await mediaService.uploadAsset(asset, "video");
      setVideoAttachment({ localUri: asset.uri, remoteUrl: uploaded.secureUrl });
    } catch (error) {
      console.error("Failed to pick reel", error);
      setScreenError("Could not load the reel video.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading && !reels.length) {
    return (
      <Screen>
        <ScreenState
          variant="loading"
          title="Loading reels"
          message="Short videos are being prepared."
        />
      </Screen>
    );
  }

  if (isError && !reels.length) {
    return (
      <Screen>
        <ScreenState
          variant="error"
          title="Could not load reels"
          message="Reels are temporarily unavailable."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Reels</Text>
      {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}
      <View style={styles.composeCard}>
        <Input label="Caption" value={caption} onChangeText={setCaption} multiline />
        <Pressable style={styles.uploadButton} onPress={() => void handlePickReel()}>
          <Text style={styles.uploadButtonLabel}>{isUploading ? "Uploading reel..." : "Pick reel video"}</Text>
        </Pressable>
        {videoAttachment ? (
          <MediaAttachmentPreview uri={videoAttachment.localUri} kind="VIDEO" height={260} autoPlay label="Ready to publish" />
        ) : null}
        <Button
          label={createMutation.isPending ? "Publishing..." : "Publish reel"}
          onPress={() => createMutation.mutate()}
          disabled={!videoAttachment?.remoteUrl || createMutation.isPending || isUploading}
        />
      </View>
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }) => (
          <ReelCard
            reel={item}
            active={item.id === activeReelId}
            cardHeight={Math.max(height * 0.66, 420)}
            currentUserId={currentUserId}
            commentDraft={commentDrafts[item.id] ?? ""}
            onCommentDraftChange={(value) => setCommentDrafts((current) => ({ ...current, [item.id]: value }))}
            onLike={() => likeMutation.mutate(item.id)}
            onFollow={() => followMutation.mutate(item.author.id)}
            onShare={() => shareMutation.mutate(item.id)}
            onDelete={() => deleteMutation.mutate(item.id)}
            onComment={() => commentMutation.mutate({ reelId: item.id, body: (commentDrafts[item.id] ?? "").trim() })}
            likePending={likeMutation.isPending && likeMutation.variables === item.id}
            followPending={followMutation.isPending && followMutation.variables === item.author.id}
            sharePending={shareMutation.isPending && shareMutation.variables === item.id}
            deletePending={deleteMutation.isPending && deleteMutation.variables === item.id}
            commentPending={commentMutation.isPending && commentMutation.variables?.reelId === item.id}
            sharePath={
              shareMutation.data?.shareSlug && shareMutation.variables === item.id
                ? `faceme://reels?share=${shareMutation.data.shareSlug}`
                : null
            }
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyState}>No reels yet. Publish the first short video.</Text>}
      />
    </Screen>
  );
}

type ReelCardProps = {
  reel: Reel;
  active: boolean;
  cardHeight: number;
  currentUserId?: string;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onLike: () => void;
  onFollow: () => void;
  onShare: () => void;
  onDelete: () => void;
  onComment: () => void;
  likePending: boolean;
  followPending: boolean;
  sharePending: boolean;
  deletePending: boolean;
  commentPending: boolean;
  sharePath: string | null;
};

const ReelCard = ({
  reel,
  active,
  cardHeight,
  currentUserId,
  commentDraft,
  onCommentDraftChange,
  onLike,
  onFollow,
  onShare,
  onDelete,
  onComment,
  likePending,
  followPending,
  sharePending,
  deletePending,
  commentPending,
  sharePath,
}: ReelCardProps) => {
  const player = useVideoPlayer(reel.videoUrl, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = false;
  });

  useEffect(() => {
    if (active) {
      player.play();
      return;
    }

    player.pause();
  }, [active, player]);

  useEffect(() => () => player.pause(), [player]);

  return (
    <View style={styles.reelCard}>
      <View style={styles.identity}>
        <Pressable onPress={() => router.push(`/profile/${reel.author.username}`)}>
          <Avatar name={reel.author.firstName ?? reel.author.username} />
        </Pressable>
        <View style={styles.identityText}>
          <Pressable onPress={() => router.push(`/profile/${reel.author.username}`)}>
            <Text style={styles.author}>{reel.author.firstName ?? reel.author.username}</Text>
          </Pressable>
          <Text style={styles.meta}>{reel.scoreReason ?? "Fresh from the Faceme reel loop"}</Text>
        </View>
      </View>
      <View style={[styles.videoFrame, { minHeight: cardHeight }]}>
        <ManagedVideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          nativeControls={false}
          contentFit="cover"
          allowsPictureInPicture={false}
        />
        <View style={styles.videoOverlay}>
          <Text style={styles.videoLabel}>{active ? "Now playing" : "Queued"}</Text>
          <Text style={styles.videoHint}>{active ? "Scroll for the next reel" : "Bring this reel into view to autoplay"}</Text>
        </View>
      </View>
      <Text style={styles.caption}>{reel.caption ?? "No caption."}</Text>
      <View style={styles.metrics}>
        <Text style={styles.metricText}>{reel.likesCount} likes</Text>
        <Text style={styles.metricText}>{reel.commentsCount ?? 0} comments</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={onLike}>
          <Text style={styles.actionText}>
            {likePending ? "Working..." : reel.isLiked ? "Liked" : "Like"}
          </Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onFollow}>
          <Text style={styles.actionText}>
            {reel.author.id === currentUserId ? "You" : followPending ? "Following..." : "Follow creator"}
          </Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onShare}>
          <Text style={styles.actionText}>{sharePending ? "Sharing..." : reel.shareSlug ? "Share link" : "Share"}</Text>
        </Pressable>
        {reel.canDelete ? (
          <Pressable style={styles.dangerButton} onPress={onDelete}>
            <Text style={styles.dangerText}>{deletePending ? "Deleting..." : "Delete"}</Text>
          </Pressable>
        ) : null}
      </View>
      <Input
        label="Comment on reel"
        value={commentDraft}
        onChangeText={onCommentDraftChange}
        placeholder="Join the conversation"
      />
      <Button
        label={commentPending ? "Posting..." : "Post comment"}
        variant="secondary"
        onPress={onComment}
        disabled={commentPending || !commentDraft.trim()}
      />
      {(reel.comments ?? []).length ? (
        <View style={styles.commentList}>
          {(reel.comments ?? []).slice(0, 4).map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Pressable onPress={() => router.push(`/profile/${comment.author.username}`)}>
                <Text style={styles.commentAuthor}>@{comment.author.username}</Text>
              </Pressable>
              <Text style={styles.commentBody}>{comment.body}</Text>
              {(comment.replies ?? []).length ? (
                <Text style={styles.commentMeta}>{(comment.replies ?? []).length} replies in thread</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {sharePath ? <Text style={styles.sharePath}>{sharePath}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 30, fontWeight: "800" },
  composeCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  list: { gap: spacing.md, paddingBottom: 80 },
  reelCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  identity: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  identityText: { flex: 1, gap: 2 },
  author: { color: colors.text, fontWeight: "800" },
  meta: { color: colors.textSoft, fontSize: 12 },
  videoFrame: {
    backgroundColor: "#131313",
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  videoOverlay: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: "rgba(11, 24, 40, 0.72)",
    borderRadius: radius.md,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  videoLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  videoHint: { color: "#D9D9D9", lineHeight: 18 },
  caption: { color: colors.text, lineHeight: 22 },
  metrics: { flexDirection: "row", gap: spacing.md },
  metricText: { color: colors.textSoft, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: { color: colors.primaryDark, fontWeight: "700" },
  dangerButton: {
    backgroundColor: "#FDECEC",
    borderColor: "#F6C7C7",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dangerText: { color: "#B42318", fontWeight: "700" },
  commentList: { gap: spacing.sm },
  commentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  commentAuthor: { color: colors.primaryDark, fontWeight: "800" },
  commentBody: { color: colors.text },
  commentMeta: { color: colors.textMuted, fontSize: 12 },
  sharePath: { color: colors.primaryDark, fontWeight: "700" },
  emptyState: { color: colors.textSoft, lineHeight: 22, textAlign: "center" },
  uploadButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  uploadButtonLabel: { color: colors.primaryDark, fontWeight: "700" },
  errorText: { color: colors.danger, lineHeight: 20 },
});
