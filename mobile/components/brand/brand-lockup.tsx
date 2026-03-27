import { StyleSheet, Text, View } from "react-native";
import { brand, colors, radius, spacing } from "@/utils/theme";

type BrandLockupProps = {
  compact?: boolean;
};

export const BrandLockup = ({ compact = false }: BrandLockupProps) => (
  <View style={[styles.row, compact ? styles.rowCompact : null]}>
    <View style={[styles.mark, compact ? styles.markCompact : null]}>
      <Text style={[styles.markLabel, compact ? styles.markLabelCompact : null]}>{brand.monogram}</Text>
    </View>
    <View style={styles.copy}>
      <Text style={[styles.name, compact ? styles.nameCompact : null]}>{brand.name}</Text>
      {!compact ? <Text style={styles.tagline}>{brand.tagline}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  rowCompact: {
    gap: spacing.sm,
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.brandCanvas,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  markCompact: {
    borderRadius: radius.md,
    height: 42,
    width: 42,
  },
  markLabel: {
    color: colors.brandInk,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
  },
  markLabelCompact: {
    fontSize: 22,
    lineHeight: 24,
  },
  copy: {
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  nameCompact: {
    fontSize: 20,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
