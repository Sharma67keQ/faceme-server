import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text } from "react-native";
import { PostCard } from "@/components/post-card";
import { Screen } from "@/components/ui/screen";
import { postService } from "@/services/posts";
import { colors, spacing } from "@/utils/theme";

export default function SavedPostsScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["saved-posts"],
    queryFn: postService.getSavedPosts,
  });

  return (
    <Screen>
      <Text style={styles.title}>Saved posts</Text>
      {isLoading ? <Text style={styles.feedback}>Loading saved posts...</Text> : null}
      {isError ? (
        <Text style={styles.feedback} onPress={() => void refetch()}>
          Could not load saved posts. Tap to retry.
        </Text>
      ) : null}
      {!isLoading && !isError && !data?.length ? (
        <Text style={styles.feedback}>You have not saved any posts yet.</Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.list}>
        {data?.map((post) => (
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
  feedback: {
    color: colors.textMuted,
  },
  list: {
    gap: spacing.md,
    paddingBottom: 120,
  },
});
