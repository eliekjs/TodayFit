/**
 * Sticky note + two-option toggle for daily focus distribution
 * (spread vs resolve when multi-region tension exists).
 * Blend vs dedicate for weeks is a per-day focus preset, not this control.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import type { SessionFocusDistributionStyle } from "../lib/types";

type Props = {
  variant: "daily";
  value: SessionFocusDistributionStyle | null | undefined;
  onChange: (value: SessionFocusDistributionStyle) => void;
  /** When resolve is selected but conflicts remain. */
  needsResolution?: boolean;
};

const ACCENT = "#f59e0b";

const OPTIONS: { id: SessionFocusDistributionStyle; label: string; hint: string }[] = [
  {
    id: "spread",
    label: "Mix them",
    hint: "Keep all goals and body parts in today’s mix",
  },
  {
    id: "resolve",
    label: "Pick one",
    hint: "One region, matching sub-goals",
  },
];

export function FocusDistributionNote(props: Props) {
  const theme = useTheme();
  const selected = props.value ?? null;
  const needsPick = selected == null;
  const needsResolution = props.needsResolution === true;

  const borderColor = needsPick || needsResolution ? ACCENT : theme.primary;
  const labelColor = needsPick || needsResolution ? ACCENT : theme.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: borderColor }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.label, { color: labelColor }]}>
            {needsPick ? "Choose how to handle this" : "Note"}
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>You picked more than one region</Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>
          Mix them today, or pick one.
        </Text>
        {needsResolution ? (
          <Text style={[styles.resolveHint, { color: ACCENT }]}>
            Pick a resolution below, or switch to mix them.
          </Text>
        ) : null}
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSel = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => props.onChange(opt.id)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: isSel ? theme.primary : theme.border,
                    backgroundColor: isSel ? theme.primarySoft : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isSel ? theme.primarySolid : theme.textMuted },
                  ]}
                >
                  {isSel ? (
                    <View style={[styles.radioInner, { backgroundColor: theme.primarySolid }]} />
                  ) : null}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: theme.text }]}>{opt.label}</Text>
                  <Text style={[styles.optionHint, { color: theme.textMuted }]}>{opt.hint}</Text>
                </View>
              </Pressable>
            );
          })}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  resolveHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  options: {
    gap: 8,
    marginTop: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionHint: {
    fontSize: 12,
    lineHeight: 16,
  },
});
