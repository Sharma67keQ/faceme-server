import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { communityService } from "@/services/communities";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

export default function CommunitiesScreen() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: communities = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["communities"],
    queryFn: communityService.listCommunities,
  });
  const createMutation = useMutation({
    mutationFn: () => communityService.createCommunity({ name, slug, description }),
    onSuccess: async (community) => {
      await queryClient.invalidateQueries({ queryKey: ["communities"] });
      setErrorMessage(null);
      setName("");
      setSlug("");
      setDescription("");
      if (community.conversationId) {
        router.push(`/chat/${community.conversationId}`);
      }
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof AxiosError && typeof error.response?.data === "object" && error.response?.data && "message" in error.response.data && typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Could not create the community. Try a different name or slug.",
      );
    },
  });
  const joinMutation = useMutation({
    mutationFn: (communityId: string) => communityService.joinCommunity(communityId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["communities"] });
      setErrorMessage(null);
      if (result.conversationId) {
        router.push(`/chat/${result.conversationId}`);
      }
    },
    onError: () => {
      setErrorMessage("Could not open the community chat. Try again.");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (communityId: string) => communityService.deleteCommunity(communityId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["communities"] });
      setErrorMessage(null);
    },
    onError: () => {
      setErrorMessage("Could not delete the community. Try again.");
    },
  });
  const handleCommunityPress = (community: (typeof communities)[number]) => {
    if (community.isMember && community.conversationId) {
      router.push(`/chat/${community.conversationId}`);
      return;
    }

    joinMutation.mutate(community.id);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Communities</Text>
      <View style={styles.form}>
        <Input label="Name" value={name} onChangeText={setName} placeholder="Faceme Creators" />
        <Input label="Slug" value={slug} onChangeText={setSlug} placeholder="faceme-creators" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What is this community about?"
        />
        <Button
          label={createMutation.isPending ? "Creating..." : "Create community"}
          onPress={() => createMutation.mutate()}
          disabled={createMutation.isPending || name.trim().length < 2 || slug.trim().length < 2}
        />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {isLoading ? <Text style={styles.feedback}>Loading communities...</Text> : null}
        {isError ? (
          <Text style={styles.feedback} onPress={() => void refetch()}>
            Could not load communities. Tap to retry.
          </Text>
        ) : null}
        {communities.map((community) => (
          <View key={community.id} style={styles.card}>
            <Text style={styles.name}>{community.name}</Text>
            <Text style={styles.slug}>/{community.slug}</Text>
            {community.description ? <Text style={styles.description}>{community.description}</Text> : null}
            <Text style={styles.meta}>
              {community.memberCount ?? 0} members · Owner: {community.owner.firstName ?? community.owner.username}
            </Text>
            <Pressable onPress={() => handleCommunityPress(community)}>
              <Text style={styles.action}>{community.isMember ? "Open chat" : "Join community"}</Text>
            </Pressable>
            {community.owner.id === currentUserId ? (
              <Pressable onPress={() => deleteMutation.mutate(community.id)}>
                <Text style={styles.dangerAction}>
                  {deleteMutation.isPending ? "Deleting..." : "Delete community"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {!isLoading && !isError && !communities.length ? (
          <Text style={styles.feedback}>No communities yet. Create the first one.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  form: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.md,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  slug: {
    color: colors.primary,
    fontWeight: "700",
  },
  description: {
    color: colors.textMuted,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  action: {
    color: colors.primary,
    fontWeight: "700",
  },
  dangerAction: {
    color: "#B42318",
    fontWeight: "700",
  },
  feedback: {
    color: colors.textMuted,
  },
  error: {
    color: "#B42318",
    fontSize: 14,
  },
});
