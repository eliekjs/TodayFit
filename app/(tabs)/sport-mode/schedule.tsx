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
  remapDayBodyPicksToMode,
  resolveDayBodyFocusMode,
  bodyFocusModeForChoiceId,
  sportGoalPrioritySectionNote,
  toggleDayBodyFocusPick,
  type DayBodyFocusChoice,
  type DayBodyFocusChoiceId,
  type DayFocusPreset,
} from "../../../lib/weekDaySessionFocus";
import {
  overlayUserDayFocusPicks,
  recommendWeekDayFocus,
  recommendWeeklyBodyFocusMode,
  weekFocusRecommendationSeed,
} from "../../../lib/weekDayFocusRecommendation";
import {
  buildSubFocusOverrideAligningToBody,
  mapBodyResolutionToMode,
  shouldPromptSubFocusConflictForTrigger,
} from "../../../lib/bodyFocusModeOverride";
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
import type { WeeklyBodyFocusMode } from "../../../lib/types";
import { energyFromSportIntensity } from "../../../lib/energyLevelMapping";
import { listSportsForPrep, resolveActiveSportForSlug } from "../../../lib/db/sportRepository";
import type { Sport } from "../../../lib/db/types";
import { SPORTS_WITH_SUB_FOCUSES, getCanonicalSportSlug } from "../../../data/sportSubFocus";
import {
  goalSubFocusPayloadForAdaptiveGoals,
  goalSubFocusPctPayloadForAdaptiveGoals,
} from "../../../lib/preferencesConstants";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    beginSessionFlow,
    updateActiveSessionDraft,
    activeSessionDraft,
  } = useAppState();
  const { userId } = useAuth();

  const [gymTrainingDays, setGymTrainingDays] = useState<number[]>([0, 2, 4]);
  const [sportDaysBySlug, setSportDaysBySlug] = useState<Record<string, number[]>>({});
  const [defaultDuration, setDefaultDuration] = useState<number>(45);
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
  const [sectionDurationOpen, setSectionDurationOpen] = useState(false);
  const [weekSetupStep, setWeekSetupStep] = useState<"pickDays" | "sessionFocus">("pickDays");
  const [dayFocusChoiceIds, setDayFocusChoiceIds] = useState<string[]>([]);
  const [dayBodyFocusPicks, setDayBodyFocusPicks] = useState<DayBodyFocusChoiceId[][]>([]);
  const [dayBodyFocusModes, setDayBodyFocusModes] = useState<WeeklyBodyFocusMode[]>([]);
  const [daySessionFocusLocked, setDaySessionFocusLocked] = useState<boolean[]>([]);
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
    if (ws.dayBodyFocusModes?.length) {
      setDayBodyFocusModes(ws.dayBodyFocusModes);
    }
    if (ws.daySessionFocusLocked?.length) {
      setDaySessionFocusLocked(ws.daySessionFocusLocked);
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
      dayBodyFocusModes,
      daySessionFocusLocked,
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
    dayBodyFocusModes,
    daySessionFocusLocked,
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
    const recommendations = recommendWeekDayFocus({
      gymDays: n,
      manualPreferences,
      adaptiveSetup,
    });
    const merged = overlayUserDayFocusPicks({
      gymDays: n,
      recommendation: recommendations,
      existingBodyPicks: dayBodyFocusPicks,
      existingFocusIds: dayFocusChoiceIds,
      lockedDays: daySessionFocusLocked,
      existingModes: dayBodyFocusModes,
    });
    const labels = gymTrainingDays.map((dow, i) => {
      const picks = merged.bodyPicks[i]?.length
        ? merged.bodyPicks[i]!
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
    const bodyOptions = gymTrainingDays.map((_, i) => {
      const recBias = dayBodyFocusChoicesToBias(recommendations.days[i]?.bodyIds ?? ["full"]);
      const dayMode = resolveDayBodyFocusMode(
        merged.bodyPicks[i],
        dayBodyFocusModes[i],
        recommendations.mode
      );
      return buildDayBodyFocusChoicesForDay({
        manualPreferences,
        adaptiveSetup,
        slotIndex: i,
        fallbackTargetBody: recBias.targetBody,
        fallbackTargetModifier: recBias.targetModifier,
        mode: dayMode,
        templateChoiceId: recommendations.days[i]?.bodyIds[0],
      });
    });
    const presets = gymTrainingDays.map((_, i) => {
      const picks = merged.bodyPicks[i]?.length
        ? merged.bodyPicks[i]!
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
    return {
      labels,
      bodyOptions,
      presets,
      recommendationSummaries: recommendations.days.map((d) => d.summary),
      recommendedFocusIds: recommendations.days.map((d) => d.goalPresetId),
    };
  }, [gymTrainingDays, manualPreferences, adaptiveSetup, dayBodyFocusPicks, dayBodyFocusModes, dayFocusChoiceIds, daySessionFocusLocked]);

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
        mode: recommendWeeklyBodyFocusMode(manualPreferences),
      }),
    [manualPreferences, dayBodyFocusPicks]
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
            bodyFocusId: mapBodyResolutionToMode(
              resolution.bodyFocusId,
              resolveDayBodyFocusMode(
                dayBodyFocusPicks[dayIdx],
                dayBodyFocusModes[dayIdx],
                recommendWeeklyBodyFocusMode(manualPreferences)
              )
            ),
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
    [daySessionFocusConflictsToSurface, manualPreferences.subFocusByGoal, dayBodyFocusPicks, dayBodyFocusModes]
  );

  const handleChangeDayBodyFocusMode = useCallback(
    (dayIdx: number, mode: WeeklyBodyFocusMode) => {
      const current = resolveDayBodyFocusMode(
        dayBodyFocusPicks[dayIdx],
        dayBodyFocusModes[dayIdx],
        "region"
      );
      if (mode === current) return;
      setRevealDayFocusConflicts(false);
      setAcknowledgedUncoveredSubGoalId(undefined);
      setDayBodyFocusModes((prev) => {
        const next = [...prev];
        next[dayIdx] = mode;
        return next;
      });
      setDayBodyFocusPicks((prev) => {
        const next = [...prev];
        const remapped = remapDayBodyPicksToMode(next[dayIdx] ?? [], mode);
        next[dayIdx] = remapped.length ? remapped : ["full"];
        return next;
      });
      setDaySessionFocusLocked((prev) => {
        const next = [...prev];
        next[dayIdx] = true;
        return next;
      });
      clearDayConflictState(dayIdx);
    },
    [dayBodyFocusPicks, dayBodyFocusModes, clearDayConflictState]
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
      const impliedMode = bodyFocusModeForChoiceId(id);
      if (impliedMode) {
        setDayBodyFocusModes((prev) => {
          const next = [...prev];
          next[dayIdx] = impliedMode;
          return next;
        });
      }
      setDaySessionFocusLocked((prev) => {
        const next = [...prev];
        next[dayIdx] = true;
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
    const rec = recommendWeekDayFocus({
      gymDays: n,
      manualPreferences,
      adaptiveSetup,
    });
    const merged = overlayUserDayFocusPicks({
      gymDays: n,
      recommendation: rec,
      existingBodyPicks: dayBodyFocusPicks,
      existingFocusIds: dayFocusChoiceIds,
      lockedDays: daySessionFocusLocked,
      existingSubFocusOverrides: daySubFocusOverrides,
      existingModes: dayBodyFocusModes,
    });
    setDayBodyFocusPicks(merged.bodyPicks);
    setDayBodyFocusModes(merged.modes);
    setDayFocusChoiceIds(merged.focusIds);
    setDaySubFocusOverrides(merged.subFocusOverrides);
    setDaySessionFocusLocked(merged.lockedDays);
    setResolvedConflictIdsByDay({});
    setRevealDayFocusConflicts(false);
    setRecommendationSeed(weekFocusRecommendationSeed({ manualPreferences, adaptiveSetup }));
    setWeekSetupStep("sessionFocus");
  }, [
    gymTrainingDays,
    manualPreferences,
    adaptiveSetup,
    dayBodyFocusPicks,
    dayBodyFocusModes,
    dayFocusChoiceIds,
    daySessionFocusLocked,
    daySubFocusOverrides,
  ]);

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
      const dayFocusMerged = overlayUserDayFocusPicks({
        gymDays: gymTrainingDays.length,
        recommendation: recommendWeekDayFocus({
          gymDays: gymTrainingDays.length,
          manualPreferences,
          adaptiveSetup,
        }),
        existingBodyPicks: dayBodyFocusPicks,
        existingFocusIds: dayFocusChoiceIds,
        lockedDays: gymTrainingDays.map(
          (_, i) => (dayBodyFocusPicks[i]?.length ?? 0) > 0 || Boolean(dayFocusChoiceIds[i])
        ),
        existingSubFocusOverrides: daySubFocusOverrides,
        existingModes: dayBodyFocusModes,
      });
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
        workoutTier: manualPreferences.workoutTier ?? "intermediate",
        includeCreativeVariations: manualPreferences.includeCreativeVariations === true,
        goalDistributionStyle: "dedicate_days",
        adaptiveScheduleLabels: {
          intensityLevel: adaptiveSetup.intensityLevel,
          injuryStatus: adaptiveSetup.injuryStatus,
          ...(adaptiveSetup.injuryTypes.length > 0
            ? { injuryAreas: [...adaptiveSetup.injuryTypes] }
            : {}),
        },
        gymDayFocusPresetIds: dayFocusMerged.focusIds,
        gymDayBodyFocuses: dayFocusMerged.bodyPicks.map((picks, i) => ({
          ...dayBodyFocusChoicesToBias(picks),
          weeklyBodyFocusMode: dayFocusMerged.modes[i],
        })),
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
    setSportPrepWeekPlan,
    activeGymProfileId,
    gymProfiles,
    manualPreferences,
    userId,
    router,
    dayFocusChoiceIds,
    dayBodyFocusPicks,
    dayBodyFocusModes,
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
    if (selected.length === 0) return "Sport days non-selected";
    return selected.join(" · ");
  }, [selectedSportSlugs, sportDaysBySlug, sports]);

  const hasSportDaysSelected = useMemo(
    () => selectedSportSlugs.some((slug) => (sportDaysBySlug[slug] ?? []).length > 0),
    [selectedSportSlugs, sportDaysBySlug]
  );

  const durationSummary = `${defaultDuration} min`;

  if (isSubmitting) {
    return (
      <GenerationLoadingScreen
        message="Putting the week together"
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
      dayFocusChoiceIds.length === gymTrainingDays.length;
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
              recommendedFocusIds={sessionFocusMeta.recommendedFocusIds}
              conflictsPerDay={
                revealDayFocusConflicts ? daySessionFocusConflictsToSurface : undefined
              }
              resolvedConflictIdsByDay={resolvedConflictIdsByDay}
              sportGoalPriorityNote={sportGoalPrioritySectionNote(manualPreferences, adaptiveSetup)}
              bodyFocusModePerDay={gymTrainingDays.map((_, i) =>
                resolveDayBodyFocusMode(
                  dayBodyFocusPicks[i],
                  dayBodyFocusModes[i],
                  recommendWeeklyBodyFocusMode(manualPreferences)
                )
              )}
              onChangeDayBodyFocusMode={handleChangeDayBodyFocusMode}
              onSelectBody={handleSelectDayBody}
              onSelect={(dayIdx, id) => {
                clearDayConflictState(dayIdx);
                setDayFocusChoiceIds((prev) => {
                  const next = [...prev];
                  next[dayIdx] = id;
                  return next;
                });
                setDaySessionFocusLocked((prev) => {
                  const next = [...prev];
                  next[dayIdx] = true;
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
              revealDayFocusConflicts &&
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
            title={
              hasSportDaysSelected
                ? "Sport days (optional)"
                : "Mark practices or games to plan around, or skip."
            }
            subtitle="Add sport days to help plan your week, or leave this blank. Overlap with gym days is fine."
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
