import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Theme } from "../lib/theme";
import { themeRadius } from "../lib/theme";
import type { WeeklyBodyFocusMode } from "../lib/types";
import type { DayBodyFocusChoice, DayBodyFocusChoiceId, DayFocusPreset } from "../lib/weekDaySessionFocus";
import type {
  DaySessionFocusConflict,
  DaySessionFocusResolution,
} from "../lib/daySessionFocusConflict";
import { dayHasUnresolvedSessionFocusConflict } from "../lib/daySessionFocusConflict";
import type { UncoveredSubGoalPrompt, UncoveredSubGoalResolution } from "../lib/subGoalSplitCoverage";
import { DaySessionFocusConflictBanner } from "./DaySessionFocusConflictBanner";
import { WeeklyBodyFocusModeToggle } from "./WeeklyBodyFocusModeToggle";

type Props = {
  theme: Theme;
  /** One entry per selected training day (same order as generation). */
  dayLabels: string[];
  bodyOptionsPerDay?: DayBodyFocusChoice[][];
  presetOptionsPerDay: DayFocusPreset[][];
  selectedBodyIds?: DayBodyFocusChoiceId[][];
  /** Selected preset id per day (parallel arrays). */
  selectedIds: string[];
  /** Per-day recommendation line (from first-page goals / sub-goals). */
  recommendationSummaries?: string[];
  /** Recommended focus preset id per day (shows · rec; usually preselected). */
  recommendedFocusIds?: string[];
  /** Detected body vs sub-goal conflicts per day (parallel to dayLabels). */
  conflictsPerDay?: (DaySessionFocusConflict | null)[];
  /** Resolution id applied per day, keyed by day index. */
  resolvedConflictIdsByDay?: Record<number, string>;
  /** Shown once at top — explains sport/goal day options without repeating per day/option. */
  sportGoalPriorityNote?: string | null;
  /** Per-day Region | Pattern | Muscle vocabulary (parallel to dayLabels). */
  bodyFocusModePerDay?: WeeklyBodyFocusMode[];
  onChangeDayBodyFocusMode?: (dayIndex: number, value: WeeklyBodyFocusMode) => void;
  onSelectBody?: (dayIndex: number, bodyId: DayBodyFocusChoiceId) => void;
  onSelect: (dayIndex: number, presetId: string) => void;
  onApplyDayResolution?: (dayIndex: number, resolution: DaySessionFocusResolution) => void;
  /** Week-level: selected splits don't cover a first-page sub-goal (e.g. Overhead Press). */
  uncoveredSubGoalPrompt?: UncoveredSubGoalPrompt | null;
  onApplyUncoveredResolution?: (resolution: UncoveredSubGoalResolution) => void;
  onBack: () => void;
};

export type WeekDayFocusSummaryOption = {
  label: string;
  subtitle?: string | null;
};

type WeekDayFocusSummaryCardProps = {
  theme: Theme;
  bodyFocus?: WeekDayFocusSummaryOption | null;
  priorityFocus?: WeekDayFocusSummaryOption | null;
  selected?: boolean;
  onPress?: () => void;
  actionLabel?: string;
  onActionPress?: () => void;
  statusLabel?: string | null;
  statusTone?: "primary" | "muted";
};

