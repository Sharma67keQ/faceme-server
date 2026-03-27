import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { postService } from "@/services/posts";
import { socialService } from "@/services/social";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";
import { useState } from "react";

export default function GroupScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const { data: group } = useQuery({
    queryKey: ["group", slug],
    queryFn: () => socialService.getGroup(slug),
  });
  const isOwner = group?.owner.id === currentUserId;
  const { data: posts = [] } = useQuery({
    queryKey: ["group-posts", group?.id],
    queryFn: () => postService.getPostsByGroup(group!.id),
    enabled: Boolean(group?.id && (group.isMember || group.privacy === "PUBLIC")),
  });

  const joinMutation = useMutation({
    mutationFn: () => socialService.joinGroup(group!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", slug] });
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["group-posts", group?.id] });
    },
  });

  const postMutation = useMutation({
    mutationFn: () =>
      postService.createPost({
        body: body.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        groupId: group!.id,
      }),
    onSuccess: async () => {
      setBody("");
      setMediaUrl("");
      await queryClient.invalidateQueries({ queryKey: ["group-posts", group?.id] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      socialService.updateGroup(group!.id, {
        name: groupName.trim() || undefined,
        description: groupDescription.trim() || undefined,
        privacy: group?.privacy,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", slug] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => socialService.deleteGroup(group!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.replace("/explore");
    },
  });

  return (
    <Screen scroll>
      {group ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.title}>{group.name}</Text>
            <Text style={styles.meta}>
              {group.privacy} group - {group.membersCount} members - {group.discussionCount} replies
            </Text>
            <Text style={styles.body}>{group.description ?? "Group discussion and chat."}</Text>
            <View style={styles.actions}>
              <Button
                label={
                  joinMutation.isPending
                    ? "Updating..."
                    : group.isMember
                      ? "Joined"
                      : group.privacy === "PRIVATE"
                        ? "Request join"
                        : "Join group"
                }
                onPress={() => joinMutation.mutate()}
                variant={group.isMember ? "secondary" : "primary"}
              />
              {group.chatId && group.isMember ? (
                <Button label="Open chat" variant="secondary" onPress={() => router.push(`/chat/${group.chatId}`)} />
              ) : null}
            </View>
          </View>
          {isOwner ? (
            <View style={styles.compose}>
              <Text style={styles.sectionTitle}>Manage group</Text>
              <Input label="Group name" value={groupName} onChangeText={setGroupName} placeholder={group.name} />
              <Input
                label="Description"
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder={group.description ?? "Describe this group"}
              />
              <Button
                label={updateMutation.isPending ? "Saving..." : "Save group changes"}
                variant="secondary"
                onPress={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              />
              <Button
                label={deleteMutation.isPending ? "Deleting..." : "Delete group"}
                onPress={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              />
            </View>
          ) : null}
          {group.isMember ? (
            <View style={styles.compose}>
              <Text style={styles.sectionTitle}>Post to group</Text>
              <Input label="Post body" value={body} onChangeText={setBody} multiline />
              <Input label="Media URL" value={mediaUrl} onChangeText={setMediaUrl} placeholder="https://..." />
              <Button
                label={postMutation.isPending ? "Publishing..." : "Publish group post"}
                onPress={() => postMutation.mutate()}
                disabled={!body.trim() || postMutation.isPending}
              />
            </View>
          ) : null}
          <View style={styles.list}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {!posts.length ? <Text style={styles.body}>No posts visible yet.</Text> : null}
          </View>
        </>
      ) : (
        <Text style={styles.body}>Loading group...</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  body: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
  },
  compose: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  list: {
    gap: spacing.md,
    paddingBottom: 80,
  },
});
