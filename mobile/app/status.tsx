import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { statusService } from "@/services/status";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function StatusScreen() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [kind, setKind] = useState<"TEXT" | "IMAGE" | "VIDEO">("TEXT");
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS">("PUBLIC");
  const [replyText, setReplyText] = useState("");

  const { data: statuses = [] } = useQuery({
    queryKey: ["status"],
    queryFn: statusService.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      statusService.create({
        kind,
        text: kind === "TEXT" ? text.trim() : undefined,
        mediaUrl: kind !== "TEXT" ? mediaUrl.trim() : undefined,
        visibility,
      }),
    onSuccess: async () => {
      setText("");
      setMediaUrl("");
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ statusId, emoji }: { statusId: string; emoji: string }) =>
      statusService.react(statusId, { emoji, replyText: replyText.trim() || undefined }),
    onSuccess: async () => {
      setReplyText("");
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (statusId: string) => statusService.delete(statusId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });

  return (
    <Screen scroll>
      <Text style={styles.title}>24-hour status</Text>
      <View style={styles.composeCard}>
        <View style={styles.row}>
          {(["TEXT", "IMAGE", "VIDEO"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.chip, kind === value ? styles.chipActive : null]}
              onPress={() => setKind(value)}
            >
              <Text style={[styles.chipLabel, kind === value ? styles.chipLabelActive : null]}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          {(["PUBLIC", "FOLLOWERS", "FRIENDS"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.chip, visibility === value ? styles.chipActive : null]}
              onPress={() => setVisibility(value)}
            >
              <Text style={[styles.chipLabel, visibility === value ? styles.chipLabelActive : null]}>{value}</Text>
            </Pressable>
          ))}
        </View>
        {kind === "TEXT" ? (
          <Input label="Text status" value={text} onChangeText={setText} multiline />
        ) : (
          <Input label={`${kind} URL`} value={mediaUrl} onChangeText={setMediaUrl} placeholder="https://..." />
        )}
        <Input
          label="Optional reaction reply"
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Add text when reacting to someone's status"
        />
        <Button
          label={createMutation.isPending ? "Publishing..." : "Publish status"}
          onPress={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {statuses.map((status) => (
          <View key={status.id} style={styles.card}>
            <View style={styles.identity}>
              <Pressable onPress={() => router.push(`/profile/${status.author.username}`)}>
                <Avatar name={status.author.firstName ?? status.author.username} />
              </Pressable>
              <View style={styles.identityText}>
                <Pressable onPress={() => router.push(`/profile/${status.author.username}`)}>
                  <Text style={styles.cardTitle}>{status.author.firstName ?? status.author.username}</Text>
                </Pressable>
                <Text style={styles.cardMeta}>
                  {status.visibility} • {status.viewersCount ?? 0} viewers
                </Text>
              </View>
            </View>
            <Text style={styles.body}>{status.text ?? status.mediaUrl ?? "Status update"}</Text>
            <View style={styles.row}>
              {["🔥", "👏", "❤️"].map((emoji) => (
                <Pressable
                  key={`${status.id}-${emoji}`}
                  style={styles.reactionChip}
                  onPress={() => reactMutation.mutate({ statusId: status.id, emoji })}
                >
                  <Text>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            {status.reactions?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent reactions</Text>
                {status.reactions.slice(0, 4).map((reaction) => (
                  <Pressable
                    key={reaction.id}
                    style={styles.metaCard}
                    onPress={() => router.push(`/profile/${reaction.user.username}`)}
                  >
                    <Text style={styles.metaTitle}>
                      {reaction.emoji} @{reaction.user.username}
                    </Text>
                    {reaction.replyText ? <Text style={styles.metaBody}>{reaction.replyText}</Text> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
            {status.author.id === currentUserId && status.viewers?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Viewed by</Text>
                {status.viewers.slice(0, 5).map((view) => (
                  <Pressable
                    key={view.id}
                    style={styles.metaCard}
                    onPress={() => router.push(`/profile/${view.viewer.username}`)}
                  >
                    <Text style={styles.metaTitle}>{view.viewer.firstName ?? view.viewer.username}</Text>
                    <Text style={styles.metaBody}>{new Date(view.viewedAt).toLocaleString()}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {status.author.id === currentUserId ? (
              <Pressable style={styles.deleteButton} onPress={() => deleteMutation.mutate(status.id)}>
                <Text style={styles.deleteLabel}>{deleteMutation.isPending ? "Deleting..." : "Delete status"}</Text>
              </Pressable>
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  chipLabel: { color: colors.text, fontWeight: "700" },
  chipLabelActive: { color: colors.surface },
  list: { gap: spacing.md, paddingBottom: 80 },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  identity: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  identityText: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontWeight: "800" },
  cardMeta: { color: colors.textSoft, fontSize: 12 },
  body: { color: colors.text, lineHeight: 22 },
  reactionChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  metaTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  metaBody: {
    color: colors.textMuted,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#FDECEC",
    borderColor: "#F6C7C7",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  deleteLabel: {
    color: "#B42318",
    fontWeight: "800",
  },
});
