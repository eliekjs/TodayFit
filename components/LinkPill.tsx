import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  /** When false, the pill hugs its content instead of stretching. */
  fill?: boolean;
  style?: ViewStyle;
};

/** Nested Ethos action row: outline icon, label, and a trailing arrow. */
export function LinkPill({ label, onPress, icon, fill = true, style }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        fill ? styles.rowFill : styles.rowHug,
        {
          borderColor: theme.border,
          backgroundColor: theme.cardOpaque,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={theme.text} />
      ) : null}
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.spacer} />
      <Ionicons name="arrow-forward" size={14} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowFill: {
    alignSelf: "stretch",
  },
  rowHug: {
    alignSelf: "flex-start",
  },
  spacer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
});
