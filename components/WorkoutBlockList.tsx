import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { themeRadius, useTheme } from "../lib/theme";
import type { BlockType, GeneratedWorkout, SetLogRow, WorkoutBlock, WorkoutItem } from "../lib/types";
import { formatPrescription, formatSupersetPairLabel, getSupersetPairsForBlock } from "../lib/types";
import {
  resolveExerciseSetupText,
  withResolvedExerciseDescription,
} from "../lib/exerciseDisplayCue";
import {
  ensureCuratedDescriptionsLoaded,
  getCuratedExerciseDescription,
} from "../lib/exerciseDescriptionsCurated";
import { buildBlockGoalBadgeLabel, getBlockDisplayTitle } from "../lib/blockGoalDisplay";
import { ExerciseSetupModal } from "./ExerciseSetupModal";
import { EditPrescriptionModal, type PrescriptionEdit } from "./EditPrescriptionModal";

function resolveSetupItem(item: WorkoutItem): WorkoutItem {
  return withResolvedExerciseDescription(item, getCuratedExerciseDescription);
}

function setupCueFor(item: WorkoutItem): string {
  return resolveExerciseSetupText(resolveSetupItem(item));
}

function BlockGoalBadge({
  block,
  theme,
}: {
  block: WorkoutBlock;
  theme: ReturnType<typeof useTheme>;
}) {
  const intent = block.goal_intent;
  if (!intent) return null;

  const label = buildBlockGoalBadgeLabel(intent);
  if (!label) return null;

  return (
    <View style={blockGoalStyles.row}>
      <View style={[blockGoalStyles.badge, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
        <Text style={[blockGoalStyles.badgeText, { color: theme.primary }]}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const blockGoalStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 8,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
});

export type WorkoutBlockListProps = {
  workout: GeneratedWorkout;
  showSwap?: boolean;
  onSwap?: (
    exerciseId: string,
    exerciseName: string,
    blockType: BlockType,
    swapPoolExerciseIds?: string[]
  ) => void;
  /** When true, show an Edit sets/reps button per exercise. */
  showEditPrescription?: boolean;
  onEditPrescription?: (exerciseId: string, edit: PrescriptionEdit) => void;
  showTags?: boolean;
  /** Optional notes per exercise id (e.g. from completed workout history). */
  exerciseNotes?: Record<string, string>;
  /** Optional set/round logs per exercise id (from completed workout history). */
  exercisePerformance?: Record<string, { sets: SetLogRow[] }>;
  /** When false, hides per-exercise notes and set logs (e.g. when shown in WorkoutSessionLog). */
  showCompletionLog?: boolean;
};

export function WorkoutBlockList({
  workout,
  showSwap = false,
  onSwap,
  showEditPrescription = false,
  onEditPrescription,
  showTags = false,
  exerciseNotes,
  exercisePerformance,
  showCompletionLog = true,
}: WorkoutBlockListProps) {
  const theme = useTheme();
  const [, setCuratedReady] = React.useState(false);
  const [setupModal, setSetupModal] = React.useState<{
    exerciseName: string;
    setupText: string;
  } | null>(null);
  const [editItem, setEditItem] = React.useState<WorkoutItem | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void ensureCuratedDescriptionsLoaded()
      .then(() => {
        if (!cancelled) setCuratedReady(true);
      })
      .catch(() => {
        /* Loader resets on failure so the next mount retries. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {workout.blocks.map((block, blockIdx) => {
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
              {getBlockDisplayTitle(block)}
            </Text>
            <BlockGoalBadge block={block} theme={theme} />
            {renderBlockContent(
              block,
              block.block_type,
              theme,
              showSwap,
              onSwap,
              showEditPrescription,
              showTags,
              showCompletionLog ? exerciseNotes : undefined,
              showCompletionLog ? exercisePerformance : undefined,
              (item) => {
                const setupText = setupCueFor(item);
                if (!setupText) return;
                setSetupModal({ exerciseName: item.exercise_name, setupText });
              },
              (item) => setEditItem(item)
            )}
          </View>
        );
      })}
      <ExerciseSetupModal
        visible={setupModal != null}
        exerciseName={setupModal?.exerciseName ?? ""}
        setupText={setupModal?.setupText ?? null}
        onClose={() => setSetupModal(null)}
      />
      <EditPrescriptionModal
        visible={editItem != null}
        exerciseName={editItem?.exercise_name ?? ""}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={(edit) => {
          if (editItem == null || onEditPrescription == null) return;
          onEditPrescription(editItem.exercise_id, edit);
          setEditItem(null);
        }}
      />
    </>
  );
}

function formatLoggedSet(row: SetLogRow, index: number, mode: "strength" | "rounds"): string {
  const label = mode === "rounds" ? `Round ${index + 1}` : `Set ${index + 1}`;
  const parts: string[] = [];
  if (mode === "strength") {
    if (row.reps != null) parts.push(`${row.reps} reps`);
    if (row.load_kg != null) parts.push(`@ ${row.load_kg}`);
  } else if (row.duration_seconds != null) {
    const min = row.duration_seconds / 60;
    parts.push(`${Number.isInteger(min) ? min : min.toFixed(1)} min`);
  }
  if (row.notes?.trim()) parts.push(row.notes.trim());
  return parts.length > 0 ? `${label}: ${parts.join(" · ")}` : label;
}

function renderBlockContent(
  block: WorkoutBlock,
  blockType: BlockType,
  theme: ReturnType<typeof useTheme>,
  showSwap: boolean,
  onSwap:
    | ((
        exerciseId: string,
        exerciseName: string,
        blockType: BlockType,
        swapPoolExerciseIds?: string[]
      ) => void)
    | undefined,
  showEditPrescription: boolean,
  showTags: boolean,
  exerciseNotes: Record<string, string> | undefined,
  exercisePerformance: Record<string, { sets: SetLogRow[] }> | undefined,
  onSetupPress: (item: WorkoutItem) => void,
  onEditPress: (item: WorkoutItem) => void
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
  const performanceFor = (item: WorkoutItem) => {
    const rows = exercisePerformance?.[item.exercise_id]?.sets;
    if (!rows?.length) return null;
    const mode =
      item.time_seconds != null && item.time_seconds > 0 ? "rounds" : "strength";
    return (
      <View style={[styles.performanceBox, { backgroundColor: theme.cardOpaque ?? theme.card }]}>
        <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
          Logged
        </Text>
        {rows.map((row, idx) => (
          <Text
            key={row.id}
            style={[styles.performanceLine, { color: theme.text }]}
          >
            {formatLoggedSet(row, idx, mode)}
          </Text>
        ))}
      </View>
    );
  };
  const setupButtonFor = (item: WorkoutItem) => {
    const cue = setupCueFor(item);
    if (!cue) return null;
    return (
      <Pressable
        onPress={() => onSetupPress(item)}
        style={[styles.setupBtn, { borderColor: theme.primary }]}
      >
        <Text style={[styles.setupBtnText, { color: theme.primary }]}>setup</Text>
      </Pressable>
    );
  };
  const actionButtonsFor = (item: WorkoutItem) => (
    <View style={styles.actionCol}>
      {setupButtonFor(item)}
      {showEditPrescription && (
        <Pressable
          onPress={() => onEditPress(item)}
          style={[styles.swapBtn, { borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Edit sets and reps for ${item.exercise_name}`}
        >
          <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
            Edit sets/reps
          </Text>
        </Pressable>
      )}
      {showSwap && onSwap && (
        <Pressable
          onPress={() =>
            onSwap(
              item.exercise_id,
              item.exercise_name,
              blockType,
              block.goal_intent?.swap_pool_exercise_ids
            )
          }
          style={[styles.swapBtn, { borderColor: theme.border }]}
        >
          <Text style={[styles.swapBtnText, { color: theme.textMuted }]}>
            Swap exercise
          </Text>
        </Pressable>
      )}
    </View>
  );
  if (pairs && pairs.length > 0) {
    return (
      <>
        {pairs.map((pair, idx) => (
          <View
            key={`superset-${idx}`}
            style={[styles.supersetBlock, { borderLeftColor: theme.primary ?? theme.border }]}
          >
            {(() => {
              const pairRest = Math.max(pair[0]?.rest_seconds ?? 0, pair[1]?.rest_seconds ?? 0);
              const pairRestText = pairRest > 0 ? `, rest ${pairRest}s after both` : "";
              return (
            <Text style={[styles.supersetLabel, { color: theme.textMuted }]}>
              {formatSupersetPairLabel(pair)} — do A then B
              {pairRestText}
            </Text>
              );
            })()}
            <View style={[styles.pairRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {pair.map((item, pairIdx) => (
                <View
                  key={item.exercise_id}
                  style={[styles.exerciseRow, { borderWidth: 0, paddingHorizontal: 0, marginBottom: 0 }]}
                >
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
                      {formatPrescription(item, { includeRest: false })}
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
                    {performanceFor(item)}
                  </View>
                  {actionButtonsFor(item)}
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
        <View
          key={item.exercise_id}
          style={[
            styles.exerciseRow,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.exerciseName, { color: theme.text }]}>
              {item.exercise_name}
            </Text>
            <Text
              style={[styles.exercisePrescription, { color: theme.textMuted }]}
            >
              {formatPrescription(item, { includeRest: true })}
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
            {performanceFor(item)}
          </View>
          {actionButtonsFor(item)}
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
    fontSize: 17,
    fontWeight: "600",
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
    borderRadius: themeRadius.card,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderRadius: themeRadius.card,
    marginBottom: 8,
  },
  actionCol: {
    gap: 6,
    alignItems: "flex-end",
  },
  supersetLetter: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 20,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
  },
  exercisePrescription: {
    fontSize: 13,
    marginTop: 2,
  },
  setupBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setupBtnText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "lowercase",
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
  performanceBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  performanceLine: {
    fontSize: 13,
  },
});
