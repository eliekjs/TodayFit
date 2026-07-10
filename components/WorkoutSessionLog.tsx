import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../lib/theme";
import type { ExecutionProgress, GeneratedWorkout } from "../lib/types";
import {
  buildWorkoutLogExercises,
  formatLoggedSetRow,
  type WorkoutLogExercise,
} from "../lib/workoutCompletionLog";

type WorkoutSessionLogProps = {
  workout: GeneratedWorkout;
  exerciseNotes?: Record<string, string>;
  exercisePerformance?: Record<string, { sets: import("../lib/types").SetLogRow[] }>;
  progress?: ExecutionProgress | null;
  /** When viewing a saved in-progress workout. */
  inProgress?: boolean;
  compact?: boolean;
};

function ExerciseLogCard({
  entry,
  theme,
  compact,
}: {
  entry: WorkoutLogExercise;
  theme: ReturnType<typeof useTheme>;
  compact?: boolean;
}) {
  const mode = entry.isTimeBased ? "rounds" : "strength";
  const setLabel = mode === "rounds" ? "round" : "set";

  return (
    <View
      style={[
        styles.exerciseCard,
        compact && styles.exerciseCardCompact,
        { borderColor: theme.border, backgroundColor: theme.card },
      ]}
    >
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseName, { color: theme.text }]}>
          {entry.exerciseName}
        </Text>
        {entry.completed === true && (
          <View style={[styles.doneBadge, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.doneBadgeText, { color: theme.primary }]}>Done</Text>
          </View>
        )}
        {entry.completed === false && (
          <View style={[styles.doneBadge, { backgroundColor: theme.cardOpaque ?? theme.card }]}>
            <Text style={[styles.doneBadgeText, { color: theme.textMuted }]}>In progress</Text>
          </View>
        )}
      </View>

      {entry.sets != null && entry.sets.length > 0 && (
        <View style={styles.setsBlock}>
          <Text style={[styles.setsLabel, { color: theme.textMuted }]}>
            {entry.sets.length} {setLabel}
            {entry.sets.length !== 1 ? "s" : ""} logged
          </Text>
          {entry.sets.map((row, index) => (
            <Text
              key={row.id}
              style={[styles.setLine, { color: theme.text }]}
            >
              {formatLoggedSetRow(row, index, mode)}
            </Text>
          ))}
        </View>
      )}

      {entry.exerciseNotes ? (
        <View style={[styles.noteBox, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.noteLabel, { color: theme.textMuted }]}>Note</Text>
          <Text style={[styles.noteText, { color: theme.text }]}>{entry.exerciseNotes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function WorkoutSessionLog({
  workout,
  exerciseNotes,
  exercisePerformance,
  progress,
  inProgress = false,
  compact = false,
}: WorkoutSessionLogProps) {
  const theme = useTheme();
  const entries = buildWorkoutLogExercises(
    workout,
    exerciseNotes,
    exercisePerformance,
    progress
  );

  if (entries.length === 0) {
    return (
      <View style={[styles.emptyBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          {inProgress
            ? "No sets or notes recorded yet for this workout."
            : "No sets or notes were recorded for this session."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!compact && (
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {inProgress ? "Progress so far" : "Session log"}
        </Text>
      )}
      {entries.map((entry) => (
        <ExerciseLogCard
          key={entry.exerciseId}
          entry={entry}
          theme={theme}
          compact={compact}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  exerciseCardCompact: {
    padding: 10,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  doneBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  setsBlock: {
    gap: 4,
  },
  setsLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  setLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteBox: {
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
