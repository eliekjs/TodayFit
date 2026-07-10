import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../lib/theme";
import {
  formatWorkoutLibraryDate,
  formatWorkoutFocusLabel,
} from "../lib/workoutLibraryLabel";

type Props = {
  date: string | Date;
  focusAreas: string[];
  /** User-defined name overrides auto-generated focus label. */
  primaryLabel?: string;
  /** Appended when multiple workouts share the same date + focus. */
  suffix?: string;
  fallbackFocus?: string;
};

export function WorkoutLibraryTitle({
  date,
  focusAreas,
  primaryLabel,
  suffix,
  fallbackFocus = "General training",
}: Props) {
  const theme = useTheme();
  const focusLabel = formatWorkoutFocusLabel(focusAreas, fallbackFocus);
  const headline = primaryLabel?.trim() || focusLabel;
  const showFocusSubtitle =
    Boolean(primaryLabel?.trim()) && focusLabel !== fallbackFocus;

  return (
    <View style={styles.container}>
      <Text style={[styles.date, { color: theme.textMuted }]}>
        {formatWorkoutLibraryDate(date)}
      </Text>
      <Text style={[styles.headline, { color: theme.text }]} numberOfLines={3}>
        {headline}
        {suffix ? (
          <Text style={[styles.suffix, { color: theme.textMuted }]}>
            {" "}
            {suffix}
          </Text>
        ) : null}
      </Text>
      {showFocusSubtitle ? (
        <Text
          style={[styles.focusSubtitle, { color: theme.textMuted }]}
          numberOfLines={2}
        >
          {focusLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  date: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  suffix: {
    fontSize: 14,
    fontWeight: "500",
  },
  focusSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
