import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioSession,
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
} from "@livekit/react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ConnectionState, Participant } from "livekit-client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ensureLiveKitGlobals } from "@/services/livekit";
import { voiceRoomService } from "@/services/voice-rooms";
import { useAuthStore } from "@/store/auth-store";
import { VoiceRoom } from "@/types/domain";
import { colors, radius, spacing } from "@/utils/theme";

const roomThemes: Record<VoiceRoom["theme"], { label: string; colors: [string, string] }> = {
  SUNSET: { label: "Sunset", colors: ["#FFB36B", "#EF6F5E"] },
  AURORA: { label: "Aurora", colors: ["#4B86B4", "#173F5F"] },
  LOUNGE: { label: "Lounge", colors: ["#D9C6A5", "#7C5C3B"] },
  PARTY: { label: "Party", colors: ["#FF7A90", "#7B61FF"] },
};

type AudioSessionPayload = {
  serverUrl: string;
  token: string;
  roomName: string;
};

type LiveParticipantMap = Record<
  string,
  {
    identity: string;
    isSpeaking: boolean;
    isMicrophoneEnabled: boolean;
    metadata?: {
      role?: "OWNER" | "ADMIN" | "MEMBER";
      isMutedByModerator?: boolean;
    } | null;
  }
>;

type VoidAction = {
  isPending: boolean;
  mutate: () => void;
};

type RoleAction = {
  mutate: (payload: { userId: string; role: "ADMIN" | "MEMBER" }) => void;
};

type ModerationAction = {
  mutate: (payload: { userId: string; muted: boolean }) => void;
};

type RemoveAction = {
  mutate: (userId: string) => void;
};

const parseMetadata = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as { role?: "OWNER" | "ADMIN" | "MEMBER"; isMutedByModerator?: boolean };
  } catch {
    return null;
  }
};

const serializeLiveParticipants = (participants: Participant[]): LiveParticipantMap =>
  participants.reduce<LiveParticipantMap>((accumulator, participant) => {
    accumulator[participant.identity] = {
      identity: participant.identity,
      isSpeaking: participant.isSpeaking,
      isMicrophoneEnabled: Boolean(participant.isMicrophoneEnabled),
      metadata: parseMetadata(participant.metadata),
    };

    return accumulator;
  }, {});

export default function VoiceRoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTopic, setDraftTopic] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPrivacy, setDraftPrivacy] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY">("PUBLIC");
  const [draftTheme, setDraftTheme] = useState<VoiceRoom["theme"]>("SUNSET");
  const [audioSession, setAudioSession] = useState<AudioSessionPayload | null>(null);
  const [voiceTransportError, setVoiceTransportError] = useState<string | null>(null);

  useEffect(() => {
    ensureLiveKitGlobals();
  }, []);

  const { data: room, refetch } = useQuery({
    queryKey: ["voice-room", roomId],
    queryFn: () => voiceRoomService.getById(roomId) as Promise<VoiceRoom>,
    refetchInterval: 5000,
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

  useEffect(
    () => () => {
      void AudioSession.stopAudioSession();
    },
    [],
  );

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["voice-room", roomId] }),
      queryClient.invalidateQueries({ queryKey: ["voice-rooms"] }),
    ]);
    await refetch();
  };

  const disconnectAudio = async () => {
    setAudioSession(null);
    setVoiceTransportError(null);
    await AudioSession.stopAudioSession();
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

  const joinLeaveMutation = useMutation({
    mutationFn: async () => {
      if (room?.canJoin) {
        await voiceRoomService.join(roomId);
        return { joined: true };
      }

      await disconnectAudio();
      await voiceRoomService.leave(roomId);
      return { joined: false };
    },
    onSuccess: async ({ joined }) => {
      await invalidate();
      if (joined) {
        audioTokenMutation.mutate();
      }
    },
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      await disconnectAudio();
      return voiceRoomService.endRoom(roomId);
    },
    onSuccess: invalidate,
  });

  if (!room) {
    return (
      <Screen>
        <Text style={styles.feedback}>Loading room...</Text>
      </Screen>
    );
  }

  const currentViewer = room.participants.find((participant) => participant.user.id === currentUserId) ?? null;

  return (
    <Screen scroll>
      <LinearGradient colors={roomThemes[room.theme].colors} style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{room.title}</Text>
            <Text style={styles.meta}>{`${roomThemes[room.theme].label} | ${room.privacy} | ${room.status}`}</Text>
          </View>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>{room.participantsCount ?? room.participants.length} live</Text>
          </View>
        </View>
        <Text style={styles.description}>{room.description ?? room.topic ?? "Join the live conversation."}</Text>
        <View style={styles.hostRow}>
          <Avatar name={room.owner?.firstName ?? room.host.firstName ?? room.host.username} size={34} />
          <View>
            <Text style={styles.hostLabel}>Hosted by</Text>
            <Text style={styles.hostName}>{room.owner?.firstName ?? room.host.firstName ?? room.host.username}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <Button
          label={joinLeaveMutation.isPending ? "Working..." : room.canJoin ? "Join room" : "Leave room"}
          onPress={() => joinLeaveMutation.mutate()}
          variant={room.canJoin ? "primary" : "secondary"}
        />
        {!room.canJoin ? (
          <Button
            label={audioTokenMutation.isPending ? "Connecting..." : audioSession ? "Reconnect audio" : "Connect audio"}
            onPress={() => audioTokenMutation.mutate()}
            variant="secondary"
          />
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
          <VoiceRoomLivePanel
            room={room}
            currentViewer={currentViewer}
            roomId={roomId}
            draftDescription={draftDescription}
            draftPrivacy={draftPrivacy}
            draftTheme={draftTheme}
            draftTitle={draftTitle}
            draftTopic={draftTopic}
            endAction={{ isPending: endMutation.isPending, mutate: () => endMutation.mutate() }}
            invalidate={invalidate}
            onChangeDescription={setDraftDescription}
            onChangePrivacy={setDraftPrivacy}
            onChangeTheme={setDraftTheme}
            onChangeTitle={setDraftTitle}
            onChangeTopic={setDraftTopic}
            updateAction={{ isPending: updateMutation.isPending, mutate: () => updateMutation.mutate() }}
          />
        </LiveKitRoom>
      ) : (
        <VoiceRoomRoster room={room} />
      )}
    </Screen>
  );
}

