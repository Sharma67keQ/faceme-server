import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/utils/theme";

type AppErrorStateProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const AppErrorState = ({
  title = "Something went wrong",
  message = "The app hit an unexpected error while loading this screen.",
  actionLabel = "Try again",
  onAction,
}: AppErrorStateProps) => (
  <View style={styles.container}>
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      {onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.xl,
    width: "100%",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  body: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    color: colors.surface,
    fontWeight: "800",
  },
});
