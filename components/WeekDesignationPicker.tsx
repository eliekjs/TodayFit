import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { formatWeekRangeLabel } from "../lib/weekProgress";
import { shiftWeekStartByWeeks } from "../lib/weekDesignation";

type Props = {
  weekStartDate: string;
  onChangeWeekStart: (nextWeekStartMonday: string) => void;
  /** Optional label above the range (e.g. "Designated for"). */
  label?: string;
  disabled?: boolean;
};

/**
 * Prev/next week control for changing which calendar week a plan is designated for.
 */
export function WeekDesignationPicker({
  weekStartDate,
  onChangeWeekStart,
  label = "Week of",
  disabled = false,
}: Props) {
  const theme = useTheme();

  const shift = (weeks: number) => {
    if (disabled) return;
    onChangeWeekStart(shiftWeekStartByWeeks(weekStartDate, weeks));
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          disabled={disabled}
          onPress={() => shift(-1)}
          style={({ pressed }) => [
            styles.chevronBtn,
            { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.range, { color: theme.text }]} numberOfLines={1}>
          {formatWeekRangeLabel(weekStartDate)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          disabled={disabled}
          onPress={() => shift(1)}
          style={({ pressed }) => [
            styles.chevronBtn,
            { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chevronBtn: {
    padding: 6,
  },
  range: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
});
