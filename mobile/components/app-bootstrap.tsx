import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/services/i18n";
import { colors, spacing } from "@/utils/theme";

export const AppBootstrap = () => {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primaryDark} size="large" />
      <Text style={styles.title}>{t("appBootstrap.title")}</Text>
      <Text style={styles.body}>{t("appBootstrap.body")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  body: {
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
});
