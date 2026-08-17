import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, LayoutAnimation } from "react-native";
import { WeekDayFocusPlanner } from "../../../components/WeekDayFocusPlanner";
import {
  applyDaySessionFocusResolution,
  dayHasUnresolvedSessionFocusConflict,
  detectDaySessionFocusConflict,
  shouldSurfaceDaySessionFocusConflict,
  type DaySessionFocusResolution,
} from "../../../lib/daySessionFocusConflict";
import {
  dayIndexForUncoveredRecommendation,
  detectUncoveredSubGoalsForWeek,
  type UncoveredSubGoalResolution,
} from "../../../lib/subGoalSplitCoverage";
import {
  buildDayBodyFocusChoicesForDay,
  buildDayFocusPresetsForDay,
  buildGymDayFocusCardLabel,
  conflictBodyIdForPicks,
  dayBodyFocusChoicesToBias,
  decodeDayBodyFocusPicks,
  encodeDayBodyFocusPicks,
  getBodyFocusDistributionForMode,
  resolveWeeklyBodyFocusMode,
  sportGoalPrioritySectionNote,
  toggleDayBodyFocusPick,
  type DayBodyFocusChoice,
  type DayBodyFocusChoiceId,
  type DayFocusPreset,
} from "../../../lib/weekDaySessionFocus";
import { recommendWeekDayFocus, weekFocusRecommendationSeed } from "../../../lib/weekDayFocusRecommendation";
import {
  buildSubFocusOverrideAligningToBody,
  mapBodyResolutionToMode,
  shouldPromptSubFocusConflictForTrigger,
} from "../../../lib/bodyFocusModeOverride";
import { getBodyEmphasisDistribution } from "../../../services/sportPrepPlanner/weeklyEmphasis";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { CollapsiblePreferenceSection } from "../../../components/CollapsiblePreferenceSection";
import { SectionLabel } from "../../../components/SectionLabel";
import { Chip } from "../../../components/Chip";
import { DurationSlider } from "../../../components/DurationSlider";
import { FlowPhaseNavBar } from "../../../components/FlowPhaseNavBar";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import { backLabelForPhase, setupRouteForFlow } from "../../../lib/sessionFlowNav";
import { sessionFlowFromSportScope, weekSetupAtPickDays, weekSetupDraftEqual } from "../../../lib/sessionDraft";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { isDbConfigured } from "../../../lib/db";
import { loadSportPrepPlannerModule } from "../../../lib/loadSportPrepPlannerModule";
import type { BodyEmphasisKey, GoalDistributionStyle, WeeklyBodyFocusMode } from "../../../lib/types";
import {
  canProceedWithWeeklyGoalDistribution,
  shouldShowWeeklyGoalDistributionNote,
} from "../../../lib/sessionFocusDistribution";
import { energyFromSportIntensity } from "../../../lib/energyLevelMapping";
import { listSportsForPrep, resolveActiveSportForSlug } from "../../../lib/db/sportRepository";
import type { Sport } from "../../../lib/db/types";
import { SPORTS_WITH_SUB_FOCUSES, getCanonicalSportSlug } from "../../../data/sportSubFocus";
import {
  goalSubFocusPayloadForAdaptiveGoals,
  goalSubFocusPctPayloadForAdaptiveGoals,
} from "../../../lib/preferencesConstants";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EMPHASIS_OPTIONS: { id: BodyEmphasisKey; label: string }[] = [
  { id: "none", label: "None" },
  { id: "upper_body", label: "Upper Body" },
  { id: "lower_body", label: "Lower Body" },
  { id: "pull", label: "Pull" },
  { id: "push", label: "Push" },
  { id: "glutes", label: "Glutes" },
  { id: "core", label: "Core" },
];

/** preferredTrainingDays uses week index: 0=Mon..6=Sun (matches planner weekDates). */
function toPreferredTrainingDays(selectedDows: number[]): number[] {
  return [...selectedDows].sort((a, b) => a - b);
}

