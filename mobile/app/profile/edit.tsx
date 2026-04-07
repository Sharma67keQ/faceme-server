import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { api } from "@/services/api";
import { useI18n } from "@/services/i18n";
import { useAuthStore } from "@/store/auth-store";
import { User } from "@/types/domain";
import { colors, spacing } from "@/utils/theme";

export default function EditProfileScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { t } = useI18n();
  const [firstName, setFirstName] = useState(currentUser?.firstName ?? "");
  const [lastName, setLastName] = useState(currentUser?.lastName ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [location, setLocation] = useState(currentUser?.location ?? "");
  const [website, setWebsite] = useState(currentUser?.website ?? "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(currentUser?.coverImageUrl ?? "");
  const [accountType, setAccountType] = useState(currentUser?.accountType ?? "PERSONAL");
  const [profileVisibility, setProfileVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "FRIENDS"
  >(currentUser?.profileVisibility ?? "PUBLIC");

  const handleSave = async () => {
    const { data } = await api.patch<User>("/users/me", {
      firstName,
      lastName: lastName.trim() || null,
      bio: bio.trim() || null,
      location: location.trim() || null,
      website: website.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      coverImageUrl: coverImageUrl.trim() || null,
      accountType,
      profileVisibility,
      isOnboardingComplete: true,
    });

    setUser({
      ...currentUser,
      ...data,
      email: currentUser?.email,
      _count: currentUser?._count,
    } as User);
    router.back();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>{t("auth.registerSubtitle")}</Text>
      </View>
      <Input label={t("auth.firstName")} value={firstName} onChangeText={setFirstName} />
      <Input label="Last name" value={lastName} onChangeText={setLastName} />
      <Input label="Bio" value={bio} onChangeText={setBio} multiline />
      <Input label={t("profile.location")} value={location} onChangeText={setLocation} placeholder="Johannesburg" />
      <Input label={t("profile.website")} value={website} onChangeText={setWebsite} placeholder="https://example.com" />
      <Input label="Avatar URL" value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://..." />
      <Input
        label="Cover image URL"
        value={coverImageUrl}
        onChangeText={setCoverImageUrl}
        placeholder="https://..."
      />
      <View style={styles.visibilitySection}>
        <Text style={styles.visibilityLabel}>{t("profile.privacy")}</Text>
        <View style={styles.accountRow}>
          {(["PUBLIC", "FOLLOWERS", "FRIENDS"] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.accountPill, profileVisibility === value ? styles.accountPillActive : null]}
              onPress={() => setProfileVisibility(value)}
            >
              <Text
                style={[
                  styles.accountPillLabel,
                  profileVisibility === value ? styles.accountPillLabelActive : null,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.accountRow}>
        {(["PERSONAL", "CREATOR", "BUSINESS"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.accountPill, accountType === value ? styles.accountPillActive : null]}
            onPress={() => setAccountType(value)}
          >
            <Text style={[styles.accountPillLabel, accountType === value ? styles.accountPillLabelActive : null]}>
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button label={t("common.save")} onPress={handleSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
  },
  accountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  visibilitySection: {
    gap: spacing.xs,
  },
  visibilityLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  accountPill: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  accountPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  accountPillLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  accountPillLabelActive: {
    color: colors.surface,
  },
});
