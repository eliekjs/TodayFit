import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../lib/theme";

type Props = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Chip({ label, selected = false, disabled = false, onPress, style }: Props) {
  const theme = useTheme();

  const content = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: selected
            ? theme.chipSelectedBackground
            : "transparent",
          borderWidth: 1,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? theme.chipSelectedText : theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress == null || disabled) return content;

  return (
    <Pressable
      style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
});