const VoiceRoomLivePanel = ({
  room,
  currentViewer,
  roomId,
  draftDescription,
  draftPrivacy,
  draftTheme,
  draftTitle,
  draftTopic,
  endAction,
  invalidate,
  onChangeDescription,
  onChangePrivacy,
  onChangeTheme,
  onChangeTitle,
  onChangeTopic,
  updateAction,
}: {
  room: VoiceRoom;
  currentViewer: VoiceRoom["participants"][number] | null;
  roomId: string;
  draftDescription: string;
  draftPrivacy: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY";
  draftTheme: VoiceRoom["theme"];
  draftTitle: string;
  draftTopic: string;
  endAction: VoidAction;
  invalidate: () => Promise<void>;
  onChangeDescription: (value: string) => void;
  onChangePrivacy: (value: "PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY") => void;
  onChangeTheme: (value: VoiceRoom["theme"]) => void;
  onChangeTitle: (value: string) => void;
  onChangeTopic: (value: string) => void;
  updateAction: VoidAction;
}) => {
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

  const stateMutation = useMutation({
    mutationFn: (state: "LISTENING" | "SPEAKING" | "MUTED") => voiceRoomService.setState(roomId, state),
    onSuccess: invalidate,
  });
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "ADMIN" | "MEMBER" }) =>
      voiceRoomService.setRole(roomId, userId, role),
    onSuccess: invalidate,
  });
  const moderationMutation = useMutation({
    mutationFn: ({ userId, muted }: { userId: string; muted: boolean }) => voiceRoomService.setModeration(roomId, userId, muted),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => voiceRoomService.removeParticipant(roomId, userId),
    onSuccess: invalidate,
  });

  const liveParticipants = useMemo(() => serializeLiveParticipants(participants), [participants]);

  const mergedParticipants = useMemo(
    () =>
      room.participants.map((participant) => {
        const liveParticipant = liveParticipants[participant.user.id];
        const role = liveParticipant?.metadata?.role ?? participant.role;
        const isMutedByModerator = liveParticipant?.metadata?.isMutedByModerator ?? participant.isMutedByModerator ?? false;

        return {
          ...participant,
          role,
          isConnected: Boolean(liveParticipant),
          isSpeakingLive: liveParticipant?.isSpeaking ?? participant.isSpeakingLive ?? false,
          isMicEnabled:
            liveParticipant?.isMicrophoneEnabled ??
            participant.isMicEnabled ??
            (participant.state !== "MUTED" && !isMutedByModerator),
          isMutedByModerator,
        };
      }),
    [liveParticipants, room.participants],
  );

  const toggleSelfMicrophone = async () => {
    const nextEnabled = !isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(nextEnabled);
    await stateMutation.mutateAsync(nextEnabled ? "SPEAKING" : "MUTED");
  };

  return (
    <>
      <View style={styles.transportCard}>
        <View style={styles.transportHeader}>
          <View>
            <Text style={styles.sectionTitle}>Live audio</Text>
            <Text style={styles.transportSubtle}>
              {connectionState === ConnectionState.Connected ? "Connected to LiveKit" : "Connecting to LiveKit"}
            </Text>
          </View>
          <View style={[styles.connectionPill, connectionState === ConnectionState.Connected ? styles.connectionPillActive : null]}>
            <Text style={[styles.connectionPillLabel, connectionState === ConnectionState.Connected ? styles.connectionPillLabelActive : null]}>
              {connectionState === ConnectionState.Connected ? "Live" : "Syncing"}
            </Text>
          </View>
        </View>

        <View style={styles.transportActions}>
          <Button
            label={stateMutation.isPending ? "Updating..." : isMicrophoneEnabled ? "Mute mic" : "Unmute mic"}
            onPress={() => void toggleSelfMicrophone()}
            disabled={stateMutation.isPending || currentViewer?.isMutedByModerator}
          />
        </View>

        {currentViewer?.isMutedByModerator ? (
          <Text style={styles.audioError}>A moderator muted your microphone. Wait for them to unmute you.</Text>
        ) : null}
      </View>

      <VoiceRoomRoster
        moderationAction={{ mutate: (payload) => moderationMutation.mutate(payload) }}
        removeAction={{ mutate: (userId) => removeMutation.mutate(userId) }}
        roleAction={{ mutate: (payload) => roleMutation.mutate(payload) }}
        room={{ ...room, participants: mergedParticipants }}
      />

      {room.canEdit ? (
        <View style={styles.editor}>
          <Text style={styles.sectionTitle}>Room settings</Text>
          <Input label="Title" value={draftTitle} onChangeText={onChangeTitle} />
          <Input label="Topic" value={draftTopic} onChangeText={onChangeTopic} />
          <Input label="Description" value={draftDescription} onChangeText={onChangeDescription} multiline />
          <View style={styles.themeRow}>
            {(Object.keys(roomThemes) as VoiceRoom["theme"][]).map((themeKey) => (
              <Pressable key={themeKey} style={styles.themeOption} onPress={() => onChangeTheme(themeKey)}>
                <LinearGradient
                  colors={roomThemes[themeKey].colors}
                  style={[styles.themeSwatch, draftTheme === themeKey ? styles.themeSwatchActive : null]}
                />
                <Text style={styles.themeText}>{roomThemes[themeKey].label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.privacyRow}>
            {(["PUBLIC", "FOLLOWERS", "FRIENDS", "INVITE_ONLY"] as const).map((privacy) => (
              <Pressable
                key={privacy}
                style={[styles.privacyChip, draftPrivacy === privacy ? styles.privacyChipActive : null]}
                onPress={() => onChangePrivacy(privacy)}
              >
                <Text style={[styles.privacyChipLabel, draftPrivacy === privacy ? styles.privacyChipLabelActive : null]}>
                  {privacy === "INVITE_ONLY" ? "Invite only" : privacy}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button label={updateAction.isPending ? "Saving..." : "Save room"} onPress={updateAction.mutate} />
          <Button
            label={endAction.isPending ? "Ending..." : "Close room"}
            onPress={endAction.mutate}
            variant="secondary"
          />
        </View>
      ) : null}
    </>
  );
};

const VoiceRoomRoster = ({
  moderationAction,
  removeAction,
  roleAction,
  room,
}: {
  moderationAction?: ModerationAction;
  removeAction?: RemoveAction;
  roleAction?: RoleAction;
  room: VoiceRoom;
}) => (
  <View style={styles.memberSection}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Participants</Text>
      <Text style={styles.sectionMeta}>{room.participantsCount ?? room.participants.length}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.memberList}>
      {room.participants.map((participant) => (
        <View key={participant.id} style={styles.memberCard}>
          <View style={styles.memberIdentity}>
            <Avatar name={participant.user.firstName ?? participant.user.username} size={44} />
            <View style={styles.memberCopy}>
              <View style={styles.memberHeadline}>
                <Text style={styles.memberName}>{participant.user.firstName ?? participant.user.username}</Text>
                <View style={[styles.roleBadge, participant.role === "OWNER" ? styles.ownerBadge : participant.role === "ADMIN" ? styles.adminBadge : null]}>
                  <Text style={[styles.roleBadgeLabel, participant.role !== "MEMBER" ? styles.roleBadgeLabelStrong : null]}>
                    {participant.role}
                  </Text>
                </View>
              </View>
              <Text style={styles.memberMeta}>
                {participant.isConnected ? "Connected" : "Offline"} |{" "}
                {participant.isMutedByModerator ? "Muted by moderator" : participant.isSpeakingLive ? "Speaking" : participant.isMicEnabled ? "Mic on" : "Listening"}
              </Text>
            </View>
          </View>
          <View style={styles.memberActions}>
            {participant.canPromote ? (
              <Pressable style={styles.actionChip} onPress={() => roleAction?.mutate({ userId: participant.user.id, role: "ADMIN" })}>
                <Text style={styles.actionChipLabel}>Promote</Text>
              </Pressable>
            ) : null}
            {participant.canDemote ? (
              <Pressable style={styles.actionChip} onPress={() => roleAction?.mutate({ userId: participant.user.id, role: "MEMBER" })}>
                <Text style={styles.actionChipLabel}>Demote</Text>
              </Pressable>
            ) : null}
            {participant.canMute ? (
              <Pressable style={styles.actionChip} onPress={() => moderationAction?.mutate({ userId: participant.user.id, muted: true })}>
                <Text style={styles.actionChipLabel}>Mute</Text>
              </Pressable>
            ) : null}
            {participant.canUnmute ? (
              <Pressable style={styles.actionChip} onPress={() => moderationAction?.mutate({ userId: participant.user.id, muted: false })}>
                <Text style={styles.actionChipLabel}>Unmute</Text>
              </Pressable>
            ) : null}
            {participant.canBeRemoved ? (
              <Pressable style={styles.removeChip} onPress={() => removeAction?.mutate(participant.user.id)}>
                <Text style={styles.removeChipLabel}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  meta: { color: "#FFF2EA", fontWeight: "700" },
  description: { color: "#FFF8F1", lineHeight: 21 },
  liveBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  liveBadgeText: { color: "#FFFFFF", fontWeight: "800" },
  hostRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  hostLabel: { color: "#FFF2EA", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  hostName: { color: "#FFFFFF", fontWeight: "800" },
  controls: { gap: spacing.sm },
  audioError: { color: colors.danger, lineHeight: 20 },
  transportCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  transportHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  transportSubtle: { color: colors.textMuted, lineHeight: 20 },
  connectionPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  connectionPillActive: {
    backgroundColor: colors.energySoft,
    borderColor: colors.accent,
  },
  connectionPillLabel: { color: colors.textMuted, fontWeight: "800" },
  connectionPillLabelActive: { color: colors.accent },
  transportActions: { gap: spacing.sm },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  sectionMeta: { color: colors.textSoft, fontWeight: "700" },
  memberSection: { gap: spacing.sm },
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
  memberHeadline: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  memberName: { color: colors.text, fontWeight: "800" },
  memberMeta: { color: colors.textSoft, fontSize: 12 },
  roleBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  ownerBadge: {
    backgroundColor: colors.energySoft,
    borderColor: colors.accent,
  },
  adminBadge: {
    backgroundColor: colors.signalBlueSoft,
    borderColor: colors.signalBlue,
  },
  roleBadgeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  roleBadgeLabelStrong: { color: colors.primaryDark },
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
  editor: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  themeOption: { alignItems: "center", gap: spacing.xs },
  themeSwatch: { borderRadius: radius.md, height: 54, width: 70 },
  themeSwatchActive: { borderColor: colors.primaryDark, borderWidth: 2 },
  themeText: { color: colors.textSoft, fontSize: 12, fontWeight: "700" },
  privacyRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  privacyChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  privacyChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  privacyChipLabel: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  privacyChipLabelActive: { color: colors.surface },
  feedback: { color: colors.textMuted },
});
