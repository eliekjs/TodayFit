import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { themeRadius, useTheme } from "../../../lib/theme";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { useAppState } from "../../../context/AppStateContext";
import { PrimaryButton } from "../../../components/Button";
import { SaveNamedPlanModal } from "../../../components/SaveNamedPlanModal";
import { FlowPhaseNavBar } from "../../../components/FlowPhaseNavBar";
import { backLabelForPhase } from "../../../lib/sessionFlowNav";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { AdjustFocusModal, type FocusSection } from "../../../components/AdjustFocusModal";
import { DayFocusOverrideChips } from "../../../components/DayFocusOverrideChips";
import { SwapExerciseModal } from "../../../components/SwapExerciseModal";
import { DiscardSessionLink } from "../../navigation/tabFlowChrome";
import { getLocalDateString, getTodayLocalDateString, parseLocalDate, getDesignatedWeekStartMonday } from "../../../lib/dateUtils";
import {
  remapDateKeyedRecord,
  remapManualWeekToStart,
} from "../../../lib/weekDesignation";
import { WeekDesignationPicker } from "../../../components/WeekDesignationPicker";
import {
  saveDayButtonLabel,
  savedDayFingerprint,
  savedWeekFingerprint,
} from "../../../lib/saveNamedPlan";
import { useSaveAndExecute } from "../../../lib/useSaveAndExecute";
import { StartWorkoutPromptModal } from "../../../components/StartWorkoutPromptModal";
import {
  reviewAndAdjustHint,
  saveAndExecuteHint,
  saveAndExecuteLabel,
} from "../../../lib/weekReviewCopy";
import { ACTIVE_WEEK_ROUTE } from "../../../lib/weekProgress";
import { preferredExerciseNamesForManualPreferences } from "../../../lib/manualPreferredExerciseNames";
import { loadGeneratorModule } from "../../../lib/loadGeneratorModule";
import { composeRunGenerationSeed } from "../../../lib/generationSeed";
import { collectWeekMainLiftExerciseIds } from "../../../logic/workoutGeneration/collectWeekMainLiftExerciseIds";
import {
  accumulateWeeklySubFocusCountsFromGeneratedWorkout,
  buildWeeklySubFocusKeysFromPreferences,
} from "../../../logic/workoutGeneration/weeklySubFocusCoveragePlan";
import type { Exercise } from "../../../logic/workoutGeneration/types";
import { replaceExerciseInWorkout, collectWorkoutExerciseIds, updateExercisePrescriptionInWorkout } from "../../../lib/workoutUtils";
import { ensureCuratedDescriptionsLoaded, getCuratedExerciseDescription } from "../../../lib/exerciseDescriptionsCurated";
import {
  blockTypeToSwapBlockRole,
  getSwapSuggestionsPage,
  generatorGoalToSwapTagSlugs,
} from "../../../lib/exerciseProgressions";
import { GOAL_SLUG_TO_PRIMARY_FOCUS, PRIMARY_FOCUS_TO_GOAL_SLUG } from "../../../lib/preferencesConstants";
import { getBodyEmphasisDistribution } from "../../../services/sportPrepPlanner/weeklyEmphasis";
import { formatDayTitle, isSpecificFocusRelevantForBody } from "../../../lib/dayTitle";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import { AddWorkoutBlockPanel } from "../../../components/AddWorkoutBlockPanel";
import type { AddWorkoutBlockRequest } from "../../../components/AddWorkoutBlockPanel";
import { generateAndAppendWorkoutBlock } from "../../../lib/appendGeneratedBlock";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import {
  canProceedWithWeeklyGoalDistribution,
  shouldShowWeeklyGoalDistributionNote,
} from "../../../lib/sessionFocusDistribution";
import {
  applyBodyChoicesSubFocusToPrefs,
  buildDayBodyFocusChoicesForDay,
  buildDayFocusPresetsForDay,
  buildBodyFocusSummary,
  buildPriorityFocusSummary,
  bodyFocusEmphasisLabelForPicks,
  conflictBodyIdForPicks,
  dayBodyFocusChoicesToBias,
  decodeDayBodyFocusPicks,
  encodeDayBodyFocusPicks,
  getBodyFocusDistributionForMode,
  resolveDayFocusPreset,
  resolveWeeklyBodyFocusMode,
  shouldApplyHypertrophySubFocusForBodyChoice,
  defaultPresetIdForWeekDay,
  sportGoalPrioritySectionNote,
  presetUsesExclusiveDayFocus,
  toggleDayBodyFocusPick,
  type DayBodyFocusChoice,
  type DayBodyFocusChoiceId,
  type DayFocusPreset,
} from "../../../lib/weekDaySessionFocus";
import { recommendWeekDayFocus, weekFocusRecommendationSeed } from "../../../lib/weekDayFocusRecommendation";
import { resolveDailyBodyFocusMode, sessionBiasFromDailyBodyOverride } from "../../../lib/sessionBodyContract";
import {
  buildSubFocusOverrideAligningToBody,
  mapBodyResolutionToMode,
  shouldPromptSubFocusConflictForTrigger,
} from "../../../lib/bodyFocusModeOverride";
import { WeekDayFocusPlanner, WeekDayFocusSummaryCard } from "../../../components/WeekDayFocusPlanner";
import {
  applyDaySessionFocusResolution,
  dayHasUnresolvedSessionFocusConflict,
  detectDaySessionFocusConflict,
  mergeDaySubFocusOverride,
  shouldSurfaceDaySessionFocusConflict,
  type DaySessionFocusResolution,
} from "../../../lib/daySessionFocusConflict";
import { filterSubFocusMapsToFocusLabels } from "../../../lib/subFocusWeights";
import {
  dayIndexForUncoveredRecommendation,
  detectUncoveredSubGoalsForWeek,
  matchingSubFocusNamesForBodyPicks,
  type UncoveredSubGoalResolution,
} from "../../../lib/subGoalSplitCoverage";
import type {
  BlockType,
  DailyWorkoutPreferences,
  GoalDistributionStyle,
  ManualWeekPlan,
  WeeklyBodyFocusMode,
} from "../../../lib/types";
import { normalizeGeneratedWorkout } from "../../../lib/types";
import { navigateToManualGoalPreferences } from "../../../lib/manualGoalPreferencesHref";
import { weekSetupAtPickDays, weekSetupDraftEqual } from "../../../lib/sessionDraft";

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateToISO(d: Date): string {
  return getLocalDateString(d);
}

function assignedGoalForExerciseFromWorkout(
  workout: import("../../../lib/types").GeneratedWorkout | undefined,
  exerciseId: string
): string | undefined {
  if (!workout?.blocks?.length) return undefined;
  for (const b of workout.blocks) {
    const pairs = b.supersetPairs;
    if (pairs?.length) {
      for (const pair of pairs) {
        for (const it of pair) {
          if (it.exercise_id === exerciseId) return it.session_intent_links?.goals?.[0];
        }
      }
      continue;
    }
    for (const it of b.items ?? []) {
      if (it.exercise_id === exerciseId) return it.session_intent_links?.goals?.[0];
    }
  }
  return undefined;
}

/** 0 = Monday, 6 = Sunday (matches week display order). */
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Format ISO date as day of week in user's locale (e.g. "Monday"). */
function formatDayOfWeek(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString(undefined, {
    weekday: "long",
  });
}

