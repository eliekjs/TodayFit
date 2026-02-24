import React from "react";
import { View, Text, StyleSheet, Switch, type ViewStyle } from "react-native";
import { useTheme } from "../lib/theme";

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: ViewStyle;
};

export function ToggleRow({
  label,
  value,
  onValueChange,
  style,
}: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { borderColor: theme.border },
        style,
      ]}
    >
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.secondarySoft,
          true: theme.primarySoft,
        }}
        thumbColor={value ? theme.primary : "#f4f3f4"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
