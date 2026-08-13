/**
 * Sticky note + 3-segment control for weekly body-focus vocabulary:
 * Region (Upper/Lower) | Pattern (Push/Pull/Legs) | Muscle (Chest/Back/…).
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";
import type { WeeklyBodyFocusMode } from "../lib/types";

type Props = {
  value: WeeklyBodyFocusMode | null | undefined;
  onChange: (value: WeeklyBodyFocusMode) => void;
};

const OPTIONS: {
  id: WeeklyBodyFocusMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "region",
    label: "Region",
    hint: "Upper, lower, full, or core days.",
  },
  {
    id: "pattern",
    label: "Pattern",
    hint: "Push, pull, and legs days (PPL-style).",
  },
  {
    id: "muscle",
    label: "Muscle",
    hint: "Chest, back, shoulders, arms, legs, glutes, or core.",
  },
];

export function WeeklyBodyFocusModeNote({ value, onChange }: Props) {
  const theme = useTheme();
  const selected = value ?? "region";
  const selectedHint = OPTIONS.find((o) => o.id === selected)?.hint ?? OPTIONS[0]!.hint;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.primary,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: theme.primary }]} />
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.primary }]}>Note</Text>
        <Text style={[styles.title, { color: theme.text }]}>How should body focus work?</Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>
          Choose the vocabulary for each day’s body focus — works the same for sport and goal
          weeks. Switching modes rebuilds a balanced week template — you can still tweak any day.
        </Text>
        <View
          style={[
            styles.segmentRow,
            { borderColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          {OPTIONS.map((opt) => {
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
        <Text style={[styles.hint, { color: theme.textMuted }]}>{selectedHint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 8,
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  segmentRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    gap: 3,
    marginTop: 6,
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
    marginTop: 2,
  },
});