export default function ManualWeekScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    manualPreferences,
    updateManualPreferences,
    activeGymProfileId,
    gymProfiles,
    manualWeekPlan,
    setManualWeekPlan,
    setGeneratedWorkout,
    setResumeProgress,
    setManualExecutionStarted,
    adaptiveSetup,
    setManualGoalPreferencesScope,
    workoutHistory,
    savedWorkouts,
    manualSessionProgress,
    beginSessionFlow,
    updateActiveSessionDraft,
    activeSessionDraft,
  } = useAppState();
  const {
    save: {
      dialog: saveDialog,
      busy: saveBusy,
      isSaved,
      requestSaveDay,
      confirmSave,
      cancelSave,
    },
    startTarget,
    requestSaveAndExecute,
    confirmStart,
    dismissStart,
  } = useSaveAndExecute();
  const goBackToWeekPreferences = useCallback(() => {
    const next = weekSetupAtPickDays(activeSessionDraft?.weekSetup);
    if (next && next !== activeSessionDraft?.weekSetup) {
      updateActiveSessionDraft({ weekSetup: next });
    }
    navigateToManualGoalPreferences(router, "week", { replace: true });
  }, [router, activeSessionDraft?.weekSetup, updateActiveSessionDraft]);

  useFocusEffect(
    useCallback(() => {
      weekScreenFocusedRef.current = true;
      generationCancelledRef.current = false;
      setGenerating(false);
      setIsRegenerating(false);
      setIsAddingBlock(false);
      setManualGoalPreferencesScope("week");
      beginSessionFlow("goal_week");
      if (activeSessionDraft?.weekSetup?.step === "pickDays") {
        setWeekSetupStep("pickDays");
      }
      return () => {
        weekScreenFocusedRef.current = false;
        generationCancelledRef.current = true;
        setGenerating(false);
        setIsRegenerating(false);
        setIsAddingBlock(false);
      };
    }, [setManualGoalPreferencesScope, beginSessionFlow, activeSessionDraft?.weekSetup?.step])
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustFocusModal, setShowAdjustFocusModal] = useState(false);
  /** Per-day regenerate chips (goal, body, energy, volume). Keyed by session date so days don't share state. */
  const [dailyPrefsOverrideByDate, setDailyPrefsOverrideByDate] = useState<
    Record<string, DailyWorkoutPreferences>
  >({});
  const [focusEditorExpandSignal, setFocusEditorExpandSignal] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  /** Which weekdays to generate workouts for. 0 = Mon, 6 = Sun. Default Mon, Wed, Fri. */
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<number[]>([0, 2, 4]);
  /** Selected session (date + workout) for detail view, matching adaptive mode. */
  const [selectedSession, setSelectedSession] = useState<{ date: string; workout: ManualWeekPlan["days"][0]["workout"]; displayTitle?: string } | null>(null);
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
  /** Weekly flow: pick training days, then choose sport/goal focus per day before generating. */
  const [weekSetupStep, setWeekSetupStep] = useState<"pickDays" | "sessionFocus">("pickDays");
  /** Parallel to selectedTrainingDays: preset id from buildDayFocusPresetsForDay / resolveDayFocusPreset. */
  const [dayFocusChoiceIds, setDayFocusChoiceIds] = useState<string[]>([]);
  const [dayBodyFocusPicks, setDayBodyFocusPicks] = useState<DayBodyFocusChoiceId[][]>([]);
  /** Per-day sub-focus overrides after conflict resolution (merged at generation). */
  const [daySubFocusOverrides, setDaySubFocusOverrides] = useState<
    Record<number, Record<string, string[]>>
  >({});
  /** Conflict id marked resolved per day index. */
  const [resolvedConflictIdsByDay, setResolvedConflictIdsByDay] = useState<Record<number, string>>(
    {}
  );
  const [navBarHeight, setNavBarHeight] = useState(72);
  /** Inline day banners wait until generate — not while choosing body-focus mode/chips. */
  const [revealDayFocusConflicts, setRevealDayFocusConflicts] = useState(false);
  const [acknowledgedUncoveredSubGoalId, setAcknowledgedUncoveredSubGoalId] = useState<
    string | undefined
  >(undefined);

  const sessionHydratedRef = useRef(false);
  const weekScreenFocusedRef = useRef(true);
  const [recommendationSeed, setRecommendationSeed] = useState<string | undefined>(undefined);
  useEffect(() => {
    sessionHydratedRef.current = false;
  }, [activeSessionDraft?.id]);

  useEffect(() => {
    const ws = activeSessionDraft?.weekSetup;
    if (!ws || sessionHydratedRef.current) return;
    if (ws.selectedTrainingDays.length > 0) {
      setSelectedTrainingDays(ws.selectedTrainingDays);
    }
    setWeekSetupStep(ws.step);
    if (ws.dayFocusChoiceIds.length > 0) {
      setDayFocusChoiceIds(ws.dayFocusChoiceIds);
    }
    if (ws.dayBodyFocusChoiceIds?.length) {
      setDayBodyFocusPicks(ws.dayBodyFocusChoiceIds.map((raw) => decodeDayBodyFocusPicks(raw)));
    }
    setRecommendationSeed(ws.recommendationSeed);
    sessionHydratedRef.current = true;
  }, [activeSessionDraft?.id, activeSessionDraft?.weekSetup]);

  useEffect(() => {
    if (!weekScreenFocusedRef.current) return;
    const nextWeekSetup = {
      enteredWeekScreen: true,
      step: weekSetupStep,
      selectedTrainingDays,
      dayFocusChoiceIds,
      dayBodyFocusChoiceIds: dayBodyFocusPicks.map(encodeDayBodyFocusPicks),
      recommendationSeed,
    };
    const prev = activeSessionDraft?.weekSetup;
    if (weekSetupDraftEqual(prev, nextWeekSetup)) {
      return;
    }
    updateActiveSessionDraft({ weekSetup: nextWeekSetup });
  }, [
    weekSetupStep,
    selectedTrainingDays,
    dayFocusChoiceIds,
    dayBodyFocusPicks,
    recommendationSeed,
    updateActiveSessionDraft,
    activeSessionDraft?.weekSetup,
  ]);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const dayFocusSectionRef = useRef<View>(null);
  const generationCancelledRef = useRef(false);
  const scrollToDayFocusSection = useCallback(() => {
    const content = scrollContentRef.current;
    const section = dayFocusSectionRef.current;
    if (!content || !section) return;
    section.measureLayout(
      content as any,
      (_x: number, y: number) => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, y - 24),
          animated: true,
        });
      }
    );
  }, []);

  const focusSectionsForModal = useMemo((): FocusSection[] => {
    const goals = manualPreferences.primaryFocus;
    if (goals.length === 0) return [];
    const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
    const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
    const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
    const percentages = [p1, p2, p3].slice(0, goals.length);
    if (percentages.reduce((a, b) => a + b, 0) !== 100 && goals.length > 0) {
      const sum = percentages.reduce((a, b) => a + b, 0);
      percentages[0] = Math.max(0, percentages[0] + (100 - (sum || 1)));
    }
    return [
      {
        title: "Goals",
        items: goals.map((g) => ({ id: g, label: g })),
        percentages,
      },
    ];
  }, [manualPreferences.primaryFocus, manualPreferences.goalMatchPrimaryPct, manualPreferences.goalMatchSecondaryPct, manualPreferences.goalMatchTertiaryPct]);

  const bodyFocusMode = resolveWeeklyBodyFocusMode(manualPreferences.weeklyBodyFocusMode);
  const sessionFocusMeta = useMemo(() => {
    if (selectedTrainingDays.length === 0) {
      return {
        labels: [] as string[],
        bodyOptions: [] as DayBodyFocusChoice[][],
        presets: [] as DayFocusPreset[][],
        recommendationSummaries: [] as string[],
      };
    }
    const n = selectedTrainingDays.length;
    const bd = getBodyEmphasisDistribution(n);
    const templateIds = getBodyFocusDistributionForMode(bodyFocusMode, n, bd);
    const weekStart = manualWeekPlan?.weekStartDate
      ? parseLocalDate(manualWeekPlan.weekStartDate)
      : parseLocalDate(getDesignatedWeekStartMonday());
    const labels = selectedTrainingDays.map((dow, i) => {
      const date = addDays(weekStart, dow);
      const picks = dayBodyFocusPicks[i]?.length
        ? dayBodyFocusPicks[i]!
        : templateIds[i]
          ? [templateIds[i]!]
          : (["full"] as DayBodyFocusChoiceId[]);
      return `${formatDayOfWeek(dateToISO(date))} · ${bodyFocusEmphasisLabelForPicks(picks)}`;
    });
    const bodyOptions = selectedTrainingDays.map((_, i) =>
      buildDayBodyFocusChoicesForDay({
        manualPreferences,
        adaptiveSetup,
        slotIndex: i,
        fallbackTargetBody: bd[i]!.targetBody,
        fallbackTargetModifier: bd[i]!.targetModifier,
        mode: bodyFocusMode,
        templateChoiceId: templateIds[i],
      })
    );
    const presets = selectedTrainingDays.map((_, i) => {
      const picks = dayBodyFocusPicks[i]?.length
        ? dayBodyFocusPicks[i]!
        : templateIds[i]
          ? [templateIds[i]!]
          : (["full"] as DayBodyFocusChoiceId[]);
      const b = dayBodyFocusChoicesToBias(picks);
      return buildDayFocusPresetsForDay({
        manualPreferences,
        adaptiveSetup,
        targetBody: b.targetBody,
        targetModifier: b.targetModifier,
        specificBodyFocus: b.specificBodyFocus,
        bodyChoiceIds: picks,
      });
    });
    const recommendations = recommendWeekDayFocus({
      gymDays: n,
      manualPreferences,
      adaptiveSetup,
      dedicateDays:
        manualPreferences.goalDistributionStyle === "dedicate_days" &&
        manualPreferences.primaryFocus.length > 0,
    });
    return {
      labels,
      bodyOptions,
      presets,
      recommendationSummaries: recommendations.days.map((d) => d.summary),
    };
  }, [
    selectedTrainingDays,
    manualPreferences,
    adaptiveSetup,
    dayBodyFocusPicks,
    bodyFocusMode,
    manualWeekPlan?.weekStartDate,
  ]);

  const daySessionFocusConflicts = useMemo(() => {
    if (selectedTrainingDays.length === 0) return [];
    return selectedTrainingDays.map((_, i) =>
      detectDaySessionFocusConflict({
        bodyFocusId: conflictBodyIdForPicks(dayBodyFocusPicks[i] ?? []),
        focusPresetId: dayFocusChoiceIds[i] ?? "",
        manualPreferences,
        adaptiveSetup,
        presetOptions: sessionFocusMeta.presets[i] ?? [],
        subFocusByGoalOverride: daySubFocusOverrides[i],
      })
    );
  }, [
    selectedTrainingDays,
    dayBodyFocusPicks,
    dayFocusChoiceIds,
    manualPreferences,
    adaptiveSetup,
    sessionFocusMeta.presets,
    daySubFocusOverrides,
  ]);

  const daySessionFocusConflictsToSurface = useMemo(
    () =>
      daySessionFocusConflicts.map((conflict) =>
        shouldSurfaceDaySessionFocusConflict({
          conflict,
          weekDayBodyIds: dayBodyFocusPicks.flat(),
        })
          ? conflict
          : null
      ),
    [daySessionFocusConflicts, dayBodyFocusPicks]
  );

  useEffect(() => {
    setResolvedConflictIdsByDay((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [dayIdxStr, resolvedId] of Object.entries(prev)) {
        const dayIdx = Number(dayIdxStr);
        const conflict = daySessionFocusConflictsToSurface[dayIdx] ?? null;
        if (!conflict || conflict.id !== resolvedId) {
          delete next[dayIdx];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setDaySubFocusOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const dayIdxStr of Object.keys(prev)) {
        const dayIdx = Number(dayIdxStr);
        if (!daySessionFocusConflictsToSurface[dayIdx]) {
          delete next[dayIdx];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [daySessionFocusConflictsToSurface]);

  const hasUnresolvedDayConflicts = useMemo(
    () =>
      daySessionFocusConflictsToSurface.some((c, i) =>
        dayHasUnresolvedSessionFocusConflict(c, resolvedConflictIdsByDay[i])
      ),
    [daySessionFocusConflictsToSurface, resolvedConflictIdsByDay]
  );

  const uncoveredSubGoalPrompt = useMemo(
    () =>
      detectUncoveredSubGoalsForWeek({
        manualPreferences,
        dayBodyPicks: dayBodyFocusPicks,
        mode: bodyFocusMode,
      }),
    [manualPreferences, dayBodyFocusPicks, bodyFocusMode]
  );

  const hasUnresolvedUncoveredSubGoals =
    uncoveredSubGoalPrompt != null &&
    acknowledgedUncoveredSubGoalId !== uncoveredSubGoalPrompt.id;

  useEffect(() => {
    if (!uncoveredSubGoalPrompt) {
      setAcknowledgedUncoveredSubGoalId(undefined);
      return;
    }
    if (
      acknowledgedUncoveredSubGoalId &&
      acknowledgedUncoveredSubGoalId !== uncoveredSubGoalPrompt.id
    ) {
      setAcknowledgedUncoveredSubGoalId(undefined);
    }
  }, [uncoveredSubGoalPrompt, acknowledgedUncoveredSubGoalId]);

  const showWeeklyGoalDistribution = shouldShowWeeklyGoalDistributionNote(
    manualPreferences.primaryFocus.length
  );
  const weeklyGoalDistributionGate = canProceedWithWeeklyGoalDistribution(
    manualPreferences.goalDistributionStyle,
    manualPreferences.primaryFocus.length
  );

  const clearDayConflictState = useCallback((dayIdx: number) => {
    setResolvedConflictIdsByDay((prev) => {
      if (prev[dayIdx] == null) return prev;
      const next = { ...prev };
      delete next[dayIdx];
      return next;
    });
    setDaySubFocusOverrides((prev) => {
      if (prev[dayIdx] == null) return prev;
      const next = { ...prev };
      delete next[dayIdx];
      return next;
    });
  }, []);

  const handleApplyDayResolution = useCallback(
    (dayIdx: number, resolution: DaySessionFocusResolution) => {
      const conflict = daySessionFocusConflictsToSurface[dayIdx];
      if (!conflict) return;
      const mapped: DaySessionFocusResolution = resolution.bodyFocusId
        ? {
            ...resolution,
            bodyFocusId: mapBodyResolutionToMode(resolution.bodyFocusId, bodyFocusMode),
          }
        : resolution;
      applyDaySessionFocusResolution({
        dayIndex: dayIdx,
        resolution: mapped,
        conflict,
        subFocusByGoal: manualPreferences.subFocusByGoal ?? {},
        setBodyFocusId: (idx, id) => {
          setDayBodyFocusPicks((prev) => {
            const next = [...prev];
            next[idx] = [id];
            return next;
          });
        },
        setFocusPresetId: (idx, presetId) => {
          setDayFocusChoiceIds((prev) => {
            const next = [...prev];
            next[idx] = presetId;
            return next;
          });
        },
        setSubFocusOverride: (idx, patch) => {
          setDaySubFocusOverrides((prev) => {
            const next = { ...prev };
            if (patch) next[idx] = patch;
            else delete next[idx];
            return next;
          });
        },
        setResolvedConflictId: (idx, conflictId) => {
          setResolvedConflictIdsByDay((prev) => ({ ...prev, [idx]: conflictId }));
        },
      });
    },
    [daySessionFocusConflictsToSurface, manualPreferences.subFocusByGoal, bodyFocusMode]
  );

  const applyWeeklyBodyFocusMode = useCallback(
    (mode: WeeklyBodyFocusMode, bodyPicks: DayBodyFocusChoiceId[][]) => {
      updateManualPreferences({ weeklyBodyFocusMode: mode });
      setDayBodyFocusPicks(bodyPicks);
      setDaySubFocusOverrides({});
      setResolvedConflictIdsByDay({});
    },
    [updateManualPreferences]
  );

  const reseedBodyFocusForMode = useCallback(
    (mode: WeeklyBodyFocusMode) => {
      const n = selectedTrainingDays.length;
      if (n === 0) return [] as DayBodyFocusChoiceId[][];
      const rec = recommendWeekDayFocus({
        gymDays: n,
        manualPreferences: { ...manualPreferences, weeklyBodyFocusMode: mode },
        adaptiveSetup,
        dedicateDays:
          manualPreferences.goalDistributionStyle === "dedicate_days" &&
          manualPreferences.primaryFocus.length > 0,
      });
      return rec.days.map((d) => d.bodyIds);
    },
    [selectedTrainingDays, manualPreferences, adaptiveSetup]
  );

  const handleChangeWeeklyBodyFocusMode = useCallback(
    (mode: WeeklyBodyFocusMode) => {
      if (mode === bodyFocusMode) return;
      // Reseed immediately. Sub-goal vs body prompts wait until generate.
      const bodyIds = reseedBodyFocusForMode(mode);
      setRevealDayFocusConflicts(false);
      setAcknowledgedUncoveredSubGoalId(undefined);
      applyWeeklyBodyFocusMode(mode, bodyIds);
    },
    [bodyFocusMode, reseedBodyFocusForMode, applyWeeklyBodyFocusMode]
  );

  const applyDayBodySelect = useCallback(
    (dayIdx: number, id: DayBodyFocusChoiceId, alignSubFocus: boolean) => {
      setResolvedConflictIdsByDay((prev) => {
        if (prev[dayIdx] == null) return prev;
        const next = { ...prev };
        delete next[dayIdx];
        return next;
      });
      setDayBodyFocusPicks((prev) => {
        const next = [...prev];
        next[dayIdx] = toggleDayBodyFocusPick(next[dayIdx] ?? [], id);
        return next;
      });
      setDaySubFocusOverrides((prev) => {
        if (alignSubFocus) {
          const patch = buildSubFocusOverrideAligningToBody(
            id,
            manualPreferences,
            prev[dayIdx]
          );
          if (!patch) {
            if (prev[dayIdx] == null) return prev;
            const next = { ...prev };
            delete next[dayIdx];
            return next;
          }
          return { ...prev, [dayIdx]: patch };
        }
        if (prev[dayIdx] == null) return prev;
        const next = { ...prev };
        delete next[dayIdx];
        return next;
      });
    },
    [manualPreferences]
  );

  const handleApplyUncoveredResolution = useCallback(
    (resolution: UncoveredSubGoalResolution) => {
      if (resolution.acknowledge) {
        if (uncoveredSubGoalPrompt) {
          setAcknowledgedUncoveredSubGoalId(uncoveredSubGoalPrompt.id);
        }
        return;
      }
      if (!resolution.bodyFocusId) return;
      const slug = uncoveredSubGoalPrompt?.uncovered[0]?.slug;
      setDayBodyFocusPicks((prev) => {
        const next = prev.map((picks) => [...picks]);
        const idx = dayIndexForUncoveredRecommendation(next, resolution.bodyFocusId!, slug);
        next[idx] = [resolution.bodyFocusId!];
        return next;
      });
    },
    [uncoveredSubGoalPrompt]
  );

  const handleSelectDayBody = useCallback(
    (dayIdx: number, id: DayBodyFocusChoiceId) => {
      applyDayBodySelect(dayIdx, id, false);
    },
    [applyDayBodySelect]
  );

  const initSessionFocusStep = useCallback(() => {
    if (selectedTrainingDays.length === 0) return;
    const n = selectedTrainingDays.length;
    const dedicateDays =
      manualPreferences.goalDistributionStyle === "dedicate_days" &&
      manualPreferences.primaryFocus.length > 0;
    const rec = recommendWeekDayFocus({
      gymDays: n,
      manualPreferences,
      adaptiveSetup,
      dedicateDays,
    });
    if (!manualPreferences.weeklyBodyFocusMode && rec.mode) {
      updateManualPreferences({ weeklyBodyFocusMode: rec.mode });
    }
    setDayBodyFocusPicks(rec.days.map((d) => d.bodyIds));
    setDayFocusChoiceIds(rec.days.map((d) => d.goalPresetId));
    const overrides: Record<number, Record<string, string[]>> = {};
    rec.days.forEach((d, i) => {
      if (d.subFocusByGoal) overrides[i] = d.subFocusByGoal;
    });
    setDaySubFocusOverrides(overrides);
    setResolvedConflictIdsByDay({});
    setRevealDayFocusConflicts(false);
    setRecommendationSeed(weekFocusRecommendationSeed({ manualPreferences, adaptiveSetup }));
    setWeekSetupStep("sessionFocus");
  }, [selectedTrainingDays, manualPreferences, adaptiveSetup, updateManualPreferences]);

  /** Always show per-day body + goal priority before generating (initial or regenerate). */
  const enterSessionFocusForGeneration = useCallback(() => {
    const n = selectedTrainingDays.length;
    const bodyIdsValidForMode =
      n > 0 &&
      dayBodyFocusPicks.length === n &&
      dayBodyFocusPicks.every((picks, i) =>
        picks.every((id) => (sessionFocusMeta.bodyOptions[i] ?? []).some((c) => c.id === id))
      );
    const choicesMatchDays =
      n > 0 && dayFocusChoiceIds.length === n && bodyIdsValidForMode;
    const seed = weekFocusRecommendationSeed({ manualPreferences, adaptiveSetup });
    if (choicesMatchDays && recommendationSeed === seed) {
      setWeekSetupStep("sessionFocus");
    } else {
      initSessionFocusStep();
    }
    setManualWeekPlan(null);
    setSelectedSession(null);
  }, [
    selectedTrainingDays.length,
    dayFocusChoiceIds.length,
    dayBodyFocusPicks,
    sessionFocusMeta.bodyOptions,
    initSessionFocusStep,
    setManualWeekPlan,
    manualPreferences,
    adaptiveSetup,
    recommendationSeed,
  ]);

  const toggleTrainingDay = useCallback((dow: number) => {
    setSelectedTrainingDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  }, []);

  const generateWeek = useCallback(async () => {
    if (
      (hasUnresolvedDayConflicts || hasUnresolvedUncoveredSubGoals) &&
      shouldPromptSubFocusConflictForTrigger("generate")
    ) {
      setRevealDayFocusConflicts(true);
      return;
    }
    generationCancelledRef.current = false;
    setError(null);
    setGenerating(true);
    const profile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const weekStartStr = manualWeekPlan?.weekStartDate ?? getDesignatedWeekStartMonday();
    const weekStart = parseLocalDate(weekStartStr);

    const preferredNames = await preferredExerciseNamesForManualPreferences(manualPreferences);
    if (generationCancelledRef.current) return;

    try {
      const { generateWorkoutAsync, getExercisePoolForManualGeneration, injurySlugsFromManualPreferences } =
        await loadGeneratorModule();
      if (generationCancelledRef.current) return;
      const injurySlugs = injurySlugsFromManualPreferences(manualPreferences);
      const exercisePool = await getExercisePoolForManualGeneration(injurySlugs);
      if (exercisePool.length === 0) {
        setError(
          "No exercises available for generation. With Supabase, seed the catalog or check injury filters."
        );
        return;
      }
      const n = selectedTrainingDays.length;
      const bodyDistribution = getBodyEmphasisDistribution(n);
      const selectedBodyDistribution: ReturnType<typeof dayBodyFocusChoicesToBias>[] =
        dayBodyFocusPicks.length === selectedTrainingDays.length
          ? dayBodyFocusPicks.map((picks) => dayBodyFocusChoicesToBias(picks))
          : bodyDistribution.map((b) => ({
              targetBody: b.targetBody,
              targetModifier: [...b.targetModifier],
            }));
      const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
      const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
      const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
      const total = p1 + p2 + p3;
      const n1 = total > 0 ? Math.round(n * (p1 / total)) : n;
      const n2 = total > 0 ? Math.min(n - n1, Math.round(n * (p2 / total))) : 0;
      const goalIndices: number[] = [];
      for (let i = 0; i < n1; i++) goalIndices.push(0);
      for (let i = 0; i < n2; i++) goalIndices.push(1);
      for (let i = n1 + n2; i < n; i++) goalIndices.push(2);
      const dedicateDays =
        manualPreferences.goalDistributionStyle === "dedicate_days" && manualPreferences.primaryFocus.length > 0;

      let focusIds = dayFocusChoiceIds;
      if (focusIds.length !== selectedTrainingDays.length) {
        focusIds = selectedTrainingDays.map((_, i) => {
          const presets = buildDayFocusPresetsForDay({
            manualPreferences,
            adaptiveSetup,
            targetBody: selectedBodyDistribution[i]!.targetBody,
            targetModifier: selectedBodyDistribution[i]!.targetModifier,
            specificBodyFocus: selectedBodyDistribution[i]!.specificBodyFocus,
          });
          return defaultPresetIdForWeekDay(presets, {
            dedicateDays,
            weekGoalSlotIndex: goalIndices[i] ?? 0,
          });
        });
        setDayFocusChoiceIds(focusIds);
      }

      const modifierToSpecific: Record<string, string> = {
        Push: "push",
        Pull: "pull",
        Quad: "quad",
        Posterior: "posterior",
      };
      const specificEmphasis =
        (manualPreferences.targetModifier?.length ?? 0) > 0
          ? (manualPreferences.targetModifier ?? [])
              .map((m) => modifierToSpecific[m] ?? m.toLowerCase())
              .filter(Boolean)
          : [];

      const days: ManualWeekPlan["days"] = [];
      const weekMainStrengthLiftIds: string[] = [];
      const weeklySubFocusKeys = buildWeeklySubFocusKeysFromPreferences(manualPreferences);
      const weeklySubFocusCounts: Record<string, number> = {};
      const exerciseByIdForWeekly = new Map<string, Exercise>(
        exercisePool.map((e) => [e.id, e as Exercise])
      );
      for (let i = 0; i < selectedTrainingDays.length; i++) {
        const dow = selectedTrainingDays[i];
        const date = addDays(weekStart, dow);
        const bodyBias = selectedBodyDistribution[i]!;
        const bodyKey = bodyBias.targetBody.toLowerCase() as "upper" | "lower" | "full";
        const specificForDay = [
          ...(bodyBias.specificBodyFocus ?? []),
          ...specificEmphasis.filter((k) => isSpecificFocusRelevantForBody(k, bodyKey)),
        ].filter((v, idx, arr) => arr.indexOf(v) === idx);
        const presetsForDay = buildDayFocusPresetsForDay({
          manualPreferences,
          adaptiveSetup,
          targetBody: bodyBias.targetBody,
          targetModifier: bodyBias.targetModifier,
          specificBodyFocus: bodyBias.specificBodyFocus,
        });
        const presetId = focusIds[i] ?? defaultPresetIdForWeekDay(presetsForDay, {
          dedicateDays,
          weekGoalSlotIndex: goalIndices[i] ?? 0,
        });
        const resolved = resolveDayFocusPreset(presetId, manualPreferences, adaptiveSetup);
        const effectivePrimary =
          resolved.primaryFocus.length > 0 ? resolved.primaryFocus : manualPreferences.primaryFocus;
        const exclusiveDay = presetUsesExclusiveDayFocus(presetId);
        const bodyPicks = dayBodyFocusPicks[i] ?? [];
        const mergedDaySubFocus = mergeDaySubFocusOverride(
          manualPreferences.subFocusByGoal ?? {},
          daySubFocusOverrides[i]
        );
        // Exclusive day picks: only that day's goal drives sub-focus (align with sport-prep).
        // Blend days: keep full ranked goals so cross-goal sub-picks still apply.
        const daySubFocusMaps = exclusiveDay
          ? filterSubFocusMapsToFocusLabels(
              mergedDaySubFocus,
              effectivePrimary,
              manualPreferences.subFocusPctByGoal
            )
          : {
              subFocusByGoal: mergedDaySubFocus,
              subFocusPctByGoal: manualPreferences.subFocusPctByGoal,
            };
        let dayPrefs: typeof manualPreferences = {
          ...manualPreferences,
          primaryFocus: effectivePrimary,
          subFocusByGoal: daySubFocusMaps.subFocusByGoal,
          ...(daySubFocusMaps.subFocusPctByGoal
            ? { subFocusPctByGoal: daySubFocusMaps.subFocusPctByGoal }
            : exclusiveDay
              ? { subFocusPctByGoal: {} }
              : {}),
          ...(exclusiveDay
            ? {}
            : {
                weekSubFocusPrimaryLabels:
                  manualPreferences.primaryFocus.length > 0
                    ? [...manualPreferences.primaryFocus]
                    : undefined,
              }),
          targetBody: bodyBias.targetBody,
          targetModifier: bodyBias.targetModifier,
          specificBodyFocus: bodyBias.specificBodyFocus,
          weekMainStrengthLiftIdsUsed:
            weekMainStrengthLiftIds.length > 0 ? [...weekMainStrengthLiftIds] : undefined,
          weeklySubFocusCoverage:
            weeklySubFocusKeys.length > 0 && selectedTrainingDays.length > 0
              ? {
                  matchCountsSoFar: { ...weeklySubFocusCounts },
                  trainingDayIndex: i,
                  trainingDaysTotal: selectedTrainingDays.length,
                  targetPerSubFocus: 3,
                }
              : undefined,
        };
        if (
          (bodyFocusMode === "muscle" || bodyFocusMode === "pattern") &&
          bodyPicks.length > 0 &&
          shouldApplyHypertrophySubFocusForBodyChoice(dayPrefs.primaryFocus)
        ) {
          dayPrefs = applyBodyChoicesSubFocusToPrefs(dayPrefs, bodyPicks);
        }
        const priorBatchSessions = days.map((d) => d.workout);
        const workout = await generateWorkoutAsync(
          dayPrefs,
          profile,
          dateToISO(date),
          preferredNames,
          resolved.sportGoalContext,
          {
            exercisePool,
            historySources: {
              workoutHistory,
              savedWorkouts,
              inProgressProgress: manualSessionProgress,
              priorBatchSessions,
            },
          }
        );
        if (generationCancelledRef.current) return;
        accumulateWeeklySubFocusCountsFromGeneratedWorkout(
          weeklySubFocusCounts,
          workout,
          exerciseByIdForWeekly,
          weeklySubFocusKeys
        );
        weekMainStrengthLiftIds.push(...collectWeekMainLiftExerciseIds(workout));
        const displayTitle = formatDayTitle(
          effectivePrimary.length ? effectivePrimary : ["Workout"],
          bodyKey,
          specificForDay.length ? specificForDay : undefined
        );
        days.push({ date: dateToISO(date), workout, displayTitle, status: "planned" });
      }
      if (generationCancelledRef.current) return;
      setWeekSetupStep("pickDays");
      if (days.length === 1) {
        setGeneratedWorkout(days[0].workout);
        setResumeProgress(null);
        setManualWeekPlan(null);
        setGenerating(false);
        router.push("/manual/workout");
        return;
      }
      setDailyPrefsOverrideByDate({});
      setManualWeekPlan({ weekStartDate: weekStartStr, days });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    setManualWeekPlan,
    setGeneratedWorkout,
    setResumeProgress,
    selectedTrainingDays,
    router,
    dayFocusChoiceIds,
    dayBodyFocusPicks,
    daySubFocusOverrides,
    hasUnresolvedDayConflicts,
    hasUnresolvedUncoveredSubGoals,
    adaptiveSetup,
    setDayFocusChoiceIds,
    bodyFocusMode,
    workoutHistory,
    savedWorkouts,
    manualSessionProgress,
  ]);

  const handleAdjustFocusApply = useCallback(
    (sections: FocusSection[]) => {
      const sec = sections[0];
      if (!sec?.items?.length) return;
      const p1 = sec.percentages[0] ?? 100;
      const p2 = sec.percentages[1] ?? 0;
      const p3 = sec.percentages[2] ?? 0;
      updateManualPreferences({
        goalMatchPrimaryPct: p1,
        goalMatchSecondaryPct: p2,
        goalMatchTertiaryPct: p3,
      });
      setShowAdjustFocusModal(false);
      enterSessionFocusForGeneration();
    },
    [updateManualPreferences, enterSessionFocusForGeneration]
  );

  const todayIso = getTodayLocalDateString();

  useEffect(() => {
    void ensureCuratedDescriptionsLoaded().catch(() => {
      /* Loader resets on failure so the next mount retries. */
    });
  }, []);

  useEffect(() => {
    if (!manualWeekPlan?.days?.length) return;
    const first = manualWeekPlan.days[0];
    if (!selectedSession) {
      setSelectedSession(first);
      return;
    }
    const byDate = manualWeekPlan.days.find((d) => d.date === selectedSession.date);
    if (byDate) {
      if (
        byDate.workout.id !== selectedSession.workout.id ||
        byDate.displayTitle !== selectedSession.displayTitle
      ) {
        setSelectedSession(byDate);
      }
      return;
    }
    const found = manualWeekPlan.days.find((d) => d.workout.id === selectedSession.workout.id);
    setSelectedSession(found ?? first);
  }, [manualWeekPlan, selectedSession]);

  /** Week dates Mon–Sun in order. */
  const weekDates = useMemo(() => {
    const plan = manualWeekPlan;
    if (!plan) {
      const start = parseLocalDate(getDesignatedWeekStartMonday());
      return Array.from({ length: 7 }, (_, i) => dateToISO(addDays(start, i)));
    }
    const start = new Date(plan.weekStartDate + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => dateToISO(addDays(start, i)));
  }, [manualWeekPlan]);

  /** Group plan days by date (7 slots Mon–Sun). */
  const daySlots = useMemo(() => {
    type DayEntry = ManualWeekPlan["days"][number];
    if (!manualWeekPlan) return weekDates.map((date) => ({ date, sessions: [] as DayEntry[] }));
    const byDate = new Map<string, DayEntry[]>();
    for (const date of weekDates) byDate.set(date, []);
    for (const day of manualWeekPlan.days) {
      if (byDate.has(day.date)) byDate.get(day.date)!.push(day);
      else byDate.set(day.date, [day]);
    }
    return weekDates.map((date) => ({ date, sessions: byDate.get(date) ?? [] }));
  }, [manualWeekPlan, weekDates]);

  /** Move workout to previous day (up). */
  const moveWorkoutUp = useCallback(
    (date: string, workout: ManualWeekPlan["days"][0]["workout"]) => {
      if (!manualWeekPlan) return;
      const idx = weekDates.indexOf(date);
      if (idx <= 0) return;
      const newDate = weekDates[idx - 1];
      const newDays = manualWeekPlan.days.map((d) =>
        d.workout.id === workout.id ? { ...d, date: newDate } : d
      );
      setManualWeekPlan({ ...manualWeekPlan, days: newDays });
      setDailyPrefsOverrideByDate((prev) => {
        if (!(date in prev) || date === newDate) return prev;
        const { [date]: moved, ...rest } = prev;
        return moved ? { ...rest, [newDate]: { ...rest[newDate], ...moved } } : rest;
      });
    },
    [manualWeekPlan, setManualWeekPlan, weekDates]
  );

  /** Move workout to next day (down). */
  const moveWorkoutDown = useCallback(
    (date: string, workout: ManualWeekPlan["days"][0]["workout"]) => {
      if (!manualWeekPlan) return;
      const idx = weekDates.indexOf(date);
      if (idx < 0 || idx >= weekDates.length - 1) return;
      const newDate = weekDates[idx + 1];
      const newDays = manualWeekPlan.days.map((d) =>
        d.workout.id === workout.id ? { ...d, date: newDate } : d
      );
      setManualWeekPlan({ ...manualWeekPlan, days: newDays });
      setDailyPrefsOverrideByDate((prev) => {
        if (!(date in prev) || date === newDate) return prev;
        const { [date]: moved, ...rest } = prev;
        return moved ? { ...rest, [newDate]: { ...rest[newDate], ...moved } } : rest;
      });
    },
    [manualWeekPlan, setManualWeekPlan, weekDates]
  );

  const onStartDay = useCallback(
    (date: string, workout: ManualWeekPlan["days"][0]["workout"]) => {
      setGeneratedWorkout(workout);
      setResumeProgress(null);
      setManualExecutionStarted(true);
      router.push("/manual/execute");
    },
    [setGeneratedWorkout, setResumeProgress, setManualExecutionStarted, router]
  );

  const onSelectSession = useCallback(
    (date: string, workout: ManualWeekPlan["days"][0]["workout"], displayTitle?: string) => {
      setSelectedSession({ date, workout, displayTitle });
    },
    []
  );

  const onChangeDesignatedWeek = useCallback(
    (nextWeekStart: string) => {
      if (!manualWeekPlan) return;
      const fromStart = manualWeekPlan.weekStartDate;
      const remapped = remapManualWeekToStart(manualWeekPlan, nextWeekStart);
      setManualWeekPlan(remapped);
      setDailyPrefsOverrideByDate((prev) => remapDateKeyedRecord(prev, fromStart, remapped.weekStartDate));
      setSelectedSession((prev) => {
        if (!prev) return prev;
        const deltaDay = remapped.days.find((d) => d.workout.id === prev.workout.id);
        return deltaDay
          ? { date: deltaDay.date, workout: deltaDay.workout, displayTitle: deltaDay.displayTitle }
          : prev;
      });
    },
    [manualWeekPlan, setManualWeekPlan]
  );

  /** Save to the library, then offer to train today's session right away. */
  const onSaveAndExecute = useCallback(() => {
    const weekPlan = manualWeekPlan;
    if (!weekPlan || weekPlan.days.length === 0) return;
    requestSaveAndExecute({
      kind: weekPlan.days.length === 1 ? "day" : "week",
      weekStartDate: weekPlan.weekStartDate,
      days: weekPlan.days,
      source: "manual",
      onStart: (day) => {
        if (!day.workout) return;
        onStartDay(day.date, day.workout);
      },
      onDecline: () => router.replace(ACTIVE_WEEK_ROUTE as never),
    });
  }, [manualWeekPlan, requestSaveAndExecute, onStartDay, router]);

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
    const goal = assignedGoalForExerciseFromWorkout(selectedSession?.workout, swapModal.exerciseId);
    const preferredGoalTagSlugs = generatorGoalToSwapTagSlugs(goal);
    getSwapSuggestionsPage(
      swapModal.exerciseId,
      {
        energyLevel,
        swapBlockRole: blockTypeToSwapBlockRole(swapModal.blockType),
        preferredGoalTagSlugs,
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
    selectedSession?.workout,
  ]);

  const onSwapChoose = useCallback(
    (optionId: string, optionName: string) => {
      const plan = manualWeekPlan;
      if (!plan || !selectedSession || !swapModal) return;
      const updatedWorkout = replaceExerciseInWorkout(
        selectedSession.workout,
        swapModal.exerciseId,
        optionId,
        optionName,
        getCuratedExerciseDescription(optionId)
      );
      const newDays = plan.days.map((d) =>
        d.date === selectedSession.date ? { ...d, workout: updatedWorkout } : d
      );
      setManualWeekPlan({ ...plan, days: newDays });
      setSelectedSession({ ...selectedSession, workout: updatedWorkout });
      setSwapModal(null);
    },
    [manualWeekPlan, selectedSession, swapModal, setManualWeekPlan]
  );

  const onEditPrescription = useCallback(
    (exerciseId: string, edit: { sets: number; reps?: number; time_seconds?: number }) => {
      const plan = manualWeekPlan;
      if (!plan || !selectedSession) return;
      const updatedWorkout = updateExercisePrescriptionInWorkout(
        selectedSession.workout,
        exerciseId,
        edit
      );
      const newDays = plan.days.map((d) =>
        d.date === selectedSession.date ? { ...d, workout: updatedWorkout } : d
      );
      setManualWeekPlan({ ...plan, days: newDays });
      setSelectedSession({ ...selectedSession, workout: updatedWorkout });
    },
    [manualWeekPlan, selectedSession, setManualWeekPlan]
  );

  const onAddBlock = useCallback(
    async (request: AddWorkoutBlockRequest) => {
      const plan = manualWeekPlan;
      if (!plan || !selectedSession || isAddingBlock) return;
      setIsAddingBlock(true);
      setError(null);
      const profile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
      try {
        const updatedWorkout = await generateAndAppendWorkoutBlock({
          workout: selectedSession.workout,
          basePreferences: selectedSession.workout.generationPreferences ?? manualPreferences,
          gymProfile: profile,
          blockType: request.blockType,
          bodyChoiceId: request.bodyChoiceId,
          historySources: {
            workoutHistory,
            savedWorkouts,
            inProgressProgress: manualSessionProgress,
            regenerationAvoidExerciseIds: collectWorkoutExerciseIds(selectedSession.workout),
          },
        });
        if (generationCancelledRef.current) return;
        const newDays = plan.days.map((d) =>
          d.date === selectedSession.date ? { ...d, workout: updatedWorkout } : d
        );
        setManualWeekPlan({ ...plan, days: newDays });
        setSelectedSession({ ...selectedSession, workout: updatedWorkout });
      } catch (e) {
        if (generationCancelledRef.current) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        Alert.alert("Couldn't add block", msg);
      } finally {
        setIsAddingBlock(false);
      }
    },
    [
      manualWeekPlan,
      selectedSession,
      isAddingBlock,
      gymProfiles,
      activeGymProfileId,
      manualPreferences,
      workoutHistory,
      savedWorkouts,
      manualSessionProgress,
      setManualWeekPlan,
    ]
  );

  /** Map goalBias (daily override) to manual primary focus label. */
  const goalBiasToPrimaryFocus = useCallback((goalBias: DailyWorkoutPreferences["goalBias"]): string | undefined => {
    if (!goalBias) return undefined;
    if (goalBias === "hypertrophy") return GOAL_SLUG_TO_PRIMARY_FOCUS["muscle"];
    if (goalBias === "power") return GOAL_SLUG_TO_PRIMARY_FOCUS["power"];
    return GOAL_SLUG_TO_PRIMARY_FOCUS[goalBias];
  }, []);

  const onRegenerateDay = useCallback(async () => {
    const plan = manualWeekPlan;
    if (!plan || !selectedSession) return;
    generationCancelledRef.current = false;
    setError(null);
    setIsRegenerating(true);
    const profile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const dayIndex = plan.days.findIndex((d) => d.date === selectedSession.date);
    if (dayIndex < 0) {
      setIsRegenerating(false);
      return;
    }
    const n = plan.days.length;
    const bodyDistribution = getBodyEmphasisDistribution(n);
    const bodyBias =
      dayBodyFocusPicks.length === n
        ? dayBodyFocusChoicesToBias(dayBodyFocusPicks[dayIndex] ?? [])
        : bodyDistribution[dayIndex]!;
    const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
    const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
    const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
    const total = p1 + p2 + p3;
    const n1 = total > 0 ? Math.round(n * (p1 / total)) : n;
    const n2 = total > 0 ? Math.min(n - n1, Math.round(n * (p2 / total))) : 0;
    const goalIndices: number[] = [];
    for (let i = 0; i < n1; i++) goalIndices.push(0);
    for (let i = 0; i < n2; i++) goalIndices.push(1);
    for (let i = n1 + n2; i < n; i++) goalIndices.push(2);
    const dedicateDays = manualPreferences.goalDistributionStyle === "dedicate_days" && manualPreferences.primaryFocus.length > 0;
    const goalIdx = goalIndices[dayIndex] ?? 0;
    const dayFocus = dedicateDays && manualPreferences.primaryFocus.length
      ? [manualPreferences.primaryFocus[goalIdx] ?? manualPreferences.primaryFocus[0]]
      : manualPreferences.primaryFocus;
    const dailyPrefsOverride = dailyPrefsOverrideByDate[selectedSession.date] ?? null;
    const presetsForDay = buildDayFocusPresetsForDay({
      manualPreferences,
      adaptiveSetup,
      targetBody: bodyBias.targetBody,
      targetModifier: bodyBias.targetModifier,
      specificBodyFocus: bodyBias.specificBodyFocus,
    });
    const presetId =
      dailyPrefsOverride?.dayFocusPresetId ??
      dayFocusChoiceIds[dayIndex] ??
      defaultPresetIdForWeekDay(presetsForDay, {
        dedicateDays,
        weekGoalSlotIndex: goalIdx,
      });
    const resolvedPreset = resolveDayFocusPreset(presetId, manualPreferences, adaptiveSetup);
    const exclusiveDay = presetUsesExclusiveDayFocus(presetId);
    const effectivePrimaryFocus =
      resolvedPreset.primaryFocus.length > 0
        ? resolvedPreset.primaryFocus
        : dayFocus.length
          ? dayFocus
          : manualPreferences.primaryFocus;
    const otherDays = plan.days.filter((_, i) => i !== dayIndex);
    const weekMainStrengthLiftIds = otherDays.flatMap((d) => collectWeekMainLiftExerciseIds(d.workout));
    const mergedDaySubFocus = mergeDaySubFocusOverride(
      manualPreferences.subFocusByGoal ?? {},
      daySubFocusOverrides[dayIndex]
    );
    const daySubFocusMaps = exclusiveDay
      ? filterSubFocusMapsToFocusLabels(
          mergedDaySubFocus,
          effectivePrimaryFocus,
          manualPreferences.subFocusPctByGoal
        )
      : {
          subFocusByGoal: mergedDaySubFocus,
          subFocusPctByGoal: manualPreferences.subFocusPctByGoal,
        };
    let dayPrefs: typeof manualPreferences = {
      ...manualPreferences,
      primaryFocus: effectivePrimaryFocus,
      subFocusByGoal: daySubFocusMaps.subFocusByGoal,
      ...(daySubFocusMaps.subFocusPctByGoal
        ? { subFocusPctByGoal: daySubFocusMaps.subFocusPctByGoal }
        : exclusiveDay
          ? { subFocusPctByGoal: {} }
          : {}),
      ...(exclusiveDay
        ? {}
        : {
            weekSubFocusPrimaryLabels:
              manualPreferences.primaryFocus.length > 0
                ? [...manualPreferences.primaryFocus]
                : undefined,
          }),
      targetBody: bodyBias.targetBody,
      targetModifier: bodyBias.targetModifier,
      specificBodyFocus: bodyBias.specificBodyFocus,
      weekMainStrengthLiftIdsUsed:
        weekMainStrengthLiftIds.length > 0 ? weekMainStrengthLiftIds : undefined,
    };
    if (dailyPrefsOverride) {
      if (dailyPrefsOverride.goalBias) {
        const focusLabel = goalBiasToPrimaryFocus(dailyPrefsOverride.goalBias);
        if (focusLabel) dayPrefs = { ...dayPrefs, primaryFocus: [focusLabel] };
      }
      if (dailyPrefsOverride.bodyRegionBias || dailyPrefsOverride.specificBodyFocus?.length) {
        const fromChoice = sessionBiasFromDailyBodyOverride(dailyPrefsOverride);
        if (fromChoice) {
          dayPrefs = {
            ...dayPrefs,
            targetBody: fromChoice.targetBody,
            targetModifier: fromChoice.targetModifier,
            specificBodyFocus: fromChoice.specificBodyFocus,
          };
        }
      }
      if (dailyPrefsOverride.weeklyBodyFocusMode) {
        dayPrefs = {
          ...dayPrefs,
          weeklyBodyFocusMode: dailyPrefsOverride.weeklyBodyFocusMode,
        };
      }
      if (dailyPrefsOverride.energyLevel) dayPrefs = { ...dayPrefs, energyLevel: dailyPrefsOverride.energyLevel };
      if (dailyPrefsOverride.volumePreference) {
        dayPrefs = { ...dayPrefs, volumePreference: dailyPrefsOverride.volumePreference };
      }
      if (dailyPrefsOverride.workoutTier != null) {
        dayPrefs = { ...dayPrefs, workoutTier: dailyPrefsOverride.workoutTier };
      }
      if (dailyPrefsOverride.includeCreativeVariations != null) {
        dayPrefs = {
          ...dayPrefs,
          includeCreativeVariations: dailyPrefsOverride.includeCreativeVariations,
        };
      }
    }
    const regenMode = resolveDailyBodyFocusMode({
      dailyOverride: dailyPrefsOverride,
      weekMode: bodyFocusMode,
    });
    const regenBodyPicks: DayBodyFocusChoiceId[] =
      dailyPrefsOverride?.bodyRegionBias != null
        ? [dailyPrefsOverride.bodyRegionBias as DayBodyFocusChoiceId]
        : (dayBodyFocusPicks[dayIndex] ?? []);
    if (
      (regenMode === "muscle" || regenMode === "pattern") &&
      regenBodyPicks.length > 0 &&
      shouldApplyHypertrophySubFocusForBodyChoice(dayPrefs.primaryFocus)
    ) {
      dayPrefs = applyBodyChoicesSubFocusToPrefs(dayPrefs, regenBodyPicks);
    }
    const preferredNames = await preferredExerciseNamesForManualPreferences(dayPrefs);
    if (generationCancelledRef.current) return;
    try {
      const { generateWorkoutAsync } = await loadGeneratorModule();
      if (generationCancelledRef.current) return;
      const avoidIds = collectWorkoutExerciseIds(selectedSession.workout);
      const workout = await generateWorkoutAsync(
        dayPrefs,
        profile,
        composeRunGenerationSeed(selectedSession.date),
        preferredNames,
        {
          ...resolvedPreset.sportGoalContext,
          regeneration_avoid_exercise_ids: avoidIds,
        },
        {
          historySources: {
            workoutHistory,
            savedWorkouts,
            inProgressProgress: manualSessionProgress,
            priorBatchSessions: otherDays.map((d) => d.workout),
            regenerationAvoidExerciseIds: avoidIds,
          },
        }
      );
      if (generationCancelledRef.current) return;
      const bodyKey = (dayPrefs.targetBody ?? "Full").toLowerCase() as "upper" | "lower" | "full";
      const specificForTitle = [
        ...(dayPrefs.specificBodyFocus ?? []),
        ...(dayPrefs.targetModifier ?? []).map((m) => m.toLowerCase()).filter(Boolean),
      ].filter((v, idx, arr) => arr.indexOf(v) === idx);
      const displayTitle = formatDayTitle(
        dayPrefs.primaryFocus.length ? dayPrefs.primaryFocus : ["Workout"],
        bodyKey,
        specificForTitle.length ? specificForTitle : undefined
      );
      const newDays = plan.days.map((d) =>
        d.date === selectedSession.date ? { ...d, workout, displayTitle } : d
      );
      setManualWeekPlan({ ...plan, days: newDays });
      setSelectedSession((prev) => (prev ? { ...prev, workout, displayTitle } : null));
    } catch (e) {
      if (generationCancelledRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRegenerating(false);
    }
  }, [
    manualWeekPlan,
    selectedSession,
    manualPreferences,
    dailyPrefsOverrideByDate,
    activeGymProfileId,
    gymProfiles,
    adaptiveSetup,
    dayBodyFocusPicks,
    dayFocusChoiceIds,
    goalBiasToPrimaryFocus,
    workoutHistory,
    savedWorkouts,
    manualSessionProgress,
    setManualWeekPlan,
    bodyFocusMode,
    daySubFocusOverrides,
  ]);

  const onSaveDay = () => {
    const weekPlan = manualWeekPlan;
    if (!selectedSession || !weekPlan) return;
    requestSaveDay({
      date: selectedSession.date,
      workout: selectedSession.workout,
      weekStartDate: weekPlan.weekStartDate,
      source: "manual",
      displayTitle: selectedSession.displayTitle,
    });
  };

  if (generating) {
    const oneDayLoading =
      manualWeekPlan?.days.length === 1 || selectedTrainingDays.length === 1;
    return (
      <GenerationLoadingScreen
        message={oneDayLoading ? "Building your session…" : "Building your week…"}
        subtitle={
          oneDayLoading
            ? "Choosing blocks that fit your schedule."
            : "Generating each training day in order."
        }
        onGoBack={goBackToWeekPreferences}
      />
    );
  }

  if (isRegenerating) {
    return (
      <GenerationLoadingScreen
        message="Regenerating your workout…"
        subtitle="Applying your day edits to a fresh session."
        onGoBack={goBackToWeekPreferences}
      />
    );
  }

  if (error && !manualWeekPlan) {
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        <PrimaryButton label="Retry" onPress={generateWeek} />
      </View>
      </AppScreenWrapper>
    );
  }

  const plan = manualWeekPlan;

  if (!plan || plan.days.length === 0) {
    if (weekSetupStep === "sessionFocus") {
      const canGenerate =
        selectedTrainingDays.length > 0 &&
        dayFocusChoiceIds.length === selectedTrainingDays.length &&
        weeklyGoalDistributionGate.ok;
      return (
        <AppScreenWrapper>
          <StatusBar style="dark" />
          <View style={styles.container}>
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: navBarHeight + 16 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <WeekDayFocusPlanner
                theme={theme}
                dayLabels={sessionFocusMeta.labels}
                bodyOptionsPerDay={sessionFocusMeta.bodyOptions}
                presetOptionsPerDay={sessionFocusMeta.presets}
                selectedBodyIds={dayBodyFocusPicks}
                selectedIds={dayFocusChoiceIds}
                recommendationSummaries={sessionFocusMeta.recommendationSummaries}
                conflictsPerDay={
                  revealDayFocusConflicts ? daySessionFocusConflictsToSurface : undefined
                }
                resolvedConflictIdsByDay={resolvedConflictIdsByDay}
                sportGoalPriorityNote={sportGoalPrioritySectionNote(manualPreferences, adaptiveSetup)}
                showGoalDistributionNote={showWeeklyGoalDistribution}
                goalDistributionStyle={manualPreferences.goalDistributionStyle}
                onChangeGoalDistributionStyle={(value: GoalDistributionStyle) =>
                  updateManualPreferences({ goalDistributionStyle: value })
                }
                showBodyFocusModeNote
                weeklyBodyFocusMode={bodyFocusMode}
                onChangeWeeklyBodyFocusMode={handleChangeWeeklyBodyFocusMode}
                onSelectBody={handleSelectDayBody}
                onSelect={(dayIdx, id) => {
                  clearDayConflictState(dayIdx);
                  setDayFocusChoiceIds((prev) => {
                    const next = [...prev];
                    next[dayIdx] = id;
                    return next;
                  });
                }}
                onApplyDayResolution={handleApplyDayResolution}
                uncoveredSubGoalPrompt={
                  revealDayFocusConflicts && hasUnresolvedUncoveredSubGoals
                    ? uncoveredSubGoalPrompt
                    : null
                }
                onApplyUncoveredResolution={handleApplyUncoveredResolution}
                onBack={() => setWeekSetupStep("pickDays")}
              />
              {error ? (
                <Text style={[styles.errorText, { color: theme.danger, paddingHorizontal: 20 }]}>
                  {error}
                </Text>
              ) : null}
            </ScrollView>
            <FlowPhaseNavBar
              sticky
              onLayout={setNavBarHeight}
              back={{
                label: "Training days",
                onPress: () => setWeekSetupStep("pickDays"),
              }}
              forward={{
                label: generating
                  ? "Generating…"
                  : selectedTrainingDays.length === 1
                    ? "Generate workout"
                    : "Generate week",
                onPress: generateWeek,
                disabled: generating || !canGenerate,
                loading: generating,
              }}
              hint={
                !weeklyGoalDistributionGate.ok
                  ? weeklyGoalDistributionGate.reason ?? null
                  : revealDayFocusConflicts &&
                      (hasUnresolvedDayConflicts || hasUnresolvedUncoveredSubGoals)
                    ? hasUnresolvedUncoveredSubGoals
                      ? "A selected sub-goal needs a matching day split before generating."
                      : "Resolve day focus conflicts before generating."
                    : null
              }
            />
          </View>
        </AppScreenWrapper>
      );
    }
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.centered, { paddingBottom: navBarHeight + 16 }]}
            showsVerticalScrollIndicator={false}
          >
            <Card
              title="Which days are you training?"
              subtitle="We’ll balance upper, lower, and full body across the week. Change days anytime."
            >
              <Text style={{ fontSize: 13, marginBottom: 10, color: theme.textMuted }}>
                Your training days
              </Text>
              <View style={styles.chipGroup}>
                {WEEKDAY_LABELS.map((label, dow) => (
                  <Chip
                    key={dow}
                    label={label}
                    selected={selectedTrainingDays.includes(dow)}
                    onPress={() => toggleTrainingDay(dow)}
                  />
                ))}
              </View>
            </Card>
            {error ? (
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            ) : null}
          </ScrollView>
          <FlowPhaseNavBar
            sticky
            onLayout={setNavBarHeight}
            back={{
              label: backLabelForPhase("setup"),
              onPress: goBackToWeekPreferences,
            }}
            forward={{
              label:
                selectedTrainingDays.length === 1
                  ? "Next: session focus"
                  : "Next: focus per day",
              onPress: enterSessionFocusForGeneration,
              disabled: selectedTrainingDays.length === 0,
            }}
          />
        </View>
      </AppScreenWrapper>
    );
  }

  const isSingleDayWeek = plan.days.length === 1;

  const weekOverviewContent = (
    <View>
      {daySlots.map((slot) => (
        <View
          key={slot.date}
          style={[
            styles.dayCard,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <View style={[styles.dayHeaderRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.dayHeaderText, { color: theme.text }]}>
              {formatDayOfWeek(slot.date)}
            </Text>
            {slot.date === todayIso && (
              <Text style={[styles.todayBadge, { color: theme.primary, borderColor: theme.primary, marginLeft: 8 }]}>
                Today
              </Text>
            )}
          </View>
          {slot.sessions.map((s) => {
            const isSelected =
              selectedSession?.date === s.date && selectedSession?.workout.id === s.workout.id;
            const dayIdx = weekDates.indexOf(s.date);
            const sessionIdx = plan.days.findIndex((d) => d.workout.id === s.workout.id);
            const bodyOptions = sessionIdx >= 0 ? sessionFocusMeta.bodyOptions[sessionIdx] ?? [] : [];
            const selectedBodyPicks = sessionIdx >= 0 ? dayBodyFocusPicks[sessionIdx] ?? [] : [];
            const bodyFocus = buildBodyFocusSummary(
              selectedBodyPicks.length
                ? {
                    label: bodyFocusEmphasisLabelForPicks(selectedBodyPicks),
                    subtitle: null,
                  }
                : bodyOptions.find((o) => o.id === selectedBodyPicks[0]),
              s.workout.generationPreferences?.targetBody
                ? {
                    targetBody: s.workout.generationPreferences.targetBody,
                    targetModifier: s.workout.generationPreferences.targetModifier,
                  }
                : undefined
            );
            const presetOptions = sessionIdx >= 0 ? sessionFocusMeta.presets[sessionIdx] ?? [] : [];
            const selectedPresetId = sessionIdx >= 0 ? dayFocusChoiceIds[sessionIdx] : undefined;
            const daySubs =
              sessionIdx >= 0
                ? matchingSubFocusNamesForBodyPicks(
                    {
                      ...manualPreferences,
                      subFocusByGoal: mergeDaySubFocusOverride(
                        manualPreferences.subFocusByGoal ?? {},
                        daySubFocusOverrides[sessionIdx]
                      ),
                    },
                    selectedBodyPicks,
                    { max: 3 }
                  )
                : [];
            const priorityFocus = buildPriorityFocusSummary(
              presetOptions.find((o) => o.id === selectedPresetId),
              {
                displayTitle: s.displayTitle,
                workoutFocus: s.workout.focus,
                subFocusNames: daySubs,
              }
            );
            const canMoveUp = dayIdx > 0;
            const canMoveDown = dayIdx >= 0 && dayIdx < weekDates.length - 1;
            return (
              <View key={`${s.date}-${s.workout.id}`} style={[styles.sessionRow, { marginLeft: 12 }]}>
                <View style={styles.moveButtons}>
                  <Pressable
                    onPress={() => canMoveUp && moveWorkoutUp(s.date, s.workout)}
                    disabled={!canMoveUp}
                    style={({ pressed }) => ({
                      padding: 8,
                      opacity: canMoveUp ? (pressed ? 0.7 : 1) : 0.3,
                    })}
                  >
                    <Ionicons name="chevron-up" size={20} color={theme.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => canMoveDown && moveWorkoutDown(s.date, s.workout)}
                    disabled={!canMoveDown}
                    style={({ pressed }) => ({
                      padding: 8,
                      opacity: canMoveDown ? (pressed ? 0.7 : 1) : 0.3,
                    })}
                  >
                    <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <WeekDayFocusSummaryCard
                    theme={theme}
                    bodyFocus={bodyFocus}
                    priorityFocus={priorityFocus}
                    selected={isSelected}
                    onPress={() => onSelectSession(s.date, s.workout, s.displayTitle)}
                    actionLabel="Change focus"
                    onActionPress={() => {
                      onSelectSession(s.date, s.workout, s.displayTitle);
                      setFocusEditorExpandSignal((v) => v + 1);
                      setTimeout(scrollToDayFocusSection, 200);
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const selectedDay = selectedSession;
  const selectedDaySessionIdx = selectedDay
    ? plan.days.findIndex((d) => d.date === selectedDay.date)
    : -1;
  const selectedDayPresetOptions =
    selectedDaySessionIdx >= 0 ? sessionFocusMeta.presets[selectedDaySessionIdx] ?? [] : [];
  const selectedDayFocusPresetId =
    selectedDaySessionIdx >= 0 ? dayFocusChoiceIds[selectedDaySessionIdx] : undefined;
  const selectedDayPrefsOverride =
    selectedDay != null ? dailyPrefsOverrideByDate[selectedDay.date] ?? null : null;
  const selectedDayPlannedBodyIds =
    selectedDaySessionIdx >= 0 ? dayBodyFocusPicks[selectedDaySessionIdx] ?? [] : [];

  const scrollContent = (
    <View ref={scrollContentRef} style={styles.scrollContent} collapsable={false}>
      <Card title="Your Week Plan">
        <WeekDesignationPicker
          weekStartDate={plan.weekStartDate}
          onChangeWeekStart={onChangeDesignatedWeek}
          label="Designated for"
        />
        <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 10 }}>
          {reviewAndAdjustHint({ multipleDays: !isSingleDayWeek })}
        </Text>
        <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>
          Swap exercises, edit sets and reps, or use the arrows to move sessions between days.
        </Text>
      </Card>

      {error ? (
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
      ) : null}

      <Card
        title="Your training days"
        subtitle={
          isSingleDayWeek
            ? "Toggle days, then regenerate the workout to apply changes."
            : "Toggle days, then regenerate the week to apply changes."
        }
        style={{ marginTop: 0 }}
      >
        <View style={styles.chipGroup}>
          {WEEKDAY_LABELS.map((label, dow) => (
            <Chip
              key={dow}
              label={label}
              selected={selectedTrainingDays.includes(dow)}
              onPress={() => toggleTrainingDay(dow)}
            />
          ))}
        </View>
        <PrimaryButton
          label={
            generating
              ? "Regenerating…"
              : isSingleDayWeek
                ? "Regenerate workout"
                : "Regenerate week"
          }
          variant="ghost"
          onPress={enterSessionFocusForGeneration}
          disabled={generating || selectedTrainingDays.length === 0}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card
        title="Week overview"
        style={{ marginTop: 16 }}
        subtitle="Use ↑↓ arrows to move sessions to different days."
      >
        {weekOverviewContent}
      </Card>

      {selectedDay ? (
        <View style={{ marginTop: 16, gap: 16 }}>
          <WorkoutBlockList
            workout={normalizeGeneratedWorkout(selectedDay.workout)}
            showSwap
            onSwap={(exerciseId, exerciseName, blockType, swapPoolExerciseIds) =>
              setSwapModal({ exerciseId, exerciseName, blockType, swapPoolExerciseIds })
            }
            showEditPrescription
            onEditPrescription={onEditPrescription}
          />

          <AddWorkoutBlockPanel
            onAdd={onAddBlock}
            adding={isAddingBlock}
            disabled={isRegenerating}
          />

          <View style={styles.footer}>
            <DayFocusOverrideChips
              ref={dayFocusSectionRef}
              dailyPrefsOverride={selectedDayPrefsOverride}
              onOverrideChange={(update) => {
                if (!selectedDay) return;
                const date = selectedDay.date;
                setDailyPrefsOverrideByDate((prev) => ({
                  ...prev,
                  [date]: { ...(prev[date] ?? {}), ...update },
                }));
                if (update.dayFocusPresetId && selectedDaySessionIdx >= 0) {
                  setDayFocusChoiceIds((prev) =>
                    prev.map((id, i) => (i === selectedDaySessionIdx ? update.dayFocusPresetId! : id))
                  );
                }
              }}
              onRegenerate={onRegenerateDay}
              isRegenerating={isRegenerating}
              showAdjustFocusLink={focusSectionsForModal.length > 0}
              onAdjustFocusPress={() => {
                setShowAdjustFocusModal(true);
                setTimeout(scrollToDayFocusSection, 100);
              }}
              helperText={
                isSingleDayWeek
                  ? "Then tap Regenerate workout to rebuild this session."
                  : undefined
              }
              regenerateLabel={isSingleDayWeek ? "Regenerate workout" : "Regenerate this day"}
              dayFocusPresets={selectedDayPresetOptions}
              selectedDayFocusPresetId={selectedDayFocusPresetId}
              plannedBodyChoiceIds={selectedDayPlannedBodyIds}
              sportGoalPriorityNote={sportGoalPrioritySectionNote(manualPreferences, adaptiveSetup)}
              expandSignal={focusEditorExpandSignal}
              weeklyBodyFocusMode={bodyFocusMode}
            />
            {selectedDay ? (
              <PrimaryButton
                label={saveDayButtonLabel({
                  saved: isSaved(
                    savedDayFingerprint(selectedDay.date, selectedDay.workout.id)
                  ),
                  busy: saveBusy && saveDialog?.kind === "day",
                })}
                variant="secondary"
                onPress={onSaveDay}
                disabled={
                  saveBusy ||
                  saveDialog != null ||
                  isSaved(savedDayFingerprint(selectedDay.date, selectedDay.workout.id))
                }
                style={{ marginTop: 8 }}
              />
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={[styles.sessionHint, { color: theme.textMuted, marginTop: 16 }]}>
          Tap a session above to view its details.
        </Text>
      )}

      <DiscardSessionLink style={{ marginTop: 24, marginBottom: 24 }} />

      <AdjustFocusModal
        visible={showAdjustFocusModal}
        onClose={() => setShowAdjustFocusModal(false)}
        sections={focusSectionsForModal}
        onApply={handleAdjustFocusApply}
        title="Adjust focus areas and days"
      />
    </View>
  );

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingBottom: navBarHeight + 16 }}
          showsVerticalScrollIndicator={false}
        >
          {scrollContent}
        </ScrollView>
        <FlowPhaseNavBar
          sticky
          onLayout={setNavBarHeight}
          back={{
            label: backLabelForPhase("setup"),
            onPress: goBackToWeekPreferences,
          }}
          forward={{
            label: saveAndExecuteLabel({
              multipleDays: !isSingleDayWeek,
              busy: saveBusy,
              alreadySaved: isSaved(savedWeekFingerprint(plan.weekStartDate, plan.days)),
            }),
            onPress: onSaveAndExecute,
            disabled: saveBusy || saveDialog != null,
            loading: saveBusy,
          }}
          hint={saveAndExecuteHint({ multipleDays: !isSingleDayWeek })}
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 13,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 16,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: themeRadius.card,
    padding: 12,
    marginBottom: 10,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    marginTop: 0,
    marginBottom: 8,
  },
  dayHeaderText: {
    fontSize: 15,
    fontWeight: "700",
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  moveButtons: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: 16,
    marginBottom: 24,
  },
  sessionHint: {
    fontSize: 13,
  },
});
