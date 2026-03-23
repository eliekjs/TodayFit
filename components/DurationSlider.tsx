import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { DURATIONS } from "../lib/preferencesConstants";
import type { Theme } from "../lib/theme";

type Props = {
  /** Selected length in minutes; use one of DURATIONS, or null to show generator default (45). */
  valueMinutes: number | null;
  onValueChange: (minutes: (typeof DURATIONS)[number]) => void;
  theme: Theme;
};

const DEFAULT_MINUTES = 45;

function sliderIndexForMinutes(minutes: number | null): number {
  if (minutes == null) {
    const i = (DURATIONS as readonly number[]).indexOf(DEFAULT_MINUTES);
    return i >= 0 ? i : Math.floor(DURATIONS.length / 2);
  }
  const exact = (DURATIONS as readonly number[]).indexOf(minutes);
  if (exact >= 0) return exact;
  let best = 0;
  let bestDist = Infinity;
  DURATIONS.forEach((d, idx) => {
    const dist = Math.abs(d - minutes);
    if (dist < bestDist) {
      bestDist = dist;
      best = idx;
    }
  });
  return best;
}

/**
 * Discrete horizontal slider over {@link DURATIONS} (same options as the previous chip row).
 */
export function DurationSlider({ valueMinutes, onValueChange, theme }: Props) {
  const index = sliderIndexForMinutes(valueMinutes);
  const selected = DURATIONS[index];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.valueLabel, { color: theme.text }]}>{selected} min</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={DURATIONS.length - 1}
        step={1}
        value={index}
        onValueChange={(v) => {
          const i = Math.round(v);
          const clamped = Math.max(0, Math.min(DURATIONS.length - 1, i));
          onValueChange(DURATIONS[clamped]);
        }}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
      />
      <View style={styles.ticks}>
        {DURATIONS.map((m) => (
          <Text key={m} style={[styles.tickLabel, { color: theme.textMuted }]}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  valueLabel: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  slider: {
    width: "100%",
    height: 44,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: -4,
  },
  tickLabel: {
    fontSize: 11,
  },
});
