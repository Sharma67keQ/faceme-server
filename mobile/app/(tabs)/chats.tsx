import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChatListItem } from "@/components/chat-list-item";
import { ScreenState } from "@/components/screen-state";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { chatService } from "@/services/chat";
import { userService } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function ChatsScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const trimmedSearchQuery = searchQuery.trim();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: chatService.getConversations,
  });
  const conversations = data ?? [];
  const unreadTotal = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount ?? 0), 0);
  const { data: users = [], isFetching: isSearching } = useQuery({
    queryKey: ["user-search", trimmedSearchQuery],
    queryFn: () => userService.searchUsers(trimmedSearchQuery),
    enabled: trimmedSearchQuery.length > 0,
  });
  const createDirectConversationMutation = useMutation({
    mutationFn: (peerId: string) => chatService.createDirectConversation(peerId),
    onError: (error) => {
      console.error("Failed to create direct conversation", error);
    },
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSearchQuery("");
      router.push(`/chat/${conversation.id}`);
    },
  });
  const searchResults = users.filter((user) => user.id !== currentUser?.id);
  const createGroupMutation = useMutation({
    mutationFn: (participantIds: string[]) =>
      chatService.createGroupConversation({ title: groupTitle.trim(), participantIds }),
    onError: (error) => {
      console.error("Failed to create group conversation", error);
    },
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setGroupTitle("");
      setSearchQuery("");
      router.push(`/chat/${conversation.id}`);
    },
  });

  if (isLoading && !conversations.length) {
    return (
      <Screen>
        <ScreenState
          variant="loading"
          title="Loading chats"
          message="Your conversations are being prepared."
        />
      </Screen>
    );
  }

  if (isError && !conversations.length) {
    return (
      <Screen>
        <ScreenState
          variant="error"
          title="Could not load chats"
          message="Messaging is unavailable right now, but the app is still running."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>Messaging hub</Text>
            <Text style={styles.title}>Chats</Text>
          </View>
          <Pressable style={styles.communityButton} onPress={() => router.push("/communities")}>
            <Ionicons name="people-circle-outline" color={colors.primaryDark} size={18} />
            <Text style={styles.communityButtonLabel}>Communities</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Direct threads, groups, and community rooms move through the same inbox.
        </Text>
      </View>

      <View style={styles.searchPanel}>
        <Input
          label="Find people"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or username"
        />
        <Input
          label="New group title"
          value={groupTitle}
          onChangeText={setGroupTitle}
          placeholder="Design Team"
        />
      </View>

      {trimmedSearchQuery ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>People</Text>
          {searchResults.map((user) => (
            <Pressable
              key={user.id}
              style={styles.searchCard}
              onPress={() => router.push(`/profile/${user.username}`)}
            >
              <View style={styles.searchMeta}>
                <Avatar name={user.firstName ?? user.username} />
                <View style={styles.searchText}>
                  <Text style={styles.name}>{user.firstName ?? user.username}</Text>
                  <Text style={styles.preview}>@{user.username}</Text>
                </View>
              </View>
              <Pressable style={styles.inlineAction} onPress={() => createDirectConversationMutation.mutate(user.id)}>
                <Text style={styles.actionLabel}>
                  {createDirectConversationMutation.isPending ? "Opening..." : "Message"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.inlineAction}
                onPress={() => createGroupMutation.mutate([user.id])}
                disabled={createGroupMutation.isPending || groupTitle.trim().length < 2}
              >
                <Text style={styles.actionLabel}>
                  {createGroupMutation.isPending ? "Creating..." : "Add to group"}
                </Text>
              </Pressable>
            </Pressable>
          ))}
          {!isSearching && searchResults.length === 0 ? (
            <Text style={styles.empty}>No matching users found.</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent conversations</Text>
        <Text style={styles.sectionMeta}>
          {conversations.length} active {"\u00B7"} {unreadTotal} unread
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {conversations.map((conversation) => (
          <ChatListItem
            key={conversation.id}
            conversation={conversation}
            currentUserId={currentUser?.id}
            onPress={() => router.push(`/chat/${conversation.id}`)}
          />
        ))}
        {!conversations.length ? (
          <Text style={styles.empty}>
            Search for someone above to start your first direct conversation.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  communityButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  communityButtonLabel: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  searchPanel: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionMeta: {
    color: colors.textSoft,
    fontWeight: "700",
  },
  list: {
    gap: spacing.sm,
    paddingBottom: 140,
  },
  searchCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  searchMeta: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
  },
  searchText: {
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  preview: {
    color: colors.textMuted,
  },
  inlineAction: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionLabel: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  empty: {
    color: colors.textMuted,
  },
});
