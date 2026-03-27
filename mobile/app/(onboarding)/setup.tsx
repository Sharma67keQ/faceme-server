import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { socialService } from "@/services/social";
import { userService } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";
import { useState } from "react";

export default function OnboardingSetupScreen() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");

  const { data: launch } = useQuery({
    queryKey: ["launch-summary"],
    queryFn: socialService.getLaunchSummary,
  });

  const followPageMutation = useMutation({
    mutationFn: (pageId: string) => socialService.togglePageFollow(pageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: (groupId: string) => socialService.joinGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
    },
  });

  const friendMutation = useMutation({
    mutationFn: (targetUserId: string) => socialService.sendFriendRequest(targetUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["launch-summary"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      userService.updateMe({
        bio: bio.trim() || null,
        location: location.trim() || null,
        isOnboardingComplete: true,
      }),
    onSuccess: async (nextUser) => {
      setUser({
        ...user,
        ...nextUser,
      });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      router.replace("/(tabs)");
    },
  });

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <BrandLockup compact />
        <Text style={styles.eyebrow}>Activate Faceme</Text>
        <Text style={styles.title}>Build your graph before your first session goes quiet.</Text>
        <Text style={styles.subtitle}>
          Follow people, add friends, join groups, and seed discovery so your feed starts alive.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Input label="Bio" value={bio} onChangeText={setBio} multiline placeholder="What should people know about you?" />
        <Input label="Location" value={location} onChangeText={setLocation} placeholder="Johannesburg" />
      </View>

      {launch?.onboarding?.suggestedUsers?.length ? (
        <>
          <Text style={styles.sectionTitle}>People you may know</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {launch.onboarding.suggestedUsers.map((person) => (
              <View key={person.id} style={styles.card}>
                <Avatar name={person.firstName ?? person.username} />
                <Text style={styles.cardTitle}>{person.firstName ?? person.username}</Text>
                <Text style={styles.cardMeta}>@{person.username}</Text>
                <Text style={styles.cardMeta}>{person.mutualFriendsCount ?? 0} mutual friends</Text>
                <Pressable style={styles.cardButton} onPress={() => friendMutation.mutate(person.id)}>
                  <Text style={styles.cardButtonText}>Add friend</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {launch?.onboarding?.suggestedPages?.length ? (
        <>
          <Text style={styles.sectionTitle}>Suggested pages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {launch.onboarding.suggestedPages.map((page) => (
              <View key={page.id} style={styles.cardWide}>
                <Text style={styles.cardTitle}>{page.name}</Text>
                <Text style={styles.cardMeta}>{page.followersCount} followers</Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {page.description ?? "Follow this page to seed your feed."}
                </Text>
                <Pressable style={styles.cardButton} onPress={() => followPageMutation.mutate(page.id)}>
                  <Text style={styles.cardButtonText}>Follow page</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {launch?.onboarding?.suggestedGroups?.length ? (
        <>
          <Text style={styles.sectionTitle}>Suggested groups</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {launch.onboarding.suggestedGroups.map((group) => (
              <View key={group.id} style={styles.cardWide}>
                <Text style={styles.cardTitle}>{group.name}</Text>
                <Text style={styles.cardMeta}>{group.membersCount} members</Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {group.description ?? "Join and start seeing real discussion."}
                </Text>
                <Pressable style={styles.cardButton} onPress={() => joinGroupMutation.mutate(group.id)}>
                  <Text style={styles.cardButtonText}>
                    {group.privacy === "PRIVATE" ? "Request join" : "Join group"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Invite loop</Text>
        <Text style={styles.footerBody}>
          Your invite link is created inside the product and can pull new users into the same onboarding path.
        </Text>
        <Button
          label={completeMutation.isPending ? "Finishing..." : "Finish onboarding"}
          onPress={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
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
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  formCard: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    width: 160,
  },
  cardWide: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: 240,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  cardMeta: {
    color: colors.textSoft,
    fontSize: 12,
  },
  cardBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  cardButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  cardButtonText: {
    color: colors.surface,
    fontWeight: "800",
  },
  footerCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: 80,
  },
  footerTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
  },
  footerBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
