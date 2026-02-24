import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";

type ExerciseProgress = {
  completed: boolean;
  setsCompleted: number;
};

export default function ExecuteScreen() {
  const { generatedWorkout, addCompletedWorkout } = useAppState();
  const router = useRouter();
  const theme = useTheme();

  const allExercises = useMemo(
    () =>
      generatedWorkout != null
        ? generatedWorkout.sections.flatMap((section) =>
            section.exercises.map((ex) => ({
              ...ex,
              sectionTitle: section.title,
            }))
          )
        : [],
    [generatedWorkout]
  );

  const [progress, setProgress] = useState<Record<string, ExerciseProgress>>(
    () =>
      allExercises.reduce<Record<string, ExerciseProgress>>(
        (acc, ex) => ({
          ...acc,
          [ex.id]: { completed: false, setsCompleted: 0 },
        }),
        {}
      )
  );

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

  const onFinish = () => {
    if (generatedWorkout == null) {
      router.replace("/manual/preferences");
      return;
    }
    addCompletedWorkout({
      date: new Date().toISOString(),
      focus: generatedWorkout.focus,
      durationMinutes: generatedWorkout.durationMinutes,
    });
    router.replace("/history/complete");
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
        <Card title="Session Timer">
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            Timer placeholder — you'll see elapsed time here later.
          </Text>
        </Card>

        <View style={{ marginTop: 16, gap: 12 }}>
          {allExercises.map((exercise) => {
            const state = progress[exercise.id] ?? {
              completed: false,
              setsCompleted: 0,
            };
            return (
              <View
                key={exercise.id}
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
                  onPress={() => toggleCompleted(exercise.id)}
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
                    {exercise.name}
                  </Text>
                  <Text
                    style={[styles.exerciseMeta, { color: theme.textMuted }]}
                  >
                    {exercise.prescription} • {exercise.sectionTitle}
                  </Text>
                </View>
                <Pressable
                  onPress={() => incrementSets(exercise.id)}
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
          <PrimaryButton label="Finish Workout" onPress={onFinish} />
        </View>
      </ScrollView>
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
  footer: {
    marginTop: 24,
    marginBottom: 32,
  },
});