export default function AdaptiveScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    adaptiveSetup,
    setSportPrepWeekPlan,
    sportPrepWeekPlan,
    activeGymProfileId,
    gymProfiles,
    manualPreferences,
    updateManualPreferences,
    beginSessionFlow,
    updateActiveSessionDraft,
    activeSessionDraft,
  } = useAppState();
  const { userId } = useAuth();

  const [gymTrainingDays, setGymTrainingDays] = useState<number[]>([0, 2, 4]);
  const [sportDaysBySlug, setSportDaysBySlug] = useState<Record<string, number[]>>({});
  const [defaultDuration, setDefaultDuration] = useState<number>(45);
  const [weeklyEmphasis, setWeeklyEmphasis] = useState<BodyEmphasisKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [navBarHeight, setNavBarHeight] = useState(72);
  const generationCancelledRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      scheduleFocusedRef.current = true;
      generationCancelledRef.current = false;
      beginSessionFlow(sessionFlowFromSportScope(false));
      if (adaptiveSetup) {
        updateActiveSessionDraft({ adaptiveSetup });
      }
      if (activeSessionDraft?.weekSetup?.step === "pickDays") {
        setWeekSetupStep("pickDays");
      }
      return () => {
        scheduleFocusedRef.current = false;
        generationCancelledRef.current = true;
        setIsSubmitting(false);
      };
    }, [
      adaptiveSetup,
      beginSessionFlow,
      updateActiveSessionDraft,
      activeSessionDraft?.weekSetup?.step,
    ])
  );
  const [error, setError] = useState<string | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sectionGymOpen, setSectionGymOpen] = useState(false);
  const [sectionSportOpen, setSectionSportOpen] = useState(false);
  const [sectionEmphasisOpen, setSectionEmphasisOpen] = useState(false);
  const [sectionDurationOpen, setSectionDurationOpen] = useState(false);
  const [weekSetupStep, setWeekSetupStep] = useState<"pickDays" | "sessionFocus">("pickDays");
  const [dayFocusChoiceIds, setDayFocusChoiceIds] = useState<string[]>([]);
  const [dayBodyFocusPicks, setDayBodyFocusPicks] = useState<DayBodyFocusChoiceId[][]>([]);
  const [daySubFocusOverrides, setDaySubFocusOverrides] = useState<
    Record<number, Record<string, string[]>>
  >({});
  const [resolvedConflictIdsByDay, setResolvedConflictIdsByDay] = useState<Record<number, string>>(
    {}
  );
  /** Inline day banners wait until generate — not while choosing body-focus mode/chips. */
  const [revealDayFocusConflicts, setRevealDayFocusConflicts] = useState(false);
  const [acknowledgedUncoveredSubGoalId, setAcknowledgedUncoveredSubGoalId] = useState<
    string | undefined
  >(undefined);
  const sessionHydratedRef = useRef(false);
  const scheduleFocusedRef = useRef(true);
  const [recommendationSeed, setRecommendationSeed] = useState<string | undefined>(undefined);

  useEffect(() => {
    sessionHydratedRef.current = false;
  }, [activeSessionDraft?.id]);

  useEffect(() => {
    const ws = activeSessionDraft?.weekSetup;
    if (!ws || sessionHydratedRef.current) return;
    if (ws.selectedTrainingDays.length > 0) {
      setGymTrainingDays(ws.selectedTrainingDays);
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
    if (!scheduleFocusedRef.current) return;
    const nextWeekSetup = {
      enteredWeekScreen: true,
      step: weekSetupStep,
      selectedTrainingDays: gymTrainingDays,
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
    gymTrainingDays,
    dayFocusChoiceIds,
    dayBodyFocusPicks,
    recommendationSeed,
    updateActiveSessionDraft,
    activeSessionDraft?.weekSetup,
  ]);

  useEffect(() => {
    const snap = sportPrepWeekPlan?.scheduleSnapshot;
    if (!snap?.gymTrainingDays?.length) return;
    setGymTrainingDays([...snap.gymTrainingDays].sort((a, b) => a - b));
    if (snap.sportTrainingDaysBySlug) {
      setSportDaysBySlug(
        Object.fromEntries(
          Object.entries(snap.sportTrainingDaysBySlug).map(([slug, days]) => [
            slug,
            [...days].sort((a, b) => a - b),
          ])
        )
      );
    }
    if (snap.defaultSessionDuration != null) {
      setDefaultDuration(snap.defaultSessionDuration);
    }
    if (snap.emphasis !== undefined) {
      setWeeklyEmphasis(snap.emphasis ?? null);
    }
  }, [sportPrepWeekPlan?.scheduleSnapshot?.weekStartDate]);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await listSportsForPrep();
        setSports(all);
      } catch {
        // ignore; sport labels fall back to slugs
      }
    };
    load();
  }, []);

  const toggleGymDay = useCallback((dow: number) => {
    setGymTrainingDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  }, []);

  const toggleSportDay = useCallback((slug: string, dow: number) => {
    setSportDaysBySlug((prev) => {
      const current = prev[slug] ?? [];
      const next = current.includes(dow)
        ? current.filter((d) => d !== dow)
        : [...current, dow].sort((a, b) => a - b);
      return { ...prev, [slug]: next };
    });
  }, []);

  const bodyFocusMode = resolveWeeklyBodyFocusMode(manualPreferences.weeklyBodyFocusMode);

  const sessionFocusMeta = useMemo(() => {
    if (gymTrainingDays.length === 0) {
      return {
        labels: [] as string[],
        bodyOptions: [] as DayBodyFocusChoice[][],
        presets: [] as DayFocusPreset[][],
        recommendationSummaries: [] as string[],
      };
    }
    const n = gymTrainingDays.length;
    const bd = getBodyEmphasisDistribution(n);
    const templateIds = getBodyFocusDistributionForMode(bodyFocusMode, n, bd);
    const labels = gymTrainingDays.map((dow, i) => {
      const picks = dayBodyFocusPicks[i]?.length
        ? dayBodyFocusPicks[i]!
        : templateIds[i]
          ? [templateIds[i]!]
          : (["full"] as DayBodyFocusChoiceId[]);
      const bodyChoice = dayBodyFocusChoicesToBias(picks);
      return buildGymDayFocusCardLabel(
        dow,
        i,
        bodyChoice.targetBody,
        bodyChoice.targetModifier,
        bodyChoice.specificBodyFocus,
        WEEKDAY_LABELS
      );
    });
    const bodyOptions = gymTrainingDays.map((_, i) =>
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
    const presets = gymTrainingDays.map((_, i) => {
      const picks = dayBodyFocusPicks[i]?.length
        ? dayBodyFocusPicks[i]!
        : templateIds[i]
          ? [templateIds[i]!]
          : (["full"] as DayBodyFocusChoiceId[]);
      const bodyChoice = dayBodyFocusChoicesToBias(picks);
      return buildDayFocusPresetsForDay({
        manualPreferences,
        adaptiveSetup,
        targetBody: bodyChoice.targetBody,
        targetModifier: bodyChoice.targetModifier,
        specificBodyFocus: bodyChoice.specificBodyFocus,
        bodyChoiceIds: picks,
      });
    });
    const recommendations = recommendWeekDayFocus({
      gymDays: n,
      manualPreferences,
      adaptiveSetup,
      dedicateDays:
        manualPreferences.goalDistributionStyle === "dedicate_days" &&
        (manualPreferences.primaryFocus.length > 0 ||
          (adaptiveSetup?.rankedGoals?.filter(Boolean).length ?? 0) > 0),
    });
    return {
      labels,
      bodyOptions,
      presets,
      recommendationSummaries: recommendations.days.map((d) => d.summary),
    };
  }, [gymTrainingDays, manualPreferences, adaptiveSetup, dayBodyFocusPicks, bodyFocusMode]);

  const daySessionFocusConflicts = useMemo(() => {
    if (gymTrainingDays.length === 0) return [];
    return gymTrainingDays.map((_, i) =>
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
    gymTrainingDays,
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

  const weeklyPrimaryFocusCount = manualPreferences.primaryFocus.length;
  const hasSportGoals =
    (adaptiveSetup?.rankedGoals?.filter(Boolean).length ?? 0) > 0 || weeklyPrimaryFocusCount > 0;
  const showWeeklyGoalDistribution = shouldShowWeeklyGoalDistributionNote(weeklyPrimaryFocusCount, {
    hasSportGoals,
  });
  const weeklyGoalDistributionGate = canProceedWithWeeklyGoalDistribution(
    manualPreferences.goalDistributionStyle,
    weeklyPrimaryFocusCount,
    { hasSportGoals }
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

  const reseedBodyFocusForMode = useCallback(
    (mode: WeeklyBodyFocusMode) => {
      const n = gymTrainingDays.length;
      if (n === 0) return [] as DayBodyFocusChoiceId[][];
      const rec = recommendWeekDayFocus({
        gymDays: n,
        manualPreferences: { ...manualPreferences, weeklyBodyFocusMode: mode },
        adaptiveSetup,
        dedicateDays:
          manualPreferences.goalDistributionStyle === "dedicate_days" &&
          (manualPreferences.primaryFocus.length > 0 ||
            (adaptiveSetup?.rankedGoals?.filter(Boolean).length ?? 0) > 0),
      });
      return rec.days.map((d) => d.bodyIds);
    },
    [gymTrainingDays, manualPreferences, adaptiveSetup]
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

  const handleChangeWeeklyBodyFocusMode = useCallback(
    (mode: WeeklyBodyFocusMode) => {
      if (mode === bodyFocusMode) return;
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
    if (gymTrainingDays.length === 0) return;
    const n = gymTrainingDays.length;
    const dedicateDays =
      manualPreferences.goalDistributionStyle === "dedicate_days" &&
      (manualPreferences.primaryFocus.length > 0 ||
        (adaptiveSetup?.rankedGoals?.filter(Boolean).length ?? 0) > 0);
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
  }, [gymTrainingDays, manualPreferences, adaptiveSetup, updateManualPreferences]);

  /** Always show per-day body + goal priority before generating (initial or regenerate). */
  const enterSessionFocusForGeneration = useCallback(() => {
    const n = gymTrainingDays.length;
    const choicesMatchDays =
      n > 0 &&
      dayFocusChoiceIds.length === n &&
      dayBodyFocusPicks.length === n;
    const seed = weekFocusRecommendationSeed({ manualPreferences, adaptiveSetup });
    if (choicesMatchDays && recommendationSeed === seed) {
      setWeekSetupStep("sessionFocus");
    } else {
      initSessionFocusStep();
    }
    setSportPrepWeekPlan(null);
  }, [
    gymTrainingDays.length,
    dayFocusChoiceIds.length,
    dayBodyFocusPicks.length,
    initSessionFocusStep,
    setSportPrepWeekPlan,
    manualPreferences,
    adaptiveSetup,
    recommendationSeed,
  ]);

  const goBackToSportFilters = useCallback(() => {
    setWeekSetupStep("pickDays");
    const next = weekSetupAtPickDays(activeSessionDraft?.weekSetup);
    if (next && next !== activeSessionDraft?.weekSetup) {
      updateActiveSessionDraft({ weekSetup: next });
    }
    router.replace(setupRouteForFlow("sport_week") as never);
  }, [activeSessionDraft?.weekSetup, updateActiveSessionDraft, router]);

  const onGenerate = useCallback(async () => {
    if (!adaptiveSetup) return;
    if (
      (hasUnresolvedDayConflicts || hasUnresolvedUncoveredSubGoals) &&
      shouldPromptSubFocusConflictForTrigger("generate")
    ) {
      setRevealDayFocusConflicts(true);
      return;
    }
    generationCancelledRef.current = false;
    setError(null);
    if (!isDbConfigured()) {
      setError("Configure Supabase (env vars) to use Sport Mode.");
      return;
    }
    if (gymTrainingDays.length === 0) {
      setError("Select at least one gym day.");
      return;
    }

    const primary = adaptiveSetup.rankedGoals[0] ?? null;
    const secondary = adaptiveSetup.rankedGoals[1] ?? null;
    const tertiary = adaptiveSetup.rankedGoals[2] ?? null;

    const energyBaseline = energyFromSportIntensity(adaptiveSetup.intensityLevel);

    const activeProfile =
      gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const selectedSportSlugs = adaptiveSetup.rankedSportSlugs.filter((s): s is string => s != null);

    const sportDaysAllocation: Record<string, number> = {};
    const sportTrainingDaysSelected: Record<string, number[]> = {};
    selectedSportSlugs.forEach((slug) => {
      const days = sportDaysBySlug[slug] ?? [];
      if (days.length > 0) {
        sportDaysAllocation[slug] = days.length;
        sportTrainingDaysSelected[slug] = [...days].sort((a, b) => a - b);
      }
    });
    const hasSelectedSportDays = Object.keys(sportDaysAllocation).length > 0;

    // Union of gym days and all sport-designated days (our dow: 0=Mon..6=Sun)
    const allTrainingDows = new Set<number>(gymTrainingDays);
    if (hasSelectedSportDays) {
      Object.values(sportTrainingDaysSelected).forEach((days) => {
        days.forEach((d) => allTrainingDows.add(d));
      });
    }
    const preferredTrainingDays = toPreferredTrainingDays(
      Array.from(allTrainingDows).sort((a, b) => a - b)
    );

    setIsSubmitting(true);
    try {
      const rankedGoalIds = adaptiveSetup.rankedGoals.filter((g): g is string => g != null);
      const payloadGoalSubs = goalSubFocusPayloadForAdaptiveGoals(
        rankedGoalIds,
        manualPreferences.subFocusByGoal
      );
      const { planWeek } = await loadSportPrepPlannerModule();
      const plan = await planWeek({
        userId: userId ?? undefined,
        primaryGoalSlug: primary,
        secondaryGoalSlug: secondary,
        tertiaryGoalSlug: tertiary,
        goalSubFocusByGoal: payloadGoalSubs,
        goalSubFocusPctByGoal: goalSubFocusPctPayloadForAdaptiveGoals(
          rankedGoalIds,
          manualPreferences.subFocusPctByGoal,
          payloadGoalSubs
        ),
        sportSlug: adaptiveSetup.rankedSportSlugs[0] ?? null,
        sportSubFocusSlugs:
          adaptiveSetup.rankedSportSlugs[0] &&
          SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === getCanonicalSportSlug(adaptiveSetup.rankedSportSlugs[0]!))
            ? (adaptiveSetup.subFocusBySport[adaptiveSetup.rankedSportSlugs[0]] ?? []).slice(0, 3)
            : undefined,
        sportQualitySlugs:
          adaptiveSetup.rankedSportSlugs[0] &&
          !SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === getCanonicalSportSlug(adaptiveSetup.rankedSportSlugs[0]!))
            ? (adaptiveSetup.subFocusBySport[adaptiveSetup.rankedSportSlugs[0]] ?? []).slice(0, 3)
            : undefined,
        gymDaysPerWeek: gymTrainingDays.length,
        gymTrainingDays: [...gymTrainingDays].sort((a, b) => a - b),
        sportTrainingDaysBySlug: hasSelectedSportDays
          ? sportTrainingDaysSelected
          : undefined,
        preferredTrainingDays,
        sportDaysAllocation: hasSelectedSportDays ? sportDaysAllocation : undefined,
        rankedSportSlugs: selectedSportSlugs.length > 0 ? selectedSportSlugs : undefined,
        sportFocusPct: selectedSportSlugs.length === 2 ? adaptiveSetup.sportFocusPct : undefined,
        sportVsGoalPct: adaptiveSetup.sportVsGoalPct ?? 50,
        sportSubFocusSlugsBySport: Object.keys(adaptiveSetup.subFocusBySport).length > 0 ? adaptiveSetup.subFocusBySport : undefined,
        defaultSessionDuration: defaultDuration,
        energyBaseline,
        injuries: adaptiveSetup.injuryTypes.map((label) =>
          label.toLowerCase().replace(/\s/g, "_")
        ),
        sportSessions: [],
        gymProfile: activeProfile,
        goalMatchPrimaryPct: manualPreferences.goalMatchPrimaryPct ?? 50,
        goalMatchSecondaryPct: manualPreferences.goalMatchSecondaryPct ?? 30,
        goalMatchTertiaryPct: manualPreferences.goalMatchTertiaryPct ?? 20,
        emphasis: weeklyEmphasis ?? undefined,
        workoutTier: manualPreferences.workoutTier ?? "intermediate",
        includeCreativeVariations: manualPreferences.includeCreativeVariations === true,
        goalDistributionStyle: manualPreferences.goalDistributionStyle ?? undefined,
        adaptiveScheduleLabels: {
          intensityLevel: adaptiveSetup.intensityLevel,
          injuryStatus: adaptiveSetup.injuryStatus,
          ...(adaptiveSetup.injuryTypes.length > 0
            ? { injuryAreas: [...adaptiveSetup.injuryTypes] }
            : {}),
        },
        gymDayFocusPresetIds:
          dayFocusChoiceIds.length === gymTrainingDays.length
            ? dayFocusChoiceIds
            : undefined,
        gymDayBodyFocuses:
          dayBodyFocusPicks.length === gymTrainingDays.length
            ? dayBodyFocusPicks.map((picks) => dayBodyFocusChoicesToBias(picks))
            : undefined,
        gymDaySubFocusByGoalOverrides:
          gymTrainingDays.length > 0
            ? gymTrainingDays.map((_, i) => daySubFocusOverrides[i] ?? null)
            : undefined,
        manualPreferences,
      });
      if (generationCancelledRef.current) return;
      setWeekSetupStep("pickDays");
      setSportPrepWeekPlan(plan);
      setIsSubmitting(false);
      router.replace("/sport-mode/recommendation");
    } catch (e) {
      if (generationCancelledRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    adaptiveSetup,
    gymTrainingDays,
    sportDaysBySlug,
    defaultDuration,
    weeklyEmphasis,
    setSportPrepWeekPlan,
    activeGymProfileId,
    gymProfiles,
    manualPreferences,
    userId,
    router,
    dayFocusChoiceIds,
    dayBodyFocusPicks,
    daySubFocusOverrides,
    hasUnresolvedDayConflicts,
    hasUnresolvedUncoveredSubGoals,
  ]);

  const selectedSportSlugs = useMemo(
    () =>
      adaptiveSetup
        ? adaptiveSetup.rankedSportSlugs.filter((s): s is string => s != null)
        : [],
    [adaptiveSetup]
  );

  const gymDaysSummary = useMemo(() => {
    if (gymTrainingDays.length === 0) return "Tap to choose";
    return [...gymTrainingDays]
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_LABELS[d])
      .join(", ");
  }, [gymTrainingDays]);

  const sportDaysSummary = useMemo(() => {
    if (selectedSportSlugs.length === 0) return "—";
    const parts = selectedSportSlugs.map((slug) => {
      const sport = resolveActiveSportForSlug(sports, slug);
      const days = sportDaysBySlug[slug] ?? [];
      if (days.length === 0) return null;
      const dayStr = [...days]
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_LABELS[d])
        .join(", ");
      return `${sport?.name ?? slug}: ${dayStr}`;
    });
    const selected = parts.filter((p): p is string => p != null);
    if (selected.length === 0) return "Optional — none selected";
    return selected.join(" · ");
  }, [selectedSportSlugs, sportDaysBySlug, sports]);

  const emphasisSummary = useMemo(() => {
    if (weeklyEmphasis == null) return "None";
    return EMPHASIS_OPTIONS.find((o) => o.id === weeklyEmphasis)?.label ?? "Custom";
  }, [weeklyEmphasis]);

  const durationSummary = `${defaultDuration} min`;

  if (isSubmitting) {
    return (
      <GenerationLoadingScreen
        message="Building your week…"
        subtitle="Generating each training day in order."
        onGoBack={() => {
          generationCancelledRef.current = true;
          setIsSubmitting(false);
        }}
      />
    );
  }

  if (!adaptiveSetup) {
    // Use declarative redirect to avoid calling router before root navigator mount.
    return <Redirect href="/sport-mode" />;
  }

  if (weekSetupStep === "sessionFocus") {
    const canGenerate =
      gymTrainingDays.length > 0 &&
      dayFocusChoiceIds.length === gymTrainingDays.length &&
      weeklyGoalDistributionGate.ok;
    return (
      <AppScreenWrapper>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: navBarHeight + 16 }]}
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
              label: "Your schedule",
              onPress: () => setWeekSetupStep("pickDays"),
            }}
            forward={{
              label: isSubmitting ? "Planning…" : "Generate week plan",
              onPress: onGenerate,
              disabled: isSubmitting || !canGenerate,
              loading: isSubmitting,
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
        contentContainerStyle={[styles.content, { paddingBottom: navBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title="Your schedule"
          subtitle="Pick gym days, optional sport days, and defaults—each section expands on tap."
        />

        {error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        ) : null}

        <SectionLabel style={{ marginTop: 16 }}>Session</SectionLabel>
        <CollapsiblePreferenceSection
          title="Gym days"
          subtitle="Which days do you want gym workouts?"
          summary={gymDaysSummary}
          expanded={sectionGymOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionGymOpen((v) => !v);
          }}
          marginTop={16}
        >
          <View style={styles.chipGroup}>
            {WEEKDAY_LABELS.map((label, dow) => (
              <Chip
                key={dow}
                label={label}
                selected={gymTrainingDays.includes(dow)}
                onPress={() => toggleGymDay(dow)}
              />
            ))}
          </View>
        </CollapsiblePreferenceSection>

        {selectedSportSlugs.length > 0 ? (
          <>
          <SectionLabel style={{ marginTop: 12 }}>Optional</SectionLabel>
          <CollapsiblePreferenceSection
            title="Sport days (optional)"
            subtitle="Optional: add sport days to help plan your week, or leave this blank. Overlap with gym days is fine."
            summary={sportDaysSummary}
            expanded={sectionSportOpen}
            onToggle={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSectionSportOpen((v) => !v);
            }}
          >
            {selectedSportSlugs.map((slug) => {
              const sport = resolveActiveSportForSlug(sports, slug);
              const days = sportDaysBySlug[slug] ?? [];
              return (
                <View key={slug} style={{ marginBottom: 16 }}>
                  <Text
                    style={{ fontSize: 13, marginBottom: 8, color: theme.textMuted }}
                  >
                    {sport?.name ?? slug}
                  </Text>
                  <View style={styles.chipGroup}>
                    {WEEKDAY_LABELS.map((label, dow) => (
                      <Chip
                        key={dow}
                        label={label}
                        selected={days.includes(dow)}
                        onPress={() => toggleSportDay(slug, dow)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </CollapsiblePreferenceSection>
          </>
        ) : null}

        <CollapsiblePreferenceSection
          title="Weekly body emphasis"
          subtitle="Optional bias toward one region on top of rotating upper, lower, and occasional full gym days."
          summary={emphasisSummary}
          expanded={sectionEmphasisOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionEmphasisOpen((v) => !v);
          }}
        >
          <View style={styles.chipGroup}>
            {EMPHASIS_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                label={opt.label}
                selected={weeklyEmphasis === opt.id || (opt.id === "none" && weeklyEmphasis == null)}
                onPress={() => setWeeklyEmphasis(opt.id === "none" ? null : opt.id)}
              />
            ))}
          </View>
        </CollapsiblePreferenceSection>

        <CollapsiblePreferenceSection
          title="Session length"
          subtitle="Default length for each session."
          summary={durationSummary}
          expanded={sectionDurationOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionDurationOpen((v) => !v);
          }}
        >
          <DurationSlider
            valueMinutes={defaultDuration}
            onValueChange={setDefaultDuration}
            theme={theme}
          />
        </CollapsiblePreferenceSection>

      </ScrollView>
      <FlowPhaseNavBar
        sticky
        onLayout={setNavBarHeight}
        back={{
          label: backLabelForPhase("setup"),
          onPress: goBackToSportFilters,
        }}
        forward={{
          label: sportPrepWeekPlan
            ? "Regenerate: choose each day's focus"
            : "Choose each day's focus",
          onPress: enterSessionFocusForGeneration,
          disabled: gymTrainingDays.length === 0,
        }}
        hint={gymTrainingDays.length === 0 ? "Choose at least one gym day." : null}
      />
      </View>
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
    paddingBottom: 40,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
  },
});
