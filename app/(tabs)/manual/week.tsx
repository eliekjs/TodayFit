import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { PrimaryButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { AdjustFocusModal, type FocusSection } from "../../../components/AdjustFocusModal";
import { DayFocusOverrideChips } from "../../../components/DayFocusOverrideChips";
import { SwapExerciseModal } from "../../../components/SwapExerciseModal";
import { saveManualWeek, saveManualDay } from "../../../lib/db/weekPlanRepository";
import { getLocalDateString, getTodayLocalDateString, parseLocalDate } from "../../../lib/dateUtils";
import { isDbConfigured } from "../../../lib/db";
import { preferredExerciseNamesForManualPreferences } from "../../../lib/manualPreferredExerciseNames";
import { loadGeneratorModule } from "../../../lib/loadGeneratorModule";
import { collectWeekMainLiftExerciseIds } from "../../../logic/workoutGeneration/collectWeekMainLiftExerciseIds";
import {
  accumulateWeeklySubFocusCountsFromGeneratedWorkout,
  buildWeeklySubFocusKeysFromPreferences,
} from "../../../logic/workoutGeneration/weeklySubFocusCoveragePlan";
import type { Exercise } from "../../../logic/workoutGeneration/types";
import { replaceExerciseInWorkout, collectWorkoutExerciseIds } from "../../../lib/workoutUtils";
import {
  blockTypeToSwapBlockRole,
  getSwapSuggestionsPage,
  generatorGoalToSwapTagSlugs,
} from "../../../lib/exerciseProgressions";
import { GOAL_SLUG_TO_PRIMARY_FOCUS, PRIMARY_FOCUS_TO_GOAL_SLUG } from "../../../lib/preferencesConstants";
import { buildManualPreferenceSummaryLines } from "../../../lib/workoutPreferenceSummary";
import { getBodyEmphasisDistribution } from "../../../services/sportPrepPlanner/weeklyEmphasis";
import { formatDayTitle, isSpecificFocusRelevantForBody } from "../../../lib/dayTitle";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import {
  computeDeclaredIntentSplitFromPrefs,
  buildWorkoutIntentTitle,
} from "../../../lib/workoutIntentSplit";
import {
  buildDayFocusPresetsForDay,
  resolveDayFocusPreset,
  defaultPresetIdForWeekDay,
  type DayFocusPreset,
} from "../../../lib/weekDaySessionFocus";
import { WeekDayFocusPlanner } from "../../../components/WeekDayFocusPlanner";
import type { BlockType, DailyWorkoutPreferences, ManualWeekPlan } from "../../../lib/types";
import { normalizeGeneratedWorkout } from "../../../lib/types";

const isWeb = Platform.OS === "web";

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
  } = useAppState();
  const { userId } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustFocusModal, setShowAdjustFocusModal] = useState(false);
  /** Override preferences for the selected day when regenerating (goal, body, energy). */
  const [dailyPrefsOverride, setDailyPrefsOverride] = useState<DailyWorkoutPreferences | null>(null);
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

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const dayFocusSectionRef = useRef<View>(null);
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

  const weekFocusSplit = useMemo(() => {
    const goalLabels = manualPreferences.primaryFocus.slice(0, 3);
    if (goalLabels.length === 0) return [];
    const goalSlugs = goalLabels.map((l) => PRIMARY_FOCUS_TO_GOAL_SLUG[l] ?? "strength");
    return computeDeclaredIntentSplitFromPrefs({
      sportSlugs: [],
      goalSlugs,
      sportVsGoalPct: 0,
      goalMatchPrimaryPct: manualPreferences.goalMatchPrimaryPct ?? 50,
      goalMatchSecondaryPct: manualPreferences.goalMatchSecondaryPct ?? 30,
      goalMatchTertiaryPct: manualPreferences.goalMatchTertiaryPct ?? 20,
      orderedPrimaryLabelsForSubFocus: goalLabels,
      subFocusByGoal: manualPreferences.subFocusByGoal,
      weekSubFocusPrimaryLabels: manualPreferences.weekSubFocusPrimaryLabels,
    });
  }, [
    manualPreferences.primaryFocus,
    manualPreferences.goalMatchPrimaryPct,
    manualPreferences.goalMatchSecondaryPct,
    manualPreferences.goalMatchTertiaryPct,
    manualPreferences.subFocusByGoal,
    manualPreferences.weekSubFocusPrimaryLabels,
  ]);

  const weekWorkoutTitle = useMemo(
    () => (weekFocusSplit.length > 0 ? buildWorkoutIntentTitle(weekFocusSplit) : undefined),
    [weekFocusSplit]
  );

  const sessionFocusMeta = useMemo(() => {
    if (selectedTrainingDays.length === 0) return { labels: [] as string[], presets: [] as DayFocusPreset[][] };
    const n = selectedTrainingDays.length;
    const bd = getBodyEmphasisDistribution(n);
    const weekStart = startOfWeekMonday(new Date());
    const labels = selectedTrainingDays.map((dow, i) => {
      const date = addDays(weekStart, dow);
      const b = bd[i]!;
      const mod =
        b.targetModifier.length > 0
          ? ` (${b.targetModifier.join(" · ")})`
          : "";
      return `${formatDayOfWeek(dateToISO(date))} · ${b.targetBody}${mod}`;
    });
    const presets = selectedTrainingDays.map((_, i) =>
      buildDayFocusPresetsForDay({
        manualPreferences,
        adaptiveSetup,
        targetBody: bd[i]!.targetBody,
        targetModifier: bd[i]!.targetModifier,
      })
    );
    return { labels, presets };
  }, [selectedTrainingDays, manualPreferences, adaptiveSetup]);

  const initSessionFocusStep = useCallback(() => {
    if (selectedTrainingDays.length === 0) return;
    const n = selectedTrainingDays.length;
    const bd = getBodyEmphasisDistribution(n);
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
      const presets = buildDayFocusPresetsForDay({
        manualPreferences,
        adaptiveSetup,
        targetBody: bd[i]!.targetBody,
        targetModifier: bd[i]!.targetModifier,
      });
      return defaultPresetIdForWeekDay(presets, {
        dedicateDays,
        weekGoalSlotIndex: goalIndices[i] ?? 0,
      });
    });
    setDayFocusChoiceIds(ids);
    setWeekSetupStep("sessionFocus");
  }, [selectedTrainingDays, manualPreferences, adaptiveSetup]);

  const toggleTrainingDay = useCallback((dow: number) => {
    setSelectedTrainingDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  }, []);

  const generateWeek = useCallback(async () => {
    setError(null);
    setGenerating(true);
    const profile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const weekStart = startOfWeekMonday(new Date());
    const weekStartStr = dateToISO(weekStart);

    const preferredNames = await preferredExerciseNamesForManualPreferences(manualPreferences);

    try {
      const { generateWorkoutAsync, getExercisePoolForManualGeneration, injurySlugsFromManualPreferences } =
        await loadGeneratorModule();
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
            targetBody: bodyDistribution[i]!.targetBody,
            targetModifier: bodyDistribution[i]!.targetModifier,
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
        const bodyBias = bodyDistribution[i];
        const bodyKey = bodyBias.targetBody.toLowerCase() as "upper" | "lower" | "full";
        const specificForDay = specificEmphasis.filter((k) => isSpecificFocusRelevantForBody(k, bodyKey));
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
        const workout = await generateWorkoutAsync(
          dayPrefs,
          profile,
          dateToISO(date),
          preferredNames,
          resolved.sportGoalContext,
          { exercisePool }
        );
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
      generateWeek();
    },
    [updateManualPreferences, generateWeek]
  );

  const todayIso = getTodayLocalDateString();

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
        optionName
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
    if (goalBias === "power") return "Power & Explosiveness";
    return GOAL_SLUG_TO_PRIMARY_FOCUS[goalBias];
  }, []);

  const onRegenerateDay = useCallback(async () => {
    const plan = manualWeekPlan;
    if (!plan || !selectedSession) return;
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
    const bodyBias = bodyDistribution[dayIndex];
    const goalIdx = goalIndices[dayIndex] ?? 0;
    const dayFocus = dedicateDays && manualPreferences.primaryFocus.length
      ? [manualPreferences.primaryFocus[goalIdx] ?? manualPreferences.primaryFocus[0]]
      : manualPreferences.primaryFocus;
    let dayPrefs: typeof manualPreferences = {
      ...manualPreferences,
      primaryFocus: dayFocus.length ? dayFocus : manualPreferences.primaryFocus,
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
    try {
      const { generateWorkoutAsync } = await loadGeneratorModule();
      const workout = await generateWorkoutAsync(
        dayPrefs,
        profile,
        `${selectedSession.date}_${Date.now()}`,
        preferredNames,
        {
          regeneration_avoid_exercise_ids: collectWorkoutExerciseIds(selectedSession.workout),
        }
      );
      const bodyKey = (dayPrefs.targetBody ?? "Full").toLowerCase() as "upper" | "lower" | "full";
      const specificEmphasis = (dayPrefs.targetModifier ?? []).map((m) => m.toLowerCase()).filter(Boolean);
      const displayTitle = formatDayTitle(dayPrefs.primaryFocus.length ? dayPrefs.primaryFocus : ["Workout"], bodyKey, specificEmphasis.length ? specificEmphasis : undefined);
      const newDays = plan.days.map((d) =>
        d.date === selectedSession.date ? { ...d, workout, displayTitle } : d
      );
      setManualWeekPlan({ ...plan, days: newDays });
      setSelectedSession((prev) => (prev ? { ...prev, workout, displayTitle } : null));
    } catch (e) {
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
    goalBiasToPrimaryFocus,
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
        focusSplit={weekFocusSplit.length > 0 ? weekFocusSplit : undefined}
        workoutTitle={weekWorkoutTitle}
        onGoBack={() => router.push("/manual/preferences")}
      />
    );
  }

  if (isRegenerating) {
    return (
      <GenerationLoadingScreen
        message="Regenerating your workout…"
        subtitle="Applying your day edits to a fresh session."
        focusSplit={weekFocusSplit.length > 0 ? weekFocusSplit : undefined}
        workoutTitle={weekWorkoutTitle}
        onGoBack={() => router.push("/manual/preferences")}
      />
    );
  }

  if (error && !manualWeekPlan) {
    return (
      <AppScreenWrapper>
        <StatusBar style="light" />
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
      return (
        <AppScreenWrapper>
          <StatusBar style="light" />
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <WeekDayFocusPlanner
              theme={theme}
              dayLabels={sessionFocusMeta.labels}
              presetOptionsPerDay={sessionFocusMeta.presets}
              selectedIds={dayFocusChoiceIds}
              onSelect={(dayIdx, id) => {
                setDayFocusChoiceIds((prev) => {
                  const next = [...prev];
                  next[dayIdx] = id;
                  return next;
                });
              }}
              onBack={() => setWeekSetupStep("pickDays")}
            />
            {error ? (
              <Text style={[styles.errorText, { color: theme.danger, paddingHorizontal: 20 }]}>{error}</Text>
            ) : null}
            <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
              <PrimaryButton
                label={
                  generating
                    ? "Generating…"
                    : selectedTrainingDays.length === 1
                      ? "Generate workout"
                      : "Generate week"
                }
                onPress={generateWeek}
                disabled={
                  generating ||
                  selectedTrainingDays.length === 0 ||
                  dayFocusChoiceIds.length !== selectedTrainingDays.length
                }
              />
            </View>
          </ScrollView>
        </AppScreenWrapper>
      );
    }
    return (
      <AppScreenWrapper>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.centered]}
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
          <PrimaryButton
            label={
              selectedTrainingDays.length === 1
                ? "Next: choose session focus"
                : "Next: session focus per day"
            }
            onPress={initSessionFocusStep}
            disabled={selectedTrainingDays.length === 0}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
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
                <Pressable
                  onPress={() => onSelectSession(s.date, s.workout, s.displayTitle)}
                  style={[
                    styles.dayRow,
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? theme.primarySoft : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.dayLabel, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                    {label}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onSelectSession(s.date, s.workout, s.displayTitle);
                      setTimeout(scrollToDayFocusSection, 200);
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 13, color: theme.primary, fontWeight: "500" }}>
                      Change focus
                    </Text>
                  </Pressable>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const selectedDay = selectedSession;
  const summaryLines: string[] = [];
  if (selectedDay) {
    const head = selectedDay.displayTitle;
    const snap = selectedDay.workout.generationPreferences;
    if (snap) {
      if (head) summaryLines.push(head);
      summaryLines.push(
        ...buildManualPreferenceSummaryLines(snap, { includePrimaryFocus: !head })
      );
    } else {
      if (selectedDay.workout.focus?.length) {
        summaryLines.push(head ?? selectedDay.workout.focus.join(" • "));
      } else if (head) {
        summaryLines.push(head);
      }
      if (selectedDay.workout.durationMinutes != null) {
        summaryLines.push(`${selectedDay.workout.durationMinutes} min`);
      }
      if (selectedDay.workout.energyLevel) {
        const e = selectedDay.workout.energyLevel;
        summaryLines.push(`${e.charAt(0).toUpperCase()}${e.slice(1)} energy`);
      }
    }
  }

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
          onPress={generateWeek}
          disabled={generating}
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
          <Card
            title="Summary"
            subtitle={summaryLines.join(" • ")}
            style={styles.summaryCard}
          >
            {selectedDay.workout.notes != null ? (
              <Text style={[styles.notes, { color: theme.textMuted }]}>
                {selectedDay.workout.notes}
              </Text>
            ) : null}
          </Card>

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
            />
            <PrimaryButton
              label="Start"
              onPress={() => onStartDay(selectedDay.date, selectedDay.workout)}
              style={{ marginTop: 16 }}
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
            <PrimaryButton
              label="Back to Preferences"
              variant="ghost"
              onPress={() => {
                router.push("/manual/preferences");
              }}
              style={{ marginTop: 8 }}
            />
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
      <StatusBar style="light" />
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {scrollContent}
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
  dayRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    marginTop: 16,
    marginBottom: 24,
  },
  summaryCard: {
    marginBottom: 8,
  },
  notes: {
    fontSize: 13,
  },
  sessionHint: {
    fontSize: 13,
  },
  saveWeekBtn: {
    marginTop: 24,
  },
});
