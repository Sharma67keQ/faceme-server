import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { postService } from "@/services/posts";
import { socialService } from "@/services/social";
import { statusService } from "@/services/status";
import { colors, radius, spacing } from "@/utils/theme";

export default function CreatePostScreen() {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [postKind, setPostKind] = useState<"STANDARD" | "QUICK">("STANDARD");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [target, setTarget] = useState<{ type: "PROFILE" | "PAGE" | "GROUP"; id?: string }>({
    type: "PROFILE",
  });
  const [statusKind, setStatusKind] = useState<"TEXT" | "IMAGE" | "VIDEO">("TEXT");
  const [statusText, setStatusText] = useState("");
  const [statusMediaUrl, setStatusMediaUrl] = useState("");
  const [statusVisibility, setStatusVisibility] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS">("PUBLIC");
  const { data: pages = [] } = useQuery({
    queryKey: ["pages"],
    queryFn: socialService.getPages,
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: socialService.getGroups,
  });
  const createPostMutation = useMutation({
    mutationFn: () =>
      postService.createPost({
        body: body.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: mediaUrl.trim() ? mediaType : undefined,
        kind: postKind,
        pageId: target.type === "PAGE" ? target.id : undefined,
        groupId: target.type === "GROUP" ? target.id : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["explore-hub"] });
      setBody("");
      setMediaUrl("");
      router.replace("/(tabs)");
    },
  });
  const createStatusMutation = useMutation({
    mutationFn: () =>
      statusService.create({
        kind: statusKind,
        text: statusKind === "TEXT" ? statusText.trim() : undefined,
        mediaUrl: statusKind !== "TEXT" ? statusMediaUrl.trim() : undefined,
        visibility: statusVisibility,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["status"] });
      setStatusText("");
      setStatusMediaUrl("");
      setStatusKind("TEXT");
      setStatusVisibility("PUBLIC");
      router.replace("/(tabs)");
    },
  });

  const handleCreate = async () => {
    if (!body.trim()) {
      return;
    }
    await createPostMutation.mutateAsync();
  };

  const handleStatusCreate = async () => {
    if (statusKind === "TEXT" && !statusText.trim()) {
      return;
    }

    if (statusKind !== "TEXT" && !statusMediaUrl.trim()) {
      return;
    }

    await createStatusMutation.mutateAsync();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Create post</Text>
        <Text style={styles.subtitle}>
          Publish a full post, a quick conversation starter, or a post into a page or group.
        </Text>
      </View>
      <View style={styles.segmentRow}>
        {(["STANDARD", "QUICK"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.segment, postKind === value ? styles.segmentActive : null]}
            onPress={() => setPostKind(value)}
          >
            <Text style={[styles.segmentLabel, postKind === value ? styles.segmentLabelActive : null]}>
              {value === "STANDARD" ? "Standard post" : "Quick post"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.segmentRow}>
        {(["PROFILE", "PAGE", "GROUP"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.segment, target.type === value ? styles.segmentActive : null]}
            onPress={() => setTarget({ type: value })}
          >
            <Text style={[styles.segmentLabel, target.type === value ? styles.segmentLabelActive : null]}>
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      {target.type === "PAGE" ? (
        <View style={styles.selectionWrap}>
          {pages.map((page) => (
            <Pressable
              key={page.id}
              style={[styles.selectionChip, target.id === page.id ? styles.selectionChipActive : null]}
              onPress={() => setTarget({ type: "PAGE", id: page.id })}
            >
              <Text style={[styles.selectionChipLabel, target.id === page.id ? styles.selectionChipLabelActive : null]}>
                {page.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {target.type === "GROUP" ? (
        <View style={styles.selectionWrap}>
          {groups.filter((group) => group.isMember).map((group) => (
            <Pressable
              key={group.id}
              style={[styles.selectionChip, target.id === group.id ? styles.selectionChipActive : null]}
              onPress={() => setTarget({ type: "GROUP", id: group.id })}
            >
              <Text style={[styles.selectionChipLabel, target.id === group.id ? styles.selectionChipLabelActive : null]}>
                {group.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Input
        label="What are you sharing?"
        value={body}
        onChangeText={setBody}
        multiline
        placeholder="Write an update..."
      />
      <Input label="Media URL" value={mediaUrl} onChangeText={setMediaUrl} placeholder="https://..." />
      {mediaUrl.trim() ? (
        <View style={styles.segmentRow}>
          {(["IMAGE", "VIDEO"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.segment, mediaType === value ? styles.segmentActive : null]}
              onPress={() => setMediaType(value)}
            >
              <Text style={[styles.segmentLabel, mediaType === value ? styles.segmentLabelActive : null]}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Button
        label={createPostMutation.isPending ? "Publishing..." : "Publish post"}
        onPress={handleCreate}
        disabled={createPostMutation.isPending}
      />
      <View style={styles.storySection}>
        <Text style={styles.storyTitle}>Publish 24-hour status</Text>
        <View style={styles.segmentRow}>
          {(["TEXT", "IMAGE", "VIDEO"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.segment, statusKind === value ? styles.segmentActive : null]}
              onPress={() => setStatusKind(value)}
            >
              <Text style={[styles.segmentLabel, statusKind === value ? styles.segmentLabelActive : null]}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.segmentRow}>
          {(["PUBLIC", "FOLLOWERS", "FRIENDS"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.segment, statusVisibility === value ? styles.segmentActive : null]}
              onPress={() => setStatusVisibility(value)}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  statusVisibility === value ? styles.segmentLabelActive : null,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        {statusKind === "TEXT" ? (
          <Input
            label="Status text"
            value={statusText}
            onChangeText={setStatusText}
            placeholder="Share a 24-hour update"
            multiline
          />
        ) : (
          <Input
            label={`${statusKind} URL`}
            value={statusMediaUrl}
            onChangeText={setStatusMediaUrl}
            placeholder="https://..."
          />
        )}
        <Button
          label={createStatusMutation.isPending ? "Publishing..." : "Publish status"}
          variant="secondary"
          onPress={handleStatusCreate}
          disabled={createStatusMutation.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
  },
  storySection: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  storyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  segmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  segment: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  segmentLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  segmentLabelActive: {
    color: colors.surface,
  },
  selectionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectionChip: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectionChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  selectionChipLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  selectionChipLabelActive: {
    color: colors.surface,
  },
});
