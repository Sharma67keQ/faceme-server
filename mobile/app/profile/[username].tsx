import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { PostCard } from "@/components/post-card";
import { chatService } from "@/services/chat";
import { socialService } from "@/services/social";
import { userService } from "@/services/users";
import { colors, radius, spacing } from "@/utils/theme";

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => userService.getUserByUsername(username),
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["public-profile-posts", username],
    queryFn: () => userService.getUserPostsByUsername(username),
    enabled: Boolean(user?.canViewPosts),
  });
  const { data: relationship } = useQuery({
    queryKey: ["relationship", user?.id],
    queryFn: () => socialService.getRelationship(user!.id),
    enabled: Boolean(user?.id),
  });
  const followMutation = useMutation({
    mutationFn: (userId: string) => userService.toggleFollow(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["public-profile", username] });
      await queryClient.invalidateQueries({ queryKey: ["public-profile-posts", username] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const messageMutation = useMutation({
    mutationFn: (peerId: string) => chatService.createDirectConversation(peerId),
    onSuccess: (conversation) => {
      router.push(`/chat/${conversation.id}`);
    },
  });
  const friendMutation = useMutation({
    mutationFn: async (action: "send" | "accept" | "remove") => {
      if (!user?.id) {
        return null;
      }

      if (action === "send") {
        return socialService.sendFriendRequest(user.id);
      }

      if (action === "remove") {
        return socialService.removeFriend(user.id);
      }

      if (!relationship?.friendRequestId) {
        return null;
      }

      return socialService.respondToFriendRequest(relationship.friendRequestId, "accept");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["relationship", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const openConnections = (type: "followers" | "following") => {
    router.push(`/profile/${username}/connections?type=${type}` as never);
  };

  return (
    <Screen>
      {isLoading ? <Text style={styles.feedback}>Loading profile...</Text> : null}
      {isError ? (
        <Text style={styles.feedback} onPress={() => void refetch()}>
          Could not load profile. Tap to retry.
        </Text>
      ) : null}
      {user ? (
        <>
          <View style={styles.hero}>
            <Avatar name={user.firstName ?? user.username} size={72} />
            <Text style={styles.name}>{user.firstName}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>
          <View style={styles.stats}>
            <Pressable style={styles.statCard}>
              <Text style={styles.statValue}>{user._count?.posts ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => openConnections("followers")}>
              <Text style={styles.statValue}>{user._count?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => openConnections("following")}>
              <Text style={styles.statValue}>{user._count?.following ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
            <Pressable style={styles.statCard}>
              <Text style={styles.statValue}>{user.friendCount ?? 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </Pressable>
          </View>
          <View style={styles.actions}>
            <Button
              label={
                friendMutation.isPending
                  ? "Updating..."
                  : relationship?.isFriend
                    ? "Friends"
                    : relationship?.hasIncomingRequest
                      ? "Accept friend"
                      : relationship?.hasSentRequest
                        ? "Request sent"
                        : "Add friend"
              }
              variant={relationship?.isFriend ? "secondary" : "primary"}
              onPress={() =>
                friendMutation.mutate(
                  relationship?.isFriend ? "remove" : relationship?.hasIncomingRequest ? "accept" : "send",
                )
              }
              disabled={friendMutation.isPending || Boolean(relationship?.hasSentRequest)}
            />
            <Button
              label={followMutation.isPending ? "Updating..." : user.isFollowing ? "Following" : "Follow"}
              variant={user.isFollowing ? "secondary" : "primary"}
              onPress={() => followMutation.mutate(user.id)}
              disabled={followMutation.isPending}
            />
            <Button
              label={messageMutation.isPending ? "Opening..." : "Message"}
              variant="secondary"
              onPress={() => messageMutation.mutate(user.id)}
              disabled={messageMutation.isPending}
            />
          </View>
          {relationship?.mutualFriendsCount ? (
            <View style={styles.relationshipCard}>
              <Text style={styles.relationshipTitle}>{relationship.mutualFriendsCount} mutual friends</Text>
              <Text style={styles.relationshipBody}>
                {relationship.mutualFriends.map((friend) => friend.firstName ?? friend.username).join(", ")}
              </Text>
            </View>
          ) : null}
          {!user.canViewPosts ? (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedTitle}>Private profile</Text>
              <Text style={styles.lockedBody}>
                {user.profileVisibility === "FRIENDS"
                  ? "Become friends with this person to view posts and deeper profile activity."
                  : "Follow this account to view posts and deeper profile activity."}
              </Text>
            </View>
          ) : null}
          {user.canViewPosts ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Posts</Text>
                <Text style={styles.sectionMeta}>{posts.length}</Text>
              </View>
              <ScrollView contentContainerStyle={styles.postList}>
                {posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
                {!posts.length ? <Text style={styles.feedback}>No posts yet.</Text> : null}
              </ScrollView>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  username: {
    color: colors.textMuted,
  },
  bio: {
    color: colors.text,
    lineHeight: 22,
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
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
  actions: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionMeta: {
    color: colors.textSoft,
    fontWeight: "700",
  },
  postList: {
    gap: spacing.md,
    paddingBottom: 140,
  },
  lockedCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  lockedTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  lockedBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  feedback: {
    color: colors.textMuted,
  },
  relationshipCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  relationshipTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  relationshipBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
