import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../lib/theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Chip({ label, selected = false, onPress, style }: Props) {
  const theme = useTheme();

  const content = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: selected
            ? theme.chipSelectedBackground
            : theme.chipBackground,
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

  if (onPress == null) return content;

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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
});
