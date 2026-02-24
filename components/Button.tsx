import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  type PressableProps,
} from "react-native";
import { useTheme } from "../lib/theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  variant = "primary",
  style,
  ...rest
}: Props) {
  const theme = useTheme();

  const backgroundByVariant: Record<ButtonVariant, string> = {
    primary: theme.primary,
    secondary: theme.secondarySoft,
    ghost: "transparent",
  };

  const textColorByVariant: Record<ButtonVariant, string> = {
    primary: "#FFFFFF",
    secondary: theme.text,
    ghost: theme.text,
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: backgroundByVariant[variant],
          opacity: pressed ? 0.85 : 1,
          borderColor: variant === "ghost" ? theme.border : "transparent",
        },
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          {
            color: textColorByVariant[variant],
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
