import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { manualGoalPreferencesHref } from "../../../lib/manualGoalPreferencesHref";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { PrimaryButton } from "../../../components/Button";
import { FlowPhaseNavBar } from "../../../components/FlowPhaseNavBar";
import { backLabelForPhase } from "../../../lib/sessionFlowNav";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { SwapExerciseModal } from "../../../components/SwapExerciseModal";
import { ExerciseSetupModal } from "../../../components/ExerciseSetupModal";
import { ExerciseSetLogTable } from "../../../components/ExerciseSetLogTable";
import {
  createSetLogRow,
  formatPrescription,
  formatSupersetPairLabel,
  getSupersetPairsForBlock,
  isTimeBasedPrescription,
  type BlockType,
  type ExecutionProgress,
  type ExerciseExecutionProgress,
  type SetLogRow,
} from "../../../lib/types";
import { replaceExerciseInWorkout } from "../../../lib/workoutUtils";
import { formatExerciseDisplayCue } from "../../../lib/exerciseDisplayCue";
import { ensureCuratedDescriptionsLoaded, getCuratedExerciseDescription } from "../../../lib/exerciseDescriptionsCurated";
import {
  blockTypeToSwapBlockRole,
  getSwapSuggestionsPage,
} from "../../../lib/exerciseProgressions";
import {
  markManualWeekDayByWorkoutId,
  markSportWeekDayByWorkoutId,
  WEEK_PROGRESS_ROUTE,
} from "../../../lib/weekProgress";
import { getBlockDisplayTitle } from "../../../lib/blockGoalDisplay";

function migrateLegacySets(saved: ExerciseExecutionProgress): SetLogRow[] | undefined {
  if (saved.sets != null) return saved.sets;
  const count = saved.setsCompleted ?? 0;
  if (count <= 0) return undefined;
  return Array.from({ length: count }, () => createSetLogRow());
}

function buildProgressMap(
  exerciseIds: string[],
  saved: ExecutionProgress | null
): Record<string, ExerciseExecutionProgress> {
  const out: Record<string, ExerciseExecutionProgress> = {};
  for (const id of exerciseIds) {
    const s = saved?.[id];
    if (s != null) {
      const sets = migrateLegacySets(s);
      out[id] = {
        completed: Boolean(s.completed),
        setsCompleted: sets?.length ?? s.setsCompleted ?? 0,
        sets,
        notes: s.notes,
      };
    } else {
      out[id] = { completed: false, setsCompleted: 0 };
    }
  }
  return out;
}

