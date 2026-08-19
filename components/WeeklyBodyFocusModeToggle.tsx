/**
 * Compact Region | Pattern | Muscle segment control shared by week planning
 * and per-day change-focus / regenerate UI.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";
import type { WeeklyBodyFocusMode } from "../lib/types";

export const WEEKLY_BODY_FOCUS_MODE_OPTIONS: {
  id: WeeklyBodyFocusMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "region",
    label: "Region",
    hint: "Upper, lower, and full days.",
  },
  {
    id: "pattern",
    label: "Pattern",
    hint: "Push, pull, and legs. Extra days rotate the split — pick Full body if you want it.",
  },
  {
    id: "muscle",
    label: "Muscle",
    hint: "Chest, back, shoulders, arms, legs, glutes. Extra days rotate the split — pick Full body if you want it.",
  },
];

type Props = {
  value: WeeklyBodyFocusMode | null | undefined;
  onChange: (value: WeeklyBodyFocusMode) => void;
  /** When true, show the hint line under the segments. Default true. */
  showHint?: boolean;
};

export function WeeklyBodyFocusModeToggle({ value, onChange, showHint = true }: Props) {
  const theme = useTheme();
  const selected = value ?? "region";
  const selectedHint =
    WEEKLY_BODY_FOCUS_MODE_OPTIONS.find((o) => o.id === selected)?.hint ??
    WEEKLY_BODY_FOCUS_MODE_OPTIONS[0]!.hint;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.segmentRow,
          { borderColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        {WEEKLY_BODY_FOCUS_MODE_OPTIONS.map((opt) => {
          const isSel = selected === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={({ pressed }) => [
                styles.segment,
                {
                  backgroundColor: isSel ? theme.primarySoft : "transparent",
                  borderColor: isSel ? theme.primary : "transparent",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={opt.label}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: isSel ? theme.primary : theme.textMuted },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showHint ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>{selectedHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  segmentRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
});
