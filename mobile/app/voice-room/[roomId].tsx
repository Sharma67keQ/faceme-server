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
import { ScreenState } from "@/components/screen-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { useI18n } from "@/services/i18n";
import { ensureLiveKitGlobals } from "@/services/livekit";
import { monetizationService } from "@/services/monetization";
import { voiceRoomService } from "@/services/voice-rooms";
import { chatService } from "@/services/chat";
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
  const resolvedRoomId = typeof roomId === "string" ? roomId : "";
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTopic, setDraftTopic] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPrivacy, setDraftPrivacy] = useState<"PUBLIC" | "FOLLOWERS" | "FRIENDS" | "INVITE_ONLY">("PUBLIC");
  const [draftTheme, setDraftTheme] = useState<VoiceRoom["theme"]>("SUNSET");
  const [audioSession, setAudioSession] = useState<AudioSessionPayload | null>(null);
  const [voiceTransportError, setVoiceTransportError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [giftMessage, setGiftMessage] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    ensureLiveKitGlobals();
  }, []);

  const { data: room, refetch, isLoading, isError } = useQuery({
    queryKey: ["voice-room", resolvedRoomId],
    queryFn: () => voiceRoomService.getById(resolvedRoomId) as Promise<VoiceRoom>,
    enabled: Boolean(resolvedRoomId),
  });
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: monetizationService.getWallet,
  });
  const { data: giftCatalog = [] } = useQuery({
    queryKey: ["gift-catalog"],
    queryFn: monetizationService.getGiftCatalog,
  });
  const { data: giftSnapshot } = useQuery({
    queryKey: ["voice-room-gifts", resolvedRoomId],
    queryFn: () => monetizationService.getRoomGiftSnapshot(resolvedRoomId),
    enabled: Boolean(resolvedRoomId),
  });

  useEffect(() => {
    if (!resolvedRoomId || !accessToken) {
      return;
    }

    const socket = chatService.connect(accessToken);
    if (!socket) {
      console.error("Voice room socket unavailable", { roomId: resolvedRoomId });
      return;
    }
    const handleRoomChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ["voice-room", resolvedRoomId] });
      void queryClient.invalidateQueries({ queryKey: ["voice-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["voice-room-gifts", resolvedRoomId] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    };

    chatService.joinVoiceRoom(resolvedRoomId);
    socket.on("voice-room:changed", handleRoomChanged);

    return () => {
      socket.off("voice-room:changed", handleRoomChanged);
      chatService.leaveVoiceRoom(resolvedRoomId);
    };
  }, [accessToken, queryClient, resolvedRoomId]);

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
      queryClient.invalidateQueries({ queryKey: ["voice-room", resolvedRoomId] }),
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
      voiceRoomService.update(resolvedRoomId, {
        title: draftTitle.trim(),
        topic: draftTopic.trim() || null,
        description: draftDescription.trim() || null,
        privacy: draftPrivacy,
        theme: draftTheme,
      }),
    onSuccess: invalidate,
  });

  const audioTokenMutation = useMutation({
    mutationFn: () => voiceRoomService.issueAudioToken(resolvedRoomId),
    onSuccess: (payload) => {
      setScreenError(null);
      setVoiceTransportError(null);
      setAudioSession(payload);
    },
    onError: (error: Error) => {
      console.error("Failed to issue audio token", error);
      setVoiceTransportError(error.message);
    },
  });

  const joinLeaveMutation = useMutation({
    mutationFn: async () => {
      if (room?.canJoin) {
        await voiceRoomService.join(resolvedRoomId);
        return { joined: true };
      }

      await disconnectAudio();
      await voiceRoomService.leave(resolvedRoomId);
      return { joined: false };
    },
    onError: (error) => {
      console.error("Failed to join or leave room", error);
      setScreenError("Could not update room participation.");
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
      return voiceRoomService.endRoom(resolvedRoomId);
    },
    onError: (error) => {
      console.error("Failed to end room", error);
      setScreenError("Could not close this room.");
    },
    onSuccess: invalidate,
  });
  const giftMutation = useMutation({
    mutationFn: (giftId: string) =>
      monetizationService.sendRoomGift(resolvedRoomId, {
        giftId,
        clientRequestId: `${resolvedRoomId}-${Date.now()}-${giftId}`,
        message: giftMessage.trim() || undefined,
      }),
    onError: (error) => {
      console.error("Failed to send room gift", error);
      setScreenError("Gift could not be sent.");
    },
    onSuccess: async () => {
      setScreenError(null);
      setGiftMessage("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["voice-room-gifts", resolvedRoomId] }),
      ]);
    },
  });

  if (!resolvedRoomId) {
    return (
      <Screen>
        <ScreenState
          variant="error"
          title="Voice room unavailable"
          message="The selected room route is invalid."
        />
      </Screen>
    );
  }

  if (isLoading && !room) {
    return (
      <Screen>
        <ScreenState
          variant="loading"
          title={t("common.loading")}
          message="Voice room details are loading."
        />
      </Screen>
    );
  }

  if (isError && !room) {
    return (
      <Screen>
        <ScreenState
          variant="error"
          title="Could not load room"
          message="The room details are temporarily unavailable."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  if (!room) {
    return (
      <Screen>
        <ScreenState
          variant="loading"
          title={t("common.loading")}
          message="Faceme is waiting for room data."
        />
      </Screen>
    );
  }

  const activeRoom = room;
  const currentViewer = activeRoom.participants.find((participant) => participant.user.id === currentUserId) ?? null;

  return (
    <Screen scroll>
      <LinearGradient colors={roomThemes[activeRoom.theme].colors} style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{activeRoom.title}</Text>
            <Text style={styles.meta}>{`${roomThemes[activeRoom.theme].label} | ${activeRoom.privacy} | ${activeRoom.status}`}</Text>
          </View>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>{activeRoom.participantsCount ?? activeRoom.participants.length} live</Text>
          </View>
        </View>
        <Text style={styles.description}>{activeRoom.description ?? activeRoom.topic ?? "Join the live conversation."}</Text>
        <View style={styles.hostRow}>
          <Avatar name={activeRoom.owner?.firstName ?? activeRoom.host.firstName ?? activeRoom.host.username} size={34} />
          <View>
            <Text style={styles.hostLabel}>Hosted by</Text>
            <Text style={styles.hostName}>{activeRoom.owner?.firstName ?? activeRoom.host.firstName ?? activeRoom.host.username}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <View style={styles.walletChip}>
          <Text style={styles.walletChipLabel}>{wallet?.balanceCoins ?? 0} coins</Text>
        </View>
        <Button
          label={joinLeaveMutation.isPending ? "Working..." : activeRoom.canJoin ? "Join room" : "Leave room"}
          onPress={() => joinLeaveMutation.mutate()}
          variant={activeRoom.canJoin ? "primary" : "secondary"}
        />
        {!activeRoom.canJoin ? (
          <Button
            label={audioTokenMutation.isPending ? "Connecting..." : audioSession ? "Reconnect audio" : "Connect audio"}
            onPress={() => audioTokenMutation.mutate()}
            variant="secondary"
          />
        ) : null}
        {voiceTransportError ? <Text style={styles.audioError}>{voiceTransportError}</Text> : null}
        {screenError ? <Text style={styles.audioError}>{screenError}</Text> : null}
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
            giftCatalog={giftCatalog}
            giftMessage={giftMessage}
            giftMutation={giftMutation}
            giftSnapshot={giftSnapshot}
            room={activeRoom}
            currentViewer={currentViewer}
            roomId={resolvedRoomId}
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
            onGiftMessageChange={setGiftMessage}
            t={t}
            updateAction={{ isPending: updateMutation.isPending, mutate: () => updateMutation.mutate() }}
          />
        </LiveKitRoom>
      ) : (
        <VoiceRoomRoster room={activeRoom} />
      )}
    </Screen>
  );
}

