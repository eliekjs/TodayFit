import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Theme } from "../lib/theme";
import type { DayBodyFocusChoice, DayBodyFocusChoiceId, DayFocusPreset } from "../lib/weekDaySessionFocus";
import type {
  DaySessionFocusConflict,
  DaySessionFocusResolution,
} from "../lib/daySessionFocusConflict";
import { dayHasUnresolvedSessionFocusConflict } from "../lib/daySessionFocusConflict";
import { DaySessionFocusConflictBanner } from "./DaySessionFocusConflictBanner";

type Props = {
  theme: Theme;
  /** One entry per selected training day (same order as generation). */
  dayLabels: string[];
  bodyOptionsPerDay?: DayBodyFocusChoice[][];
  presetOptionsPerDay: DayFocusPreset[][];
  selectedBodyIds?: DayBodyFocusChoiceId[];
  /** Selected preset id per day (parallel arrays). */
  selectedIds: string[];
  /** Detected body vs sub-goal conflicts per day (parallel to dayLabels). */
  conflictsPerDay?: (DaySessionFocusConflict | null)[];
  /** Resolution id applied per day, keyed by day index. */
  resolvedConflictIdsByDay?: Record<number, string>;
  /** Shown once at top — explains "X first" options without repeating per day/option. */
  sportGoalPriorityNote?: string | null;
  onSelectBody?: (dayIndex: number, bodyId: DayBodyFocusChoiceId) => void;
  onSelect: (dayIndex: number, presetId: string) => void;
  onApplyDayResolution?: (dayIndex: number, resolution: DaySessionFocusResolution) => void;
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
  conflictsPerDay,
  resolvedConflictIdsByDay,
  sportGoalPriorityNote,
  onSelectBody,
  onSelect,
  onApplyDayResolution,
  onBack,
}: Props) {
  return (
    <View style={styles.scroll}>
      <Text style={[styles.screenTitle, { color: theme.text }]}>Focus for each day</Text>
      <Text style={[styles.screenSub, { color: theme.textMuted }]}>
        We preselect body areas that fit your sport and goals. Adjust them if you want a different
        lower, core, upper, or full-body mix for the week.
      </Text>
      {sportGoalPriorityNote ? (
        <Text style={[styles.screenNote, { color: theme.textMuted }]}>
          {sportGoalPriorityNote}
        </Text>
      ) : null}

      {dayLabels.map((label, dayIdx) => {
        const bodyOptions = bodyOptionsPerDay?.[dayIdx] ?? [];
        const selectedBody = selectedBodyIds?.[dayIdx];
        const presets = presetOptionsPerDay[dayIdx] ?? [];
        const selected = selectedIds[dayIdx];
        const conflict = conflictsPerDay?.[dayIdx] ?? null;
        return (
          <View key={label} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.dayTitle, { color: theme.text }]}>{label}</Text>
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
                onApplyResolution={(resolution) => onApplyDayResolution(dayIdx, resolution)}
              />
            ) : null}
            {bodyOptions.length > 0 && onSelectBody ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                  Body focus this day
                </Text>
                <View style={styles.options}>
                  {bodyOptions.map((p) => {
                    const isSel = selectedBody === p.id;
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
                          <Text style={[styles.optionLabel, { color: theme.text }]}>{p.label}</Text>
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
                Sport / goal priority
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
                      <Text style={[styles.optionLabel, { color: theme.text }]}>{p.label}</Text>
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