export default function ExecuteScreen() {
  const {
    generatedWorkout,
    manualPreferences,
    addCompletedWorkout,
    addSavedWorkout,
    setGeneratedWorkout,
    setResumeProgress,
    resumeProgress,
    removeSavedWorkoutByWorkoutId,
    manualSessionProgress,
    setManualSessionProgress,
    setManualExecutionStarted,
    manualGoalPreferencesScope,
    manualWeekPlan,
    sportPrepWeekPlan,
    activeSessionDraft,
    setManualWeekPlan,
    setSportPrepWeekPlan,
    discardActiveSession,
  } = useAppState();
  const router = useRouter();
  const manualPrefsHref = manualGoalPreferencesHref(manualGoalPreferencesScope);
  const theme = useTheme();
  const reviewHref =
    manualWeekPlan != null && manualWeekPlan.days.length > 0
      ? "/manual/week"
      : "/manual/workout";
  const [navBarHeight, setNavBarHeight] = useState(72);

  const allExercises = useMemo(
    () =>
      generatedWorkout != null
        ? generatedWorkout.blocks.flatMap((block) => {
            const pairs = getSupersetPairsForBlock(block);
            if (pairs && pairs.length > 0) {
              const swapPoolExerciseIds = block.goal_intent?.swap_pool_exercise_ids;
            return pairs.flatMap((pair, idx) =>
                pair.map((item) => ({
                  ...item,
                  id: item.exercise_id,
                  name: item.exercise_name,
                  prescription: formatPrescription(item),
                  sectionTitle: `${getBlockDisplayTitle(block)} • Pair ${idx + 1} (${formatSupersetPairLabel(pair)})`,
                  blockType: block.block_type,
                  swapPoolExerciseIds,
                }))
              );
            }
            const swapPoolExerciseIds = block.goal_intent?.swap_pool_exercise_ids;
            return block.items.map((item) => ({
              ...item,
              id: item.exercise_id,
              name: item.exercise_name,
              prescription: formatPrescription(item),
              sectionTitle: getBlockDisplayTitle(block),
              blockType: block.block_type,
              swapPoolExerciseIds,
            }));
          })
        : [],
    [generatedWorkout]
  );

  const [progress, setProgress] = useState<Record<string, ExerciseExecutionProgress>>({});

  const manualProgressRef = useRef(manualSessionProgress);
  manualProgressRef.current = manualSessionProgress;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  /** When null, blur must not write session progress back (finish / save / discard). */
  const lastPersistWorkoutIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    void ensureCuratedDescriptionsLoaded();
  }, []);

  useEffect(() => {
    if (generatedWorkout == null) {
      lastPersistWorkoutIdRef.current = null;
    }
  }, [generatedWorkout]);

  useFocusEffect(
    useCallback(() => {
      if (!generatedWorkout) return;
      lastPersistWorkoutIdRef.current = generatedWorkout.id;
      const ids = allExercises.map((e) => e.exercise_id);
      setProgress(buildProgressMap(ids, manualProgressRef.current));
      return () => {
        if (lastPersistWorkoutIdRef.current == null) return;
        setManualSessionProgress(progressRef.current);
      };
    }, [allExercises, generatedWorkout, setManualSessionProgress])
  );
  const [swapModal, setSwapModal] = useState<{
    exerciseId: string;
    exerciseName: string;
    blockType: BlockType;
    swapPoolExerciseIds?: string[];
  } | null>(null);
  const [swapSuggested, setSwapSuggested] = useState<{ id: string; name: string }[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSuggestionPage, setSwapSuggestionPage] = useState(0);
  const [swapNumPages, setSwapNumPages] = useState(1);
  const [setupModal, setSetupModal] = useState<{
    exerciseName: string;
    setupText: string;
  } | null>(null);

  useEffect(() => {
    if (resumeProgress != null && Object.keys(resumeProgress).length > 0) {
      setProgress((prev) => ({ ...prev, ...resumeProgress }));
      setResumeProgress(null);
    }
  }, [resumeProgress, setResumeProgress]);

  const toggleCompleted = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { completed: false, setsCompleted: 0 }),
        completed: !(prev[id]?.completed ?? false),
      },
    }));
  };

  const updateSetRows = (id: string, sets: SetLogRow[]) => {
    setProgress((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { completed: false, setsCompleted: 0 }),
        sets,
        setsCompleted: sets.length,
      },
    }));
  };

  const setNote = (id: string, notes: string) => {
    setProgress((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { completed: false, setsCompleted: 0 }),
        notes,
      },
    }));
  };

  useEffect(() => {
    if (!swapModal) {
      setSwapSuggested([]);
      setSwapSuggestionPage(0);
      setSwapNumPages(1);
      return;
    }
    let cancelled = false;
    setSwapLoading(true);
    const energyLevel = manualPreferences.energyLevel ?? undefined;
    getSwapSuggestionsPage(
      swapModal.exerciseId,
      {
        energyLevel,
        swapBlockRole: blockTypeToSwapBlockRole(swapModal.blockType),
        workoutTier: manualPreferences.workoutTier ?? "intermediate",
        includeCreativeVariations: manualPreferences.includeCreativeVariations === true,
        swapPoolExerciseIds: swapModal.swapPoolExerciseIds,
      },
      swapSuggestionPage
    ).then(
      ({ suggestions, numPages }) => {
        if (cancelled) return;
        setSwapSuggested(suggestions);
        setSwapNumPages(numPages);
        setSwapLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [
    swapModal?.exerciseId,
    swapModal?.blockType,
    manualPreferences.energyLevel,
    manualPreferences.workoutTier,
    manualPreferences.includeCreativeVariations,
    swapSuggestionPage,
  ]);

  const onSwapChoose = (optionId: string, optionName: string) => {
    if (!generatedWorkout || !swapModal) return;
    const updated = replaceExerciseInWorkout(
      generatedWorkout,
      swapModal.exerciseId,
      optionId,
      optionName,
      getCuratedExerciseDescription(optionId)
    );
    setGeneratedWorkout(updated);
    setProgress((prev) => {
      const next = { ...prev };
      const existing = next[swapModal.exerciseId];
      if (existing != null) {
        next[optionId] = existing;
        delete next[swapModal.exerciseId];
      }
      return next;
    });
    setSwapModal(null);
  };

  const onFinish = () => {
    if (generatedWorkout == null) {
      router.replace(manualPrefsHref);
      return;
    }
    const workoutId = generatedWorkout.id;
    const isWeekFlow =
      activeSessionDraft?.flow === "goal_week" || activeSessionDraft?.flow === "sport_week";
    lastPersistWorkoutIdRef.current = null;
    const exerciseNotes: Record<string, string> = {};
    const exercisePerformance: Record<string, { sets: SetLogRow[] }> = {};
    Object.entries(progress).forEach(([exId, p]) => {
      if (p.notes?.trim()) exerciseNotes[exId] = p.notes.trim();
      if (p.sets != null && p.sets.length > 0) {
        exercisePerformance[exId] = { sets: p.sets };
      }
    });
    addCompletedWorkout({
      date: new Date().toISOString(),
      focus: generatedWorkout.focus,
      durationMinutes: generatedWorkout.durationMinutes,
      workout: generatedWorkout,
      exerciseNotes: Object.keys(exerciseNotes).length > 0 ? exerciseNotes : undefined,
      exercisePerformance:
        Object.keys(exercisePerformance).length > 0 ? exercisePerformance : undefined,
    });
    removeSavedWorkoutByWorkoutId(generatedWorkout.id);

    if (isWeekFlow) {
      if (manualWeekPlan) {
        setManualWeekPlan(markManualWeekDayByWorkoutId(manualWeekPlan, workoutId, "completed"));
      }
      if (sportPrepWeekPlan) {
        setSportPrepWeekPlan(
          markSportWeekDayByWorkoutId(sportPrepWeekPlan, workoutId, "completed")
        );
      }
    }

    setGeneratedWorkout(null);
    setManualSessionProgress(null);
    setManualExecutionStarted(false);
    setResumeProgress(null);
    if (!isWeekFlow) {
      discardActiveSession();
    }
    router.replace(isWeekFlow ? WEEK_PROGRESS_ROUTE : "/history/complete");
  };

  const onSaveForLater = () => {
    if (generatedWorkout == null) return;
    lastPersistWorkoutIdRef.current = null;
    addSavedWorkout({
      savedAt: new Date().toISOString(),
      workout: generatedWorkout,
      progress,
    });
    setGeneratedWorkout(null);
    setResumeProgress(null);
    setManualSessionProgress(null);
    setManualExecutionStarted(false);
    router.replace("/library");
  };

  if (generatedWorkout == null) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            No workout loaded. Generate one first.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Back to Preferences"
              onPress={() => router.replace(manualPrefsHref)}
            />
          </View>
        </View>
      </AppScreenWrapper>
    );
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: navBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          {allExercises.map((exercise) => {
            const state = progress[exercise.exercise_id] ?? {
              completed: false,
              setsCompleted: 0,
            };
            const setupText = formatExerciseDisplayCue(exercise);
            const isRounds = isTimeBasedPrescription(exercise);
            return (
              <View
                key={exercise.exercise_id}
                style={[
                  styles.exerciseCard,
                  {
                    borderColor: theme.border,
                    backgroundColor: state.completed
                      ? theme.primarySoft
                      : theme.card,
                  },
                ]}
              >
                <View style={styles.exerciseHeader}>
                  <Pressable
                    onPress={() => toggleCompleted(exercise.exercise_id)}
                    style={[
                      styles.checkbox,
                      {
                        borderColor: theme.border,
                        backgroundColor: state.completed
                          ? theme.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {state.completed && (
                      <Text style={styles.checkboxMark}>✓</Text>
                    )}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseName, { color: theme.text }]}>
                      {exercise.exercise_name}
                    </Text>
                    <Text
                      style={[styles.exerciseMeta, { color: theme.textMuted }]}
                    >
                      {exercise.prescription} • {exercise.sectionTitle}
                    </Text>
                  </View>
                  <View style={styles.exerciseActions}>
                    {setupText ? (
                      <Pressable
                        onPress={() =>
                          setSetupModal({
                            exerciseName: exercise.exercise_name,
                            setupText,
                          })
                        }
                        style={[styles.setupButton, { borderColor: theme.primary }]}
                      >
                        <Text style={[styles.setupButtonText, { color: theme.primary }]}>
                          setup
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() =>
                        setSwapModal({
                          exerciseId: exercise.exercise_id,
                          exerciseName: exercise.exercise_name,
                          blockType: exercise.blockType,
                          swapPoolExerciseIds: exercise.swapPoolExerciseIds,
                        })
                      }
                      style={[styles.swapButton, { borderColor: theme.border }]}
                    >
                      <Text style={[styles.logButtonText, { color: theme.textMuted }]}>
                        Swap
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <ExerciseSetLogTable
                  mode={isRounds ? "rounds" : "strength"}
                  rows={state.sets ?? []}
                  onChange={(sets) => updateSetRows(exercise.exercise_id, sets)}
                  defaultReps={exercise.reps}
                  defaultDurationSeconds={exercise.time_seconds}
                />

                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.cardOpaque,
                    },
                  ]}
                  placeholder="Exercise notes (optional)"
                  placeholderTextColor={theme.textMuted}
                  value={state.notes ?? ""}
                  onChangeText={(text) => setNote(exercise.exercise_id, text)}
                  multiline
                />
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Save for later"
            variant="secondary"
            onPress={onSaveForLater}
          />
        </View>
      </ScrollView>

      <FlowPhaseNavBar
        sticky
        onLayout={setNavBarHeight}
        back={{
          label: backLabelForPhase("review"),
          onPress: () => router.push(reviewHref as never),
        }}
        forward={{
          label: "Finish workout",
          onPress: onFinish,
        }}
      />
      </View>

      <SwapExerciseModal
        visible={swapModal != null}
        onClose={() => setSwapModal(null)}
        exerciseId={swapModal?.exerciseId ?? ""}
        exerciseName={swapModal?.exerciseName ?? ""}
        suggested={swapSuggested}
        loading={swapLoading && swapSuggestionPage === 0}
        onChoose={onSwapChoose}
        moreSuggestionsAvailable={swapNumPages > 1}
        onMoreSuggestions={() => setSwapSuggestionPage((p) => p + 1)}
        loadingMoreSuggestions={swapLoading && swapSuggestionPage > 0}
      />
      <ExerciseSetupModal
        visible={setupModal != null}
        exerciseName={setupModal?.exerciseName ?? ""}
        setupText={setupModal?.setupText ?? null}
        onClose={() => setSetupModal(null)}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  exerciseCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
  },
  exerciseMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  setupButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setupButtonText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  swapButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    fontSize: 13,
    minHeight: 36,
  },
  footer: {
    marginTop: 24,
    marginBottom: 32,
  },
});
