import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../lib/theme";
import type { GeneratedWorkout, WorkoutBlock } from "../lib/types";
import { formatPrescription, formatSupersetPairLabel, getSupersetPairsForBlock } from "../lib/types";

export type WorkoutBlockListProps = {
  workout: GeneratedWorkout;
  showSwap?: boolean;
  onSwap?: (exerciseId: string, exerciseName: string) => void;
  showTags?: boolean;
  /** Optional notes per exercise id (e.g. from completed workout history). */
  exerciseNotes?: Record<string, string>;
};

export function WorkoutBlockList({
  workout,
  showSwap = false,
  onSwap,
  showTags = false,
  exerciseNotes,
}: WorkoutBlockListProps) {
  const theme = useTheme();

  return (
    <>
      {workout.blocks.map((block, blockIdx) => (
        (() => {
          const pairs = getSupersetPairsForBlock(block);
          const hasSupersetExercises = !!(pairs && pairs.length > 0);
          const hasBlockItems = (block.items?.length ?? 0) > 0;
          const hasExercises = hasSupersetExercises || hasBlockItems;

          if (!hasExercises) {
            return null;
          }

          return (
            <View
              key={`${block.block_type}-${blockIdx}`}
              style={styles.sectionBlock}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {block.title ?? block.block_type}
              </Text>
              {block.reasoning && !hasSupersetExercises ? (
                <Text
                  style={[styles.sectionReasoning, { color: theme.textMuted }]}
                >
                  {block.reasoning}
                </Text>
              ) : null}
              {renderBlockContent(block, theme, showSwap, onSwap, showTags, exerciseNotes)}
            </View>
          );
        })()
      )}
    </>
  );
}

function renderBlockContent(
  block: WorkoutBlock,
  theme: ReturnType<typeof useTheme>,
  showSwap: boolean,
  onSwap: ((exerciseId: string, exerciseName: string) => void) | undefined,
  showTags: boolean,
  exerciseNotes?: Record<string, string>
) {
  const pairs = getSupersetPairsForBlock(block);
  const noteFor = (exerciseId: string) =>
    exerciseNotes?.[exerciseId] ? (
      <View style={[styles.noteBox, { backgroundColor: theme.primarySoft }]}>
        <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
          Your note
        </Text>
        <Text style={[styles.noteText, { color: theme.text }]}>
          {exerciseNotes[exerciseId]}
        </Text>
      </View>
    ) : null;
  if (pairs && pairs.length > 0) {
    return (
      <>
        {pairs.map((pair, idx) => (
          <View
            key={`superset-${idx}`}
            style={[styles.supersetBlock, { borderLeftColor: theme.primary ?? theme.border }]}
          >
            <Text style={[styles.supersetLabel, { color: theme.textMuted }]}>
              {formatSupersetPairLabel(pair)} — do A then B
              {pair[0]?.time_seconds != null && (pair[0]?.sets ?? 1) <= 1 ? "" : ", rest after both"}
            </Text>
            <View style={[styles.pairRow, { backgroundColor: theme.card ?? theme.background }]}>
              {pair.map((item, pairIdx) => (
                <View key={item.exercise_id} style={styles.exerciseRow}>
                  <Text style={[styles.supersetLetter, { color: theme.primary ?? theme.text }]}>
                    {String.fromCharCode(65 + pairIdx)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseName, { color: theme.text }]}>
                      {item.exercise_name}
                    </Text>
                    <Text
                      style={[styles.exercisePrescription, { color: theme.textMuted }]}
                    >
                      {formatPrescription(item)}
                    </Text>
                    {showTags && (item.tags?.length ?? 0) > 0 && (
                      <View style={styles.tagsRow}>
                        {(item.tags ?? []).slice(0, 3).map((tag) => (
                          <Text
                            key={tag}
                            style={[styles.tag, { color: theme.textMuted }]}
                          >
                            {tag}
                          </Text>
                        ))}
                      </View>
                    )}
                    {noteFor(item.exercise_id)}
                  </View>
                  {showSwap && onSwap && (
                    <Pressable
                      onPress={() => onSwap(item.exercise_id, item.exercise_name)}
                      style={[styles.swapBtn, { borderColor: theme.border }]}
                    >
                      <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
                        Swap
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </>
    );
  }

  return (
    <>
      {block.items.map((item) => (
        <View key={item.exercise_id} style={styles.exerciseRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.exerciseName, { color: theme.text }]}>
              {item.exercise_name}
            </Text>
            <Text
              style={[styles.exercisePrescription, { color: theme.textMuted }]}
            >
              {formatPrescription(item)}
            </Text>
            {showTags && (item.tags?.length ?? 0) > 0 && (
              <View style={styles.tagsRow}>
                {(item.tags ?? []).slice(0, 3).map((tag) => (
                  <Text
                    key={tag}
                    style={[styles.tag, { color: theme.textMuted }]}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            )}
            {noteFor(item.exercise_id)}
          </View>
          {showSwap && onSwap && (
            <Pressable
              onPress={() => onSwap(item.exercise_id, item.exercise_name)}
              style={[styles.swapBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
                Swap
              </Text>
            </Pressable>
          )}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionReasoning: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 8,
  },
  supersetBlock: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
  },
  supersetLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pairRow: {
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 8,
  },
  supersetLetter: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 20,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exercisePrescription: {
    fontSize: 13,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tag: {
    fontSize: 11,
  },
  swapBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  swapBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  noteBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  noteText: {
    fontSize: 13,
  },
});
