import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { themeFonts, useTheme } from "../lib/theme";
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
  /** Smaller type for dense lists (e.g. History). */
  dense?: boolean;
};

export function WorkoutLibraryTitle({
  date,
  focusAreas,
  primaryLabel,
  suffix,
  fallbackFocus = "General training",
  dense = false,
}: Props) {
  const theme = useTheme();
  const focusLabel = formatWorkoutFocusLabel(focusAreas, fallbackFocus);
  const headline = primaryLabel?.trim() || focusLabel;
  const showFocusSubtitle =
    Boolean(primaryLabel?.trim()) && focusLabel !== fallbackFocus;

  return (
    <View style={[styles.container, dense && styles.containerDense]}>
      <Text
        style={[styles.date, dense && styles.dateDense, { color: theme.textMuted }]}
      >
        {formatWorkoutLibraryDate(date)}
      </Text>
      <Text
        style={[
          styles.headline,
          dense && styles.headlineDense,
          { color: theme.text },
        ]}
        numberOfLines={dense ? 2 : 3}
      >
        {headline}
        {suffix ? (
          <Text
            style={[
              styles.suffix,
              dense && styles.suffixDense,
              { color: theme.textMuted },
            ]}
          >
            {" "}
            {suffix}
          </Text>
        ) : null}
      </Text>
      {showFocusSubtitle ? (
        <Text
          style={[
            styles.focusSubtitle,
            dense && styles.focusSubtitleDense,
            { color: theme.textMuted },
          ]}
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
  containerDense: {
    gap: 2,
  },
  date: {
    fontFamily: themeFonts.displayMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  dateDense: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  headline: {
    fontFamily: themeFonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  headlineDense: {
    fontSize: 15,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  suffix: {
    fontSize: 14,
    fontWeight: "500",
  },
  suffixDense: {
    fontSize: 13,
  },
  focusSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  focusSubtitleDense: {
    fontSize: 12,
    lineHeight: 16,
  },
});
