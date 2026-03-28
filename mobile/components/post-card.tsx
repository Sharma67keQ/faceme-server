import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MediaAttachmentPreview } from "@/components/media-attachment-preview";
import { Comment, Post } from "@/types/domain";
import { postService } from "@/services/posts";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";
import { Avatar } from "./ui/avatar";

type PostCardProps = {
  post: Post;
  onLike?: () => void;
  onComment?: (body: string) => Promise<unknown>;
  onSave?: () => void;
  onShare?: () => void;
  isCommenting?: boolean;
};

const QUICK_EMOJIS = ["🔥", "👏", "😂"];

const ProfileIdentity = ({
  firstName,
  username,
  avatarSize = 44,
}: {
  firstName: string;
  username: string;
  avatarSize?: number;
}) => (
  <Pressable style={styles.identity} onPress={() => router.push(`/profile/${username}`)}>
    <Avatar name={firstName || username} size={avatarSize} />
    <View style={styles.identityMeta}>
      <Text style={styles.name}>{firstName}</Text>
      <Text style={styles.username}>@{username}</Text>
    </View>
  </Pressable>
);

const CommentReactionBar = ({
  comment,
  onReact,
  compact = false,
}: {
  comment: Comment;
  onReact: (payload: { type: "LIKE" | "DISLIKE" | "EMOJI"; emoji?: string }) => void;
  compact?: boolean;
}) => (
  <View style={[styles.commentReactionRow, compact ? styles.commentReactionRowCompact : null]}>
    <Pressable
      style={[styles.reactionChip, comment.viewerReactions.like ? styles.reactionChipActive : null]}
      onPress={() => onReact({ type: "LIKE" })}
    >
      <Ionicons name="thumbs-up-outline" color={colors.primaryDark} size={14} />
      <Text style={styles.reactionChipLabel}>{comment.reactionSummary.likes}</Text>
    </Pressable>
    <Pressable
      style={[styles.reactionChip, comment.viewerReactions.dislike ? styles.reactionChipActive : null]}
      onPress={() => onReact({ type: "DISLIKE" })}
    >
      <Ionicons name="thumbs-down-outline" color={colors.primaryDark} size={14} />
      <Text style={styles.reactionChipLabel}>{comment.reactionSummary.dislikes}</Text>
    </Pressable>
    {QUICK_EMOJIS.map((emoji) => {
      const existing = comment.reactionSummary.emojis.find((item) => item.emoji === emoji);
      const reacted = comment.viewerReactions.emojis.includes(emoji);

      return (
        <Pressable
          key={`${comment.id}-${emoji}`}
          style={[styles.reactionChip, reacted ? styles.reactionChipActive : null]}
          onPress={() => onReact({ type: "EMOJI", emoji })}
        >
          <Text style={styles.emojiText}>{emoji}</Text>
          <Text style={styles.reactionChipLabel}>{existing?.count ?? 0}</Text>
        </Pressable>
      );
    })}
  </View>
);

