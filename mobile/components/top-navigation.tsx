import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/services/i18n";
import { colors, radius, spacing } from "@/utils/theme";

const items = [
  { label: "Feed", icon: "home-outline", activeIcon: "home", href: "/(tabs)" },
  { label: "Chats", icon: "chatbubble-ellipses-outline", activeIcon: "chatbubble-ellipses", href: "/(tabs)/chats" },
  { label: "Studio", icon: "add-circle-outline", activeIcon: "add-circle", href: "/(tabs)/create" },
  { label: "Alerts", icon: "notifications-outline", activeIcon: "notifications", href: "/(tabs)/notifications" },
  { label: "Profile", icon: "person-outline", activeIcon: "person", href: "/(tabs)/profile" },
] as const;

const isActivePath = (pathname: string, href: string) =>
  href === "/(tabs)" ? pathname === "/(tabs)" || pathname === "/" : pathname.startsWith(href.replace("/(tabs)", ""));

export const TopNavigation = () => {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{t("common.appName")}</Text>
          <Text style={styles.subhead}>{t("nav.subhead")}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Pressable
              key={item.href}
              style={[styles.navItem, active ? styles.navItemActive : null]}
              onPress={() => router.push(item.href as never)}
            >
              <Ionicons
                name={(active ? item.activeIcon : item.icon) as never}
                color={active ? colors.surface : colors.primaryDark}
                size={18}
              />
              <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
                {item.label === "Feed"
                  ? t("common.feed")
                  : item.label === "Chats"
                    ? t("common.chats")
                    : item.label === "Studio"
                      ? t("common.studio")
                      : item.label === "Alerts"
                        ? t("common.alerts")
                        : t("common.profile")}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surfaceRaised,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  subhead: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  navRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  navItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  navItemActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  navLabel: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 12,
  },
  navLabelActive: {
    color: colors.surface,
  },
});
