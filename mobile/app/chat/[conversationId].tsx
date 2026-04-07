import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MediaAttachmentPreview } from "@/components/media-attachment-preview";
import { ScreenState } from "@/components/screen-state";
import { Screen } from "@/components/ui/screen";
import { chatService } from "@/services/chat";
import { mediaService } from "@/services/media";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const resolvedConversationId = typeof conversationId === "string" ? conversationId : "";
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const setMessages = useChatStore((state) => state.setMessages);
  const appendMessage = useChatStore((state) => state.appendMessage);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const [text, setText] = useState("");
  const [mediaAttachment, setMediaAttachment] = useState<{ localUri: string; remoteUrl: string } | null>(null);
  const [messageType, setMessageType] = useState<"TEXT" | "IMAGE" | "VIDEO" | "AUDIO">("TEXT");
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, "SENT" | "DELIVERED" | "SEEN">>({});
  const [isUploading, setIsUploading] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["messages", resolvedConversationId],
    queryFn: () => chatService.getMessages(resolvedConversationId),
    enabled: Boolean(resolvedConversationId),
  });

  useEffect(() => {
    if (!resolvedConversationId) {
      return;
    }

    setActiveConversation(resolvedConversationId);

    return () => {
      setActiveConversation(null);
    };
  }, [resolvedConversationId, setActiveConversation]);

  useEffect(() => {
    if (resolvedConversationId && data) {
      setMessages(resolvedConversationId, data);
    }
  }, [resolvedConversationId, data, setMessages]);

  useEffect(() => {
    if (!accessToken || !resolvedConversationId) {
      return;
    }

    const socket = chatService.connect(accessToken);
    if (!socket) {
      console.error("Conversation socket unavailable", { conversationId: resolvedConversationId });
      return;
    }
    const handleNewMessage = (message: any) => {
      if (message.conversationId === resolvedConversationId) {
        appendMessage(resolvedConversationId, message);
      }
    };
    const handleTypingUpdate = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (payload.conversationId !== resolvedConversationId || payload.userId === currentUserId) {
        return;
      }

      setTypingUserId(payload.isTyping ? payload.userId : null);
    };
    const handleMessageStatus = (payload: {
      conversationId: string;
      messageId: string;
      userId: string;
      status: "SENT" | "DELIVERED" | "SEEN";
    }) => {
      if (payload.conversationId !== resolvedConversationId || payload.userId === currentUserId) {
        return;
      }

      setMessageStatuses((currentStatuses) => ({
        ...currentStatuses,
        [payload.messageId]: payload.status,
      }));
    };

    socket.emit("conversation:join", resolvedConversationId);
    socket.on("message:new", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:status", handleMessageStatus);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:status", handleMessageStatus);
      socket.emit("typing:stop", { conversationId: resolvedConversationId });
    };
  }, [accessToken, appendMessage, currentUserId, resolvedConversationId]);

  const messages = useChatStore((state) => state.messagesByConversation[resolvedConversationId] ?? []);

  useEffect(() => {
    if (!accessToken || !resolvedConversationId || !messages.length) {
      return;
    }

    const socket = chatService.connect(accessToken);
    if (!socket) {
      return;
    }
    const lastIncomingMessage = [...messages]
      .reverse()
      .find((message) => message.senderId !== currentUserId);

    if (!lastIncomingMessage) {
      return;
    }

    socket.emit("message:seen", {
      conversationId: resolvedConversationId,
      messageId: lastIncomingMessage.id,
    });
  }, [accessToken, currentUserId, messages, resolvedConversationId]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  const handleTextChange = (value: string) => {
    setText(value);
    setComposerError(null);

    if (!accessToken || !resolvedConversationId) {
      return;
    }

    const socket = chatService.connect(accessToken);
    if (!socket) {
      return;
    }

    if (!value.trim()) {
      socket.emit("typing:stop", { conversationId: resolvedConversationId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      return;
    }

    socket.emit("typing:start", { conversationId: resolvedConversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId: resolvedConversationId });
    }, 1200);
  };

  const handleSend = async () => {
    const trimmedText = text.trim();

    if (!trimmedText && !mediaAttachment?.remoteUrl) {
      return;
    }

    if (!resolvedConversationId) {
      setComposerError("This conversation link is invalid.");
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      setComposerError(null);

      if (accessToken) {
        const socket = chatService.connect(accessToken);

        if (!socket) {
          throw new Error("Socket connection unavailable.");
        }

        socket.emit("typing:stop", { conversationId: resolvedConversationId });
        socket.emit("message:send", {
          conversationId: resolvedConversationId,
          text: trimmedText || undefined,
          mediaUrl: mediaAttachment?.remoteUrl,
          type: mediaAttachment?.remoteUrl ? messageType : "TEXT",
        });
      } else {
        await chatService.sendMessage(resolvedConversationId, {
          text: trimmedText || undefined,
          mediaUrl: mediaAttachment?.remoteUrl,
          type: mediaAttachment?.remoteUrl ? messageType : "TEXT",
        });
      }

      setText("");
      setMediaAttachment(null);
      setMessageType("TEXT");
    } catch (error) {
      console.error("Failed to send message", error);
      setComposerError("Message could not be sent. Try again.");
    }
  };

  const handlePickAttachment = async (type: "IMAGE" | "VIDEO") => {
    try {
      setIsUploading(true);
      setComposerError(null);
      const asset = await mediaService.pickFromLibrary(type === "VIDEO" ? "video" : "image");

      if (!asset) {
        return;
      }

      const uploaded = await mediaService.uploadAsset(asset, type === "VIDEO" ? "video" : "image");
      setMediaAttachment({ localUri: asset.uri, remoteUrl: uploaded.secureUrl });
      setMessageType(type);
    } catch (error) {
      console.error("Failed to attach media", error);
      setComposerError("Attachment upload failed. Try another file.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!resolvedConversationId) {
    return (
      <Screen>
        <ScreenState
          variant="error"
          title="Conversation unavailable"
          message="The selected chat route is invalid."
        />
      </Screen>
    );
  }

  if (isLoading && !messages.length) {
    return (
      <Screen>
        <ScreenState
          variant="loading"
          title="Loading conversation"
          message="Messages are being fetched."
        />
      </Screen>
    );
  }

  if (isError && !messages.length) {
    return (
      <Screen>
        <ScreenState
          variant="error"
          title="Could not load messages"
          message="This chat is temporarily unavailable."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

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
        {!messages.length ? (
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
            {message.mediaUrl && (message.type === "IMAGE" || message.type === "VIDEO") ? (
              <MediaAttachmentPreview
                autoPlay={message.type === "VIDEO"}
                height={220}
                kind={message.type}
                uri={message.mediaUrl}
              />
            ) : null}
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
          <View style={styles.attachmentRow}>
            <Pressable style={styles.attachChip} onPress={() => void handlePickAttachment("IMAGE")}>
              <Ionicons name="image-outline" color={colors.primaryDark} size={16} />
              <Text style={styles.attachChipLabel}>{isUploading && messageType === "IMAGE" ? "Uploading..." : "Photo"}</Text>
            </Pressable>
            <Pressable style={styles.attachChip} onPress={() => void handlePickAttachment("VIDEO")}>
              <Ionicons name="videocam-outline" color={colors.primaryDark} size={16} />
              <Text style={styles.attachChipLabel}>{isUploading && messageType === "VIDEO" ? "Uploading..." : "Video"}</Text>
            </Pressable>
          </View>
          {mediaAttachment ? (
            <MediaAttachmentPreview
              uri={mediaAttachment.localUri}
              kind={messageType === "VIDEO" ? "VIDEO" : "IMAGE"}
              height={180}
              label="Attachment ready"
            />
          ) : null}
        </View>
        <Pressable style={styles.send} onPress={handleSend} disabled={isUploading}>
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>
      {composerError ? <Text style={styles.composerError}>{composerError}</Text> : null}
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
  attachmentRow: {
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
  attachChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  attachChipLabel: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
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
  composerError: {
    color: colors.danger,
    lineHeight: 20,
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
