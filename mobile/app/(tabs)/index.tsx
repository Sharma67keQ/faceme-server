import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenState } from "@/components/screen-state";
import { Avatar } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { Screen } from "@/components/ui/screen";
import { useI18n } from "@/services/i18n";
import { postService } from "@/services/posts";
import { storyService } from "@/services/stories";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

const updateFeedPosts = (
  current: any[] | undefined,
  updater: (posts: any[]) => any[],
) => (current ? updater([...current]) : current);

export default function FeedScreen() {
  const user = useAuthStore((state) => state.user);
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: feed = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["feed"],
    queryFn: postService.getFeed,
  });
  const {
    data: stories = [],
    isError: storiesError,
  } = useQuery({
    queryKey: ["stories"],
    queryFn: storyService.getFollowingStories,
  });

  const likePostMutation = useMutation({
    mutationFn: (postId: string) => postService.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData<any[]>(["feed"]);
      queryClient.setQueryData(["feed"], (current: any[] | undefined) =>
        updateFeedPosts(current, (posts) =>
          posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  _count: {
                    ...post._count,
                    likes: post._count.likes + 1,
                  },
                }
              : post,
          ),
        ),
      );
      return { previousFeed };
    },
    onError: (_error, _postId, context) => {
      console.error("Feed like failed", _error);
      if (context?.previousFeed) {
        queryClient.setQueryData(["feed"], context.previousFeed);
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) => postService.commentOnPost(postId, body),
    onMutate: async ({ postId, body }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData<any[]>(["feed"]);
      const optimisticComment = {
        id: `optimistic-${Date.now()}`,
        postId,
        body,
        createdAt: new Date().toISOString(),
        author: user,
        replies: [],
        reactionSummary: { likes: 0, dislikes: 0, emojis: [] },
        viewerReactions: { like: false, dislike: false, emojis: [] },
      };
      queryClient.setQueryData(["feed"], (current: any[] | undefined) =>
        updateFeedPosts(current, (posts) =>
          posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: [...(post.comments ?? []), optimisticComment],
                  _count: { ...post._count, comments: post._count.comments + 1 },
                }
              : post,
          ),
        ),
      );
      return { previousFeed };
    },
    onError: (_error, _vars, context) => {
      console.error("Feed comment failed", _error);
      if (context?.previousFeed) {
        queryClient.setQueryData(["feed"], context.previousFeed);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (postId: string) => postService.toggleSavedPost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeed = queryClient.getQueryData<any[]>(["feed"]);
      queryClient.setQueryData(["feed"], (current: any[] | undefined) =>
        updateFeedPosts(current, (posts) =>
          posts.map((post) => (post.id === postId ? { ...post, isSaved: !post.isSaved } : post)),
        ),
      );
      return { previousFeed };
    },
    onError: (_error, _vars, context) => {
      console.error("Save post failed", _error);
      if (context?.previousFeed) {
        queryClient.setQueryData(["feed"], context.previousFeed);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: (postId: string) => postService.sharePost(postId),
    onError: (error) => {
      console.error("Share post failed", error);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  if (isLoading && !feed.length) {
    return (
      <Screen>
        <ScreenState
          variant="loading"
          title={t("feed.loading")}
          message="Faceme is loading your latest posts."
        />
      </Screen>
    );
  }

  if (isError && !feed.length) {
    return (
      <Screen>
        <ScreenState
          variant="error"
          title="Could not load your feed"
          message="The app is still working, but the home feed could not be reached right now."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.composerCard}>
        <View style={styles.composerTopRow}>
          <Avatar name={user?.firstName ?? user?.username ?? "F"} size={44} />
          <Pressable style={styles.composerInput} onPress={() => router.push("/(tabs)/create")}>
            <Text style={styles.composerPlaceholder}>Maxaa maskaxdaada ku jira?</Text>
          </Pressable>
        </View>
        <View style={styles.composerActions}>
          <Pressable style={styles.composerAction} onPress={() => router.push("/(tabs)/create")}>
            <Ionicons name="image-outline" size={18} color={colors.success} />
            <Text style={styles.composerActionLabel}>Photo</Text>
          </Pressable>
          <Pressable style={styles.composerAction} onPress={() => router.push("/(tabs)/create")}>
            <Ionicons name="videocam-outline" size={18} color={colors.accent} />
            <Text style={styles.composerActionLabel}>Video</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.storySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
          <Pressable style={styles.addStoryCard} onPress={() => router.push("/status")}>
            <View style={styles.addStoryAvatar}>
              <Avatar name={user?.firstName ?? user?.username ?? "F"} size={48} />
              <View style={styles.addBadge}>
                <Ionicons name="add" size={12} color={colors.surface} />
              </View>
            </View>
            <Text style={styles.storyLabel}>Create story</Text>
          </Pressable>
          {stories.map((story) => (
            <Pressable
              key={story.id}
              style={[styles.storyCard, story.isViewed ? styles.storyCardViewed : null]}
              onPress={() => router.push(`/story/${story.id}`)}
            >
              <View style={[styles.storyRing, story.isViewed ? styles.storyRingViewed : null]}>
                <Avatar name={story.author.firstName ?? story.author.username} size={48} />
              </View>
              <Text numberOfLines={1} style={styles.storyLabel}>
                {story.author.firstName ?? story.author.username}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {storiesError ? <Text style={styles.feedback}>Stories are temporarily unavailable.</Text> : null}
      </View>

      <View style={styles.feedSection}>
        {isLoading ? <Text style={styles.feedback}>{t("feed.loading")}</Text> : null}
        {isError ? (
          <Text style={styles.feedback} onPress={() => void refetch()}>
            {t("feed.retry")}
          </Text>
        ) : null}
        {!isLoading && !isError && !feed.length ? <Text style={styles.feedback}>{t("feed.empty")}</Text> : null}
        {feed.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => likePostMutation.mutate(post.id)}
            onComment={(body) => commentMutation.mutateAsync({ postId: post.id, body })}
            onSave={() => saveMutation.mutate(post.id)}
            onShare={() => shareMutation.mutate(post.id)}
            isCommenting={commentMutation.isPending}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  composerCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  composerTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  composerPlaceholder: {
    color: colors.textMuted,
    fontSize: 15,
  },
  composerActions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  composerAction: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  composerActionLabel: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  storySection: {
    marginHorizontal: -spacing.lg,
  },
  storyRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  addStoryCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: 88,
  },
  addStoryAvatar: {
    position: "relative",
  },
  addBadge: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.pill,
    bottom: -2,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 18,
  },
  storyCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: 88,
  },
  storyCardViewed: {
    opacity: 0.8,
  },
  storyRing: {
    borderColor: colors.primaryDark,
    borderRadius: radius.pill,
    borderWidth: 2,
    padding: 2,
  },
  storyRingViewed: {
    borderColor: colors.textSoft,
  },
  storyLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  feedSection: {
    gap: spacing.md,
    paddingBottom: 140,
  },
  feedback: {
    color: colors.textMuted,
  },
});
