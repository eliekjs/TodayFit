import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { PrimaryButton } from "../../../components/Button";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { SwapExerciseModal } from "../../../components/SwapExerciseModal";
import { formatPrescription, formatSupersetPairLabel, getSupersetPairsForBlock } from "../../../lib/types";
import { replaceExerciseInWorkout } from "../../../lib/workoutUtils";
import { getSwapSuggestionsPage } from "../../../lib/exerciseProgressions";

type ExerciseProgress = {
  completed: boolean;
  setsCompleted: number;
  notes?: string;
};

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
  } = useAppState();
  const router = useRouter();
  const theme = useTheme();

  const allExercises = useMemo(
    () =>
      generatedWorkout != null
        ? generatedWorkout.blocks.flatMap((block) => {
            const pairs = getSupersetPairsForBlock(block);
            if (pairs && pairs.length > 0) {
              return pairs.flatMap((pair, idx) =>
                pair.map((item) => ({
                  ...item,
                  id: item.exercise_id,
                  name: item.exercise_name,
                  prescription: formatPrescription(item),
                  sectionTitle: `${block.title ?? block.block_type} • Pair ${idx + 1} (${formatSupersetPairLabel(pair)})`,
                }))
              );
            }
            return block.items.map((item) => ({
              ...item,
              id: item.exercise_id,
              name: item.exercise_name,
              prescription: formatPrescription(item),
              sectionTitle: block.title ?? block.block_type,
            }));
          })
        : [],
    [generatedWorkout]
  );

  const [progress, setProgress] = useState<Record<string, ExerciseProgress>>(
    () =>
      allExercises.reduce<Record<string, ExerciseProgress>>(
        (acc, ex) => ({
          ...acc,
          [ex.exercise_id]: { completed: false, setsCompleted: 0 },
        }),
        {}
      )
  );
  const [swapModal, setSwapModal] = useState<{
    exerciseId: string;
    exerciseName: string;
  } | null>(null);
  const [swapSuggested, setSwapSuggested] = useState<{ id: string; name: string }[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSuggestionPage, setSwapSuggestionPage] = useState(0);
  const [swapNumPages, setSwapNumPages] = useState(1);

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

  const incrementSets = (id: string) => {
    setProgress((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { completed: false, setsCompleted: 0 }),
        setsCompleted: (prev[id]?.setsCompleted ?? 0) + 1,
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
    getSwapSuggestionsPage(swapModal.exerciseId, { energyLevel }, swapSuggestionPage).then(
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
  }, [swapModal?.exerciseId, manualPreferences.energyLevel, swapSuggestionPage]);

  const onSwapChoose = (optionId: string, optionName: string) => {
    if (!generatedWorkout || !swapModal) return;
    const updated = replaceExerciseInWorkout(
      generatedWorkout,
      swapModal.exerciseId,
      optionId,
      optionName
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
      router.replace("/manual/preferences");
      return;
    }
    const exerciseNotes: Record<string, string> = {};
    Object.entries(progress).forEach(([exId, p]) => {
      if (p.notes?.trim()) exerciseNotes[exId] = p.notes.trim();
    });
    addCompletedWorkout({
      date: new Date().toISOString(),
      focus: generatedWorkout.focus,
      durationMinutes: generatedWorkout.durationMinutes,
      workout: generatedWorkout,
      exerciseNotes: Object.keys(exerciseNotes).length > 0 ? exerciseNotes : undefined,
    });
    removeSavedWorkoutByWorkoutId(generatedWorkout.id);
    router.replace("/history/complete");
  };

  const onSaveForLater = () => {
    if (generatedWorkout == null) return;
    addSavedWorkout({
      savedAt: new Date().toISOString(),
      workout: generatedWorkout,
      progress,
    });
    setGeneratedWorkout(null);
    setResumeProgress(null);
    router.replace("/library");
  };

  if (generatedWorkout == null) {
    return (
      <AppScreenWrapper>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            No workout loaded. Generate one first.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Back to Preferences"
              onPress={() => router.replace("/manual/preferences")}
            />
          </View>
        </View>
      </AppScreenWrapper>
    );
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          {allExercises.map((exercise) => {
            const state = progress[exercise.exercise_id] ?? {
              completed: false,
              setsCompleted: 0,
            };
            return (
              <View
                key={exercise.exercise_id}
                style={[
                  styles.exerciseRow,
                  {
                    borderColor: theme.border,
                    backgroundColor: state.completed
                      ? theme.primarySoft
                      : theme.card,
                  },
                ]}
              >
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
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.cardOpaque,
                      },
                    ]}
                    placeholder="Notes (optional)"
                    placeholderTextColor={theme.textMuted}
                    value={state.notes ?? ""}
                    onChangeText={(text) => setNote(exercise.exercise_id, text)}
                    multiline
                  />
                </View>
                <Pressable
                  onPress={() =>
                    setSwapModal({
                      exerciseId: exercise.exercise_id,
                      exerciseName: exercise.exercise_name,
                    })
                  }
                  style={[styles.swapButton, { borderColor: theme.border }]}
                >
                  <Text style={[styles.logButtonText, { color: theme.textMuted }]}>
                    Swap
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => incrementSets(exercise.exercise_id)}
                  style={[styles.logButton, { borderColor: theme.border }]}
                >
                  <Text style={[styles.logButtonText, { color: theme.text }]}>
                    + Set ({state.setsCompleted})
                  </Text>
                </Pressable>
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
          <PrimaryButton label="Finish Workout" onPress={onFinish} style={{ marginTop: 12 }} />
        </View>
      </ScrollView>

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
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
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
  swapButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logButton: {
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
