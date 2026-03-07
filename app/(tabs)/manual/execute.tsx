import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { PrimaryButton } from "../../../components/Button";
import { formatPrescription } from "../../../lib/types";
import { getProgressionsRegressionsForExercise } from "../../../lib/exerciseProgressions";
import type { GeneratedWorkout, WorkoutItem } from "../../../lib/types";

type ExerciseProgress = {
  completed: boolean;
  setsCompleted: number;
  notes?: string;
};

export default function ExecuteScreen() {
  const {
    generatedWorkout,
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
            if (block.supersetPairs && block.supersetPairs.length > 0) {
              return block.supersetPairs.flatMap((pair, idx) =>
                pair.map((item) => ({
                  ...item,
                  id: item.exercise_id,
                  name: item.exercise_name,
                  prescription: formatPrescription(item),
                  sectionTitle: `${block.title ?? block.block_type} • Superset ${idx + 1}`,
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
  const [swapOptions, setSwapOptions] = useState<{
    progressions: { id: string; name: string }[];
    regressions: { id: string; name: string }[];
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
      setSwapOptions(null);
      return;
    }
    let cancelled = false;
    setSwapOptions(null);
    getProgressionsRegressionsForExercise(swapModal.exerciseId).then((res) => {
      if (!cancelled) setSwapOptions(res);
    });
    return () => { cancelled = true; };
  }, [swapModal?.exerciseId]);

  const replaceExerciseInWorkout = (
    workout: GeneratedWorkout,
    fromExerciseId: string,
    toId: string,
    toName: string
  ): GeneratedWorkout => {
    const updateItem = (item: WorkoutItem): WorkoutItem =>
      item.exercise_id === fromExerciseId
        ? { ...item, exercise_id: toId, exercise_name: toName }
        : item;
    return {
      ...workout,
      blocks: workout.blocks.map((block) => {
        if (block.supersetPairs && block.supersetPairs.length > 0) {
          return {
            ...block,
            supersetPairs: block.supersetPairs.map((pair) =>
              pair.map(updateItem) as [WorkoutItem, WorkoutItem]
            ),
          };
        }
        return {
          ...block,
          items: block.items.map(updateItem),
        };
      }),
    };
  };

  const onSwapChoose = (optionId: string, optionName: string) => {
    if (generatedWorkout == null || swapModal == null) return;
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
                        backgroundColor: theme.background,
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

      <Modal
        visible={swapModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSwapModal(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSwapModal(null)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Swap: {swapModal?.exerciseName ?? ""}
            </Text>
            {swapOptions == null ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {swapOptions.regressions.length > 0 && (
                  <View style={styles.swapSection}>
                    <Text style={[styles.swapSectionTitle, { color: theme.textMuted }]}>
                      Regressions (easier)
                    </Text>
                    {swapOptions.regressions.map((opt) => (
                      <Pressable
                        key={opt.id}
                        style={[styles.swapOption, { borderColor: theme.border }]}
                        onPress={() => onSwapChoose(opt.id, opt.name)}
                      >
                        <Text style={[styles.swapOptionName, { color: theme.text }]}>
                          {opt.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {swapOptions.progressions.length > 0 && (
                  <View style={styles.swapSection}>
                    <Text style={[styles.swapSectionTitle, { color: theme.textMuted }]}>
                      Progressions (harder)
                    </Text>
                    {swapOptions.progressions.map((opt) => (
                      <Pressable
                        key={opt.id}
                        style={[styles.swapOption, { borderColor: theme.border }]}
                        onPress={() => onSwapChoose(opt.id, opt.name)}
                      >
                        <Text style={[styles.swapOptionName, { color: theme.text }]}>
                          {opt.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {swapOptions.regressions.length === 0 && swapOptions.progressions.length === 0 && (
                  <Text style={[styles.swapEmpty, { color: theme.textMuted }]}>
                    No progressions or regressions for this exercise.
                  </Text>
                )}
              </ScrollView>
            )}
            <PrimaryButton
              label="Cancel"
              variant="ghost"
              onPress={() => setSwapModal(null)}
              style={{ marginTop: 12 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  modalScroll: {
    maxHeight: 320,
  },
  swapSection: {
    marginBottom: 16,
  },
  swapSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  swapOption: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  swapOptionName: {
    fontSize: 15,
    fontWeight: "500",
  },
  swapEmpty: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 16,
  },
});
