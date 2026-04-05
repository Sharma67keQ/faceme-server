import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { voiceRoomService } from "@/services/voice-rooms";
import { VoiceRoom } from "@/types/domain";
import { colors, radius, spacing } from "@/utils/theme";

const roomThemes: Array<{ key: VoiceRoom["theme"]; label: string; colors: [string, string] }> = [
  { key: "SUNSET", label: "Sunset", colors: ["#FFB36B", "#EF6F5E"] },
  { key: "AURORA", label: "Aurora", colors: ["#4B86B4", "#173F5F"] },
  { key: "LOUNGE", label: "Lounge", colors: ["#D9C6A5", "#7C5C3B"] },
  { key: "PARTY", label: "Party", colors: ["#FF7A90", "#7B61FF"] },
];

export default function VoiceRoomsScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY">("PUBLIC");
  const [theme, setTheme] = useState<VoiceRoom["theme"]>("SUNSET");

  const { data: rooms = [] } = useQuery({
    queryKey: ["voice-rooms"],
    queryFn: voiceRoomService.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      voiceRoomService.create({
        title: title.trim(),
        topic: topic.trim() || undefined,
        description: description.trim() || undefined,
        privacy,
        theme,
      }),
    onSuccess: async (room) => {
      setTitle("");
      setTopic("");
      setDescription("");
      setTheme("SUNSET");
      await queryClient.invalidateQueries({ queryKey: ["voice-rooms"] });
      router.push(`/voice-room/${room.id}` as never);
    },
  });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Live audio</Text>
        <Text style={styles.title}>Voice rooms</Text>
        <Text style={styles.subtitle}>
          Join live conversations, or host a moderated room with owners, admins, and members.
        </Text>
      </View>

      <View style={styles.composeCard}>
        <Input label="Room title" value={title} onChangeText={setTitle} />
        <Input label="Topic" value={topic} onChangeText={setTopic} />
        <Input label="Description" value={description} onChangeText={setDescription} multiline />
        <View style={styles.themeRow}>
          {roomThemes.map((item) => (
            <Pressable key={item.key} onPress={() => setTheme(item.key)} style={styles.themeOption}>
              <LinearGradient
                colors={item.colors}
                style={[styles.themeSwatch, theme === item.key ? styles.themeSwatchActive : null]}
              />
              <Text style={[styles.themeLabel, theme === item.key ? styles.themeLabelActive : null]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.privacyRow}>
          {(["PUBLIC", "FOLLOWERS", "FRIENDS", "INVITE_ONLY"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.privacyChip, privacy === value ? styles.privacyChipActive : null]}
              onPress={() => setPrivacy(value)}
            >
              <Text style={[styles.privacyLabel, privacy === value ? styles.privacyLabelActive : null]}>
                {value === "INVITE_ONLY" ? "Invite-only" : value}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          label={createMutation.isPending ? "Creating..." : "Create room"}
          onPress={() => createMutation.mutate()}
          disabled={!title.trim() || createMutation.isPending}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live rooms</Text>
        <Text style={styles.sectionMeta}>{rooms.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {rooms.map((room) => (
          <Pressable key={room.id} style={styles.roomCard} onPress={() => router.push(`/voice-room/${room.id}` as never)}>
            <LinearGradient
              colors={roomThemes.find((item) => item.key === room.theme)?.colors ?? ["#FFB36B", "#EF6F5E"]}
              style={styles.roomHero}
            >
              <View style={styles.roomHeader}>
                <View style={styles.roomHeaderCopy}>
                  <Text style={styles.roomTitle}>{room.title}</Text>
                  <Text style={styles.roomMeta}>
                    {room.privacy} {"\u2022"} {room.status}
                  </Text>
                </View>
                <View style={[styles.liveBadge, room.status === "ENDED" ? styles.endedBadge : null]}>
                  <Text style={[styles.liveBadgeLabel, room.status === "ENDED" ? styles.endedBadgeLabel : null]}>
                    {room.status === "LIVE" ? "Live" : "Ended"}
                  </Text>
                </View>
              </View>
              <Text style={styles.roomBodyLight} numberOfLines={2}>
                {room.description ?? room.topic ?? "Open conversation room"}
              </Text>
            </LinearGradient>
            <View style={styles.hostRow}>
              <Avatar name={room.owner?.firstName ?? room.host.firstName ?? room.host.username} size={34} />
              <View style={styles.hostCopy}>
                <Text style={styles.hostName}>{room.owner?.firstName ?? room.host.firstName ?? room.host.username}</Text>
                <Text style={styles.hostMeta}>{room.participantsCount ?? room.participants.length} listening now</Text>
              </View>
            </View>
            <View style={styles.participantRow}>
              {room.participants.slice(0, 5).map((participant) => (
                <View key={participant.id} style={styles.participantItem}>
                  <Avatar name={participant.user.firstName ?? participant.user.username} size={30} />
                  <Text style={styles.participantRole}>{participant.role}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}
        {!rooms.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No rooms live yet</Text>
            <Text style={styles.emptyBody}>Create the first room and bring people into an actual conversation space.</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontSize: 30, fontWeight: "800" },
  subtitle: { color: colors.textMuted, lineHeight: 21 },
  composeCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  privacyRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  themeOption: { alignItems: "center", gap: spacing.xs },
  themeSwatch: {
    borderRadius: radius.md,
    height: 56,
    width: 72,
  },
  themeSwatchActive: {
    borderColor: colors.primaryDark,
    borderWidth: 2,
  },
  themeLabel: { color: colors.textSoft, fontSize: 12, fontWeight: "700" },
  themeLabelActive: { color: colors.primaryDark },
  privacyChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  privacyChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  privacyLabel: { color: colors.text, fontWeight: "700" },
  privacyLabelActive: { color: colors.surface },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  sectionMeta: { color: colors.textSoft, fontWeight: "700" },
  list: { gap: spacing.md, paddingBottom: 80 },
  roomCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    paddingBottom: spacing.md,
  },
  roomHero: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  roomHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  roomHeaderCopy: { flex: 1, gap: 4 },
  roomTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  roomMeta: { color: "#F4E8E1", fontWeight: "700" },
  liveBadge: {
    backgroundColor: colors.energySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  liveBadgeLabel: { color: colors.accent, fontWeight: "800" },
  endedBadge: { backgroundColor: colors.surfaceMuted },
  endedBadgeLabel: { color: colors.textMuted },
  roomBodyLight: { color: "#FFF8F1", lineHeight: 20 },
  hostRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  hostCopy: { gap: 2 },
  hostName: { color: colors.text, fontWeight: "800" },
  hostMeta: { color: colors.textSoft, fontSize: 12 },
  participantRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  participantItem: { alignItems: "center", gap: spacing.xxs },
  participantRole: { color: colors.textSoft, fontSize: 10, fontWeight: "700" },
  emptyCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontWeight: "800" },
  emptyBody: { color: colors.textMuted, lineHeight: 20 },
});
