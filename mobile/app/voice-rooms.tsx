import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { voiceRoomService } from "@/services/voice-rooms";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function VoiceRoomsScreen() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  const { data: rooms = [] } = useQuery({
    queryKey: ["voice-rooms"],
    queryFn: voiceRoomService.list,
  });

  const createMutation = useMutation({
    mutationFn: () => voiceRoomService.create({ title: title.trim(), topic: topic.trim() || undefined }),
    onSuccess: async () => {
      setTitle("");
      setTopic("");
      await queryClient.invalidateQueries({ queryKey: ["voice-rooms"] });
    },
  });

  const joinMutation = useMutation({
    mutationFn: ({ roomId, action }: { roomId: string; action: "join" | "leave" }) =>
      action === "join" ? voiceRoomService.join(roomId) : voiceRoomService.leave(roomId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["voice-rooms"] });
    },
  });

  return (
    <Screen scroll>
      <Text style={styles.title}>Voice rooms</Text>
      <View style={styles.composeCard}>
        <Input label="Room title" value={title} onChangeText={setTitle} />
        <Input label="Topic" value={topic} onChangeText={setTopic} />
        <Button
          label={createMutation.isPending ? "Creating..." : "Create voice room"}
          onPress={() => createMutation.mutate()}
          disabled={!title.trim() || createMutation.isPending}
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {rooms.map((room) => {
          const isParticipant = room.participants.some((participant) => participant.user.id === currentUserId);

          return (
            <View key={room.id} style={styles.roomCard}>
              <Text style={styles.roomTitle}>{room.title}</Text>
              <Text style={styles.roomMeta}>{room.topic ?? "Open conversation"}</Text>
              <Text style={styles.roomMeta}>{room.participantsCount} participants</Text>
              <View style={styles.participants}>
                {room.participants.slice(0, 5).map((participant) => (
                  <View key={participant.id} style={styles.participant}>
                    <Avatar name={participant.user.firstName ?? participant.user.username} size={32} />
                    <Text style={styles.participantLabel}>{participant.state}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={styles.roomButton}
                onPress={() => joinMutation.mutate({ roomId: room.id, action: isParticipant ? "leave" : "join" })}
              >
                <Text style={styles.roomButtonText}>{isParticipant ? "Leave room" : "Join room"}</Text>
              </Pressable>
            </View>
          );
        })}
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
  list: { gap: spacing.md, paddingBottom: 80 },
  roomCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  roomTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  roomMeta: { color: colors.textMuted },
  participants: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  participant: { alignItems: "center", gap: spacing.xxs },
  participantLabel: { color: colors.textSoft, fontSize: 11 },
  roomButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  roomButtonText: { color: colors.surface, fontWeight: "800" },
});
