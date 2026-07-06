import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { PrimaryButton } from "../../../components/Button";
import { FlowPhaseNavBar } from "../../../components/FlowPhaseNavBar";
import { backLabelForPhase, phaseLabelAfter } from "../../../lib/sessionFlowNav";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { AdjustFocusModal, type FocusSection } from "../../../components/AdjustFocusModal";
import { DayFocusOverrideChips } from "../../../components/DayFocusOverrideChips";
import { SwapExerciseModal } from "../../../components/SwapExerciseModal";
import { DiscardSessionLink } from "../../navigation/tabFlowChrome";
import { saveManualWeek, saveManualDay } from "../../../lib/db/weekPlanRepository";
import { getLocalDateString, getTodayLocalDateString, parseLocalDate } from "../../../lib/dateUtils";
import { isDbConfigured } from "../../../lib/db";
import { preferredExerciseNamesForManualPreferences } from "../../../lib/manualPreferredExerciseNames";
import { loadGeneratorModule } from "../../../lib/loadGeneratorModule";
import { composeRunGenerationSeed } from "../../../lib/generationSeed";
import { collectWeekMainLiftExerciseIds } from "../../../logic/workoutGeneration/collectWeekMainLiftExerciseIds";
import {
  accumulateWeeklySubFocusCountsFromGeneratedWorkout,
  buildWeeklySubFocusKeysFromPreferences,
} from "../../../logic/workoutGeneration/weeklySubFocusCoveragePlan";
import type { Exercise } from "../../../logic/workoutGeneration/types";
import { replaceExerciseInWorkout, collectWorkoutExerciseIds } from "../../../lib/workoutUtils";
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
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import {
  buildDayBodyFocusChoicesForDay,
  buildDayFocusPresetsForDay,
  dayBodyFocusChoiceToBias,
  defaultBodyFocusChoiceIdForDay,
  resolveDayFocusPreset,
  defaultPresetIdForWeekDay,
  type DayBodyFocusChoice,
  type DayBodyFocusChoiceId,
  type DayFocusPreset,
} from "../../../lib/weekDaySessionFocus";
<<<<<<< HEAD
import { WeekDayFocusPlanner } from "../../../components/WeekDayFocusPlanner";
import {
  applyDaySessionFocusResolution,
  dayHasUnresolvedSessionFocusConflict,
  detectDaySessionFocusConflict,
  mergeDaySubFocusOverride,
  type DaySessionFocusResolution,
} from "../../../lib/daySessionFocusConflict";
=======
import { WeekDayFocusPlanner, WeekDayFocusSummaryCard } from "../../../components/WeekDayFocusPlanner";
>>>>>>> feature/week-session-drag-reorder
import type { BlockType, DailyWorkoutPreferences, ManualWeekPlan } from "../../../lib/types";
import { normalizeGeneratedWorkout } from "../../../lib/types";
import { navigateToManualGoalPreferences } from "../../../lib/manualGoalPreferencesHref";

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

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
  const { userId } = useAuth();
  const goBackToWeekPreferences = useCallback(() => {
    navigateToManualGoalPreferences(router, "week", { replace: true });
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      generationCancelledRef.current = false;
      setGenerating(false);
      setIsRegenerating(false);
      setManualGoalPreferencesScope("week");
      beginSessionFlow("goal_week");
      return () => {
        generationCancelledRef.current = true;
        setGenerating(false);
        setIsRegenerating(false);
      };
    }, [setManualGoalPreferencesScope, beginSessionFlow])
  );

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustFocusModal, setShowAdjustFocusModal] = useState(false);
  /** Override preferences for the selected day when regenerating (goal, body, energy). */
  const [dailyPrefsOverride, setDailyPrefsOverride] = useState<DailyWorkoutPreferences | null>(null);
  const [focusEditorExpandSignal, setFocusEditorExpandSignal] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
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
  const [dayBodyFocusChoiceIds, setDayBodyFocusChoiceIds] = useState<DayBodyFocusChoiceId[]>([]);
  /** Per-day sub-focus overrides after conflict resolution (merged at generation). */
  const [daySubFocusOverrides, setDaySubFocusOverrides] = useState<
    Record<number, Record<string, string[]>>
  >({});
  /** Conflict id marked resolved per day index. */
  const [resolvedConflictIdsByDay, setResolvedConflictIdsByDay] = useState<Record<number, string>>(
    {}
  );
  const [navBarHeight, setNavBarHeight] = useState(72);

  const sessionHydratedRef = useRef(false);
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
      setDayBodyFocusChoiceIds(ws.dayBodyFocusChoiceIds as DayBodyFocusChoiceId[]);
    }
    sessionHydratedRef.current = true;
  }, [activeSessionDraft?.id, activeSessionDraft?.weekSetup]);

  useEffect(() => {
    const nextWeekSetup = {
      enteredWeekScreen: true,
      step: weekSetupStep,
      selectedTrainingDays,
      dayFocusChoiceIds,
      dayBodyFocusChoiceIds,
    };
    const prev = activeSessionDraft?.weekSetup;
    if (
      prev &&
      prev.enteredWeekScreen === nextWeekSetup.enteredWeekScreen &&
      prev.step === nextWeekSetup.step &&
      prev.selectedTrainingDays.length === nextWeekSetup.selectedTrainingDays.length &&
      prev.selectedTrainingDays.every((d, i) => d === nextWeekSetup.selectedTrainingDays[i]) &&
      prev.dayFocusChoiceIds.length === nextWeekSetup.dayFocusChoiceIds.length &&
      prev.dayFocusChoiceIds.every((id, i) => id === nextWeekSetup.dayFocusChoiceIds[i]) &&
      (prev.dayBodyFocusChoiceIds ?? []).length === nextWeekSetup.dayBodyFocusChoiceIds.length &&
      (prev.dayBodyFocusChoiceIds ?? []).every((id, i) => id === nextWeekSetup.dayBodyFocusChoiceIds[i])
    ) {
      return;
    }
    updateActiveSessionDraft({ weekSetup: nextWeekSetup });
  }, [
    weekSetupStep,
    selectedTrainingDays,
    dayFocusChoiceIds,
    dayBodyFocusChoiceIds,
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

  const sessionFocusMeta = useMemo(() => {
    if (selectedTrainingDays.length === 0) {
      return {
        labels: [] as string[],
        bodyOptions: [] as DayBodyFocusChoice[][],
        presets: [] as DayFocusPreset[][],
      };
    }
    const n = selectedTrainingDays.length;
    const bd = getBodyEmphasisDistribution(n);
    const weekStart = startOfWeekMonday(new Date());
    const labels = selectedTrainingDays.map((dow, i) => {
      const date = addDays(weekStart, dow);
      const b = dayBodyFocusChoiceIds[i]
        ? dayBodyFocusChoiceToBias(dayBodyFocusChoiceIds[i]!)
        : bd[i]!;
      const mod =
        b.targetModifier.length > 0
          ? ` (${b.targetModifier.join(" · ")})`
          : "";
      return `${formatDayOfWeek(dateToISO(date))} · ${b.targetBody}${mod}`;
    });
    const bodyOptions = selectedTrainingDays.map((_, i) =>
      buildDayBodyFocusChoicesForDay({
        manualPreferences,
        adaptiveSetup,
        slotIndex: i,
        fallbackTargetBody: bd[i]!.targetBody,
        fallbackTargetModifier: bd[i]!.targetModifier,
      })
    );
    const presets = selectedTrainingDays.map((_, i) => {
      const b = dayBodyFocusChoiceIds[i]
        ? dayBodyFocusChoiceToBias(dayBodyFocusChoiceIds[i]!)
        : bd[i]!;
      return buildDayFocusPresetsForDay({
        manualPreferences,
        adaptiveSetup,
        targetBody: b.targetBody,
        targetModifier: b.targetModifier,
      });
    });
    return { labels, bodyOptions, presets };
  }, [selectedTrainingDays, manualPreferences, adaptiveSetup, dayBodyFocusChoiceIds]);

  const daySessionFocusConflicts = useMemo(() => {
    if (selectedTrainingDays.length === 0) return [];
    return selectedTrainingDays.map((_, i) =>
      detectDaySessionFocusConflict({
        bodyFocusId: dayBodyFocusChoiceIds[i] ?? "full",
        focusPresetId: dayFocusChoiceIds[i] ?? "",
        manualPreferences,
        adaptiveSetup,
        presetOptions: sessionFocusMeta.presets[i] ?? [],
      })
    );
  }, [
    selectedTrainingDays,
    dayBodyFocusChoiceIds,
    dayFocusChoiceIds,
    manualPreferences,
    adaptiveSetup,
    sessionFocusMeta.presets,
  ]);

  const hasUnresolvedDayConflicts = useMemo(
    () =>
      daySessionFocusConflicts.some((c, i) =>
        dayHasUnresolvedSessionFocusConflict(c, resolvedConflictIdsByDay[i])
      ),
    [daySessionFocusConflicts, resolvedConflictIdsByDay]
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
      const conflict = daySessionFocusConflicts[dayIdx];
      if (!conflict) return;
      applyDaySessionFocusResolution({
        dayIndex: dayIdx,
        resolution,
        conflict,
        subFocusByGoal: manualPreferences.subFocusByGoal ?? {},
        setBodyFocusId: (idx, id) => {
          setDayBodyFocusChoiceIds((prev) => {
            const next = [...prev];
            next[idx] = id;
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
    [daySessionFocusConflicts, manualPreferences.subFocusByGoal]
  );

  const initSessionFocusStep = useCallback(() => {
    if (selectedTrainingDays.length === 0) return;
    const n = selectedTrainingDays.length;
    const bd = getBodyEmphasisDistribution(n);
    const bodyOptions = selectedTrainingDays.map((_, i) =>
      buildDayBodyFocusChoicesForDay({
        manualPreferences,
        adaptiveSetup,
        slotIndex: i,
        fallbackTargetBody: bd[i]!.targetBody,
        fallbackTargetModifier: bd[i]!.targetModifier,
      })
    );
    const bodyIds = bodyOptions.map((choices, i) =>
      defaultBodyFocusChoiceIdForDay(choices, { slotIndex: i })
    );
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
    const ids = selectedTrainingDays.map((_, i) => {
      const bodyChoice = dayBodyFocusChoiceToBias(bodyIds[i]!);
      const presets = buildDayFocusPresetsForDay({
        manualPreferences,
        adaptiveSetup,
        targetBody: bodyChoice.targetBody,
        targetModifier: bodyChoice.targetModifier,
      });
      return defaultPresetIdForWeekDay(presets, {
        dedicateDays,
        weekGoalSlotIndex: goalIndices[i] ?? 0,
      });
    });
    setDayBodyFocusChoiceIds(bodyIds);
    setDayFocusChoiceIds(ids);
    setDaySubFocusOverrides({});
    setResolvedConflictIdsByDay({});
    setWeekSetupStep("sessionFocus");
  }, [selectedTrainingDays, manualPreferences, adaptiveSetup]);

  /** Always show per-day body + goal priority before generating (initial or regenerate). */
  const enterSessionFocusForGeneration = useCallback(() => {
    const n = selectedTrainingDays.length;
    const choicesMatchDays =
      n > 0 &&
      dayFocusChoiceIds.length === n &&
      dayBodyFocusChoiceIds.length === n;
    if (choicesMatchDays) {
      setWeekSetupStep("sessionFocus");
    } else {
      initSessionFocusStep();
    }
    setManualWeekPlan(null);
    setSelectedSession(null);
  }, [
    selectedTrainingDays.length,
    dayFocusChoiceIds.length,
    dayBodyFocusChoiceIds.length,
    initSessionFocusStep,
    setManualWeekPlan,
  ]);

  const toggleTrainingDay = useCallback((dow: number) => {
    setSelectedTrainingDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  }, []);

  const generateWeek = useCallback(async () => {
    generationCancelledRef.current = false;
    setError(null);
    setGenerating(true);
    const profile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const weekStart = startOfWeekMonday(new Date());
    const weekStartStr = dateToISO(weekStart);

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
      const selectedBodyDistribution: ReturnType<typeof dayBodyFocusChoiceToBias>[] =
        dayBodyFocusChoiceIds.length === selectedTrainingDays.length
          ? dayBodyFocusChoiceIds.map((id) => dayBodyFocusChoiceToBias(id))
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
        });
        const presetId = focusIds[i] ?? defaultPresetIdForWeekDay(presetsForDay, {
          dedicateDays,
          weekGoalSlotIndex: goalIndices[i] ?? 0,
        });
        const resolved = resolveDayFocusPreset(presetId, manualPreferences, adaptiveSetup);
        const effectivePrimary =
          resolved.primaryFocus.length > 0 ? resolved.primaryFocus : manualPreferences.primaryFocus;
        const dayPrefs: typeof manualPreferences = {
          ...manualPreferences,
          primaryFocus: effectivePrimary,
          subFocusByGoal: mergeDaySubFocusOverride(
            manualPreferences.subFocusByGoal ?? {},
            daySubFocusOverrides[i]
          ),
          /** Keep full ranked goals for sub-focus merge so dedicated days still honor cross-goal picks (e.g. Handstand). */
          weekSubFocusPrimaryLabels:
            manualPreferences.primaryFocus.length > 0
              ? [...manualPreferences.primaryFocus]
              : undefined,
          targetBody: bodyBias.targetBody,
          targetModifier: bodyBias.targetModifier,
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
        days.push({ date: dateToISO(date), workout, displayTitle });
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
    dayBodyFocusChoiceIds,
    daySubFocusOverrides,
    adaptiveSetup,
    setDayFocusChoiceIds,
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
    void ensureCuratedDescriptionsLoaded();
  }, []);

  useEffect(() => {
    if (!manualWeekPlan?.days?.length) return;
    const first = manualWeekPlan.days[0];
    if (!selectedSession) {
      setSelectedSession(first);
      return;
    }
    const found = manualWeekPlan.days.find((d) => d.workout.id === selectedSession.workout.id);
    if (found && found.date !== selectedSession.date) setSelectedSession(found);
    else if (!found) setSelectedSession(first);
  }, [manualWeekPlan, selectedSession]);

  /** Week dates Mon–Sun in order. */
  const weekDates = useMemo(() => {
    const plan = manualWeekPlan;
    if (!plan) {
      const start = startOfWeekMonday(new Date());
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
      dayBodyFocusChoiceIds.length === n
        ? dayBodyFocusChoiceToBias(dayBodyFocusChoiceIds[dayIndex]!)
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
    const presetsForDay = buildDayFocusPresetsForDay({
      manualPreferences,
      adaptiveSetup,
      targetBody: bodyBias.targetBody,
      targetModifier: bodyBias.targetModifier,
    });
    const presetId =
      dailyPrefsOverride?.dayFocusPresetId ??
      dayFocusChoiceIds[dayIndex] ??
      defaultPresetIdForWeekDay(presetsForDay, {
        dedicateDays,
        weekGoalSlotIndex: goalIdx,
      });
    const resolvedPreset = resolveDayFocusPreset(presetId, manualPreferences, adaptiveSetup);
    const effectivePrimaryFocus =
      resolvedPreset.primaryFocus.length > 0
        ? resolvedPreset.primaryFocus
        : dayFocus.length
          ? dayFocus
          : manualPreferences.primaryFocus;
    let dayPrefs: typeof manualPreferences = {
      ...manualPreferences,
      primaryFocus: effectivePrimaryFocus,
      targetBody: bodyBias.targetBody,
      targetModifier: bodyBias.targetModifier,
    };
    if (dailyPrefsOverride) {
      if (dailyPrefsOverride.goalBias) {
        const focusLabel = goalBiasToPrimaryFocus(dailyPrefsOverride.goalBias);
        if (focusLabel) dayPrefs = { ...dayPrefs, primaryFocus: [focusLabel] };
      }
      if (dailyPrefsOverride.bodyRegionBias) {
        const b = dailyPrefsOverride.bodyRegionBias;
        if (b === "upper" || b === "lower" || b === "full") {
          dayPrefs = { ...dayPrefs, targetBody: b.charAt(0).toUpperCase() + b.slice(1) as "Upper" | "Lower" | "Full", targetModifier: [] };
        } else if (b === "pull" || b === "push") {
          dayPrefs = { ...dayPrefs, targetBody: "Upper", targetModifier: [b.charAt(0).toUpperCase() + b.slice(1)] };
        } else if (b === "core") {
          dayPrefs = { ...dayPrefs, targetBody: "Full", targetModifier: [] };
        }
      }
      if (dailyPrefsOverride.energyLevel) dayPrefs = { ...dayPrefs, energyLevel: dailyPrefsOverride.energyLevel };
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
    const preferredNames = await preferredExerciseNamesForManualPreferences(dayPrefs);
    if (generationCancelledRef.current) return;
    try {
      const { generateWorkoutAsync } = await loadGeneratorModule();
      if (generationCancelledRef.current) return;
      const workout = await generateWorkoutAsync(
        dayPrefs,
        profile,
        composeRunGenerationSeed(selectedSession.date),
        preferredNames,
        resolvedPreset.sportGoalContext,
        {
          historySources: {
            workoutHistory,
            savedWorkouts,
            inProgressProgress: manualSessionProgress,
            regenerationAvoidExerciseIds: collectWorkoutExerciseIds(selectedSession.workout),
          },
        }
      );
      if (generationCancelledRef.current) return;
      const bodyKey = (dayPrefs.targetBody ?? "Full").toLowerCase() as "upper" | "lower" | "full";
      const specificEmphasis = (dayPrefs.targetModifier ?? []).map((m) => m.toLowerCase()).filter(Boolean);
      const displayTitle = formatDayTitle(dayPrefs.primaryFocus.length ? dayPrefs.primaryFocus : ["Workout"], bodyKey, specificEmphasis.length ? specificEmphasis : undefined);
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
    dailyPrefsOverride,
    activeGymProfileId,
    gymProfiles,
    adaptiveSetup,
    dayBodyFocusChoiceIds,
    dayFocusChoiceIds,
    goalBiasToPrimaryFocus,
    workoutHistory,
    savedWorkouts,
    manualSessionProgress,
    setManualWeekPlan,
  ]);

  const onSaveWeek = async () => {
    const weekPlan = manualWeekPlan;
    if (!weekPlan || !userId || !isDbConfigured()) {
      if (!userId || !isDbConfigured()) {
        setError("Sign in and enable sync to save weeks.");
      }
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveManualWeek(userId, weekPlan.weekStartDate, weekPlan.days);
      setManualWeekPlan(null);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onSaveDay = async () => {
    if (!selectedSession || !userId || !isDbConfigured()) {
      if (!userId || !isDbConfigured()) {
        setError("Sign in and enable sync to save days.");
      }
      return;
    }
    setError(null);
    setSavingDay(true);
    try {
      await saveManualDay(userId, selectedSession.date, selectedSession.workout);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDay(false);
    }
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
<<<<<<< HEAD
        onGoBack={() => router.push(weekPrefsHref)}
=======
        focusSplit={weekFocusSplit.length > 0 ? weekFocusSplit : undefined}
        workoutTitle={weekWorkoutTitle}
        onGoBack={goBackToWeekPreferences}
>>>>>>> feature/week-session-drag-reorder
      />
    );
  }

  if (isRegenerating) {
    return (
      <GenerationLoadingScreen
        message="Regenerating your workout…"
        subtitle="Applying your day edits to a fresh session."
<<<<<<< HEAD
        onGoBack={() => router.push(weekPrefsHref)}
=======
        focusSplit={weekFocusSplit.length > 0 ? weekFocusSplit : undefined}
        workoutTitle={weekWorkoutTitle}
        onGoBack={goBackToWeekPreferences}
>>>>>>> feature/week-session-drag-reorder
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
        !hasUnresolvedDayConflicts;
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
                selectedBodyIds={dayBodyFocusChoiceIds}
                selectedIds={dayFocusChoiceIds}
                conflictsPerDay={daySessionFocusConflicts}
                resolvedConflictIdsByDay={resolvedConflictIdsByDay}
                onSelectBody={(dayIdx, id) => {
                  clearDayConflictState(dayIdx);
                  setDayBodyFocusChoiceIds((prev) => {
                    const next = [...prev];
                    next[dayIdx] = id;
                    return next;
                  });
                }}
                onSelect={(dayIdx, id) => {
                  clearDayConflictState(dayIdx);
                  setDayFocusChoiceIds((prev) => {
                    const next = [...prev];
                    next[dayIdx] = id;
                    return next;
                  });
                }}
                onApplyDayResolution={handleApplyDayResolution}
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
        <View key={slot.date}>
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
            const label = s.displayTitle ?? (s.workout.focus.join(" • ") || "General");
            const isSelected =
              selectedSession?.date === s.date && selectedSession?.workout.id === s.workout.id;
            const dayIdx = weekDates.indexOf(s.date);
            const sessionIdx = plan.days.findIndex((d) => d.workout.id === s.workout.id);
            const bodyOptions = sessionIdx >= 0 ? sessionFocusMeta.bodyOptions[sessionIdx] ?? [] : [];
            const selectedBodyId = sessionIdx >= 0 ? dayBodyFocusChoiceIds[sessionIdx] : undefined;
            const bodyFocus =
              bodyOptions.find((o) => o.id === selectedBodyId) ??
              (s.workout.generationPreferences?.targetBody
                ? {
                    label: `${s.workout.generationPreferences.targetBody} body`,
                    subtitle:
                      s.workout.generationPreferences.targetModifier.length > 0
                        ? s.workout.generationPreferences.targetModifier.join(", ")
                        : null,
                  }
                : null);
            const presetOptions = sessionIdx >= 0 ? sessionFocusMeta.presets[sessionIdx] ?? [] : [];
            const selectedPresetId = sessionIdx >= 0 ? dayFocusChoiceIds[sessionIdx] : undefined;
            const priorityFocus =
              presetOptions.find((o) => o.id === selectedPresetId) ??
              (label ? { label, subtitle: "Generated focus for this day." } : null);
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
                    dayLabel={label}
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
    ? plan.days.findIndex((d) => d.workout.id === selectedDay.workout.id)
    : -1;
  const selectedDayPresetOptions =
    selectedDaySessionIdx >= 0 ? sessionFocusMeta.presets[selectedDaySessionIdx] ?? [] : [];
  const selectedDayFocusPresetId =
    selectedDaySessionIdx >= 0 ? dayFocusChoiceIds[selectedDaySessionIdx] : undefined;

  const scrollContent = (
    <View ref={scrollContentRef} style={styles.scrollContent} collapsable={false}>
      <Card
        title="Your Week Plan"
        subtitle={`Week of ${parseLocalDate(plan.weekStartDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
      >
        <Text style={{ fontSize: 13, color: theme.textMuted }}>
          Tap a day to view its session. Use arrows to move sessions between days.
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
          />

          <View style={styles.footer}>
            <DayFocusOverrideChips
              ref={dayFocusSectionRef}
              dailyPrefsOverride={dailyPrefsOverride}
              onOverrideChange={(update) =>
                setDailyPrefsOverride((p) => ({ ...(p ?? {}), ...update }))
              }
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
              baseWorkoutTier={manualPreferences.workoutTier ?? "intermediate"}
              baseIncludeCreativeVariations={manualPreferences.includeCreativeVariations === true}
              dayFocusPresets={selectedDayPresetOptions}
              selectedDayFocusPresetId={selectedDayFocusPresetId}
              expandSignal={focusEditorExpandSignal}
            />
            {userId && isDbConfigured() ? (
              <PrimaryButton
                label={savingDay ? "Saving…" : "Save this day"}
                variant="secondary"
                onPress={onSaveDay}
                disabled={savingDay}
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

      <PrimaryButton
        label={saving ? "Saving…" : "Save week"}
        onPress={onSaveWeek}
        variant="secondary"
        style={styles.saveWeekBtn}
        disabled={saving}
      />

      <DiscardSessionLink style={{ marginTop: 12, marginBottom: 24 }} />

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
            label: phaseLabelAfter("review") ?? "Start session",
            onPress: () => {
              if (selectedDay) {
                onStartDay(selectedDay.date, selectedDay.workout);
              }
            },
            disabled: selectedDay == null,
          }}
          hint={selectedDay == null ? "Tap a session above to start training." : null}
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
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    marginTop: 8,
    marginBottom: 4,
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
  saveWeekBtn: {
    marginTop: 24,
  },
});
