import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { PostCard } from "@/components/post-card";
import { Screen } from "@/components/ui/screen";
import { postService } from "@/services/posts";
import { socialService } from "@/services/social";
import { storyService } from "@/services/stories";
import { userService } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";
import { Avatar } from "@/components/ui/avatar";

export default function FeedScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["feed"],
    queryFn: postService.getFeed,
  });
  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: storyService.getFollowingStories,
  });
  const { data: suggestedProfiles = [] } = useQuery({
    queryKey: ["suggested-profiles"],
    queryFn: userService.getSuggestedProfiles,
  });
  const { data: launch } = useQuery({
    queryKey: ["launch-summary"],
    queryFn: socialService.getLaunchSummary,
  });
  const likePostMutation = useMutation({
    mutationFn: (postId: string) => postService.likePost(postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const commentMutation = useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) =>
      postService.commentOnPost(postId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const saveMutation = useMutation({
    mutationFn: (postId: string) => postService.toggleSavedPost(postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
  const shareMutation = useMutation({
    mutationFn: (postId: string) => postService.sharePost(postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const inviteMutation = useMutation({
    mutationFn: () => socialService.createInvite("Join me on Faceme"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
    },
  });
  const friendRequestMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "accept" | "reject" }) =>
      socialService.respondToFriendRequest(requestId, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const followPageMutation = useMutation({
    mutationFn: (pageId: string) => socialService.togglePageFollow(pageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const joinGroupMutation = useMutation({
    mutationFn: (groupId: string) => socialService.joinGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
    },
  });
  const launchFriendRequests = launch?.friendRequests?.incoming ?? [];
  const launchSuggestedPages = launch?.onboarding?.suggestedPages ?? [];
  const launchSuggestedGroups = launch?.onboarding?.suggestedGroups ?? [];
  const enabledFeatureFlags = launch?.featureFlags?.filter((flag) => flag.isEnabled).length ?? 0;

  const activeNowPosts = [...(data ?? [])]
    .sort((left, right) => (right._count.comments + right._count.likes) - (left._count.comments + left._count.likes))
    .slice(0, 3);
  const mostDiscussedPosts = [...(data ?? [])]
    .sort((left, right) => right._count.comments - left._count.comments)
    .slice(0, 3);

  return (
    <Screen>
      <LinearGradient colors={["#F7F1E8", "#E7DED0"]} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBrand}>
            <BrandLockup compact />
            <Text style={styles.eyebrow}>Faceme Network</Text>
            <Text style={styles.title}>Good morning, {user?.firstName ?? "there"}.</Text>
          </View>
          <Pressable style={styles.exploreButton} onPress={() => router.push("/explore")}>
            <Ionicons name="compass-outline" color={colors.primaryDark} size={18} />
            <Text style={styles.exploreLink}>Explore</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Social updates, replies, stories, and community momentum live in one stream.
        </Text>
        <View style={styles.heroMetrics}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{data?.length ?? 0}</Text>
            <Text style={styles.metricLabel}>Feed posts</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stories.length}</Text>
            <Text style={styles.metricLabel}>Live stories</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{user?._count?.followers ?? 0}</Text>
            <Text style={styles.metricLabel}>Network</Text>
          </View>
        </View>
        <View style={styles.heroLinks}>
          <Pressable style={styles.quickLink} onPress={() => router.push("/status" as never)}>
            <Text style={styles.quickLinkText}>Status</Text>
          </Pressable>
          <Pressable style={styles.quickLink} onPress={() => router.push("/reels" as never)}>
            <Text style={styles.quickLinkText}>Reels</Text>
          </Pressable>
          <Pressable style={styles.quickLink} onPress={() => router.push("/voice-rooms" as never)}>
            <Text style={styles.quickLinkText}>Voice rooms</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.composerCard}>
        <View style={styles.composerCopy}>
          <Text style={styles.composerTitle}>Start a conversation</Text>
          <Text style={styles.composerSubtitle}>
            Share an update, publish a story, or move into Studio.
          </Text>
        </View>
        <Pressable style={styles.composerCta} onPress={() => router.push("/(tabs)/create")}>
          <Ionicons name="add" color={colors.surface} size={18} />
          <Text style={styles.composerCtaText}>Create</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Stories and circles</Text>
        <Pressable onPress={() => router.push("/communities")}>
          <Text style={styles.sectionLink}>Communities</Text>
        </Pressable>
      </View>
      {stories.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyTray}>
          {stories.map((story) => (
            <Pressable
              key={story.id}
              style={[styles.storyCard, story.isViewed ? styles.storyCardViewed : null]}
              onPress={() => router.push(`/story/${story.id}`)}
            >
              <View style={[styles.storyOrb, story.isViewed ? styles.storyOrbViewed : null]}>
                <Text style={styles.storyInitial}>{story.author.firstName?.slice(0, 1) ?? "F"}</Text>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {story.author.firstName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.feedback}>No live stories yet. Publish one from Studio.</Text>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Suggested profiles</Text>
        <Text style={styles.sectionMeta}>{suggestedProfiles.length}</Text>
      </View>
      {suggestedProfiles.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
          {suggestedProfiles.map((profile) => (
            <Pressable
              key={profile.id}
              style={styles.suggestionCard}
              onPress={() => router.push(`/profile/${profile.username}`)}
            >
              <Avatar name={profile.firstName ?? profile.username} />
              <Text style={styles.suggestionName} numberOfLines={1}>
                {profile.firstName}
              </Text>
              <Text style={styles.suggestionMeta} numberOfLines={1}>
                @{profile.username}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.launchCard}>
        <View style={styles.launchHeader}>
          <View style={styles.launchCopy}>
            <Text style={styles.sectionTitle}>Launch control</Text>
            <Text style={styles.launchBody}>
              {launch?.betaAccess?.isBetaUser
                ? `Beta cohort${launch.betaAccess.cohort ? `: ${launch.betaAccess.cohort}` : ""}`
                : "Soft launch support is enabled for staged rollout."}
            </Text>
          </View>
          <Pressable style={styles.launchInviteButton} onPress={() => inviteMutation.mutate()}>
            <Text style={styles.launchInviteText}>{inviteMutation.isPending ? "Creating..." : "Invite"}</Text>
          </Pressable>
        </View>
        <View style={styles.launchMetrics}>
          <View style={styles.launchMetric}>
            <Text style={styles.metricValue}>{enabledFeatureFlags}</Text>
            <Text style={styles.metricLabel}>Live flags</Text>
          </View>
          <View style={styles.launchMetric}>
            <Text style={styles.metricValue}>{launchFriendRequests.length}</Text>
            <Text style={styles.metricLabel}>Requests</Text>
          </View>
          <View style={styles.launchMetric}>
            <Text style={styles.metricValue}>{launchSuggestedGroups.length}</Text>
            <Text style={styles.metricLabel}>Groups</Text>
          </View>
        </View>
        {launch?.invite?.link ? (
          <Text style={styles.inviteLink} numberOfLines={1}>
            {launch.invite.link}
          </Text>
        ) : null}
      </View>

      {launchFriendRequests.length ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friend requests</Text>
            <Text style={styles.sectionMeta}>{launchFriendRequests.length}</Text>
          </View>
          <View style={styles.requestList}>
            {launchFriendRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestIdentity}>
                  <Avatar name={request.user.firstName ?? request.user.username} />
                  <View style={styles.requestCopy}>
                    <Text style={styles.requestName}>{request.user.firstName ?? request.user.username}</Text>
                    <Text style={styles.requestMeta}>@{request.user.username}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <Pressable
                    style={styles.requestAccept}
                    onPress={() => friendRequestMutation.mutate({ requestId: request.id, action: "accept" })}
                  >
                    <Text style={styles.requestAcceptText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={styles.requestReject}
                    onPress={() => friendRequestMutation.mutate({ requestId: request.id, action: "reject" })}
                  >
                    <Text style={styles.requestRejectText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {launchSuggestedPages.length ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested pages</Text>
            <Text style={styles.sectionMeta}>{launchSuggestedPages.length}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
            {launchSuggestedPages.map((page) => (
              <Pressable key={page.id} style={styles.socialCard} onPress={() => router.push(`/page/${page.slug}` as never)}>
                <Text style={styles.socialTitle}>{page.name}</Text>
                <Text style={styles.socialMeta}>{page.followersCount} followers</Text>
                <Text style={styles.socialBody} numberOfLines={2}>
                  {page.description ?? "Brand, creator, and community updates."}
                </Text>
                <Pressable style={styles.socialButton} onPress={() => followPageMutation.mutate(page.id)}>
                  <Text style={styles.socialButtonText}>{page.isFollowing ? "Following" : "Follow page"}</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {launchSuggestedGroups.length ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested groups</Text>
            <Text style={styles.sectionMeta}>{launchSuggestedGroups.length}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
            {launchSuggestedGroups.map((group) => (
              <Pressable key={group.id} style={styles.socialCard} onPress={() => router.push(`/group/${group.slug}` as never)}>
                <Text style={styles.socialTitle}>{group.name}</Text>
                <Text style={styles.socialMeta}>
                  {group.membersCount} members - {group.discussionCount} replies
                </Text>
                <Text style={styles.socialBody} numberOfLines={2}>
                  {group.description ?? "Discussion-first social spaces."}
                </Text>
                <Pressable style={styles.socialButton} onPress={() => joinGroupMutation.mutate(group.id)}>
                  <Text style={styles.socialButtonText}>
                    {group.isMember ? "Joined" : group.privacy === "PRIVATE" ? "Request join" : "Join group"}
                  </Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active now</Text>
        <Text style={styles.sectionMeta}>{activeNowPosts.length}</Text>
      </View>
      {activeNowPosts.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
          {activeNowPosts.map((post) => (
            <Pressable key={post.id} style={styles.topicCard}>
              <Text style={styles.topicTitle} numberOfLines={2}>{post.body}</Text>
              <Text style={styles.topicMeta}>{post._count.comments} replies</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Most discussed</Text>
        <Text style={styles.sectionMeta}>{mostDiscussedPosts.length}</Text>
      </View>
      {mostDiscussedPosts.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
          {mostDiscussedPosts.map((post) => (
            <Pressable key={post.id} style={styles.topicCard}>
              <Text style={styles.topicTitle} numberOfLines={2}>{post.body}</Text>
              <Text style={styles.topicMeta}>by @{post.author.username}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Feed</Text>
        <Text style={styles.sectionMeta}>{data?.length ?? 0} posts</Text>
      </View>
      {isLoading ? <Text style={styles.feedback}>Loading your feed...</Text> : null}
      {isError ? (
        <Text style={styles.feedback} onPress={() => void refetch()}>
          Could not load the feed. Tap to retry.
        </Text>
      ) : null}
      {!isLoading && !isError && !data?.length ? (
        <Text style={styles.feedback}>Your feed is empty. Create a post to get started.</Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {data?.map((post) => (
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroBrand: {
    flex: 1,
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
    fontSize: 32,
    fontWeight: "800",
  },
  exploreButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exploreLink: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  heroMetrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroLinks: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickLink: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickLinkText: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  metricCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  composerCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  composerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  composerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  composerSubtitle: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  composerCta: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  composerCtaText: {
    color: colors.surface,
    fontWeight: "800",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionLink: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  sectionMeta: {
    color: colors.textSoft,
    fontWeight: "700",
  },
  list: {
    gap: spacing.md,
    paddingBottom: 140,
  },
  storyTray: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  suggestionRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  suggestionCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    width: 104,
  },
  suggestionName: {
    color: colors.text,
    fontWeight: "800",
  },
  suggestionMeta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  launchCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  launchHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  launchCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  launchBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  launchInviteButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  launchInviteText: {
    color: colors.surface,
    fontWeight: "800",
  },
  launchMetrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  launchMetric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xxs,
    padding: spacing.sm,
  },
  inviteLink: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  requestList: {
    gap: spacing.sm,
  },
  requestCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  requestIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  requestCopy: {
    flex: 1,
    gap: 2,
  },
  requestName: {
    color: colors.text,
    fontWeight: "800",
  },
  requestMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  requestAccept: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  requestAcceptText: {
    color: colors.surface,
    fontWeight: "800",
    textAlign: "center",
  },
  requestReject: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  requestRejectText: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "center",
  },
  socialCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: 220,
  },
  socialTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  socialBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  socialMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  socialButtonText: {
    color: colors.surface,
    fontWeight: "800",
  },
  topicRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  topicCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: 220,
  },
  topicTitle: {
    color: colors.text,
    fontWeight: "700",
    lineHeight: 20,
  },
  topicMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  storyCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    width: 82,
  },
  storyCardViewed: {
    opacity: 0.75,
  },
  storyOrb: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  storyOrbViewed: {
    backgroundColor: colors.textSoft,
  },
  storyInitial: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "800",
  },
  storyName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  feedback: {
    color: colors.textMuted,
  },
});
