import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioSession, LiveKitRoom, useConnectionState, useParticipants, useRoomContext } from "@livekit/react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ConnectionState } from "livekit-client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { voiceRoomService } from "@/services/voice-rooms";
import { VoiceRoom } from "@/types/domain";
import { colors, radius, spacing } from "@/utils/theme";

const roomThemes: Record<VoiceRoom["theme"], { label: string; colors: [string, string] }> = {
  SUNSET: { label: "Sunset", colors: ["#FFB36B", "#EF6F5E"] },
  AURORA: { label: "Aurora", colors: ["#4B86B4", "#173F5F"] },
  LOUNGE: { label: "Lounge", colors: ["#D9C6A5", "#7C5C3B"] },
  PARTY: { label: "Party", colors: ["#FF7A90", "#7B61FF"] },
};

const miniGames = [
  { title: "Would You Rather", body: "Fast voice prompts that keep a small room moving." },
  { title: "Mood Meter", body: "Drop one emoji to show the room vibe." },
  { title: "Song Queue", body: "Take turns sharing the track running the room tonight." },
];

export default function VoiceRoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const queryClient = useQueryClient();
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTopic, setDraftTopic] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPrivacy, setDraftPrivacy] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY">("PUBLIC");
  const [draftTheme, setDraftTheme] = useState<VoiceRoom["theme"]>("SUNSET");
  const [audioSession, setAudioSession] = useState<{ serverUrl: string; token: string; roomName: string } | null>(null);
  const [voiceTransportError, setVoiceTransportError] = useState<string | null>(null);

  const { data: room, refetch } = useQuery({
    queryKey: ["voice-room", roomId],
    queryFn: () => voiceRoomService.getById(roomId),
  });

  useEffect(() => {
    if (!room) {
      return;
    }

    setDraftTitle(room.title);
    setDraftTopic(room.topic ?? "");
    setDraftDescription(room.description ?? "");
    setDraftPrivacy(room.privacy);
    setDraftTheme(room.theme);
  }, [room]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["voice-room", roomId] }),
      queryClient.invalidateQueries({ queryKey: ["voice-rooms"] }),
    ]);
    await refetch();
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      voiceRoomService.update(roomId, {
        title: draftTitle.trim(),
        topic: draftTopic.trim() || null,
        description: draftDescription.trim() || null,
        privacy: draftPrivacy,
        theme: draftTheme,
      }),
    onSuccess: invalidate,
  });
  const joinLeaveMutation = useMutation({
    mutationFn: () => (room?.canJoin ? voiceRoomService.join(roomId) : voiceRoomService.leave(roomId)),
    onSuccess: invalidate,
  });
  const stateMutation = useMutation({
    mutationFn: (state: "LISTENING" | "SPEAKING" | "MUTED") => voiceRoomService.setState(roomId, state),
    onSuccess: invalidate,
  });
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "ADMIN" | "MEMBER" }) =>
      voiceRoomService.setRole(roomId, userId, role),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => voiceRoomService.removeParticipant(roomId, userId),
    onSuccess: invalidate,
  });
  const endMutation = useMutation({
    mutationFn: () => voiceRoomService.endRoom(roomId),
    onSuccess: invalidate,
  });
  const audioTokenMutation = useMutation({
    mutationFn: () => voiceRoomService.issueAudioToken(roomId),
    onSuccess: (payload) => {
      setVoiceTransportError(null);
      setAudioSession(payload);
    },
    onError: (error: Error) => {
      setVoiceTransportError(error.message);
    },
  });

  if (!room) {
    return <Screen><Text style={styles.feedback}>Loading room...</Text></Screen>;
  }

  const currentRoom = room as VoiceRoom;

  return (
    <Screen scroll>
      <LinearGradient colors={roomThemes[currentRoom.theme].colors} style={styles.hero}>
        <Text style={styles.title}>{currentRoom.title}</Text>
        <Text style={styles.meta}>
          {roomThemes[currentRoom.theme].label} • {currentRoom.privacy} • {currentRoom.status} • {currentRoom.participantsCount ?? currentRoom.participants.length} members
        </Text>
        <Text style={styles.description}>{currentRoom.description ?? currentRoom.topic ?? "Live voice conversation"}</Text>
        <View style={styles.vibeRow}>
          <View style={styles.vibePill}>
            <Text style={styles.vibePillLabel}>Party room</Text>
          </View>
          <View style={styles.vibePill}>
            <Text style={styles.vibePillLabel}>Small-group energy</Text>
          </View>
          <View style={styles.vibePill}>
            <Text style={styles.vibePillLabel}>Voice lounge</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <Button
          label={joinLeaveMutation.isPending ? "Working..." : currentRoom.canJoin ? "Join room" : "Leave room"}
          onPress={() => joinLeaveMutation.mutate()}
          variant={currentRoom.canJoin ? "primary" : "secondary"}
        />
        {!currentRoom.canJoin ? (
          <Button
            label={audioTokenMutation.isPending ? "Connecting live audio..." : audioSession ? "Reconnect live audio" : "Enter live audio"}
            onPress={() => audioTokenMutation.mutate()}
          />
        ) : null}
        {!currentRoom.canJoin ? (
          <View style={styles.stateRow}>
            {(["LISTENING", "SPEAKING", "MUTED"] as const).map((state) => (
              <Pressable key={state} style={styles.stateChip} onPress={() => stateMutation.mutate(state)}>
                <Text style={styles.stateChipLabel}>{state}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {voiceTransportError ? <Text style={styles.audioError}>{voiceTransportError}</Text> : null}
      </View>

      {audioSession ? (
        <LiveKitRoom
          audio
          connect
          serverUrl={audioSession.serverUrl}
          token={audioSession.token}
          video={false}
          onConnected={() => {
            void AudioSession.startAudioSession();
          }}
          onDisconnected={() => {
            void AudioSession.stopAudioSession();
          }}
          onError={(error) => {
            setVoiceTransportError(error.message);
          }}
        >
          <VoiceTransportPanel />
        </LiveKitRoom>
      ) : null}

      {currentRoom.canEdit ? (
        <View style={styles.editor}>
          <Text style={styles.sectionTitle}>Room settings</Text>
          <Input label="Title" value={draftTitle} onChangeText={setDraftTitle} />
          <Input label="Topic" value={draftTopic} onChangeText={setDraftTopic} />
          <Input label="Description" value={draftDescription} onChangeText={setDraftDescription} multiline />
          <View style={styles.themeRow}>
            {(Object.keys(roomThemes) as VoiceRoom["theme"][]).map((themeKey) => (
              <Pressable key={themeKey} style={styles.themeOption} onPress={() => setDraftTheme(themeKey)}>
                <LinearGradient colors={roomThemes[themeKey].colors} style={[styles.themeSwatch, draftTheme === themeKey ? styles.themeSwatchActive : null]} />
                <Text style={styles.themeText}>{roomThemes[themeKey].label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.stateRow}>
            {(["PUBLIC", "FOLLOWERS", "FRIENDS", "INVITE_ONLY"] as const).map((privacy) => (
              <Pressable key={privacy} style={styles.stateChip} onPress={() => setDraftPrivacy(privacy)}>
                <Text style={styles.stateChipLabel}>{privacy}</Text>
              </Pressable>
            ))}
          </View>
          <Button label={updateMutation.isPending ? "Saving..." : "Save room"} onPress={() => updateMutation.mutate()} />
          <Button
            label={endMutation.isPending ? "Ending..." : "End room"}
            onPress={() => endMutation.mutate()}
            variant="secondary"
          />
        </View>
      ) : null}

      <View style={styles.memberSection}>
        <View style={styles.gamesCard}>
          <Text style={styles.sectionTitle}>Party corner</Text>
          <Text style={styles.gamesSubtitle}>
            IMO-style rooms feel alive because people do more than just talk. These cards give the room a shared vibe while voice runs.
          </Text>
          {miniGames.map((game) => (
            <View key={game.title} style={styles.gameTile}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <Text style={styles.gameBody}>{game.body}</Text>
            </View>
          ))}
          <Text style={styles.audioTruth}>
            Live voice transport is not wired yet in this repo. This screen is now IMO-style in structure and room atmosphere, but true live audio still needs microphone/WebRTC or a voice SDK.
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Participants</Text>
        <ScrollView contentContainerStyle={styles.memberList}>
          {currentRoom.participants.map((participant: VoiceRoom["participants"][number]) => (
            <View key={participant.id} style={styles.memberCard}>
              <View style={styles.memberIdentity}>
                <Avatar name={participant.user.firstName ?? participant.user.username} size={42} />
                <View style={styles.memberCopy}>
                  <Text style={styles.memberName}>{participant.user.firstName ?? participant.user.username}</Text>
                  <Text style={styles.memberMeta}>
                    {participant.role} • {participant.state}
                  </Text>
                </View>
              </View>
              <View style={styles.memberActions}>
                {participant.canPromote ? (
                  <Pressable style={styles.actionChip} onPress={() => roleMutation.mutate({ userId: participant.user.id, role: "ADMIN" })}>
                    <Text style={styles.actionChipLabel}>Promote admin</Text>
                  </Pressable>
                ) : null}
                {participant.canDemote ? (
                  <Pressable style={styles.actionChip} onPress={() => roleMutation.mutate({ userId: participant.user.id, role: "MEMBER" })}>
                    <Text style={styles.actionChipLabel}>Remove admin</Text>
                  </Pressable>
                ) : null}
                {participant.canBeRemoved ? (
                  <Pressable style={styles.removeChip} onPress={() => removeMutation.mutate(participant.user.id)}>
                    <Text style={styles.removeChipLabel}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const VoiceTransportPanel = () => {
  const room = useRoomContext();
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const toggleMicrophone = async () => {
    try {
      setIsWorking(true);
      await room.localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled((current) => !current);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <View style={styles.transportCard}>
      <View style={styles.transportHeader}>
        <Text style={styles.sectionTitle}>Live audio transport</Text>
        <Text style={styles.transportMeta}>
          {connectionState === ConnectionState.Connected ? "Connected" : connectionState}
        </Text>
      </View>
      <Text style={styles.gamesSubtitle}>
        This room is connected to the real media layer. Your microphone is published into the room when the transport is active.
      </Text>
      <View style={styles.transportActions}>
        <Pressable style={styles.transportChip} onPress={() => void toggleMicrophone()}>
          <Text style={styles.transportChipLabel}>
            {isWorking ? "Updating..." : isMicEnabled ? "Mute microphone" : "Unmute microphone"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.memberList}>
        {participants.map((participant) => (
          <View key={participant.identity} style={styles.transportParticipant}>
            <Text style={styles.memberName}>{participant.name || participant.identity}</Text>
            <Text style={styles.memberMeta}>{participant.isSpeaking ? "Speaking" : "Listening"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  meta: { color: "#FFF2EA", fontWeight: "700" },
  description: { color: "#FFF8F1", lineHeight: 21 },
  vibeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  vibePill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  vibePillLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  controls: { gap: spacing.sm },
  audioError: { color: colors.danger, lineHeight: 20 },
  stateRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  themeOption: { alignItems: "center", gap: spacing.xs },
  themeSwatch: { borderRadius: radius.md, height: 54, width: 70 },
  themeSwatchActive: { borderColor: colors.primaryDark, borderWidth: 2 },
  themeText: { color: colors.textSoft, fontSize: 12, fontWeight: "700" },
  stateChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stateChipLabel: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  editor: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  memberSection: { gap: spacing.sm },
  gamesCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  gamesSubtitle: { color: colors.textMuted, lineHeight: 20 },
  transportCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  transportHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  transportMeta: { color: colors.success, fontWeight: "800" },
  transportActions: { flexDirection: "row", gap: spacing.sm },
  transportChip: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  transportChipLabel: { color: colors.surface, fontWeight: "800" },
  transportParticipant: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    padding: spacing.sm,
  },
  gameTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  gameTitle: { color: colors.text, fontWeight: "800" },
  gameBody: { color: colors.textMuted, lineHeight: 20 },
  audioTruth: { color: colors.danger, lineHeight: 20, fontWeight: "600" },
  memberList: { gap: spacing.sm, paddingBottom: 80 },
  memberCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  memberIdentity: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: colors.text, fontWeight: "800" },
  memberMeta: { color: colors.textSoft, fontSize: 12 },
  memberActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  actionChipLabel: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  removeChip: {
    backgroundColor: "#FDECEC",
    borderColor: "#F6C7C7",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  removeChipLabel: { color: colors.danger, fontWeight: "700", fontSize: 12 },
  feedback: { color: colors.textMuted },
});
