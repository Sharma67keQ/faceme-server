import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Screen } from "@/components/ui/screen";
import { PostCard } from "@/components/post-card";
import { userService } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const stats = [
    { label: "Posts", value: user?._count?.posts ?? 0, type: "posts" },
    { label: "Followers", value: user?._count?.followers ?? 0, type: "followers" },
    { label: "Following", value: user?._count?.following ?? 0, type: "following" },
    { label: "Friends", value: user?.friendCount ?? 0, type: "friends" },
  ] as const;
  const { data: posts = [] } = useQuery({
    queryKey: ["my-profile-posts", user?.username],
    queryFn: () => (user?.username ? userService.getUserPostsByUsername(user.username) : Promise.resolve([])),
    enabled: Boolean(user?.username),
  });

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const openConnections = (type: "followers" | "following") => {
    if (!user?.username) {
      return;
    }

    router.push(`/profile/${user.username}/connections?type=${type}` as never);
  };

  const hasModerationAccess = user?.role === "ADMIN" || user?.role === "MODERATOR";

  return (
    <Screen>
      <LinearGradient colors={["#F7F0E6", "#DED2C0"]} style={styles.hero}>
        <View style={styles.heroTop}>
          <Avatar name={user?.firstName ?? "F"} size={74} />
          <View style={styles.heroInfo}>
            <View style={styles.badgeRow}>
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeLabel}>{user?.accountType ?? "PERSONAL"}</Text>
              </View>
              <View style={styles.memberBadge}>
                <Ionicons name="sparkles-outline" color={colors.gold} size={14} />
                <Text style={styles.memberBadgeLabel}>Faceme identity</Text>
              </View>
            </View>
            <Text style={styles.name}>{user?.firstName ?? "Faceme User"}</Text>
            <Text style={styles.username}>@{user?.username ?? "username"}</Text>
            <Text style={styles.meta}>{user?.email ?? "No email loaded"}</Text>
          </View>
        </View>
        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        <View style={styles.quickActions}>
          <Pressable style={styles.quickAction} onPress={() => router.push("/profile/edit")}>
            <Ionicons name="create-outline" color={colors.primaryDark} size={16} />
            <Text style={styles.quickActionLabel}>Edit profile</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push("/saved")}>
            <Ionicons name="bookmark-outline" color={colors.primaryDark} size={16} />
            <Text style={styles.quickActionLabel}>Saved</Text>
          </Pressable>
          {hasModerationAccess ? (
            <Pressable style={styles.quickAction} onPress={() => router.push("/moderation")}>
              <Ionicons name="shield-checkmark-outline" color={colors.primaryDark} size={16} />
              <Text style={styles.quickActionLabel}>Moderation</Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <Pressable
            key={stat.label}
            style={styles.statCard}
            onPress={() => {
              if (stat.type === "followers" || stat.type === "following") {
                openConnections(stat.type);
              }
            }}
          >
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.details}>
        <Text style={styles.sectionTitle}>Identity</Text>
        <Text style={styles.detailText}>Location: {user?.location ?? "Not set"}</Text>
        <Text style={styles.detailText}>Website: {user?.website ?? "Not set"}</Text>
        <Text style={styles.detailText}>Account: {user?.accountType ?? "PERSONAL"}</Text>
        <Text style={styles.detailText}>Privacy: {user?.profileVisibility ?? "PUBLIC"}</Text>
      </View>

      <View style={styles.actionStack}>
        <Button label="Edit profile" variant="secondary" onPress={() => router.push("/profile/edit")} />
        <Button label="Saved posts" variant="secondary" onPress={() => router.push("/saved")} />
        {hasModerationAccess ? (
          <Button label="Moderation" variant="secondary" onPress={() => router.push("/moderation")} />
        ) : null}
        <Button label="Sign out" onPress={handleSignOut} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your posts</Text>
        <Text style={styles.sectionMeta}>{posts.length}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.postList}>
        {posts.map((post: any) => (
          <PostCard key={post.id} post={post} />
        ))}
        {!posts.length ? <Text style={styles.empty}>You have not posted yet.</Text> : null}
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
    padding: spacing.xl,
  },
  heroTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  modeBadge: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  modeBadgeLabel: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  memberBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  memberBadgeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  username: {
    color: colors.textSoft,
    fontWeight: "700",
  },
  meta: {
    color: colors.textMuted,
  },
  bio: {
    color: colors.text,
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  quickActionLabel: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
  },
  details: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  detailText: {
    color: colors.text,
  },
  actionStack: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionMeta: {
    color: colors.textSoft,
    fontWeight: "700",
  },
  postList: {
    gap: spacing.md,
    paddingBottom: 140,
  },
  empty: {
    color: colors.textMuted,
  },
});
