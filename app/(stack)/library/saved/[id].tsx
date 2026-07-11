import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../../../../context/AppStateContext";
import { useTheme } from "../../../../lib/theme";
import { Card } from "../../../../components/Card";
import { AppScreenWrapper } from "../../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../../components/Button";
import { WorkoutBlockList } from "../../../../components/WorkoutBlockList";
import { WorkoutSessionLog } from "../../../../components/WorkoutSessionLog";
import { normalizeGeneratedWorkout } from "../../../../lib/types";

export default function ViewSavedWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    savedWorkouts,
    setGeneratedWorkout,
    setResumeProgress,
    setManualExecutionStarted,
  } = useAppState();
  const theme = useTheme();

  const saved = id ? savedWorkouts.find((item) => item.id === id) : null;

  if (!id || !saved) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            Saved workout not found.
          </Text>
        </View>
      </AppScreenWrapper>
    );
  }

  const workout = normalizeGeneratedWorkout(saved.workout);
  const savedDate = new Date(saved.savedAt);
  const focusLabel = workout.focus?.length ? workout.focus.join(" • ") : "General training";
  const exerciseCount = workout.blocks.reduce(
    (sum, block) => sum + (block.items?.length ?? 0),
    0
  );

  const onResume = () => {
    setGeneratedWorkout(saved.workout);
    setResumeProgress(saved.progress ?? null);
    setManualExecutionStarted(true);
    router.push("/manual/execute");
  };

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PrimaryButton
          label="Back"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Card
          title={focusLabel}
          subtitle={[
            savedDate.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            workout.durationMinutes != null ? `${workout.durationMinutes} min` : null,
            `${workout.blocks.length} block${workout.blocks.length !== 1 ? "s" : ""} · ${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}`,
            "Saved for later",
          ]
            .filter(Boolean)
            .join(" · ")}
          style={{ marginBottom: 16 }}
        />

        <View style={styles.detailActions}>
          <PrimaryButton label="Resume workout" onPress={onResume} style={{ flex: 1 }} />
        </View>

        <View style={styles.sessionLogSection}>
          <WorkoutSessionLog
            workout={workout}
            progress={saved.progress}
            inProgress
          />
        </View>

        <Text style={[styles.planSectionTitle, { color: theme.text }]}>
          Workout plan
        </Text>

        <WorkoutBlockList workout={workout} showCompletionLog={false} />
      </ScrollView>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  detailActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  sessionLogSection: {
    marginBottom: 24,
  },
  planSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
