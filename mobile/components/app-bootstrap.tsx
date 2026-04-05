import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/utils/theme";

export const AppBootstrap = () => (
  <View style={styles.container}>
    <ActivityIndicator color={colors.primaryDark} size="large" />
    <Text style={styles.title}>Loading Faceme</Text>
    <Text style={styles.body}>Restoring your session and preparing the app.</Text>
  </View>
);

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
