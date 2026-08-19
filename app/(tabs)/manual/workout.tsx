import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../../../context/AppStateContext";
import { useTheme } from "../../../lib/theme";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { Card } from "../../../components/Card";
import { PrimaryButton } from "../../../components/Button";
import { FlowPhaseNavBar } from "../../../components/FlowPhaseNavBar";
import { SwapExerciseModal } from "../../../components/SwapExerciseModal";
import { SaveNamedPlanModal } from "../../../components/SaveNamedPlanModal";
import { StartWorkoutPromptModal } from "../../../components/StartWorkoutPromptModal";
import { useSaveAndExecute } from "../../../lib/useSaveAndExecute";
import {
  reviewAndAdjustHint,
  saveAndExecuteHint,
  saveAndExecuteLabel,
} from "../../../lib/weekReviewCopy";
import { ACTIVE_WEEK_ROUTE } from "../../../lib/weekProgress";
import { savedDayFingerprint } from "../../../lib/saveNamedPlan";
import { getDesignatedWeekStartMonday, getTodayLocalDateString } from "../../../lib/dateUtils";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import { AddWorkoutBlockPanel } from "../../../components/AddWorkoutBlockPanel";
import type { AddWorkoutBlockRequest } from "../../../components/AddWorkoutBlockPanel";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import { generateAndAppendWorkoutBlock } from "../../../lib/appendGeneratedBlock";
import { loadGeneratorModule } from "../../../lib/loadGeneratorModule";
import { replaceExerciseInWorkout, updateExercisePrescriptionInWorkout, collectWorkoutExerciseIds } from "../../../lib/workoutUtils";
import { ensureCuratedDescriptionsLoaded, resolveSwapExerciseDescription } from "../../../lib/exerciseDescriptionsCurated";
import {
  blockTypeToSwapBlockRole,
  getSwapSuggestionsPage,
} from "../../../lib/exerciseProgressions";
import type { BlockType } from "../../../lib/types";
import { preferredExerciseNamesForManualPreferences } from "../../../lib/manualPreferredExerciseNames";
import { buildManualPreferenceSummaryLines } from "../../../lib/workoutPreferenceSummary";
import { buildWorkoutIntentTitle } from "../../../lib/workoutIntentSplit";
import { manualGoalPreferencesHref } from "../../../lib/manualGoalPreferencesHref";
import { composeRunGenerationSeed } from "../../../lib/generationSeed";

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
    manualGoalPreferencesScope,
    workoutHistory,
    manualSessionProgress,
  } = useAppState();
  const router = useRouter();
  const manualPrefsHref = manualGoalPreferencesHref(manualGoalPreferencesScope);
  const theme = useTheme();
  const {
    save: { dialog: saveDialog, busy: saveBusy, isSaved, confirmSave, cancelSave },
    startTarget,
    requestSaveAndExecute,
    confirmStart,
    dismissStart,
  } = useSaveAndExecute();

  const startWorkout = useCallback(() => {
    setManualExecutionStarted(true);
    router.push("/manual/execute");
  }, [setManualExecutionStarted, router]);

  /** Save this session to the library, then offer to train it now. */
  const onSaveAndExecute = useCallback(() => {
    if (!generatedWorkout) return;
    const title = generatedWorkout.intentSplit
      ? buildWorkoutIntentTitle(generatedWorkout.intentSplit)
      : undefined;
    requestSaveAndExecute({
      kind: "day",
      weekStartDate: getDesignatedWeekStartMonday(),
      days: [
        {
          date: getTodayLocalDateString(),
          workout: generatedWorkout,
          displayTitle: title ?? undefined,
        },
      ],
      source: "manual",
      onStart: startWorkout,
      onDecline: () => router.replace(ACTIVE_WEEK_ROUTE as never),
    });
  }, [generatedWorkout, requestSaveAndExecute, startWorkout, router]);

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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [navBarHeight, setNavBarHeight] = useState(72);
  const generationCancelledRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      generationCancelledRef.current = false;
      setIsRegenerating(false);
      setIsAddingBlock(false);
      return () => {
        generationCancelledRef.current = true;
        setIsRegenerating(false);
        setIsAddingBlock(false);
      };
    }, [])
  );

  useEffect(() => {
    void ensureCuratedDescriptionsLoaded().catch(() => {
      /* Loader resets on failure so the next mount retries. */
    });
  }, []);

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
        swapPoolExerciseIds: swapModal.swapPoolExerciseIds,
        workoutTier: manualPreferences.workoutTier ?? "intermediate",
        includeCreativeVariations: manualPreferences.includeCreativeVariations === true,
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
    swapModal?.swapPoolExerciseIds,
    manualPreferences.energyLevel,
    manualPreferences.workoutTier,
    manualPreferences.includeCreativeVariations,
    swapSuggestionPage,
  ]);

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  if (generatedWorkout == null) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No workout yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Set your preferences first and we will build a session for you.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Go to Preferences"
              onPress={() => router.push(manualPrefsHref)}
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

  const intentSplit = generatedWorkout.intentSplit;
  const workoutTitle = intentSplit ? buildWorkoutIntentTitle(intentSplit) : null;

  const onRegenerate = async () => {
    generationCancelledRef.current = false;
    setIsRegenerating(true);
    try {
      const [preferredNames, { generateWorkoutAsync }] = await Promise.all([
        preferredExerciseNamesForManualPreferences(manualPreferences),
        loadGeneratorModule(),
      ]);
      if (generationCancelledRef.current) return;
      const workout = await generateWorkoutAsync(
        manualPreferences,
        activeProfile,
        composeRunGenerationSeed(),
        preferredNames,
        {
          regeneration_avoid_exercise_ids: collectWorkoutExerciseIds(generatedWorkout),
        },
        {
          historySources: {
            workoutHistory,
            savedWorkouts,
            inProgressWorkout: generatedWorkout,
            inProgressProgress: manualSessionProgress,
            regenerationAvoidExerciseIds: collectWorkoutExerciseIds(generatedWorkout),
          },
        }
      );
      if (generationCancelledRef.current) return;
      setGeneratedWorkout(workout);
    } catch (e) {
      if (generationCancelledRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't regenerate workout", msg);
    } finally {
      setIsRegenerating(false);
    }
  };

  const onSaveForLater = () => {
    addSavedWorkout({
      savedAt: new Date().toISOString(),
      workout: generatedWorkout,
    });
    setGeneratedWorkout(null);
    router.replace("/");
  };

  const onSwapChoose = async (optionId: string, optionName: string) => {
    if (generatedWorkout == null || swapModal == null) return;
    const updated = replaceExerciseInWorkout(
      generatedWorkout,
      swapModal.exerciseId,
      optionId,
      optionName,
      await resolveSwapExerciseDescription(optionId)
    );
    setGeneratedWorkout(updated);
    setSwapModal(null);
  };

  const onEditPrescription = (
    exerciseId: string,
    edit: { sets: number; reps?: number; time_seconds?: number }
  ) => {
    if (generatedWorkout == null) return;
    setGeneratedWorkout(
      updateExercisePrescriptionInWorkout(generatedWorkout, exerciseId, edit)
    );
  };

  const onAddBlock = async (request: AddWorkoutBlockRequest) => {
    if (generatedWorkout == null || isAddingBlock) return;
    setIsAddingBlock(true);
    try {
      const updated = await generateAndAppendWorkoutBlock({
        workout: generatedWorkout,
        basePreferences: generatedWorkout.generationPreferences ?? manualPreferences,
        gymProfile: activeProfile,
        blockType: request.blockType,
        bodyChoiceId: request.bodyChoiceId,
        historySources: {
          workoutHistory,
          savedWorkouts,
          inProgressWorkout: generatedWorkout,
          inProgressProgress: manualSessionProgress,
          regenerationAvoidExerciseIds: collectWorkoutExerciseIds(generatedWorkout),
        },
      });
      if (generationCancelledRef.current) return;
      setGeneratedWorkout(updated);
    } catch (e) {
      if (generationCancelledRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't add block", msg);
    } finally {
      setIsAddingBlock(false);
    }
  };

  if (isRegenerating) {
    return (
      <GenerationLoadingScreen
        message="Regenerating your workout…"
        subtitle="Refreshing exercises with your latest preferences."
      />
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
        <Card
          title={workoutTitle ?? "Summary"}
          subtitle={summaryLines.join(" • ")}
          style={styles.summaryCard}
        >
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            {reviewAndAdjustHint({ multipleDays: false })}
          </Text>
        </Card>

        <WorkoutBlockList
          workout={generatedWorkout}
          showSwap
          onSwap={(exerciseId, exerciseName, blockType, swapPoolExerciseIds) =>
            setSwapModal({ exerciseId, exerciseName, blockType, swapPoolExerciseIds })
          }
          showEditPrescription
          onEditPrescription={onEditPrescription}
        />

        <AddWorkoutBlockPanel onAdd={onAddBlock} adding={isAddingBlock} />

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
        </View>
      </ScrollView>

      <FlowPhaseNavBar
        sticky
        onLayout={setNavBarHeight}
        forward={{
          label: saveAndExecuteLabel({
            multipleDays: false,
            busy: saveBusy,
            alreadySaved: isSaved(
              savedDayFingerprint(getTodayLocalDateString(), generatedWorkout.id)
            ),
          }),
          onPress: onSaveAndExecute,
          disabled: saveBusy || saveDialog != null,
          loading: saveBusy,
        }}
        hint={saveAndExecuteHint({ multipleDays: false })}
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
      {saveDialog ? (
        <SaveNamedPlanModal
          visible
          kind={saveDialog.kind}
          defaultName={saveDialog.defaultName}
          busy={saveBusy}
          onCancel={cancelSave}
          onSave={confirmSave}
        />
      ) : null}
      <StartWorkoutPromptModal
        target={startTarget}
        onStart={confirmStart}
        onDismiss={dismissStart}
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
  footer: {
    marginTop: 16,
    marginBottom: 24,
  },
});
