import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Conversation } from "@/types/domain";
import { colors, radius, spacing } from "@/utils/theme";
import { Avatar } from "./ui/avatar";

type ChatListItemProps = {
  conversation: Conversation;
  currentUserId?: string;
  onPress?: () => void;
};

export const ChatListItem = ({ conversation, currentUserId, onPress }: ChatListItemProps) => {
  const peer =
    conversation.participants.find((participant) => participant.user.id !== currentUserId)?.user ??
    conversation.participants[0]?.user;
  const participantCount = conversation.participants.length;
  const title =
    conversation.type === "DIRECT"
      ? peer?.firstName ?? "Conversation"
      : conversation.title ?? `${conversation.type === "COMMUNITY" ? "Community" : "Group"} chat`;
  const preview =
    conversation.lastMessage?.text ??
    (conversation.type === "COMMUNITY"
      ? "Open the community conversation"
      : conversation.type === "GROUP"
        ? "Start the group conversation"
        : "Start chatting");
  const presenceLabel =
    conversation.type === "DIRECT" ? peer?.presenceStatus : `${participantCount} members`;
  const badgeLabel =
    conversation.type === "COMMUNITY" ? "COMMUNITY" : conversation.type === "GROUP" ? "GROUP" : "DIRECT";
  const lastActivity = new Date(conversation.lastMessageAt ?? conversation.updatedAt);
  const timestamp = Number.isNaN(lastActivity.getTime())
    ? "Now"
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(lastActivity);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Avatar name={title} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {title}
            </Text>
            {presenceLabel ? <Text style={styles.meta}>{presenceLabel}</Text> : null}
          </View>
          <Text style={styles.time}>{timestamp}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.badge}>
            <Ionicons
              name={conversation.type === "DIRECT" ? "chatbubble-outline" : "people-outline"}
              color={colors.primaryDark}
              size={12}
            />
            <Text style={styles.badgeLabel}>{badgeLabel}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
          {conversation.unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadLabel}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  meta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  time: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  bottomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeLabel: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  preview: {
    color: colors.textMuted,
    flex: 1,
  },
  unreadBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    justifyContent: "center",
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadLabel: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "800",
  },
});