const VoiceRoomLivePanel = ({
  room,
  giftCatalog,
  giftMessage,
  giftMutation,
  giftSnapshot,
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
  onGiftMessageChange,
  t,
  updateAction,
}: {
  room: VoiceRoom;
  giftCatalog: Array<{ id: string; name: string; coinCost: number; accentColor?: string | null }>;
  giftMessage: string;
  giftMutation: { isPending: boolean; mutate: (giftId: string) => void };
  giftSnapshot?: {
    recentEvents: Array<{
      id: string;
      gift: { name: string };
      sender: { firstName: string; username: string };
      totalCoinCost: number;
    }>;
    topSupporters: Array<{
      user: { firstName?: string; username: string } | null;
      totalCoins: number;
    }>;
    roomEarnings: {
      grossCoins: number;
      creatorNetCoins: number;
    };
  };
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
  onGiftMessageChange: (value: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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
            <Text style={styles.sectionTitle}>{t("room.liveAudio")}</Text>
            <Text style={styles.transportSubtle}>
              {connectionState === ConnectionState.Connected ? t("room.connected") : t("room.connecting")}
            </Text>
          </View>
          <View style={[styles.connectionPill, connectionState === ConnectionState.Connected ? styles.connectionPillActive : null]}>
            <Text style={[styles.connectionPillLabel, connectionState === ConnectionState.Connected ? styles.connectionPillLabelActive : null]}>
              {connectionState === ConnectionState.Connected ? t("room.live") : t("room.syncing")}
            </Text>
          </View>
        </View>

        <View style={styles.transportActions}>
          <Button
            label={stateMutation.isPending ? t("common.loading") : isMicrophoneEnabled ? t("room.muteMic") : t("room.unmuteMic")}
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

      <View style={styles.giftPanel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("room.supportTitle")}</Text>
          <Text style={styles.sectionMeta}>{t("room.liveGifts")}</Text>
        </View>
        <Input label={t("room.giftNote")} value={giftMessage} onChangeText={onGiftMessageChange} />
        <View style={styles.giftGrid}>
          {giftCatalog.map((gift) => (
            <Pressable
              key={gift.id}
              style={[styles.giftCard, gift.accentColor ? { borderColor: gift.accentColor } : null]}
              onPress={() => giftMutation.mutate(gift.id)}
              disabled={giftMutation.isPending}
            >
              <Text style={styles.giftCardTitle}>{gift.name}</Text>
              <Text style={styles.giftCardMeta}>{gift.coinCost} coins</Text>
            </Pressable>
          ))}
        </View>
        {giftSnapshot?.topSupporters?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("room.topSupporters")}</Text>
            {giftSnapshot.topSupporters.map((supporter, index) => (
              <Text key={`${supporter.user?.username ?? "unknown"}-${index}`} style={styles.memberMeta}>
                {index + 1}. {supporter.user?.firstName ?? supporter.user?.username ?? "Unknown"} · {supporter.totalCoins} coins
              </Text>
            ))}
          </View>
        ) : null}
        {giftSnapshot?.recentEvents?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("room.activity")}</Text>
            {giftSnapshot.recentEvents.slice(0, 5).map((event) => (
              <Text key={event.id} style={styles.memberMeta}>
                {event.sender.firstName ?? event.sender.username} sent {event.gift.name} · {event.totalCoinCost} coins
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {room.canEdit ? (
        <View style={styles.editor}>
          <Text style={styles.sectionTitle}>{t("room.roomSettings")}</Text>
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
          <Button label={updateAction.isPending ? t("common.loading") : t("room.saveRoom")} onPress={updateAction.mutate} />
          <Button
            label={endAction.isPending ? t("common.loading") : t("room.closeRoom")}
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
  walletChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  walletChipLabel: { color: colors.primaryDark, fontWeight: "800" },
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
  section: { gap: spacing.xs },
  giftPanel: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  giftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  giftCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xxs,
    minWidth: 120,
    padding: spacing.sm,
  },
  giftCardTitle: { color: colors.text, fontWeight: "800" },
  giftCardMeta: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
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
