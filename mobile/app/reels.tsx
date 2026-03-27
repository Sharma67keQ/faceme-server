import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { reelService } from "@/services/reels";
import { userService } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function ReelsScreen() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const { data: reels = [] } = useQuery({
    queryKey: ["reels"],
    queryFn: reelService.list,
  });

  const createMutation = useMutation({
    mutationFn: () => reelService.create({ videoUrl: videoUrl.trim(), caption: caption.trim() || undefined }),
    onSuccess: async () => {
      setVideoUrl("");
      setCaption("");
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: (reelId: string) => reelService.like(reelId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => userService.toggleFollow(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
      await queryClient.invalidateQueries({ queryKey: ["public-profile"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ reelId, body }: { reelId: string; body: string }) => reelService.comment(reelId, body),
    onSuccess: async (_, variables) => {
      setCommentDrafts((current) => ({ ...current, [variables.reelId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: (reelId: string) => reelService.share(reelId),
  });

  const deleteMutation = useMutation({
    mutationFn: (reelId: string) => reelService.delete(reelId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reels"] });
    },
  });

  return (
    <Screen scroll>
      <Text style={styles.title}>Reels</Text>
      <View style={styles.composeCard}>
        <Input label="Video URL" value={videoUrl} onChangeText={setVideoUrl} placeholder="https://..." />
        <Input label="Caption" value={caption} onChangeText={setCaption} multiline />
        <Button
          label={createMutation.isPending ? "Publishing..." : "Publish reel"}
          onPress={() => createMutation.mutate()}
          disabled={!videoUrl.trim() || createMutation.isPending}
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {reels.map((reel) => (
          <View key={reel.id} style={styles.reelCard}>
            <View style={styles.identity}>
              <Pressable onPress={() => router.push(`/profile/${reel.author.username}`)}>
                <Avatar name={reel.author.firstName ?? reel.author.username} />
              </Pressable>
              <View style={styles.identityText}>
                <Pressable onPress={() => router.push(`/profile/${reel.author.username}`)}>
                  <Text style={styles.author}>{reel.author.firstName ?? reel.author.username}</Text>
                </Pressable>
                <Text style={styles.meta}>{reel.scoreReason}</Text>
              </View>
            </View>
            <View style={styles.videoFrame}>
              <Text style={styles.videoLabel}>Vertical video</Text>
              <Text style={styles.videoUrl}>{reel.videoUrl}</Text>
            </View>
            <Text style={styles.caption}>{reel.caption ?? "No caption."}</Text>
            <View style={styles.metrics}>
              <Text style={styles.metricText}>{reel.likesCount} likes</Text>
              <Text style={styles.metricText}>{reel.commentsCount ?? 0} comments</Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.actionButton} onPress={() => likeMutation.mutate(reel.id)}>
                <Text style={styles.actionText}>{reel.isLiked ? "Liked" : "Like"}</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => followMutation.mutate(reel.author.id)}>
                <Text style={styles.actionText}>{reel.author.id === currentUserId ? "You" : "Follow creator"}</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => shareMutation.mutate(reel.id)}>
                <Text style={styles.actionText}>
                  {shareMutation.isPending ? "Sharing..." : reel.shareSlug ? "Share link" : "Share"}
                </Text>
              </Pressable>
              {reel.canDelete ? (
                <Pressable style={styles.dangerButton} onPress={() => deleteMutation.mutate(reel.id)}>
                  <Text style={styles.dangerText}>{deleteMutation.isPending ? "Deleting..." : "Delete"}</Text>
                </Pressable>
              ) : null}
            </View>
            <Input
              label="Comment on reel"
              value={commentDrafts[reel.id] ?? ""}
              onChangeText={(value) => setCommentDrafts((current) => ({ ...current, [reel.id]: value }))}
              placeholder="Join the conversation"
            />
            <Button
              label={commentMutation.isPending ? "Posting..." : "Post comment"}
              variant="secondary"
              onPress={() => commentMutation.mutate({ reelId: reel.id, body: (commentDrafts[reel.id] ?? "").trim() })}
              disabled={commentMutation.isPending || !(commentDrafts[reel.id] ?? "").trim()}
            />
            {reel.comments?.length ? (
              <View style={styles.commentList}>
                {reel.comments.slice(0, 4).map((comment) => (
                  <View key={comment.id} style={styles.commentCard}>
                    <Pressable onPress={() => router.push(`/profile/${comment.author.username}`)}>
                      <Text style={styles.commentAuthor}>@{comment.author.username}</Text>
                    </Pressable>
                    <Text style={styles.commentBody}>{comment.body}</Text>
                    {comment.replies.length ? (
                      <Text style={styles.commentMeta}>{comment.replies.length} replies in thread</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
            {shareMutation.data?.shareSlug && shareMutation.variables === reel.id ? (
              <Text style={styles.sharePath}>faceme://reels?share={shareMutation.data.shareSlug}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

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
    gap: spacing.sm,
    minHeight: 360,
    justifyContent: "center",
    padding: spacing.lg,
  },
  videoLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  videoUrl: { color: "#D9D9D9" },
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
});