function SummaryFocusRow({
  theme,
  label,
  value,
  subtitle,
}: {
  theme: Theme;
  label: string;
  value: string;
  subtitle?: string | null;
}) {
  return (
    <View style={styles.summaryFocusRow}>
      <Text style={[styles.summaryFocusLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={styles.summaryFocusValueWrap}>
        <Text style={[styles.summaryFocusValue, { color: theme.text }]}>
          {value}
          {subtitle ? (
            <Text style={[styles.summaryFocusSub, { color: theme.textMuted }]}> · {subtitle}</Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

export function WeekDayFocusSummaryCard({
  theme,
  bodyFocus,
  priorityFocus,
  selected = false,
  onPress,
  actionLabel,
  onActionPress,
  statusLabel,
  statusTone = "muted",
}: WeekDayFocusSummaryCardProps) {
  const content = (
    <>
      {statusLabel ? (
        <View style={styles.summaryStatusRow}>
          <Text
            style={[
              styles.statusBadge,
              {
                color: statusTone === "primary" ? theme.primary : theme.textMuted,
                borderColor: statusTone === "primary" ? theme.primary : theme.border,
              },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.summaryFocusStack}>
        {bodyFocus ? (
          <SummaryFocusRow
            theme={theme}
            label="Body"
            value={bodyFocus.label}
            subtitle={bodyFocus.subtitle}
          />
        ) : null}

        {priorityFocus ? (
          <SummaryFocusRow
            theme={theme}
            label="Focus"
            value={priorityFocus.label}
            subtitle={priorityFocus.subtitle}
          />
        ) : null}
      </View>

      {actionLabel && onActionPress ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onActionPress();
          }}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            marginTop: 10,
            paddingVertical: 7,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.primary,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, color: theme.primary, fontWeight: "500" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          {
            borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected ? theme.primarySoft : theme.card,
          },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.primarySoft : theme.card,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

export function WeekDayFocusPlanner({
  theme,
  dayLabels,
  bodyOptionsPerDay,
  presetOptionsPerDay,
  selectedBodyIds,
  selectedIds,
  recommendationSummaries,
  recommendedFocusIds,
  conflictsPerDay,
  resolvedConflictIdsByDay,
  sportGoalPriorityNote,
  bodyFocusModePerDay,
  onChangeDayBodyFocusMode,
  onSelectBody,
  onSelect,
  onApplyDayResolution,
  uncoveredSubGoalPrompt,
  onApplyUncoveredResolution,
  onBack,
}: Props) {
  return (
    <View style={styles.scroll}>
      <Text style={[styles.screenTitle, { color: theme.text }]}>Focus for each day</Text>
      <Text style={[styles.screenSub, { color: theme.textMuted }]}>
        We recommend a different body split for each day. You can still combine
        compatible areas (like glutes + shoulders). Push and pull stay on separate days.
        Full body is a choice for that day — not a leftover when the week is longer.
      </Text>
      {sportGoalPriorityNote ? (
        <Text style={[styles.screenNote, { color: theme.textMuted }]}>
          {sportGoalPriorityNote}
        </Text>
      ) : null}

      {uncoveredSubGoalPrompt && onApplyUncoveredResolution ? (
        <DaySessionFocusConflictBanner
          theme={theme}
          conflict={uncoveredSubGoalPrompt}
          onApplyResolution={(res) => {
            const full =
              uncoveredSubGoalPrompt.resolutions.find((r) => r.id === res.id) ?? res;
            onApplyUncoveredResolution(full);
          }}
        />
      ) : null}

      {dayLabels.map((label, dayIdx) => {
        const bodyOptions = bodyOptionsPerDay?.[dayIdx] ?? [];
        const selectedBodies = selectedBodyIds?.[dayIdx] ?? [];
        const presets = presetOptionsPerDay[dayIdx] ?? [];
        const selected = selectedIds[dayIdx];
        const conflict = conflictsPerDay?.[dayIdx] ?? null;
        const recommendation = recommendationSummaries?.[dayIdx];
        const recommendedFocusId = recommendedFocusIds?.[dayIdx];
        return (
          <View key={label} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.dayTitle, { color: theme.text }]}>{label}</Text>
            {recommendation ? (
              <Text style={[styles.recommendLine, { color: theme.primary }]}>
                Recommended: {recommendation}
              </Text>
            ) : null}
            {conflict &&
            onApplyDayResolution &&
            dayHasUnresolvedSessionFocusConflict(
              conflict,
              resolvedConflictIdsByDay?.[dayIdx]
            ) ? (
              <DaySessionFocusConflictBanner
                theme={theme}
                conflict={conflict}
                resolvedId={resolvedConflictIdsByDay?.[dayIdx]}
                onApplyResolution={(res) => {
                  const full = conflict.resolutions.find((r) => r.id === res.id);
                  if (full) onApplyDayResolution(dayIdx, full);
                }}
              />
            ) : null}
            {bodyOptions.length > 0 && onSelectBody ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                  Body focus this day
                </Text>
                {onChangeDayBodyFocusMode ? (
                  <WeeklyBodyFocusModeToggle
                    value={bodyFocusModePerDay?.[dayIdx] ?? "region"}
                    onChange={(mode) => onChangeDayBodyFocusMode(dayIdx, mode)}
                    showHint={false}
                  />
                ) : null}
                <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                  {bodyFocusModePerDay?.[dayIdx] === "pattern"
                    ? "Pick one, or combine two compatible areas. Legs is the full lower day — use Quads or Posterior to split it."
                    : "Pick one, or combine two compatible areas"}
                </Text>
                <View style={styles.options}>
                  {bodyOptions.map((p) => {
                    const isSel = selectedBodies.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => onSelectBody(dayIdx, p.id)}
                        style={({ pressed }) => [
                          styles.option,
                          {
                            borderColor: isSel ? theme.primary : theme.border,
                            backgroundColor: isSel ? theme.primarySoft : "transparent",
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.radioOuter, { borderColor: isSel ? theme.primarySolid : theme.textMuted }]}>
                          {isSel ? <View style={[styles.radioInner, { backgroundColor: theme.primarySolid }]} /> : null}
                        </View>
                        <View style={styles.optionText}>
                          <Text style={[styles.optionLabel, { color: theme.text }]}>
                            {p.label}
                            {p.recommended ? (
                              <Text style={[styles.optionSub, { color: theme.primary }]}> · rec</Text>
                            ) : null}
                          </Text>
                          <Text style={[styles.optionSub, { color: theme.textMuted }]}>{p.subtitle}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                Focus this day
              </Text>
              <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                Overrides earlier goals for this day only
              </Text>
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
                    <View style={[styles.radioOuter, { borderColor: isSel ? theme.primarySolid : theme.textMuted }]}>
                      {isSel ? <View style={[styles.radioInner, { backgroundColor: theme.primarySolid }]} /> : null}
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: theme.text }]}>
                        {p.label}
                        {recommendedFocusId === p.id ? (
                          <Text style={[styles.optionSub, { color: theme.primary }]}> · rec</Text>
                        ) : null}
                      </Text>
                      {p.subtitle?.trim() ? (
                        <Text style={[styles.optionSub, { color: theme.textMuted }]}>{p.subtitle}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            </View>
          </View>
        );
      })}

      <Pressable onPress={onBack} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginTop: 8 })}>
        <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: "center" }}>← Back to schedule</Text>
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
  screenNote: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: "500",
  },
  card: {
    borderRadius: themeRadius.card,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  recommendLine: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: -6,
    marginBottom: 10,
  },
  section: {
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 2,
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
    borderRadius: themeRadius.card,
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
  summaryStatusRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryFocusStack: {
    gap: 4,
  },
  summaryFocusRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  summaryFocusLabel: {
    width: 46,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryFocusValueWrap: {
    flex: 1,
  },
  summaryFocusValue: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  summaryFocusSub: {
    fontSize: 12,
    fontWeight: "400",
  },
});
