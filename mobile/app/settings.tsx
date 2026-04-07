import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { useI18n, type AppLanguage } from "@/services/i18n";
import { colors, radius, spacing } from "@/utils/theme";

const languages: AppLanguage[] = ["SO", "EN", "AR"];

export default function SettingsScreen() {
  const { language, setLanguage, t } = useI18n();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t("settings.title")}</Text>
        <Text style={styles.subtitle}>{t("settings.languageSubtitle")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        {languages.map((value) => (
          <Pressable
            key={value}
            style={[styles.option, language === value ? styles.optionActive : null]}
            onPress={() => void setLanguage(value)}
          >
            <Text style={[styles.optionLabel, language === value ? styles.optionLabelActive : null]}>
              {value === "SO" ? t("settings.somali") : value === "EN" ? t("settings.english") : t("settings.arabic")}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 30, fontWeight: "800" },
  subtitle: { color: colors.textMuted, lineHeight: 21 },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  optionLabel: { color: colors.text, fontWeight: "700" },
  optionLabelActive: { color: colors.surface },
});
