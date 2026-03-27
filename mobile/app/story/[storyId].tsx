import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { storyService } from "@/services/stories";
import { colors, radius, spacing } from "@/utils/theme";

export default function StoryViewerScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const queryClient = useQueryClient();
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: storyService.getFollowingStories,
  });
  const markViewedMutation = useMutation({
    mutationFn: (id: string) => storyService.markViewed(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });
  const story = stories.find((item) => item.id === storyId);

  useEffect(() => {
    if (story && !story.isViewed) {
      markViewedMutation.mutate(story.id);
    }
  }, [story, markViewedMutation]);

  return (
    <Screen>
      {isLoading ? <Text style={styles.feedback}>Loading story...</Text> : null}
      {story ? (
        <View style={styles.card}>
          <Text style={styles.author}>{story.author.firstName}</Text>
          <Text style={styles.mediaLabel}>{story.mediaType} story</Text>
          <Text style={styles.url}>{story.mediaUrl}</Text>
          {story.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}
        </View>
      ) : !isLoading ? (
        <Text style={styles.feedback}>Story not found.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  author: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  mediaLabel: {
    color: colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  url: {
    color: colors.textMuted,
  },
  caption: {
    color: colors.text,
    lineHeight: 22,
  },
  feedback: {
    color: colors.textMuted,
  },
});
