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
import { loadGeneratorModule } from "../../../lib/loadGeneratorModule";
import { replaceExerciseInWorkout } from "../../../lib/workoutUtils";
import {
  blockTypeToSwapBlockRole,
  getSwapSuggestionsPage,
} from "../../../lib/exerciseProgressions";
import type { BlockType } from "../../../lib/types";
import { PRIMARY_FOCUS_TO_GOAL_SLUG } from "../../../lib/preferencesConstants";
import { isDbConfigured } from "../../../lib/db";
import { getPreferredExerciseNamesForSportAndGoals } from "../../../lib/db/starterExerciseRepository";
import { buildManualPreferenceSummaryLines } from "../../../lib/workoutPreferenceSummary";

export default function ManualWorkoutScreen() {
  const {
    generatedWorkout,
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    setGeneratedWorkout,
    setManualExecutionStarted,
    addSavedWorkout,
    savedWorkouts,
  } = useAppState();
  const router = useRouter();
  const theme = useTheme();

  const [swapModal, setSwapModal] = useState<{
    exerciseId: string;
    exerciseName: string;
    blockType: BlockType;
  } | null>(null);
  const [swapSuggested, setSwapSuggested] = useState<{ id: string; name: string }[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSuggestionPage, setSwapSuggestionPage] = useState(0);
  const [swapNumPages, setSwapNumPages] = useState(1);

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
  }, [swapModal?.exerciseId, swapModal?.blockType, manualPreferences.energyLevel, swapSuggestionPage]);

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

  const prefsForSummary =
    generatedWorkout.generationPreferences ?? manualPreferences;
  let summaryLines = buildManualPreferenceSummaryLines(prefsForSummary);
  if (summaryLines.length === 0) {
    summaryLines = [];
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
    const { generateWorkoutAsync } = await loadGeneratorModule();
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
          onSwap={(exerciseId, exerciseName, blockType) =>
            setSwapModal({ exerciseId, exerciseName, blockType })
          }
        />

        <View style={styles.footer}>
          <PrimaryButton
            label="Regenerate workout"
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
            onPress={() => {
              setManualExecutionStarted(true);
              router.push("/manual/execute");
            }}
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
