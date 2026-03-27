import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { PostCard } from "@/components/post-card";
import { Screen } from "@/components/ui/screen";
import { socialService } from "@/services/social";
import { Avatar } from "@/components/ui/avatar";
import { colors, radius, spacing } from "@/utils/theme";

export default function ExploreScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["explore-hub"],
    queryFn: socialService.getExploreHub,
  });

  return (
    <Screen>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>Trending content, active discussions, and social discovery in one place.</Text>
      {isLoading ? <Text style={styles.feedback}>Loading explore...</Text> : null}
      {isError ? (
        <Text style={styles.feedback} onPress={() => void refetch()}>
          Could not load explore. Tap to retry.
        </Text>
      ) : null}
      {!isLoading && !isError && !data?.trendingPosts?.length ? (
        <Text style={styles.feedback}>No explore posts available yet.</Text>
      ) : null}
      {data?.activeDiscussions?.length ? (
        <>
          <Text style={styles.sectionTitle}>Active discussions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {data.activeDiscussions.map((discussion) => (
              <View key={discussion.id} style={styles.discussionCard}>
                <Text style={styles.discussionTitle} numberOfLines={3}>
                  {discussion.body}
                </Text>
                <Text style={styles.discussionMeta}>
                  {discussion.commentsCount} replies • @{discussion.author.username}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
      {data?.suggestedUsers?.length ? (
        <>
          <Text style={styles.sectionTitle}>Suggested users</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {data.suggestedUsers.map((user) => (
              <Pressable
                key={user.id}
                style={styles.userCard}
                onPress={() => router.push(`/profile/${user.username}`)}
              >
                <Avatar name={user.firstName ?? user.username} />
                <Text style={styles.userName}>{user.firstName ?? user.username}</Text>
                <Text style={styles.userMeta}>@{user.username}</Text>
                <Text style={styles.userMeta}>{user.mutualFriendsCount ?? 0} mutual</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
      {data?.suggestedPages?.length ? (
        <>
          <Text style={styles.sectionTitle}>Suggested pages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {data.suggestedPages.map((page) => (
              <Pressable key={page.id} style={styles.entityCard} onPress={() => router.push(`/page/${page.slug}` as never)}>
                <Text style={styles.entityTitle}>{page.name}</Text>
                <Text style={styles.entityMeta}>{page.followersCount} followers</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
      {data?.suggestedGroups?.length ? (
        <>
          <Text style={styles.sectionTitle}>Suggested groups</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {data.suggestedGroups.map((group) => (
              <Pressable key={group.id} style={styles.entityCard} onPress={() => router.push(`/group/${group.slug}` as never)}>
                <Text style={styles.entityTitle}>{group.name}</Text>
                <Text style={styles.entityMeta}>
                  {group.membersCount} members • {group.discussionCount} replies
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
      <ScrollView contentContainerStyle={styles.list}>
        {data?.trendingPosts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
  },
  feedback: {
    color: colors.textMuted,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  discussionCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: 240,
  },
  discussionTitle: {
    color: colors.text,
    fontWeight: "700",
    lineHeight: 20,
  },
  discussionMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  userCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    width: 120,
  },
  userName: {
    color: colors.text,
    fontWeight: "800",
  },
  userMeta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  entityCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    width: 220,
  },
  entityTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  entityMeta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  list: {
    gap: spacing.md,
    paddingBottom: 120,
  },
});
