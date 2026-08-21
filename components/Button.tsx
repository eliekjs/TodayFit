import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  type PressableProps,
} from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import { useBusyLabel } from "../lib/useAnimatedEllipsis";

type ButtonVariant = "primary" | "secondary" | "ghost";

const ELLIPSIS_TAIL = /(?:\u2026|\.{2,3})\s*$/;

type Props = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  /** Smaller tap target + label (e.g. dense footers); default stays full-size app-wide. */
  compact?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  variant = "primary",
  compact = false,
  style,
  disabled,
  ...rest
}: Props) {
  const theme = useTheme();
  // Busy copy like "Saving…" / "Generating…" gets cycling dots while shown.
  const displayLabel = useBusyLabel(label, ELLIPSIS_TAIL.test(label));

  const backgroundByVariant: Record<ButtonVariant, string> = {
    primary: theme.primary,
    secondary: theme.cardOpaque,
    ghost: "transparent",
  };

  const textColorByVariant: Record<ButtonVariant, string> = {
    primary: theme.onPrimary,
    secondary: theme.text,
    ghost: theme.text,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.baseCompact,
        {
          backgroundColor: backgroundByVariant[variant],
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          borderColor: variant === "primary" ? "transparent" : theme.border,
        },
        style,
      ]}
      disabled={disabled}
      {...rest}
    >
      <Text
        style={[
          compact ? styles.labelCompact : styles.label,
          {
            color: textColorByVariant[variant],
          },
        ]}
      >
        {displayLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: themeRadius.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  baseCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  labelCompact: {
    fontSize: 14,
    fontWeight: "600",
  },
});
