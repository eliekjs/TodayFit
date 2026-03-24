import React, { forwardRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import type { DailyWorkoutPreferences } from "../lib/types";
import { Chip } from "./Chip";
import { PrimaryButton } from "./Button";

const GOAL_OPTIONS = ["strength", "hypertrophy", "endurance", "mobility", "recovery", "power"] as const;
const BODY_OPTIONS = ["upper", "lower", "full", "pull", "push", "core"] as const;
const ENERGY_OPTIONS = ["low", "medium", "high"] as const;

export type DayFocusOverrideChipsProps = {
  dailyPrefsOverride: DailyWorkoutPreferences | null;
  onOverrideChange: (update: Partial<DailyWorkoutPreferences>) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  /** When true, show "Adjust focus areas and weighting" link. */
  showAdjustFocusLink?: boolean;
  onAdjustFocusPress?: () => void;
  /** When false, only the Regenerate button is shown (e.g. when day has no generated session yet). Default true. */
  showChips?: boolean;
  /** Optional custom helper text. Default: "Then tap Regenerate to rebuild only this session." */
  helperText?: string;
  /** Optional custom regenerate button label. Default: "Regenerate this day" */
  regenerateLabel?: string;
};

export const DayFocusOverrideChips = forwardRef<View, DayFocusOverrideChipsProps>(function DayFocusOverrideChips({
  dailyPrefsOverride,
  onOverrideChange,
  onRegenerate,
  isRegenerating,
  showAdjustFocusLink = false,
  onAdjustFocusPress,
  showChips = true,
  helperText = "Then tap Regenerate to rebuild only this session.",
  regenerateLabel = "Regenerate this day",
}, ref) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View ref={ref} style={styles.container}>
      {!showChips ? (
        <>
          {showAdjustFocusLink && onAdjustFocusPress && (
            <Pressable
              onPress={onAdjustFocusPress}
              style={({ pressed }) => ({
                marginBottom: 12,
                paddingVertical: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, color: theme.primary, fontWeight: "500" }}>
                Adjust focus areas and weighting
              </Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 8,
              opacity: pressed ? 0.85 : 1,
            })}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>
              Change focus for this day
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textMuted}
            />
          </Pressable>
          {expanded && (
            <>
              {showAdjustFocusLink && onAdjustFocusPress && (
                <Pressable
                  onPress={onAdjustFocusPress}
                  style={({ pressed }) => ({
                    marginBottom: 12,
                    paddingVertical: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, color: theme.primary, fontWeight: "500" }}>
                    Adjust focus areas and weighting
                  </Text>
                </Pressable>
              )}
              <Text style={[styles.sectionReasoning, { color: theme.textMuted, marginBottom: 8 }]}>
                {helperText}
              </Text>
              <View style={[styles.chipGroup, { marginBottom: 8 }]}>
                <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Goal: </Text>
                {GOAL_OPTIONS.map((g) => (
                  <Chip
                    key={g}
                    label={g.charAt(0).toUpperCase() + g.slice(1)}
                    selected={dailyPrefsOverride?.goalBias === g}
                    onPress={() =>
                      onOverrideChange({
                        goalBias: dailyPrefsOverride?.goalBias === g ? undefined : g,
                      })
                    }
                  />
                ))}
              </View>
              <View style={[styles.chipGroup, { marginBottom: 8 }]}>
                <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Body: </Text>
                {BODY_OPTIONS.map((b) => (
                  <Chip
                    key={b}
                    label={b.charAt(0).toUpperCase() + b.slice(1)}
                    selected={dailyPrefsOverride?.bodyRegionBias === b}
                    onPress={() =>
                      onOverrideChange({
                        bodyRegionBias: dailyPrefsOverride?.bodyRegionBias === b ? undefined : b,
                      })
                    }
                  />
                ))}
              </View>
              <View style={[styles.chipGroup, { marginBottom: 8 }]}>
                <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Energy: </Text>
                {ENERGY_OPTIONS.map((e) => (
                  <Chip
                    key={e}
                    label={e.charAt(0).toUpperCase() + e.slice(1)}
                    selected={dailyPrefsOverride?.energyLevel === e}
                    onPress={() =>
                      onOverrideChange({
                        energyLevel: dailyPrefsOverride?.energyLevel === e ? undefined : e,
                      })
                    }
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
      <PrimaryButton
        label={isRegenerating ? "Regenerating…" : regenerateLabel}
        variant="secondary"
        onPress={onRegenerate}
        disabled={isRegenerating}
        style={{ marginTop: showChips ? 4 : 8 }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  sectionReasoning: {
    fontSize: 13,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
});
