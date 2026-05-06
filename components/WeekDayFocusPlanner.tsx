import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Theme } from "../lib/theme";
import type { DayFocusPreset } from "../lib/weekDaySessionFocus";

type Props = {
  theme: Theme;
  /** One entry per selected training day (same order as generation). */
  dayLabels: string[];
  presetOptionsPerDay: DayFocusPreset[][];
  /** Selected preset id per day (parallel arrays). */
  selectedIds: string[];
  onSelect: (dayIndex: number, presetId: string) => void;
  onBack: () => void;
};

export function WeekDayFocusPlanner({
  theme,
  dayLabels,
  presetOptionsPerDay,
  selectedIds,
  onSelect,
  onBack,
}: Props) {
  return (
    <View style={styles.scroll}>
      <Text style={[styles.screenTitle, { color: theme.text }]}>Session focus by day</Text>
      <Text style={[styles.screenSub, { color: theme.textMuted }]}>
        Pick what should lead each workout. We keep your scheduled upper / lower / full split; these choices
        control how much of the session goes to sport transfer vs each training goal.
      </Text>

      {dayLabels.map((label, dayIdx) => {
        const presets = presetOptionsPerDay[dayIdx] ?? [];
        const selected = selectedIds[dayIdx];
        return (
          <View key={label} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.dayTitle, { color: theme.text }]}>{label}</Text>
            <View style={styles.options}>
              {presets.map((p) => {
                const isSel = selected === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => onSelect(dayIdx, p.id)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        borderColor: isSel ? theme.primary : theme.border,
                        backgroundColor: isSel ? theme.primarySoft : "transparent",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.radioOuter, { borderColor: isSel ? theme.primary : theme.textMuted }]}>
                      {isSel ? <View style={[styles.radioInner, { backgroundColor: theme.primary }]} /> : null}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: theme.text }]}>{p.label}</Text>
                      <Text style={[styles.optionSub, { color: theme.textMuted }]}>{p.subtitle}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <Pressable onPress={onBack} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginTop: 8 })}>
        <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: "center" }}>← Back to training days</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  screenSub: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
});
