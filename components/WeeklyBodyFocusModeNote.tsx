/**
 * Sticky note + 3-segment control for weekly body-focus vocabulary:
 * Region (Upper/Lower) | Pattern (Push/Pull/Legs, optional Quads/Posterior) | Muscle (Chest/Back/…).
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import type { WeeklyBodyFocusMode } from "../lib/types";
import { WeeklyBodyFocusModeToggle } from "./WeeklyBodyFocusModeToggle";

type Props = {
  value: WeeklyBodyFocusMode | null | undefined;
  onChange: (value: WeeklyBodyFocusMode) => void;
};

export function WeeklyBodyFocusModeNote({ value, onChange }: Props) {
  const theme = useTheme();

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
          Choose the vocabulary for each day’s body focus. We’ll recommend one based on the
          sub-goals you already picked — you can still switch and tweak any day.
        </Text>
        <View style={styles.toggleWrap}>
          <WeeklyBodyFocusModeToggle value={value} onChange={onChange} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: themeRadius.card,
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
  toggleWrap: {
    marginTop: 6,
  },
});
