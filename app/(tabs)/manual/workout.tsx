import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { SwapExerciseModal } from "../../../components/SwapExerciseModal";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import { generateWorkoutAsync } from "../../../lib/generator";
import { replaceExerciseInWorkout } from "../../../lib/workoutUtils";
import { getProgressionsRegressionsForExercise } from "../../../lib/exerciseProgressions";
import { PRIMARY_FOCUS_TO_GOAL_SLUG } from "../../../lib/preferencesConstants";
import { isDbConfigured } from "../../../lib/db";
import { getPreferredExerciseNamesForSportAndGoals } from "../../../lib/db/starterExerciseRepository";

export default function ManualWorkoutScreen() {
  const {
    generatedWorkout,
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
    addSavedWorkout,
    savedWorkouts,
  } = useAppState();
  const router = useRouter();
  const theme = useTheme();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  if (generatedWorkout == null) {
    return (
      <AppScreenWrapper>
        <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No workout yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Set your preferences first and we'll build a session for you.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Go to Preferences"
              onPress={() => router.push("/manual/preferences")}
            />
          </View>
          {savedWorkouts.length > 0 && (
            <PrimaryButton
              label="Resume a saved workout"
              variant="secondary"
              onPress={() => router.push("/library")}
              style={{ marginTop: 12 }}
            />
          )}
        </View>
      </View>
      </AppScreenWrapper>
    );
  }

  const summaryLines: string[] = [];
  if (generatedWorkout.focus.length > 0) {
    summaryLines.push(generatedWorkout.focus.join(" • "));
  }
  if (generatedWorkout.durationMinutes != null) {
    summaryLines.push(`${generatedWorkout.durationMinutes} min`);
  }
  if (generatedWorkout.energyLevel != null) {
    const e = generatedWorkout.energyLevel;
    summaryLines.push(`${e.charAt(0).toUpperCase()}${e.slice(1)} energy`);
  }

  const onRegenerate = async () => {
    let preferredNames: string[] | undefined;
    if (isDbConfigured() && manualPreferences.primaryFocus.length > 0) {
      try {
        const goalSlugs = manualPreferences.primaryFocus
          .map((f) => PRIMARY_FOCUS_TO_GOAL_SLUG[f])
          .filter(Boolean);
        const goalWeightsPct = [
          manualPreferences.goalMatchPrimaryPct ?? 50,
          manualPreferences.goalMatchSecondaryPct ?? 30,
          manualPreferences.goalMatchTertiaryPct ?? 20,
        ];
        preferredNames = await getPreferredExerciseNamesForSportAndGoals(
          null,
          goalSlugs,
          goalWeightsPct.slice(0, goalSlugs.length)
        );
      } catch {
        preferredNames = undefined;
      }
    }
    const workout = await generateWorkoutAsync(
      manualPreferences,
      activeProfile,
      Date.now(),
      preferredNames
    );
    setGeneratedWorkout(workout);
  };

  const onSaveForLater = () => {
    addSavedWorkout({
      savedAt: new Date().toISOString(),
      workout: generatedWorkout,
    });
    setGeneratedWorkout(null);
    router.replace("/");
  };

  const [swapModal, setSwapModal] = useState<{ exerciseId: string; exerciseName: string } | null>(null);
  const [swapSuggested, setSwapSuggested] = useState<{ id: string; name: string }[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);

  useEffect(() => {
    if (!swapModal) {
      setSwapSuggested([]);
      return;
    }
    let cancelled = false;
    setSwapLoading(true);
    // #region agent log
    fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
      body: JSON.stringify({
        sessionId: "305ec8",
        location: "app/(tabs)/manual/workout.tsx:useEffect swap",
        message: "swap modal opened requesting suggestions",
        data: { exerciseId: swapModal.exerciseId, exerciseName: swapModal.exerciseName },
        timestamp: Date.now(),
        hypothesisId: "H5",
      }),
    }).catch(() => {});
    // #endregion
    getProgressionsRegressionsForExercise(swapModal.exerciseId).then((res) => {
      if (cancelled) return;
      const combined = [...res.regressions, ...res.progressions].slice(0, 3);
      // #region agent log
      fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
        body: JSON.stringify({
          sessionId: "305ec8",
          location: "app/(tabs)/manual/workout.tsx:useEffect swap then",
          message: "swap combined suggestions set",
          data: {
            exerciseId: swapModal.exerciseId,
            combinedLength: combined.length,
            progressionsLength: res.progressions.length,
            regressionsLength: res.regressions.length,
          },
          timestamp: Date.now(),
          hypothesisId: "H5",
        }),
      }).catch(() => {});
      // #endregion
      setSwapSuggested(combined);
      setSwapLoading(false);
    });
    return () => { cancelled = true; };
  }, [swapModal?.exerciseId]);

  const onSwapChoose = (optionId: string, optionName: string) => {
    if (generatedWorkout == null || swapModal == null) return;
    const updated = replaceExerciseInWorkout(
      generatedWorkout,
      swapModal.exerciseId,
      optionId,
      optionName
    );
    setGeneratedWorkout(updated);
    setSwapModal(null);
  };

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title="Summary"
          subtitle={summaryLines.join(" • ")}
          style={styles.summaryCard}
        >
          {generatedWorkout.notes != null ? (
            <Text style={[styles.notes, { color: theme.textMuted }]}>
              {generatedWorkout.notes}
            </Text>
          ) : null}
        </Card>

        <WorkoutBlockList
          workout={generatedWorkout}
          showSwap
          onSwap={(exerciseId, exerciseName) =>
            setSwapModal({ exerciseId, exerciseName })
          }
        />

        <View style={styles.footer}>
          <PrimaryButton
            label="Regenerate"
            variant="secondary"
            onPress={onRegenerate}
          />
          <PrimaryButton
            label="Save for later"
            variant="secondary"
            onPress={onSaveForLater}
            style={{ marginTop: 8 }}
          />
          <PrimaryButton
            label="Edit Preferences"
            variant="ghost"
            onPress={() => router.push("/manual/preferences")}
            style={{ marginTop: 8 }}
          />
          <PrimaryButton
            label="Start Workout"
            onPress={() => router.push("/manual/execute")}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>

      <SwapExerciseModal
        visible={swapModal != null}
        onClose={() => setSwapModal(null)}
        exerciseId={swapModal?.exerciseId ?? ""}
        exerciseName={swapModal?.exerciseName ?? ""}
        suggested={swapSuggested}
        loading={swapLoading}
        onChoose={onSwapChoose}
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
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  summaryCard: {
    marginBottom: 8,
  },
  notes: {
    fontSize: 13,
  },
  footer: {
    marginTop: 16,
    marginBottom: 24,
  },
});
