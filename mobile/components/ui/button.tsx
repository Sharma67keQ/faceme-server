import { ComponentRef, forwardRef } from "react";
import { Pressable, PressableProps, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "@/utils/theme";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: "primary" | "secondary";
};

export const Button = forwardRef<ComponentRef<typeof Pressable>, ButtonProps>(
  ({ label, variant = "primary", ...props }, ref) => (
    <Pressable
      ref={ref}
      {...props}
      style={[
        styles.button,
        variant === "secondary" ? styles.secondary : styles.primary,
        props.disabled ? styles.disabled : null,
      ]}
    >
      <Text style={[styles.label, variant === "secondary" ? styles.secondaryLabel : null]}>
        {label}
      </Text>
    </Pressable>
  ),
);

Button.displayName = "Button";

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryLabel: {
    color: colors.primaryDark,
  },
  disabled: {
    opacity: 0.6,
  },
});
