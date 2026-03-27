import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { chatService } from "@/services/chat";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const setMessages = useChatStore((state) => state.setMessages);
  const appendMessage = useChatStore((state) => state.appendMessage);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [messageType, setMessageType] = useState<"TEXT" | "IMAGE" | "VIDEO" | "AUDIO">("TEXT");
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, "SENT" | "DELIVERED" | "SEEN">>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => chatService.getMessages(conversationId),
  });

  useEffect(() => {
    setActiveConversation(conversationId);

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    if (conversationId && data) {
      setMessages(conversationId, data);
    }
  }, [conversationId, data, setMessages]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const socket = chatService.connect(accessToken);
    socket.emit("conversation:join", conversationId);
    socket.on("message:new", (message) => appendMessage(conversationId, message));
    socket.on("typing:update", (payload) => {
      if (payload.conversationId !== conversationId || payload.userId === currentUserId) {
        return;
      }

      setTypingUserId(payload.isTyping ? payload.userId : null);
    });
    socket.on("message:status", (payload) => {
      if (payload.conversationId !== conversationId || payload.userId === currentUserId) {
        return;
      }

      setMessageStatuses((currentStatuses) => ({
        ...currentStatuses,
        [payload.messageId]: payload.status,
      }));
    });

    return () => {
      socket.off("message:new");
      socket.off("typing:update");
      socket.off("message:status");
    };
  }, [accessToken, appendMessage, conversationId, currentUserId]);

  const messages = useChatStore((state) => state.messagesByConversation[conversationId] ?? []);

  useEffect(() => {
    if (!accessToken || !messages.length) {
      return;
    }

    const socket = chatService.connect(accessToken);
    const lastIncomingMessage = [...messages]
      .reverse()
      .find((message) => message.senderId !== currentUserId);

    if (!lastIncomingMessage) {
      return;
    }

    socket.emit("message:seen", {
      conversationId,
      messageId: lastIncomingMessage.id,
    });
  }, [accessToken, conversationId, currentUserId, messages]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  const handleTextChange = (value: string) => {
    setText(value);

    if (!accessToken) {
      return;
    }

    const socket = chatService.connect(accessToken);

    if (!value.trim()) {
      socket.emit("typing:stop", { conversationId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      return;
    }

    socket.emit("typing:start", { conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId });
    }, 1200);
  };

  const handleSend = async () => {
    const trimmedText = text.trim();
    const trimmedMediaUrl = mediaUrl.trim();

    if (!trimmedText && !trimmedMediaUrl) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (accessToken) {
      const socket = chatService.connect(accessToken);
      socket.emit("typing:stop", { conversationId });
      socket.emit("message:send", {
        conversationId,
        text: trimmedText || undefined,
        mediaUrl: trimmedMediaUrl || undefined,
        type: trimmedMediaUrl ? messageType : "TEXT",
      });
    } else {
      await chatService.sendMessage(conversationId, {
        text: trimmedText || undefined,
        mediaUrl: trimmedMediaUrl || undefined,
        type: trimmedMediaUrl ? messageType : "TEXT",
      });
    }

    setText("");
    setMediaUrl("");
    setMessageType("TEXT");
  };

  return (
    <Screen>
      <Text style={styles.title}>Conversation</Text>
      {isLoading ? <Text style={styles.feedback}>Loading messages...</Text> : null}
      {isError ? (
        <Text style={styles.feedback} onPress={() => void refetch()}>
          Could not load messages. Tap to retry.
        </Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.messages}>
        {!isLoading && !isError && !messages.length ? (
          <Text style={styles.feedback}>No messages yet. Start the conversation.</Text>
        ) : null}
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.senderId === currentUserId ? styles.mine : styles.theirs,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.senderId === currentUserId ? styles.messageTextMine : null,
              ]}
            >
              {message.text ??
                (message.type === "AUDIO"
                  ? "Voice/audio message"
                  : message.type === "VIDEO"
                    ? "Video message"
                    : "Image message")}
            </Text>
            {message.mediaUrl ? <Text style={styles.mediaUrl}>{message.mediaUrl}</Text> : null}
            {message.senderId === currentUserId ? (
              <Text
                style={[
                  styles.status,
                  messageStatuses[message.id] === "SEEN" ? styles.statusSeen : null,
                ]}
              >
                {messageStatuses[message.id] ?? "SENT"}
              </Text>
            ) : null}
          </View>
        ))}
        {typingUserId ? <Text style={styles.typing}>Someone is typing...</Text> : null}
      </ScrollView>
      <View style={styles.composer}>
        <View style={styles.composerFields}>
          <View style={styles.typeRow}>
            {(["TEXT", "IMAGE", "VIDEO", "AUDIO"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.typeChip, messageType === value ? styles.typeChipActive : null]}
                onPress={() => setMessageType(value)}
              >
                <Text style={[styles.typeChipLabel, messageType === value ? styles.typeChipLabelActive : null]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={text}
            onChangeText={handleTextChange}
            placeholder={messageType === "TEXT" ? "Write a message" : "Optional caption"}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          {messageType !== "TEXT" ? (
            <TextInput
              value={mediaUrl}
              onChangeText={setMediaUrl}
              placeholder={`${messageType.toLowerCase()} URL`}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          ) : null}
        </View>
        <Pressable style={styles.send} onPress={handleSend}>
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  messages: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    color: colors.text,
  },
  messageTextMine: {
    color: colors.surface,
  },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  composerFields: {
    flex: 1,
    gap: spacing.xs,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  typeChip: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  typeChipLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  typeChipLabelActive: {
    color: colors.surface,
  },
  send: {
    minHeight: 52,
    minWidth: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendLabel: {
    color: colors.surface,
    fontWeight: "700",
  },
  feedback: {
    color: colors.textMuted,
  },
  typing: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
  status: {
    color: colors.surfaceMuted,
    fontSize: 12,
    marginTop: 6,
  },
  statusSeen: {
    color: "#FFE3B5",
  },
  mediaUrl: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
});
