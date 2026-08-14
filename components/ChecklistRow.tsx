import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

type Props = {
  label: string;
  done: boolean;
};

/** Ethos-style required/optional checklist row. */
export function ChecklistRow({ label, done }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons
        name={done ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={done ? theme.primary : theme.textMuted}
      />
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
