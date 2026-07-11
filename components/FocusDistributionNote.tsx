/**
 * Sticky note + two-option toggle for focus distribution.
 * Daily: spread vs resolve (shown when multi-region tension exists).
 * Weekly: blend vs dedicate_days (mandatory when goals are selected).
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";
import type { GoalDistributionStyle, SessionFocusDistributionStyle } from "../lib/types";

type DailyProps = {
  variant: "daily";
  value: SessionFocusDistributionStyle | null | undefined;
  onChange: (value: SessionFocusDistributionStyle) => void;
  /** When resolve is selected but conflicts remain. */
  needsResolution?: boolean;
};

type WeeklyProps = {
  variant: "weekly";
  value: GoalDistributionStyle | null | undefined;
  onChange: (value: GoalDistributionStyle) => void;
  required?: boolean;
};

type Props = DailyProps | WeeklyProps;

const ACCENT = "#f59e0b";

export function FocusDistributionNote(props: Props) {
  const theme = useTheme();
  const isDaily = props.variant === "daily";
  const selected = props.value ?? null;
  const needsPick = selected == null;
  const needsResolution = isDaily && props.needsResolution === true;

  const title = isDaily ? "Mixed focus areas" : "How should goals show up?";
  const message = isDaily
    ? "Your picks cover more than one body region. Spread them through today’s workout, or focus the session and resolve the conflicts below."
    : "Choose whether workouts mix your goals, or each day is exclusively what you select below — replacing the goals from earlier pages for that day.";

  const options: { id: string; label: string; hint: string }[] = isDaily
    ? [
        {
          id: "spread",
          label: "Spread across session",
          hint: "Keep all goals and body parts in today’s mix",
        },
        {
          id: "resolve",
          label: "Focus & resolve",
          hint: "Align body focus and sub-goals for a tighter session",
        },
      ]
    : [
        {
          id: "blend",
          label: "Mix goals in each workout",
          hint: "Goals can appear together; balanced day picks keep your global mix",
        },
        {
          id: "dedicate_days",
          label: "Focus each day",
          hint: "Each day’s pick below fully replaces earlier goals for that day",
        },
      ];

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
            {needsPick ? (isDaily ? "Choose how to handle this" : "Required") : "Note"}
          </Text>
          {!isDaily && props.required !== false ? (
            <Text style={[styles.requiredBadge, { color: ACCENT }]}>Required</Text>
          ) : null}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
        {needsResolution ? (
          <Text style={[styles.resolveHint, { color: ACCENT }]}>
            Pick a resolution below, or switch to spread across session.
          </Text>
        ) : null}
        <View style={styles.options}>
          {options.map((opt) => {
            const isSel = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  if (isDaily) {
                    props.onChange(opt.id as SessionFocusDistributionStyle);
                  } else {
                    props.onChange(opt.id as GoalDistributionStyle);
                  }
                }}
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
  requiredBadge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
