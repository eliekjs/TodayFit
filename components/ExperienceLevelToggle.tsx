import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useTheme } from "../lib/theme";
import { Chip } from "./Chip";
import type { WorkoutTierPreference } from "../lib/types";

export type ExperienceLevelChange = {
  workoutTier: WorkoutTierPreference;
  includeCreativeVariations: boolean;
};

type Props = {
  workoutTier: WorkoutTierPreference;
  includeCreativeVariations: boolean;
  onChange: (patch: ExperienceLevelChange) => void;
  title?: string;
  subtitle?: string;
  marginTop?: number;
};

/**
 * Single-choice control: Beginner / Intermediate / Advanced / Creative.
 * Creative keeps tier at advanced for the generator and highlights Advanced + Creative.
 */
export function ExperienceLevelToggle({
  workoutTier,
  includeCreativeVariations,
  onChange,
  title = "Experience level",
  subtitle = "Filters exercise difficulty. Creative adds complex or unusual variations (built on advanced).",
  marginTop = 0,
}: Props) {
  const theme = useTheme();
  const tier = workoutTier ?? "intermediate";
  const creativeOn = includeCreativeVariations === true;

  return (
    <View
      style={[
        styles.wrap,
        { marginTop },
        Platform.OS !== "web" && {
          backgroundColor: theme.cardOpaque,
          borderColor: theme.borderStrong,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        },
      ]}
    >
      <Text
        style={[styles.title, { color: theme.text }, Platform.OS === "web" && styles.webLabelPassthrough]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: theme.textMuted },
          Platform.OS === "web" && styles.webLabelPassthrough,
        ]}
      >
        {subtitle}
      </Text>
      <View style={styles.chipRow}>
        <Chip
          label="Beginner"
          selected={!creativeOn && tier === "beginner"}
          onPress={() => onChange({ workoutTier: "beginner", includeCreativeVariations: false })}
        />
        <Chip
          label="Intermediate"
          selected={!creativeOn && tier === "intermediate"}
          onPress={() => onChange({ workoutTier: "intermediate", includeCreativeVariations: false })}
        />
        <Chip
          label="Advanced"
          selected={tier === "advanced" || creativeOn}
          onPress={() => onChange({ workoutTier: "advanced", includeCreativeVariations: false })}
        />
        <Chip
          label="Creative"
          selected={creativeOn}
          onPress={() => onChange({ workoutTier: "advanced", includeCreativeVariations: true })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webLabelPassthrough: {
    pointerEvents: "none",
  },
  wrap: {
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