const CommentItem = ({
  comment,
  onReply,
  onReact,
  activeReplyCommentId,
  replyBody,
  setReplyBody,
  setActiveReplyCommentId,
  isReplyPending,
  onUpdateComment,
  onDeleteComment,
  nested = false,
}: {
  comment: Comment;
  onReply: (commentId: string) => Promise<void>;
  onReact: (commentId: string, payload: { type: "LIKE" | "DISLIKE" | "EMOJI"; emoji?: string }) => void;
  activeReplyCommentId: string | null;
  replyBody: string;
  setReplyBody: (value: string) => void;
  setActiveReplyCommentId: (value: string | null) => void;
  isReplyPending: boolean;
  onUpdateComment: (commentId: string, body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  nested?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingBody, setEditingBody] = useState(comment.body);

  return (
    <View style={[styles.commentCard, nested ? styles.replyCard : null]}>
    <View style={styles.commentHeader}>
      <ProfileIdentity
        firstName={comment.author.firstName ?? comment.author.username}
        username={comment.author.username}
        avatarSize={nested ? 30 : 36}
      />
      <View style={styles.commentHeaderActions}>
        <Pressable onPress={() => router.push(`/profile/${comment.author.username}`)}>
          <Text style={styles.viewProfile}>View Profile</Text>
        </Pressable>
        {comment.canEdit ? (
          <>
            <Pressable onPress={() => setIsEditing((current) => !current)}>
              <Text style={styles.viewProfile}>{isEditing ? "Cancel" : "Edit"}</Text>
            </Pressable>
            <Pressable onPress={() => onDeleteComment(comment.id)}>
              <Text style={styles.dangerText}>Delete</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
    {isEditing ? (
      <View style={styles.replyComposer}>
        <TextInput
          value={editingBody}
          onChangeText={setEditingBody}
          placeholder="Update comment"
          placeholderTextColor={colors.textSoft}
          style={styles.replyInput}
        />
        <Pressable
          style={styles.replySubmit}
          onPress={() => void onUpdateComment(comment.id, editingBody).then(() => setIsEditing(false))}
        >
          <Text style={styles.replySubmitLabel}>Save</Text>
        </Pressable>
      </View>
    ) : (
      <Text style={styles.commentBody}>{comment.body}</Text>
    )}
    <CommentReactionBar
      comment={comment}
      onReact={(payload) => onReact(comment.id, payload)}
      compact={nested}
    />
    {!nested ? (
      <Pressable
        style={styles.replyButton}
        onPress={() =>
          setActiveReplyCommentId(activeReplyCommentId === comment.id ? null : comment.id)
        }
      >
        <Ionicons name="return-up-forward-outline" color={colors.primaryDark} size={14} />
        <Text style={styles.replyButtonLabel}>Reply</Text>
      </Pressable>
    ) : null}
    {!nested && activeReplyCommentId === comment.id ? (
      <View style={styles.replyComposer}>
        <TextInput
          value={replyBody}
          onChangeText={setReplyBody}
          placeholder={`Reply to ${comment.author.firstName}`}
          placeholderTextColor={colors.textSoft}
          style={styles.replyInput}
        />
        <Pressable
          style={styles.replySubmit}
          onPress={() => void onReply(comment.id)}
          disabled={isReplyPending}
        >
          <Text style={styles.replySubmitLabel}>{isReplyPending ? "Posting..." : "Reply"}</Text>
        </Pressable>
      </View>
    ) : null}
    {comment.replies.length ? (
      <View style={styles.replyList}>
        {comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onReact={onReact}
            activeReplyCommentId={activeReplyCommentId}
            replyBody={replyBody}
            setReplyBody={setReplyBody}
            setActiveReplyCommentId={setActiveReplyCommentId}
            isReplyPending={isReplyPending}
            onUpdateComment={onUpdateComment}
            onDeleteComment={onDeleteComment}
            nested
          />
        ))}
      </View>
    ) : null}
    </View>
  );
};

export const PostCard = ({
  post,
  onLike,
  onComment,
  onSave,
  onShare,
  isCommenting = false,
}: PostCardProps) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [commentBody, setCommentBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingBody, setEditingBody] = useState(post.body);

  const invalidatePostQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
      queryClient.invalidateQueries({ queryKey: ["explore-posts"] }),
      queryClient.invalidateQueries({ queryKey: ["explore-hub"] }),
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] }),
      queryClient.invalidateQueries({ queryKey: ["public-profile-posts"] }),
      queryClient.invalidateQueries({ queryKey: ["my-profile-posts"] }),
      queryClient.invalidateQueries({ queryKey: ["page-posts"] }),
      queryClient.invalidateQueries({ queryKey: ["group-posts"] }),
    ]);
  };

  const commentMutation = useMutation({
    mutationFn: async (body: string) => {
      if (onComment) {
        return onComment(body);
      }

      return postService.commentOnPost(post.id, body);
    },
    onSuccess: async () => {
      setCommentBody("");
      await invalidatePostQueries();
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      postService.replyToComment(post.id, commentId, body),
    onSuccess: async () => {
      setReplyBody("");
      setActiveReplyCommentId(null);
      await invalidatePostQueries();
    },
  });

  const commentReactionMutation = useMutation({
    mutationFn: ({
      commentId,
      payload,
    }: {
      commentId: string;
      payload: { type: "LIKE" | "DISLIKE" | "EMOJI"; emoji?: string };
    }) => postService.reactToComment(commentId, payload),
    onSuccess: async () => {
      await invalidatePostQueries();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (onLike) {
        onLike();
        return;
      }

      await postService.likePost(post.id);
    },
    onSuccess: invalidatePostQueries,
  });
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (onSave) {
        onSave();
        return;
      }

      await postService.toggleSavedPost(post.id);
    },
    onSuccess: invalidatePostQueries,
  });
  const shareMutation = useMutation({
    mutationFn: async () => {
      if (onShare) {
        onShare();
        return;
      }

      await postService.sharePost(post.id);
    },
    onSuccess: invalidatePostQueries,
  });
  const updatePostMutation = useMutation({
    mutationFn: () =>
      postService.updatePost(post.id, {
        body: editingBody.trim(),
        mediaUrl: post.mediaUrl ?? null,
        mediaType: post.mediaType === "VIDEO" ? "VIDEO" : post.mediaType === "IMAGE" ? "IMAGE" : null,
        visibility: post.visibility,
      }),
    onSuccess: async () => {
      setIsEditingPost(false);
      await invalidatePostQueries();
    },
  });
  const deletePostMutation = useMutation({
    mutationFn: () => postService.deletePost(post.id),
    onSuccess: invalidatePostQueries,
  });
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      postService.updateComment(commentId, body),
    onSuccess: invalidatePostQueries,
  });
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => postService.deleteComment(commentId),
    onSuccess: invalidatePostQueries,
  });

  const handleComment = async () => {
    const trimmedComment = commentBody.trim();

    if (!trimmedComment || commentMutation.isPending || isCommenting) {
      return;
    }

    await commentMutation.mutateAsync(trimmedComment);
  };

  const handleReply = async (commentId: string) => {
    const trimmedReply = replyBody.trim();

    if (!trimmedReply || replyMutation.isPending) {
      return;
    }

    await replyMutation.mutateAsync({ commentId, body: trimmedReply });
  };

  const handleUpdateComment = async (commentId: string, body: string) => {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    await updateCommentMutation.mutateAsync({ commentId, body: trimmedBody });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ProfileIdentity
          firstName={post.author.firstName ?? post.author.username}
          username={post.author.username}
        />
        <View style={styles.headerActions}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeLabel}>
              {post.kind === "QUICK"
                ? "Quick post"
                : post.sharedPost
                  ? "Shared post"
                  : post.page
                    ? "Page post"
                    : post.group
                      ? "Group post"
                      : "Network post"}
            </Text>
          </View>
          <Pressable onPress={() => router.push(`/profile/${post.author.username}`)}>
            <Text style={styles.viewProfile}>View Profile</Text>
          </Pressable>
          {post.canEdit && currentUser?.id === post.author.id ? (
            <View style={styles.ownerActions}>
              <Pressable onPress={() => setIsEditingPost((current) => !current)}>
                <Text style={styles.viewProfile}>{isEditingPost ? "Cancel" : "Edit"}</Text>
              </Pressable>
              <Pressable onPress={() => deletePostMutation.mutate()}>
                <Text style={styles.dangerText}>{deletePostMutation.isPending ? "Deleting..." : "Delete"}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {isEditingPost ? (
        <View style={styles.editorCard}>
          <TextInput
            value={editingBody}
            onChangeText={setEditingBody}
            multiline
            placeholder="Update your post"
            placeholderTextColor={colors.textMuted}
            style={styles.editorInput}
          />
          <Pressable
            style={styles.saveEditButton}
            onPress={() => updatePostMutation.mutate()}
            disabled={updatePostMutation.isPending || !editingBody.trim()}
          >
            <Text style={styles.saveEditLabel}>{updatePostMutation.isPending ? "Saving..." : "Save changes"}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.body}>{post.body}</Text>
      )}
      {post.mediaUrl && (post.mediaType === "IMAGE" || post.mediaType === "VIDEO") ? (
        <MediaAttachmentPreview
          autoPlay={post.mediaType === "VIDEO"}
          height={280}
          kind={post.mediaType}
          uri={post.mediaUrl}
        />
      ) : null}
      {post.page ? (
        <Pressable onPress={() => router.push(`/page/${post.page?.slug}` as never)}>
          <Text style={styles.contextLink}>From page: {post.page.name}</Text>
        </Pressable>
      ) : null}
      {post.group ? (
        <Pressable onPress={() => router.push(`/group/${post.group?.slug}` as never)}>
          <Text style={styles.contextLink}>In group: {post.group.name}</Text>
        </Pressable>
      ) : null}
      {post.discussionLabel ? <Text style={styles.discussionLabel}>{post.discussionLabel}</Text> : null}
      {post.scoreReason ? <Text style={styles.scoreReason}>{post.scoreReason}</Text> : null}

      <View style={styles.signalRow}>
        <Text style={styles.signalText}>{post._count.likes} reactions</Text>
        <Text style={styles.signalDot}>{"\u2022"}</Text>
        <Text style={styles.signalText}>{post._count.comments} replies</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => likeMutation.mutate()} style={styles.actionButton}>
          <Ionicons name="heart-outline" color={colors.primaryDark} size={16} />
          <Text style={styles.action}>React</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="chatbox-ellipses-outline" color={colors.primaryDark} size={16} />
          <Text style={styles.action}>Reply</Text>
        </Pressable>
        <Pressable onPress={() => saveMutation.mutate()} style={styles.actionButton}>
          <Ionicons
            name={post.isSaved ? "bookmark" : "bookmark-outline"}
            color={colors.primaryDark}
            size={16}
          />
          <Text style={styles.action}>{post.isSaved ? "Saved" : "Save"}</Text>
        </Pressable>
        <Pressable onPress={() => shareMutation.mutate()} style={styles.actionButton}>
          <Ionicons name="repeat-outline" color={colors.primaryDark} size={16} />
          <Text style={styles.action}>Share</Text>
        </Pressable>
        {post.shareSlug ? (
          <Pressable onPress={() => router.push(`/post/${post.shareSlug}` as never)} style={styles.actionButton}>
            <Ionicons name="link-outline" color={colors.primaryDark} size={16} />
            <Text style={styles.action}>Open</Text>
          </Pressable>
        ) : null}
      </View>

      {post.sharedPost ? (
        <Pressable
          style={styles.sharedCard}
          onPress={() => router.push(`/profile/${post.sharedPost?.author.username}`)}
        >
          <Text style={styles.sharedLabel}>Shared from @{post.sharedPost.author.username}</Text>
          <Text style={styles.sharedBody}>{post.sharedPost.body}</Text>
        </Pressable>
      ) : null}

      <View style={styles.commentComposer}>
        <TextInput
          value={commentBody}
          onChangeText={setCommentBody}
          placeholder="Add to the conversation"
          placeholderTextColor={colors.textMuted}
          style={styles.commentInput}
        />
        <Pressable
          onPress={() => void handleComment()}
          disabled={commentMutation.isPending || isCommenting}
          style={styles.commentCta}
        >
          <Text style={styles.commentAction}>
            {commentMutation.isPending || isCommenting ? "Posting..." : "Post"}
          </Text>
        </Pressable>
      </View>

      {post.comments?.length ? (
        <View style={styles.commentList}>
          {post.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onReact={(commentId, payload) =>
                commentReactionMutation.mutate({ commentId, payload })
              }
              activeReplyCommentId={activeReplyCommentId}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              setActiveReplyCommentId={setActiveReplyCommentId}
              isReplyPending={replyMutation.isPending}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
  },
  identityMeta: {
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  username: {
    color: colors.textSoft,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  ownerActions: {
    alignItems: "flex-end",
    gap: spacing.xxs,
  },
  typeBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  typeBadgeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  viewProfile: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  dangerText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
  },
  signalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  contextLink: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  discussionLabel: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scoreReason: {
    color: colors.textMuted,
    fontSize: 12,
  },
  signalText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  signalDot: {
    color: colors.textSoft,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  action: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 13,
  },
  sharedCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sharedLabel: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  sharedBody: {
    color: colors.text,
    lineHeight: 20,
  },
  editorCard: {
    gap: spacing.sm,
  },
  editorInput: {
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  saveEditButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  saveEditLabel: {
    color: colors.surface,
    fontWeight: "800",
  },
  commentComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  commentCta: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentAction: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  commentList: {
    gap: spacing.sm,
  },
  commentCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  replyCard: {
    marginLeft: spacing.lg,
    backgroundColor: colors.surface,
  },
  commentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  commentHeaderActions: {
    alignItems: "flex-end",
    gap: spacing.xxs,
  },
  commentBody: {
    color: colors.text,
    lineHeight: 20,
  },
  commentReactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  commentReactionRowCompact: {
    gap: spacing.xxs,
  },
  reactionChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  reactionChipActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.backgroundStrong,
  },
  reactionChipLabel: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  emojiText: {
    fontSize: 14,
  },
  replyButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
  },
  replyButtonLabel: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  replyComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  replyInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  replySubmit: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  replySubmitLabel: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  replyList: {
    gap: spacing.xs,
  },
});
