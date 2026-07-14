import React, { forwardRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import type { DailyWorkoutPreferences } from "../lib/types";
import type { DayFocusPreset } from "../lib/weekDaySessionFocus";
import { Chip } from "./Chip";
import { PrimaryButton } from "./Button";

const GOAL_OPTIONS = ["strength", "hypertrophy", "endurance", "mobility", "recovery", "power"] as const;
const BODY_OPTIONS = ["upper", "lower", "full", "pull", "push", "core"] as const;
const ENERGY_OPTIONS = ["low", "medium", "high"] as const;
const VOLUME_OPTIONS = [
  { value: "conservative", label: "Conservative" },
  { value: "standard", label: "Standard" },
  { value: "high_volume", label: "High volume" },
] as const;

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
  /** When set, show session-focus presets (sport vs goal emphasis) instead of generic goal chips. */
  dayFocusPresets?: DayFocusPreset[];
  selectedDayFocusPresetId?: string;
  /** Shown once above session-focus presets (shared sport/goal focus explanation). */
  sportGoalPriorityNote?: string | null;
  /** Increment to open the focus controls from an external card/action. */
  expandSignal?: number;
  /** When true, skip the accordion and always show focus controls (e.g. inside a modal). */
  alwaysExpanded?: boolean;
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
  dayFocusPresets,
  selectedDayFocusPresetId,
  sportGoalPriorityNote,
  expandSignal,
  alwaysExpanded = false,
}, ref) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(alwaysExpanded);

  useEffect(() => {
    if (alwaysExpanded) {
      setExpanded(true);
      return;
    }
    if (expandSignal == null) return;
    setExpanded(true);
  }, [expandSignal, alwaysExpanded]);

  const effectiveDayFocusPresetId = dailyPrefsOverride?.dayFocusPresetId ?? selectedDayFocusPresetId;

  const adjustFocusLink =
    showAdjustFocusLink && onAdjustFocusPress ? (
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
    ) : null;

  const focusControls = (
    <>
      {adjustFocusLink}
      <Text style={[styles.sectionReasoning, { color: theme.textMuted, marginBottom: 8 }]}>
        {helperText}
      </Text>
      {dayFocusPresets && dayFocusPresets.length > 0 ? (
        <View style={{ marginBottom: 12, gap: 8 }}>
          <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Session focus</Text>
          {sportGoalPriorityNote ? (
            <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>
              {sportGoalPriorityNote}
            </Text>
          ) : null}
          {dayFocusPresets.map((p) => {
            const selected = effectiveDayFocusPresetId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  onOverrideChange({
                    dayFocusPresetId: selected ? undefined : p.id,
                    goalBias: undefined,
                  })
                }
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected ? theme.primarySoft : "transparent",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>{p.label}</Text>
                {p.subtitle?.trim() ? (
                  <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{p.subtitle}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
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
                  dayFocusPresetId: undefined,
                })
              }
            />
          ))}
        </View>
      )}
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
      <View style={[styles.chipGroup, { marginBottom: 8 }]}>
        <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Volume: </Text>
        {VOLUME_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={dailyPrefsOverride?.volumePreference === opt.value}
            onPress={() =>
              onOverrideChange({
                volumePreference:
                  dailyPrefsOverride?.volumePreference === opt.value ? undefined : opt.value,
              })
            }
          />
        ))}
      </View>
    </>
  );

  return (
    <View ref={ref} style={styles.container}>
      {!showChips ? (
        adjustFocusLink
      ) : alwaysExpanded ? (
        focusControls
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
          {expanded ? focusControls : null}
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
