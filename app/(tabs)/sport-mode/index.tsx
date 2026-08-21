import React, { useEffect, useMemo, useState, useRef, useCallback, type RefObject } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
  Modal,
  type GestureResponderEvent,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { StatusBar } from "expo-status-bar";
import { themeRadius, useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { SectionLabel } from "../../../components/SectionLabel";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { CollapsiblePreferenceSection } from "../../../components/CollapsiblePreferenceSection";
import { GymProfileSelectionPanel } from "../../../components/GymProfileSelectionPanel";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { VolumePreferencePicker } from "../../../components/VolumePreferencePicker";
import { FlowPhaseNavBar } from "../../../components/FlowPhaseNavBar";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import { ExperienceLevelToggle } from "../../../components/ExperienceLevelToggle";
import { useAppState } from "../../../context/AppStateContext";
import type { AdaptiveSetup } from "../../../context/appStateModel";
import { useAuth } from "../../../context/AuthContext";
import { isDbConfigured } from "../../../lib/db";
import { formatRemoteLoadError } from "../../../context/formatRemoteLoadError";
import {
  ADVANCED_OPTIONS_LABEL,
  AVOID_OR_PROTECT_SUBTITLE,
  AVOID_OR_PROTECT_TITLE,
  constraintOptionsForTargetBody,
  energyLevelSummary,
  ENERGY_LEVELS,
  GOAL_MATCH_PCT_SUBTITLE,
  GOAL_MATCH_PCT_TITLE,
  HOW_HARD_TO_TRAIN_SUBTITLE,
  HOW_HARD_TO_TRAIN_TITLE,
  injuriesSummary,
  SUB_GOAL_BLEND_SUBTITLE,
  SUB_GOAL_BLEND_TITLE,
  VOLUME_PREFERENCE_TITLE,
  DURATIONS,
  normalizeGoalMatchPct,
  ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY,
  TARGET_OPTIONS,
  oneDayBodyBiasFromTargetBody,
  goalSubFocusPayloadForAdaptiveGoals,
  goalSubFocusPctPayloadForAdaptiveGoals,
  collectInvalidConditioningSubFocusSelections,
  subFocusChoicesForManualPrimaryGoal,
  volumePreferenceDisplayLabel,
  volumePreferenceSectionSubtitle,
} from "../../../lib/preferencesConstants";
import {
  equalIntegerPctsForLabels,
  normalizeSubFocusPctRecord,
  redistributeSubFocusPctsOnRemoval,
} from "../../../lib/subFocusWeights";
import { SubFocusWeightsEditor } from "../../../components/SubFocusWeightsEditor";
import { BodyFocusDeferredNote } from "../../../components/BodyFocusDeferredNote";
import {
  countVisibleGoalSubFocusPicks,
  filterDeferredDayBodySubFocusChoices,
  goalHasDeferredDayBodySubFocuses,
  stripDeferredDayBodySubFocuses,
} from "../../../lib/deferredDayBodySubFocus";
import { PILOT_HIDE_MATCH_PCT_ADVANCED_OPTIONS } from "../../../lib/pilotCatalog";
import { listSportsForPrep, getQualitiesForSport, resolveActiveSportForSlug } from "../../../lib/db/sportRepository";
import type { Sport } from "../../../lib/db/types";
import type { SportQuality } from "../../../lib/db/types";
import { SPORTS_WITH_SUB_FOCUSES, getCanonicalSportSlug } from "../../../data/sportSubFocus";
import { loadSportPrepPlannerModule } from "../../../lib/loadSportPrepPlannerModule";
import { prefetchWorkoutGenerationStack } from "../../../lib/prefetchWorkoutGeneration";
import type { DailyWorkoutPreferences, TargetBody } from "../../../lib/types";
import {
  SPORT_INTENSITY_OPTIONS,
  energyFromSportIntensity,
  sportIntensityFromEnergy,
  type SportIntensityLevel,
} from "../../../lib/energyLevelMapping";
import { detectPreferenceConflicts } from "../../../lib/preferenceConflictDetector";
import { PreferenceConflictBanner } from "../../../components/PreferenceConflictBanner";
import { FocusDistributionNote } from "../../../components/FocusDistributionNote";
import {
  canProceedWithDailyFocusDistribution,
  getDailyBodyFocusConflicts,
  isBodyFocusPreferenceConflict,
  shouldShowDailyFocusDistributionNote,
} from "../../../lib/sessionFocusDistribution";
import {
  isOneDaySportModeCombinationValid,
  ONE_DAY_SPORT_MODE_COMBINATION_HINT,
  MAX_TOTAL_PRIORITY_PICKS_DAY,
  MAX_TOTAL_PRIORITY_PICKS_WEEK,
} from "../../../lib/sportModeOneDayValidation";
import {
  MAX_SUB_GOALS_PER_PARENT,
  MAX_TOTAL_SUB_GOALS,
  countSubGoalPicksForParents,
} from "../../../lib/selectionCaps";
import { sessionFlowFromSportScope, weekSetupAtPickDays } from "../../../lib/sessionDraft";
import { summarizeGymProfileEquipment } from "../../../lib/gymProfileDisplay";
import { formatItemList } from "../../../lib/formatItemList";
import {
  applySportFormSnapshot,
  buildSportFormSnapshot,
} from "../../../lib/sportFormHydration";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Spec-aligned: Performance, Physique, Resilience, Energy System. Excludes sport-specific (trail, climbing, ski, conditioning) so they don’t overlap with sport selection. */
const ADAPTIVE_GOALS = [
  { id: "strength", label: "Max strength foundation", category: "Performance" },
  { id: "muscle", label: "Build visible muscle", category: "Physique" },
  { id: "endurance", label: "Endurance engine", category: "Energy System" },
  { id: "recovery_mobility", label: "Recovery & mobility", category: "Resilience" },
  { id: "joint_health", label: "Joint health strength", category: "Resilience" },
  { id: "physique", label: "Physique / body comp", category: "Physique" },
  /** @deprecated adaptive id — maps to Recovery & Mobility */
  { id: "mobility", label: "Recovery & mobility", category: "Resilience" },
  { id: "resilience", label: "Recovery & mobility", category: "Resilience" },
];

const INJURY_STATUS_OPTIONS = [
  "No Concerns",
  "Managing",
  "Rebuilding",
] as const;

const MAX_SUB_GOALS_PER_GOAL = MAX_SUB_GOALS_PER_PARENT;

function currentVisibleSubGoalPickCount(args: {
  subFocusByGoal: Record<string, string[]>;
  rankedGoals: (string | null)[];
  subFocusBySport: Record<string, string[]>;
  rankedSportSlugs: (string | null)[];
  deferDayBody: boolean;
}): number {
  const goalLabels = args.rankedGoals
    .filter((g): g is string => g != null)
    .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
    .filter((l): l is string => Boolean(l));
  const sportKeys = args.rankedSportSlugs.filter((s): s is string => s != null);
  return (
    countVisibleGoalSubFocusPicks(args.subFocusByGoal, goalLabels, args.deferDayBody) +
    countSubGoalPicksForParents(args.subFocusBySport, sportKeys)
  );
}

/** Screen-space point for anchoring the selection-limit tooltip (e.g. from press `nativeEvent`). */
type LimitPopupAnchor = { pageX: number; pageY: number };

type LimitPopupState = {
  message: string;
  anchor: LimitPopupAnchor;
};

type AdaptiveAdvNestedKey =
  | "additionalGoals"
  | "sportVsGoals"
  | "goalMatch"
  | "goalSubGoals"
  | "sportFocus"
  | "injury"
  | "intensityLevel"
  | "volumePreference";

export default function AdaptiveModeScreen() {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const windowBoxRef = useRef({ width: windowWidth, height: windowHeight });
  windowBoxRef.current = { width: windowWidth, height: windowHeight };
  const router = useRouter();
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const {
    manualPreferences,
    updateManualPreferences,
    setAdaptiveSetup,
    setSportPrepWeekPlan,
    activeGymProfileId,
    gymProfiles,
    setActiveGymProfile,
    beginSessionFlow,
    updateActiveSessionDraft,
    activeSessionDraft,
    consumeSportFormHydration,
    commitSportFormSnapshot,
    addSportPreset,
  } = useAppState();
  const { userId } = useAuth();
  const isOneDay = scope === "day";

  const [rankedGoals, setRankedGoals] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [intensityLevel, setIntensityLevel] = useState<SportIntensityLevel>(() =>
    sportIntensityFromEnergy(manualPreferences.energyLevel)
  );
  const [injuryStatus, setInjuryStatus] =
    useState<(typeof INJURY_STATUS_OPTIONS)[number]>("No Concerns");
  /** Selected injury areas when status is Managing or Rebuilding (labels, e.g. "Knee", "Shoulder"). */
  const [injuryTypes, setInjuryTypes] = useState<string[]>([]);
  /** Sport focus % when 2 sports: [1st sport %, 2nd sport %], sum = 100. Default 60/40. */
  const [sportFocusPct, setSportFocusPct] = useState<[number, number]>([60, 40]);
  /** When both sports and goals: 0–100 = sport(s) share; additional goals = 100 - sportVsGoalPct. Default 50. */
  const [sportVsGoalPct, setSportVsGoalPct] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsError, setSportsError] = useState<string | null>(null);
  const [sportsSearch, setSportsSearch] = useState("");
  /** Ranked sports (up to 2). At least one required in Sport Mode. */
  const [rankedSportSlugs, setRankedSportSlugs] = useState<(string | null)[]>([null, null]);
  /** Sub-focus (qualities) per sport: sportSlug -> quality slugs (max 3 per sport). */
  const [subFocusBySport, setSubFocusBySport] = useState<Record<string, string[]>>({});
  /** Which sport's sub-goals row is expanded. */
  const [sectionGoalsOpen, setSectionGoalsOpen] = useState(false);
  /** Cached qualities per sport (loaded when sport is selected). */
  const [qualitiesBySport, setQualitiesBySport] = useState<Record<string, SportQuality[]>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sectionSportOpen, setSectionSportOpen] = useState(false);
  const [sectionGymOpen, setSectionGymOpen] = useState(false);
  const [sectionSessionOpen, setSectionSessionOpen] = useState(false);
  const [sectionBodyOpen, setSectionBodyOpen] = useState(false);
  const adaptiveScrollRef = useRef<ScrollView>(null);
  const adaptiveContentRef = useRef<View>(null);
  const adaptiveAdvancedRef = useRef<View>(null);
  const adaptiveGoalSubFocusBlendRef = useRef<View>(null);
  const [adaptiveAdvNestedOpen, setAdaptiveAdvNestedOpen] = useState<
    Partial<Record<AdaptiveAdvNestedKey, boolean>>
  >({});
  const toggleAdaptiveAdvNested = useCallback((key: AdaptiveAdvNestedKey) => {
    setAdaptiveAdvNestedOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const [editingGoalMatchRank, setEditingGoalMatchRank] = useState<1 | 2 | 3 | null>(null);
  const [editingGoalMatchValue, setEditingGoalMatchValue] = useState("");
  const [isGeneratingOneDay, setIsGeneratingOneDay] = useState(false);
  const [navBarHeight, setNavBarHeight] = useState(88);
  const generationCancelledRef = useRef(false);

  const [dismissedConflictIds, setDismissedConflictIds] = useState<string[]>([]);
  const [showSaveSportPresetModal, setShowSaveSportPresetModal] = useState(false);
  const [saveSportPresetName, setSaveSportPresetName] = useState("");
  const [oneDayDuration, setOneDayDuration] = useState<number>(45);
  const [limitPopup, setLimitPopup] = useState<LimitPopupState | null>(null);
  const limitPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultOneDayBodyBias = useMemo<NonNullable<DailyWorkoutPreferences["bodyRegionBias"]>>(() => {
    if (manualPreferences.targetBody === "Upper") return "upper";
    if (manualPreferences.targetBody === "Lower") return "lower";
    return "full";
  }, [manualPreferences.targetBody]);
  const [oneDayBodyBias, setOneDayBodyBias] =
    useState<NonNullable<DailyWorkoutPreferences["bodyRegionBias"]>>(defaultOneDayBodyBias);

  const sportFormSnapshotRef = useRef<ReturnType<typeof buildSportFormSnapshot> | null>(null);
  const oneDayBodyBiasForSnapshot: "upper" | "lower" | "full" =
    oneDayBodyBias === "upper" || oneDayBodyBias === "lower" ? oneDayBodyBias : "full";

  sportFormSnapshotRef.current = buildSportFormSnapshot({
    rankedGoals,
    intensityLevel,
    injuryStatus,
    injuryTypes,
    sportFocusPct,
    sportVsGoalPct,
    rankedSportSlugs,
    subFocusBySport,
    oneDayDuration,
    oneDayBodyBias: oneDayBodyBiasForSnapshot,
  });

  useFocusEffect(
    useCallback(() => {
      generationCancelledRef.current = false;
      setIsGeneratingOneDay(false);
      beginSessionFlow(sessionFlowFromSportScope(isOneDay));
      if (!isOneDay) {
        const next = weekSetupAtPickDays(activeSessionDraft?.weekSetup);
        if (next && next !== activeSessionDraft?.weekSetup) {
          updateActiveSessionDraft({ weekSetup: next });
        }
      }
      const snap = consumeSportFormHydration();
      if (snap) {
        applySportFormSnapshot(snap, {
          setRankedGoals,
          // Snapshot values are plain strings; only apply when they're valid options.
          setIntensityLevel: (value) => {
            if (typeof value === "string" && (SPORT_INTENSITY_OPTIONS as readonly string[]).includes(value)) {
              setIntensityLevel(value as SportIntensityLevel);
            }
          },
          setInjuryStatus: (value) => {
            if (typeof value === "string" && (INJURY_STATUS_OPTIONS as readonly string[]).includes(value)) {
              setInjuryStatus(value as (typeof INJURY_STATUS_OPTIONS)[number]);
            }
          },
          setInjuryTypes,
          setSportFocusPct,
          setSportVsGoalPct,
          setRankedSportSlugs,
          setSubFocusBySport,
          setOneDayDuration,
          setOneDayBodyBias: (value) => {
            const next = typeof value === "function" ? value(oneDayBodyBiasForSnapshot) : value;
            setOneDayBodyBias(next);
          },
        });
        updateManualPreferences({
          energyLevel: energyFromSportIntensity(snap.intensityLevel),
        });
      }
      return () => {
        generationCancelledRef.current = true;
        setIsGeneratingOneDay(false);
        if (sportFormSnapshotRef.current) {
          commitSportFormSnapshot(sportFormSnapshotRef.current);
        }
      };
    }, [
      isOneDay,
      beginSessionFlow,
      consumeSportFormHydration,
      commitSportFormSnapshot,
      updateManualPreferences,
      oneDayBodyBiasForSnapshot,
      activeSessionDraft?.weekSetup,
      updateActiveSessionDraft,
    ])
  );

  const showLimitPopup = useCallback((message: string, anchor?: LimitPopupAnchor) => {
    if (limitPopupTimerRef.current) {
      clearTimeout(limitPopupTimerRef.current);
    }
    const { width: w, height: h } = windowBoxRef.current;
    const resolved: LimitPopupAnchor =
      anchor ?? { pageX: w / 2, pageY: h * (isOneDay ? 0.28 : 0.32) };
    setLimitPopup({ message, anchor: resolved });
    limitPopupTimerRef.current = setTimeout(() => {
      setLimitPopup(null);
      limitPopupTimerRef.current = null;
    }, 2600);
  }, [isOneDay]);

  useEffect(() => {
    void prefetchWorkoutGenerationStack({ includeCatalog: true });
    void loadSportPrepPlannerModule();
  }, []);

  useEffect(() => {
    const loadSports = async () => {
      try {
        setSportsError(null);
        const all = await listSportsForPrep();
        setSports(all);
      } catch (e) {
        setSportsError(formatRemoteLoadError(e));
      }
    };
    loadSports();
  }, []);

  useEffect(() => {
    setOneDayBodyBias(defaultOneDayBodyBias);
  }, [defaultOneDayBodyBias]);

  useEffect(() => {
    if (isOneDay) return;
    const stripped = stripDeferredDayBodySubFocuses(
      manualPreferences.subFocusByGoal,
      manualPreferences.subFocusPctByGoal
    );
    if (!stripped.changed) return;
    updateManualPreferences({
      subFocusByGoal: stripped.subFocusByGoal,
      subFocusPctByGoal: stripped.subFocusPctByGoal,
    });
  }, [
    isOneDay,
    manualPreferences.subFocusByGoal,
    manualPreferences.subFocusPctByGoal,
    updateManualPreferences,
  ]);

  useEffect(() => {
    const allowed = new Set(
      rankedGoals
        .filter((g): g is string => g != null)
        .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
        .filter((l): l is string => Boolean(l))
    );
    if (allowed.size === 0) return;
    const nextSub = { ...manualPreferences.subFocusByGoal };
    const nextPct = { ...(manualPreferences.subFocusPctByGoal ?? {}) };
    let changed = false;
    for (const key of Object.keys(nextSub)) {
      if (!allowed.has(key)) {
        delete nextSub[key];
        delete nextPct[key];
        changed = true;
      }
    }
    if (!changed) return;
    updateManualPreferences({ subFocusByGoal: nextSub, subFocusPctByGoal: nextPct });
  }, [
    rankedGoals,
    manualPreferences.subFocusByGoal,
    manualPreferences.subFocusPctByGoal,
    updateManualPreferences,
  ]);

  useEffect(() => {
    const allowed = new Set(rankedSportSlugs.filter((s): s is string => s != null));
    if (allowed.size === 0) return;
    setSubFocusBySport((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!allowed.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rankedSportSlugs]);

  useEffect(() => {
    return () => {
      if (limitPopupTimerRef.current) clearTimeout(limitPopupTimerRef.current);
    };
  }, []);

  // Load qualities (sub-goals) for each selected sport when not yet cached
  useEffect(() => {
    const slugs = rankedSportSlugs.filter((s): s is string => s != null);
    if (!isDbConfigured() || slugs.length === 0) return;
    let cancelled = false;
    slugs.forEach(async (slug) => {
      if (qualitiesBySport[slug] != null) return;
      try {
        const list = await getQualitiesForSport(slug);
        if (!cancelled) {
          setQualitiesBySport((prev) => ({ ...prev, [slug]: list }));
        }
      } catch {
        // ignore; qualities optional
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rankedSportSlugs.join(",")]);

  const addSport = (slug: string, pressEvent?: GestureResponderEvent) => {
    const anchor = pressEvent
      ? { pageX: pressEvent.nativeEvent.pageX, pageY: pressEvent.nativeEvent.pageY }
      : undefined;
    const current = rankedSportSlugs.filter((s): s is string => s != null);
    const currentGoalsCount = rankedGoals.filter((g): g is string => g != null).length;
    if (current.includes(slug) || current.length >= 2) return;
    if (isOneDay && current.length === 1 && currentGoalsCount > 0) {
      showLimitPopup(
        `For one-day Sport Mode, ${ONE_DAY_SPORT_MODE_COMBINATION_HINT}`,
        anchor
      );
      return;
    }
    if (current.length + currentGoalsCount >= totalPriorityCap) {
      showLimitPopup(
        `You can select up to ${totalPriorityCap} total across sports and goals in ${isOneDay ? "one-day" : "week"} mode.`,
        anchor
      );
      return;
    }
    setError(null);
    const next: (string | null)[] = [...rankedSportSlugs];
    const idx = next.findIndex((s) => s == null);
    if (idx >= 0) next[idx] = slug;
    setRankedSportSlugs(next);
    if (current.length === 1) setSportFocusPct([60, 40]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const removeSport = (slug: string) => {
    setRankedSportSlugs((prev) => {
      const next = prev.map((s) => (s === slug ? null : s));
      const filled = next.filter((s): s is string => s != null);
      return [filled[0] ?? null, filled[1] ?? null];
    });
    setSubFocusBySport((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const toggleSportSubFocus = (
    sportSlug: string,
    qualitySlug: string,
    pressEvent?: GestureResponderEvent
  ) => {
    const anchor = pressEvent
      ? { pageX: pressEvent.nativeEvent.pageX, pageY: pressEvent.nativeEvent.pageY }
      : undefined;
    const current = subFocusBySport[sportSlug] ?? [];
    const has = current.includes(qualitySlug);
    if (has) {
      setSubFocusBySport((prev) => ({
        ...prev,
        [sportSlug]: current.filter((x) => x !== qualitySlug),
      }));
    } else {
      if (current.length >= MAX_SUB_GOALS_PER_GOAL) return;
      const totalVisible = currentVisibleSubGoalPickCount({
        subFocusByGoal: manualPreferences.subFocusByGoal,
        rankedGoals,
        subFocusBySport,
        rankedSportSlugs,
        deferDayBody: !isOneDay,
      });
      if (totalVisible >= MAX_TOTAL_SUB_GOALS) {
        showLimitPopup(
          `You can select up to ${MAX_TOTAL_SUB_GOALS} total sub-goals across goals and sports.`,
          anchor
        );
        return;
      }
      setError(null);
      setSubFocusBySport((prev) => ({
        ...prev,
        [sportSlug]: [...current, qualitySlug],
      }));
    }
  };

  const onSaveSportPreset = () => {
    setSaveSportPresetName("");
    setShowSaveSportPresetModal(true);
  };

  const onConfirmSaveSportPreset = () => {
    const name = saveSportPresetName.trim() || "My sport preset";
    addSportPreset({
      name,
      savedAt: new Date().toISOString(),
      sportForm: sportFormSnapshotRef.current ?? buildSportFormSnapshot({
        rankedGoals,
        intensityLevel,
        injuryStatus,
        injuryTypes,
        sportFocusPct,
        sportVsGoalPct,
        rankedSportSlugs,
        subFocusBySport,
        oneDayDuration,
        oneDayBodyBias: oneDayBodyBiasForSnapshot,
      }),
    });
    setShowSaveSportPresetModal(false);
    setSaveSportPresetName("");
    router.push("/presets?kind=sport");
  };

  const onNextToSchedule = () => {
    setError(null);
    if (!isDbConfigured()) {
      setError("Configure Supabase (env vars) to use Sport Mode.");
      return;
    }
    const selectedSportCount = rankedSportSlugs.filter((s): s is string => s != null).length;
    const selectedGoalCount = rankedGoals.filter((g): g is string => g != null).length;
    if (selectedSportCount < 1) {
      setError("Choose at least one sport.");
      return;
    }
    if (
      isOneDay &&
      !isOneDaySportModeCombinationValid({
        sportCount: selectedSportCount,
        goalCount: selectedGoalCount,
        sportSubGoalCount: totalSportSubGoalsSelected,
      })
    ) {
      setError(`For one-day Sport Mode, ${ONE_DAY_SPORT_MODE_COMBINATION_HINT.toLowerCase()}`);
      return;
    }
    if (isOneDay && !(oneDayDuration > 0)) {
      setError("Choose a session length.");
      return;
    }
    const setup: AdaptiveSetup = {
      rankedGoals: [...rankedGoals],
      intensityLevel,
      injuryStatus,
      injuryTypes: [...injuryTypes],
      rankedSportSlugs: [...rankedSportSlugs],
      subFocusBySport: { ...subFocusBySport },
      sportFocusPct: [...sportFocusPct],
      sportVsGoalPct,
    };

    if (isOneDay) {
      (async () => {
        generationCancelledRef.current = false;
        setIsGeneratingOneDay(true);
        try {
          const primary = rankedGoals[0] ?? null;
          const secondary = rankedGoals[1] ?? null;
          const tertiary = rankedGoals[2] ?? null;
          const energyBaseline = energyFromSportIntensity(intensityLevel);
          const activeProfile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
          const selectedSportSlugs = rankedSportSlugs.filter((s): s is string => s != null);
          const todayDOW = (new Date().getDay() + 6) % 7;
          const rankedGoalIds = rankedGoals.filter((g): g is string => g != null);
          const payloadGoalSubs = goalSubFocusPayloadForAdaptiveGoals(
            rankedGoalIds,
            manualPreferences.subFocusByGoal
          );
          const { planWeek, forceIntentKeyForOneDaySport } = await loadSportPrepPlannerModule();
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
            sportSlug: rankedSportSlugs[0] ?? null,
            sportSubFocusSlugs:
              rankedSportSlugs[0] && SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === getCanonicalSportSlug(rankedSportSlugs[0]!))
                ? (subFocusBySport[rankedSportSlugs[0]] ?? []).slice(0, 3)
                : undefined,
            sportQualitySlugs:
              rankedSportSlugs[0] && !SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === getCanonicalSportSlug(rankedSportSlugs[0]!))
                ? (subFocusBySport[rankedSportSlugs[0]] ?? []).slice(0, 3)
                : undefined,
            gymDaysPerWeek: 1,
            preferredTrainingDays: [todayDOW],
            sportDaysAllocation: undefined,
            rankedSportSlugs: selectedSportSlugs.length > 0 ? selectedSportSlugs : undefined,
            sportFocusPct: selectedSportSlugs.length === 2 ? sportFocusPct : undefined,
            sportVsGoalPct: sportVsGoalPct ?? 50,
            sportSubFocusSlugsBySport: Object.keys(subFocusBySport).length > 0 ? subFocusBySport : undefined,
            defaultSessionDuration: oneDayDuration,
            energyBaseline,
            injuries: injuryTypes.map((label) =>
              label.toLowerCase().replace(/\s/g, "_")
            ),
            sportSessions: [],
            gymProfile: activeProfile,
            goalMatchPrimaryPct: manualPreferences.goalMatchPrimaryPct ?? 50,
            goalMatchSecondaryPct: manualPreferences.goalMatchSecondaryPct ?? 30,
            goalMatchTertiaryPct: manualPreferences.goalMatchTertiaryPct ?? 20,
            workoutTier: manualPreferences.workoutTier ?? "intermediate",
            includeCreativeVariations: manualPreferences.includeCreativeVariations === true,
            dailyPreferences: { bodyRegionBias: oneDayBodyBias },
            sessionFocusDistribution: manualPreferences.sessionFocusDistribution ?? undefined,
            // One-day sport body chips are Region-only (Upper/Lower/Full). Don't let a leftover
            // Muscle-week Chest pick or weeklyBodyFocusMode invent a chest day.
            manualPreferences: {
              ...manualPreferences,
              weeklyBodyFocusMode: "region",
              specificBodyFocus: undefined,
              targetBody:
                oneDayBodyBias === "upper"
                  ? "Upper"
                  : oneDayBodyBias === "lower"
                    ? "Lower"
                    : "Full",
              targetModifier: [],
            },
            adaptiveScheduleLabels: {
              intensityLevel,
              injuryStatus,
              ...(injuryTypes.length > 0 ? { injuryAreas: [...injuryTypes] } : {}),
            },
            forceIntentKey: forceIntentKeyForOneDaySport(primary, rankedSportSlugs),
          });
          if (generationCancelledRef.current) return;
          setSportPrepWeekPlan(plan);
          setAdaptiveSetup(null);
          router.push("/sport-mode/recommendation");
        } catch (e) {
          if (generationCancelledRef.current) return;
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setIsGeneratingOneDay(false);
        }
      })();
      return;
    }

    setAdaptiveSetup(setup);
    const next = weekSetupAtPickDays(activeSessionDraft?.weekSetup);
    if (next && next !== activeSessionDraft?.weekSetup) {
      updateActiveSessionDraft({ weekSetup: next });
    }
    router.push("/sport-mode/schedule");
  };

  const filteredSportsFlat = useMemo(() => {
    const q = sportsSearch.trim().toLowerCase();
    return sports
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sports, sportsSearch]);

  const selectedSportSlugs = rankedSportSlugs.filter((s): s is string => s != null);

  const activeGymProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
  const gymSummary =
    activeGymProfile != null
      ? `${activeGymProfile.name} · ${summarizeGymProfileEquipment(activeGymProfile).itemCount} items`
      : "Tap to choose";

  /** Available sports to show in the picker (excludes already selected), A–Z by name. */
  const availableSportsForPicker = useMemo(() => {
    const selected = new Set(selectedSportSlugs.map((s) => s.toLowerCase().trim()));
    const selectedCanonical = new Set(
      selectedSportSlugs.map((s) => getCanonicalSportSlug(s).toLowerCase().trim())
    );
    return filteredSportsFlat.filter((s) => {
      const sl = (s.slug ?? "").toLowerCase().trim();
      if (selected.has(sl)) return false;
      const canon = getCanonicalSportSlug(s.slug ?? "").toLowerCase().trim();
      if (selectedCanonical.has(canon)) return false;
      return true;
    });
  }, [filteredSportsFlat, selectedSportSlugs]);
  const primarySlug = rankedSportSlugs[0] ?? null;
  const secondarySlug = rankedSportSlugs[1] ?? null;
  const primarySport = primarySlug ? resolveActiveSportForSlug(sports, primarySlug) : null;
  const secondarySport = secondarySlug ? resolveActiveSportForSlug(sports, secondarySlug) : null;

  const addGoal = (goalId: string, pressEvent?: GestureResponderEvent) => {
    const anchor = pressEvent
      ? { pageX: pressEvent.nativeEvent.pageX, pageY: pressEvent.nativeEvent.pageY }
      : undefined;
    const currentCount = rankedGoals.filter((g): g is string => g != null).length;
    const currentSportsCount = rankedSportSlugs.filter((s): s is string => s != null).length;
    const maxGoalsAllowed = isOneDay ? 1 : 3;
    if (currentCount >= maxGoalsAllowed || rankedGoals.includes(goalId)) return;
    if (isOneDay && currentSportsCount >= 2) {
      showLimitPopup("For one-day Sport Mode, 2 sports means no additional goals.", anchor);
      return;
    }
    if (currentCount + currentSportsCount >= totalPriorityCap) {
      showLimitPopup(
        isOneDay
          ? `For one-day Sport Mode, ${ONE_DAY_SPORT_MODE_COMBINATION_HINT}`
          : `You can select up to ${totalPriorityCap} total across sports and goals in week mode.`,
        anchor
      );
      return;
    }
    setError(null);
    setRankedGoals((prev) => {
      const next = [...prev];
      const idx = next.findIndex((g) => g == null);
      if (idx < 0) return prev;
      next[idx] = goalId;
      return next;
    });
    const newCount = currentCount + 1;
    if (newCount === 2) {
      updateManualPreferences({ goalMatchPrimaryPct: 60, goalMatchSecondaryPct: 40, goalMatchTertiaryPct: 0 });
    } else if (newCount === 3) {
      updateManualPreferences({ goalMatchPrimaryPct: 50, goalMatchSecondaryPct: 30, goalMatchTertiaryPct: 20 });
    } else {
      const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
      const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
      const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
      updateManualPreferences(normalizeGoalMatchPct(p1, p2, p3, newCount));
    }
  };

  const promoteGoal = (goalId: string) => {
    setRankedGoals((prev) => {
      const filled = prev.filter((g): g is string => g != null);
      if (!filled.includes(goalId) || filled[0] === goalId) return prev;
      const rest = filled.filter((g) => g !== goalId);
      const next = [goalId, ...rest];
      return [next[0] ?? null, next[1] ?? null, next[2] ?? null];
    });
  };

  const removeGoal = (goalId: string) => {
    const currentCount = rankedGoals.filter((g): g is string => g != null).length;
    setRankedGoals((prev) => {
      const next = prev.map((g) => (g === goalId ? null : g));
      const filled = next.filter((g): g is string => g != null);
      return [filled[0] ?? null, filled[1] ?? null, filled[2] ?? null];
    });
    const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
    const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
    const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
    const norm = normalizeGoalMatchPct(p1, p2, p3, Math.max(0, currentCount - 1));
    const manualLabel = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goalId];
    const nextSub = { ...manualPreferences.subFocusByGoal };
    const nextPct = { ...(manualPreferences.subFocusPctByGoal ?? {}) };
    if (manualLabel) {
      delete nextSub[manualLabel];
      delete nextPct[manualLabel];
    }
    const hadEngineMismatch =
      collectInvalidConditioningSubFocusSelections(manualPreferences.subFocusByGoal).length > 0;
    if (hadEngineMismatch) {
      Alert.alert(
        "Sub-goals updated",
        "Removed conditioning sub-goals that don't apply to your selected primary goals."
      );
    }
    updateManualPreferences({ ...norm, subFocusByGoal: nextSub, subFocusPctByGoal: nextPct });
  };

  const toggleAdaptiveGoalSubGoal = (
    manualPrimaryLabel: string,
    subOpt: string,
    pressEvent?: GestureResponderEvent
  ) => {
    const anchor = pressEvent
      ? { pageX: pressEvent.nativeEvent.pageX, pageY: pressEvent.nativeEvent.pageY }
      : undefined;
    const current = manualPreferences.subFocusByGoal[manualPrimaryLabel] ?? [];
    const exists = current.includes(subOpt);
    if (exists) {
      const next = current.filter((v) => v !== subOpt);
      const prevGoalPct = manualPreferences.subFocusPctByGoal?.[manualPrimaryLabel] ?? {};
      const nextPctMap = { ...(manualPreferences.subFocusPctByGoal ?? {}) };
      if (next.length === 0) {
        delete nextPctMap[manualPrimaryLabel];
      } else {
        nextPctMap[manualPrimaryLabel] = redistributeSubFocusPctsOnRemoval(next, prevGoalPct);
      }
      updateManualPreferences({
        subFocusByGoal: {
          ...manualPreferences.subFocusByGoal,
          [manualPrimaryLabel]: next,
        },
        subFocusPctByGoal: nextPctMap,
      });
    } else {
      if (current.length >= MAX_SUB_GOALS_PER_GOAL) return;
      const totalVisible = currentVisibleSubGoalPickCount({
        subFocusByGoal: manualPreferences.subFocusByGoal,
        rankedGoals,
        subFocusBySport,
        rankedSportSlugs,
        deferDayBody: !isOneDay,
      });
      if (totalVisible >= MAX_TOTAL_SUB_GOALS) {
        showLimitPopup(
          `You can select up to ${MAX_TOTAL_SUB_GOALS} total sub-goals across goals and sports.`,
          anchor
        );
        return;
      }
      setError(null);
      const nextSubs = [...current, subOpt];
      const nextPctMap = { ...(manualPreferences.subFocusPctByGoal ?? {}) };
      nextPctMap[manualPrimaryLabel] = equalIntegerPctsForLabels(nextSubs);
      updateManualPreferences({
        subFocusByGoal: {
          ...manualPreferences.subFocusByGoal,
          [manualPrimaryLabel]: nextSubs,
        },
        subFocusPctByGoal: nextPctMap,
      });
    }
  };

  const filledAdaptiveGoals = rankedGoals.filter((g): g is string => g != null);
  const adaptiveAdvAdditionalGoalsSummary =
    filledAdaptiveGoals.length === 0
      ? "None"
      : formatItemList(
          filledAdaptiveGoals.map(
            (id) => ADAPTIVE_GOALS.find((g) => g.id === id)?.label ?? id
          )
        );
  const sportSectionSummary = selectedSportSlugs.length === 0
    ? "Tap to choose"
    : [primarySport?.name, secondarySport?.name].filter(Boolean).join(" · ") || "Tap to choose";
  const sessionSectionSummary = `${oneDayDuration} min`;
  const bodySectionSummary = oneDayBodyBias.charAt(0).toUpperCase() + oneDayBodyBias.slice(1);

  const setOneDayTargetBody = useCallback(
    (target: TargetBody) => {
      if (target === "Upper") setOneDayBodyBias("upper");
      else if (target === "Lower") setOneDayBodyBias("lower");
      else setOneDayBodyBias("full");

      const allowed = new Set(constraintOptionsForTargetBody(target));
      const current = manualPreferences.injuries;
      const next = current.filter((i) => allowed.has(i));
      if (next.length !== current.length) {
        const normalized = next.length === 0 ? ["No restrictions"] : next;
        updateManualPreferences({ injuries: normalized });
        const areas = normalized.filter((i) => i !== "No restrictions");
        setInjuryTypes(areas);
        if (areas.length === 0) setInjuryStatus("No Concerns");
      }
    },
    [manualPreferences.injuries, updateManualPreferences]
  );

  const toggleConstraint = useCallback(
    (opt: string) => {
      const current = manualPreferences.injuries;
      let next: string[];
      if (opt === "No restrictions") {
        next = ["No restrictions"];
      } else {
        const withoutNoRestrictions = current.filter((c) => c !== "No restrictions");
        const exists = withoutNoRestrictions.includes(opt);
        next = exists
          ? withoutNoRestrictions.filter((v) => v !== opt)
          : [...withoutNoRestrictions, opt];
      }
      updateManualPreferences({ injuries: next });
      const areas = next.filter((i) => i !== "No restrictions");
      setInjuryTypes(areas);
      setInjuryStatus((prev) =>
        areas.length === 0 ? "No Concerns" : prev === "No Concerns" ? "Managing" : prev
      );
    },
    [manualPreferences.injuries, updateManualPreferences]
  );

  type OpenAdaptiveAdvancedScrollOptions = {
    nestedKey?: AdaptiveAdvNestedKey;
    scrollTargetRef?: RefObject<View | null>;
  };

  const openAdaptiveAdvancedAndScroll = useCallback(
    (options?: OpenAdaptiveAdvancedScrollOptions) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAdvancedOpen(true);
      if (options?.nestedKey != null) {
        const key = options.nestedKey;
        setAdaptiveAdvNestedOpen((prev) => ({ ...prev, [key]: true }));
      }
      const runScroll = () => {
        const scroll = adaptiveScrollRef.current;
        const content = adaptiveContentRef.current;
        const section =
          options?.scrollTargetRef?.current ?? adaptiveAdvancedRef.current;
        if (!scroll || !content || !section) return;
        section.measureLayout(
          content as unknown as View,
          (_x: number, y: number) => {
            scroll.scrollTo({ y: Math.max(0, y - 12), animated: true });
          },
          () => {}
        );
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(runScroll);
      });
    },
    []
  );

  const oneDayGoalCount = rankedGoals.filter((g): g is string => g != null).length;
  const oneDaySportCount = selectedSportSlugs.length;
  const totalSportSubGoalsSelected = countSubGoalPicksForParents(
    subFocusBySport,
    selectedSportSlugs
  );
  const oneDayCombinationValid =
    !isOneDay ||
    isOneDaySportModeCombinationValid({
      sportCount: oneDaySportCount,
      goalCount: oneDayGoalCount,
      sportSubGoalCount: totalSportSubGoalsSelected,
    });

  const oneDayTargetBodyForConflict: TargetBody | null =
    oneDayBodyBias === "upper" ? "Upper" : oneDayBodyBias === "lower" ? "Lower" : "Full";
  const sportModeConflictContext = {
    sportSlugs: selectedSportSlugs,
    targetBodyOverride: oneDayTargetBodyForConflict,
    gymEquipmentKeys: activeGymProfile?.equipment ?? [],
  };
  const sportModeConflicts = isOneDay
    ? detectPreferenceConflicts(manualPreferences, sportModeConflictContext)
    : [];
  const showDailyFocusDistribution =
    isOneDay && shouldShowDailyFocusDistributionNote(manualPreferences, sportModeConflictContext);
  const dailyFocusDistributionGate = isOneDay
    ? canProceedWithDailyFocusDistribution(manualPreferences, sportModeConflictContext)
    : { ok: true as const };
  const dailyResolveMode =
    showDailyFocusDistribution && manualPreferences.sessionFocusDistribution === "resolve";
  const dailyBodyFocusConflicts = dailyResolveMode
    ? getDailyBodyFocusConflicts(manualPreferences, sportModeConflictContext)
    : [];
  const canContinueAdaptive =
    isDbConfigured() &&
    activeGymProfile != null &&
    selectedSportSlugs.length >= 1 &&
    oneDayCombinationValid &&
    (!isOneDay || oneDayDuration > 0) &&
    dailyFocusDistributionGate.ok;

  const adaptiveAdvSportVsSummary = `${sportVsGoalPct}% sport · ${100 - sportVsGoalPct}% goals`;
  const agw1 = manualPreferences.goalMatchPrimaryPct ?? 50;
  const agw2 = manualPreferences.goalMatchSecondaryPct ?? 30;
  const agw3 = manualPreferences.goalMatchTertiaryPct ?? 20;
  const adaptiveAdvGoalMatchSummary =
    filledAdaptiveGoals.length === 0
      ? "—"
      : filledAdaptiveGoals.length === 1
        ? `${agw1}%`
        : filledAdaptiveGoals.length === 2
          ? `${agw1}/${agw2}%`
          : `${agw1}/${agw2}/${agw3}%`;
  const adaptiveGoalSubFocusLabels = filledAdaptiveGoals
    .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
    .filter((lab): lab is string => Boolean(lab));
  const adaptiveSubGoalsTotalCount = countVisibleGoalSubFocusPicks(
    manualPreferences.subFocusByGoal,
    adaptiveGoalSubFocusLabels,
    !isOneDay
  );
  const adaptiveAdvGoalSubGoalsSummary =
    adaptiveSubGoalsTotalCount === 0 ? "None" : `${adaptiveSubGoalsTotalCount} selected`;
  const adaptiveAdvSportFocusSummary = `${sportFocusPct[0]}/${sportFocusPct[1]}%`;
  const adaptiveAdvInjurySummary = injuriesSummary(manualPreferences.injuries);
  const injuryAreaOptions = constraintOptionsForTargetBody(
    isOneDay
      ? oneDayBodyBias === "upper"
        ? "Upper"
        : oneDayBodyBias === "lower"
          ? "Lower"
          : "Full"
      : null
  );
  const totalPriorityCap = isOneDay ? MAX_TOTAL_PRIORITY_PICKS_DAY : MAX_TOTAL_PRIORITY_PICKS_WEEK;
  const totalSubGoalCap = MAX_TOTAL_SUB_GOALS;
  const totalSubGoalsSelected = currentVisibleSubGoalPickCount({
    subFocusByGoal: manualPreferences.subFocusByGoal,
    rankedGoals,
    subFocusBySport,
    rankedSportSlugs,
    deferDayBody: !isOneDay,
  });
  const rankedGoalEntries = rankedGoals
    .filter((goalId): goalId is string => goalId != null)
    .map((goalId, idx) => {
      const goalMeta = ADAPTIVE_GOALS.find((g) => g.id === goalId);
      const manualLabel = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goalId];
      const subGoals = manualLabel ? manualPreferences.subFocusByGoal[manualLabel] ?? [] : [];
      return {
        goalId,
        label: goalMeta?.label ?? goalId,
        rank: idx + 1,
        subGoals,
      };
    });
  const rankedSportEntries = selectedSportSlugs.map((slug, idx) => {
    const sport = resolveActiveSportForSlug(sports, slug);
    const subFocusItems = (subFocusBySport[slug] ?? []).map((subSlug) => {
      const sportSubFocus = SPORTS_WITH_SUB_FOCUSES.find((s) => s.slug === getCanonicalSportSlug(slug));
      const fromSubFocus = sportSubFocus?.sub_focuses.find((sf) => sf.slug === subSlug)?.name;
      if (fromSubFocus) return { qualitySlug: subSlug, label: fromSubFocus };
      const fromQuality = qualitiesBySport[slug]?.find((q) => q.slug === subSlug)?.name;
      return { qualitySlug: subSlug, label: fromQuality ?? subSlug };
    });
    return {
      slug,
      rank: idx + 1,
      label: sport?.name ?? slug,
      subFocusItems,
    };
  });
  type PriorityStackRow =
    | {
        kind: "sport";
        title: string;
        detail: string;
      }
    | {
        kind: "goal";
        title: string;
        detail: string;
      }
    | {
        kind: "body";
        title: string;
        detail: string;
      };
  const topPriorityRows: PriorityStackRow[] = [
    rankedSportEntries.length > 0
      ? {
          kind: "sport",
          title: "Sport focus",
          detail:
            rankedSportEntries.length === 1
              ? `${rankedSportEntries[0]?.label}`
              : rankedSportEntries.map((s) => s.label).join(" + "),
        }
      : null,
    rankedGoalEntries.length > 0
      ? {
          kind: "goal",
          title: "Goal focus",
          detail: rankedGoalEntries.map((g) => g.label).join(" + "),
        }
      : null,
    isOneDay
      ? {
          kind: "body",
          title: "Body-part focus",
          detail: bodySectionSummary,
        }
      : null,
  ].filter((entry): entry is PriorityStackRow => entry != null);
  const selectedContextBubbles = [
    { id: "level", label: `Level: ${manualPreferences.workoutTier ?? "intermediate"}` },
    ...(manualPreferences.includeCreativeVariations === true
      ? [{ id: "creative", label: "Style: Creative on" }]
      : []),
    ...(manualPreferences.energyLevel != null && manualPreferences.energyLevel !== "medium"
      ? [{ id: "intensity", label: `Energy: ${energyLevelSummary(manualPreferences.energyLevel)}` }]
      : []),
    ...((manualPreferences.volumePreference ?? "standard") !== "standard"
      ? [
          {
            id: "volume",
            label: `Volume: ${volumePreferenceDisplayLabel(manualPreferences.volumePreference, {
              goalSlugs: filledAdaptiveGoals,
              primaryFocus: filledAdaptiveGoals
                .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
                .filter((label): label is string => !!label),
            })}`,
          },
        ]
      : []),
    ...(manualPreferences.injuries.filter((i) => i !== "No restrictions").length > 0
      ? manualPreferences.injuries
          .filter((i) => i !== "No restrictions")
          .map((injury) => ({ id: `injury_${injury}`, label: `Protect: ${injury}` }))
      : []),
    ...(isOneDay ? [{ id: "duration", label: `Session: ${oneDayDuration} min` }] : []),
  ];

  if (isGeneratingOneDay) {
    return (
      <GenerationLoadingScreen
        message="Putting the session together"
        subtitle="Turning your sports and goals into today’s workout."
      />
    );
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="dark" />
      <View style={styles.screenFill}>
      <ScrollView
        style={styles.scrollFill}
        ref={adaptiveScrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: navBarHeight + 16 },
          ...(Platform.OS === "web"
            ? [{ paddingTop: Math.max(headerHeight + 16, 128) }]
            : []),
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View ref={adaptiveContentRef} collapsable={false}>
        <Card title="Sport">
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Gym sessions that support your sport — strength, durability, and gaps your sport doesn’t cover. Not a replacement for practice or skill work.
            {isOneDay
              ? " Choose your sport for today’s workout."
              : " Choose your sport for a weekly plan."}
          </Text>
        </Card>

        <SectionLabel style={{ marginTop: 20 }}>Session</SectionLabel>
        <ExperienceLevelToggle
          marginTop={8}
          workoutTier={manualPreferences.workoutTier ?? "intermediate"}
          includeCreativeVariations={manualPreferences.includeCreativeVariations === true}
          onChange={(patch) => updateManualPreferences(patch)}
        />

        {showDailyFocusDistribution ? (
          <FocusDistributionNote
            variant="daily"
            value={manualPreferences.sessionFocusDistribution}
            needsResolution={dailyResolveMode && dailyBodyFocusConflicts.length > 0}
            onChange={(value) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              updateManualPreferences({ sessionFocusDistribution: value });
              if (value === "spread") {
                setDismissedConflictIds((prev) => [
                  ...prev,
                  ...sportModeConflicts.filter(isBodyFocusPreferenceConflict).map((c) => c.id),
                ]);
              } else {
                setDismissedConflictIds((prev) =>
                  prev.filter(
                    (id) =>
                      !sportModeConflicts.some(
                        (c) => c.id === id && isBodyFocusPreferenceConflict(c)
                      )
                  )
                );
              }
            }}
          />
        ) : null}

        <CollapsiblePreferenceSection
          title="Where you train"
          subtitle={
            activeGymProfile != null
              ? `Equipment from: ${activeGymProfile.name}`
              : "Choose a gym profile for equipment."
          }
          summary={gymSummary}
          expanded={sectionGymOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionGymOpen((v) => !v);
          }}
          marginTop={12}
        >
          <GymProfileSelectionPanel
            activeProfile={activeGymProfile}
            gymProfiles={gymProfiles}
            onSelectProfile={setActiveGymProfile}
            onEditProfiles={() => router.push("/profiles?from=sport-mode")}
          />
        </CollapsiblePreferenceSection>

        {error ? (
          <Text style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <SectionLabel style={{ marginTop: 20 }}>Priorities</SectionLabel>
        <Card title="Workout priorities" style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12 }}>
            This order drives the workout.
          </Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
            {isOneDay
              ? `Limits: 2 sports, 1 sport + 1 goal, or 1 sport with sport sub-focus (daily); up to ${totalSubGoalCap} total sub-goals.`
              : `Limits: up to ${totalPriorityCap} total sports + goals, and up to ${totalSubGoalCap} total sub-goals.`}
          </Text>

          {topPriorityRows.length > 0 ? (
            <View style={styles.priorityStack}>
              {topPriorityRows.map((row, stackIdx) => {
                const displayRank = stackIdx + 1;
                return (
                  <View
                    key={`${row.kind}-${stackIdx}`}
                    style={[styles.priorityRow, { borderColor: theme.borderStrong, backgroundColor: theme.cardOpaque }]}
                  >
                    <View style={styles.priorityRowInner}>
                      <View
                        style={[
                          styles.priorityRankBadge,
                          {
                            backgroundColor: theme.chipSelectedBackground,
                            borderColor: theme.chipSelectedBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.priorityRankText, { color: theme.chipSelectedText }]}>
                          {displayRank}
                        </Text>
                      </View>
                      <View style={styles.priorityTextWrap}>
                        <Text style={[styles.priorityRowDetail, { color: theme.text }]}>{row.detail}</Text>
                        <Text style={[styles.priorityRowTitle, { color: theme.textMuted }]}>{row.title}</Text>

                        {row.kind === "sport" ? (
                          <View style={styles.priorityCardChips}>
                            {rankedSportEntries.map((sport) => (
                              <View key={`card-sport-${sport.slug}`} style={styles.priorityCardChipBlock}>
                                {rankedSportEntries.length > 1 ? (
                                  <Text
                                    style={[styles.priorityCardSubLabel, { color: theme.textMuted }]}
                                    numberOfLines={2}
                                  >
                                    {sport.label}
                                  </Text>
                                ) : null}
                                {sport.subFocusItems.length > 0 ? (
                                  <View style={styles.chipGroup}>
                                    {sport.subFocusItems.map((item, subIdx) => (
                                      <Pressable
                                        key={`${sport.slug}-${item.qualitySlug}`}
                                        style={styles.rankedChipWrap}
                                        onPress={(e) => toggleSportSubFocus(sport.slug, item.qualitySlug, e)}
                                      >
                                        <View
                                          style={[
                                            styles.rankBadgeSmall,
                                            {
                                              backgroundColor: theme.chipSelectedBackground,
                                              borderWidth: 1,
                                              borderColor: theme.chipSelectedBorder,
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}
                                          >
                                            {subIdx + 1}
                                          </Text>
                                        </View>
                                        <View
                                          style={[
                                            styles.rankedChipInner,
                                            {
                                              backgroundColor: theme.chipSelectedBackground,
                                              borderWidth: 1,
                                              borderColor: theme.chipSelectedBorder,
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={[styles.rankedChipLabelSmall, { color: theme.chipSelectedText }]}
                                            numberOfLines={2}
                                          >
                                            {item.label}
                                          </Text>
                                        </View>
                                      </Pressable>
                                    ))}
                                  </View>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        ) : null}

                        {row.kind === "goal" ? (
                          <View style={styles.priorityCardChips}>
                            {rankedGoalEntries.map((goal) => {
                              const manualLabel = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goal.goalId];
                              return (
                                <View key={`card-goal-${goal.goalId}`} style={styles.priorityCardChipBlock}>
                                  {rankedGoalEntries.length > 1 ? (
                                    <Text
                                      style={[styles.priorityCardSubLabel, { color: theme.textMuted }]}
                                      numberOfLines={2}
                                    >
                                      {goal.label}
                                    </Text>
                                  ) : null}
                                  {goal.subGoals.length > 0 && manualLabel ? (
                                    <View style={styles.chipGroup}>
                                      {goal.subGoals.map((sub, subIdx) => (
                                        <Pressable
                                          key={`${goal.goalId}-${sub}`}
                                          style={styles.rankedChipWrap}
                                          onPress={(e) => toggleAdaptiveGoalSubGoal(manualLabel, sub, e)}
                                        >
                                          <View
                                            style={[
                                              styles.rankBadgeSmall,
                                              {
                                                backgroundColor: theme.chipSelectedBackground,
                                                borderWidth: 1,
                                                borderColor: theme.chipSelectedBorder,
                                              },
                                            ]}
                                          >
                                            <Text
                                              style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}
                                            >
                                              {subIdx + 1}
                                            </Text>
                                          </View>
                                          <View
                                            style={[
                                              styles.rankedChipInner,
                                              {
                                                backgroundColor: theme.chipSelectedBackground,
                                                borderWidth: 1,
                                                borderColor: theme.chipSelectedBorder,
                                              },
                                            ]}
                                          >
                                            <Text
                                              style={[styles.rankedChipLabelSmall, { color: theme.chipSelectedText }]}
                                              numberOfLines={2}
                                            >
                                              {sub}
                                            </Text>
                                          </View>
                                        </Pressable>
                                      ))}
                                    </View>
                                  ) : null}
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: theme.textMuted }}>
              Choose your sport and goals to see ranked priorities.
            </Text>
          )}

          <View style={styles.priorityGroupBlock}>
            <Text style={[styles.priorityGroupTitle, { color: theme.text }]}>Selected filters</Text>
            <View style={styles.chipGroup}>
              {selectedContextBubbles.map((bubble) => (
                <View
                  key={bubble.id}
                  style={[
                    styles.filterBubble,
                    {
                      backgroundColor: theme.chipBackground,
                      borderColor: theme.borderStrong,
                    },
                  ]}
                >
                  <Text style={[styles.filterBubbleText, { color: theme.textMuted }]}>{bubble.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <CollapsiblePreferenceSection
          title="Your sport"
          subtitle={selectedSportSlugs.length === 0 ? "Choose up to two, ranked by priority." : undefined}
          summary={sportSectionSummary}
          expanded={sectionSportOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionSportOpen((v) => !v);
          }}
          marginTop={16}
        >
          {/* Selected sports with rank badges */}
          {selectedSportSlugs.length > 0 && (
            <View style={styles.rankedSportRow}>
              {selectedSportSlugs.map((slug, idx) => {
                const sport = resolveActiveSportForSlug(sports, slug);
                const displayName = sport?.name ?? slug;
                return (
                  <View key={`${slug}-${idx}`} style={styles.rankedChipWrap}>
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: theme.chipSelectedBackground,
                          borderWidth: 1,
                          borderColor: theme.chipSelectedBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.rankBadgeText, { color: theme.chipSelectedText }]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.rankedChipInner,
                        {
                          backgroundColor: theme.chipSelectedBackground,
                          borderWidth: 1,
                          borderColor: theme.chipSelectedBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.rankedChipLabel, { color: theme.chipSelectedText }]}
                      >
                        {displayName}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeSport(slug)}
                      style={styles.rankedChipRemove}
                    >
                      <Text style={[styles.rankedChipRemoveText, { color: theme.textMuted }]}>×</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Sport picker — shown when there is room for another sport */}
          {selectedSportSlugs.length < 2 && (
            <>
              {selectedSportSlugs.length === 1 && (
                <Text style={[styles.slotSeparatorLabel, { color: theme.textMuted }]}>
                  Second sport — optional
                </Text>
              )}
              <View style={[styles.searchRow, { marginTop: selectedSportSlugs.length > 0 ? 4 : 0 }]}>
                <TextInput
                  placeholder="Search sports..."
                  placeholderTextColor={theme.textMuted}
                  value={sportsSearch}
                  onChangeText={setSportsSearch}
                  style={[
                    styles.searchInput,
                    { borderColor: theme.border, color: theme.text },
                  ]}
                />
              </View>
              {sportsError ? (
                <Text style={{ fontSize: 13, color: theme.danger, marginBottom: 8 }}>
                  {sportsError}
                </Text>
              ) : null}
              {!sportsError && sports.length === 0 && (
                <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                  No sports available. Check your connection or Supabase configuration.
                </Text>
              )}
              {sports.length > 0 && filteredSportsFlat.length === 0 && (
                <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                  {`No sports match "${sportsSearch}".`}
                </Text>
              )}
              <View style={styles.chipGroup} key={`sport-picker-${selectedSportSlugs.join(",")}`}>
                {availableSportsForPicker.map((sport) => (
                  <Chip
                    key={sport.id}
                    label={sport.name}
                    selected={false}
                    onPress={(e) => addSport(sport.slug, e)}
                  />
                ))}
              </View>
            </>
          )}

          {/* Sport sub-focus — always visible when a sport is selected */}
          {selectedSportSlugs.length > 0 && (
            <View style={[styles.subFocusSectionWrap, { borderTopColor: theme.border }]}>
              <Text style={[styles.subFocusSectionLabel, { color: theme.textMuted }]}>
                Sport sub-focus{" "}
                <Text style={{ fontWeight: "400" }}>
                  (optional, up to {totalSubGoalCap} total)
                </Text>
              </Text>
              {selectedSportSlugs.map((slug) => {
                const sport = resolveActiveSportForSlug(sports, slug);
                const sportSubFocus = SPORTS_WITH_SUB_FOCUSES.find((s) => s.slug === getCanonicalSportSlug(slug));
                const optionsFromSubFocus = sportSubFocus?.sub_focuses ?? null;
                const optionsFromQualities = qualitiesBySport[slug] ?? [];
                const options = optionsFromSubFocus
                  ? optionsFromSubFocus.map((sf) => ({ slug: sf.slug, name: sf.name }))
                  : optionsFromQualities.map((q) => ({ slug: q.slug, name: q.name }));
                const selectedQualities = subFocusBySport[slug] ?? [];
                const canAddSub =
                  selectedQualities.length < MAX_SUB_GOALS_PER_GOAL &&
                  totalSubGoalsSelected < totalSubGoalCap;
                return (
                  <View key={slug} style={{ marginTop: selectedSportSlugs.length > 1 ? 8 : 0 }}>
                    {selectedSportSlugs.length > 1 && (
                      <Text style={[styles.modifierLabel, { color: theme.textMuted }]}>
                        {sport?.name ?? slug}
                      </Text>
                    )}
                    {options.length > 0 ? (
                      <>
                        {selectedQualities.length > 0 && (
                          <View style={[styles.chipGroup, { marginBottom: 6 }]}>
                            {selectedQualities.map((qSlug) => {
                              const opt = options.find((o) => o.slug === qSlug);
                              return (
                                <Pressable
                                  key={qSlug}
                                  style={styles.rankedChipWrap}
                                  onPress={(e) => toggleSportSubFocus(slug, qSlug, e)}
                                >
                                  <View
                                    style={[
                                      styles.rankBadgeSmall,
                                      {
                                        backgroundColor: theme.chipSelectedBackground,
                                        borderWidth: 1,
                                        borderColor: theme.chipSelectedBorder,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}
                                    >
                                      {selectedQualities.indexOf(qSlug) + 1}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.rankedChipInner,
                                      {
                                        backgroundColor: theme.chipSelectedBackground,
                                        borderWidth: 1,
                                        borderColor: theme.chipSelectedBorder,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[styles.rankedChipLabelSmall, { color: theme.chipSelectedText }]}
                                    >
                                      {opt?.name ?? qSlug}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                        <View style={styles.chipGroup}>
                          {options
                            .filter((o) => !selectedQualities.includes(o.slug))
                            .map((o) => (
                              <Chip
                                key={o.slug}
                                label={o.name}
                                selected={false}
                                disabled={!canAddSub}
                                onPress={(e) => toggleSportSubFocus(slug, o.slug, e)}
                              />
                            ))}
                        </View>
                      </>
                    ) : (
                      <Text style={{ fontSize: 12, color: theme.textMuted }}>
                        No sub-focus options for this sport.
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </CollapsiblePreferenceSection>

        {/* Fitness goals — inline, outside Advanced */}
        <CollapsiblePreferenceSection
          title="Fitness goals"
          subtitle={rankedGoals.filter(Boolean).length === 0 ? "Optional — blend up to 3 training goals with your sport." : undefined}
          summary={adaptiveAdvAdditionalGoalsSummary}
          expanded={sectionGoalsOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionGoalsOpen((v) => !v);
          }}
          marginTop={8}
        >
          {rankedGoals.filter((g): g is string => g != null).length > 1 ? (
            <Text style={[styles.helperHint, { color: theme.textMuted }]}>
              First is your main goal. Tap a selected goal to make it first.
            </Text>
          ) : null}
          {rankedGoals.filter((g): g is string => g != null).length > 0 && (
            <View style={styles.chipGroup}>
              {rankedGoals.filter((g): g is string => g != null).map((goalId, idx) => {
                const goal = ADAPTIVE_GOALS.find((g) => g.id === goalId);
                return (
                  <View key={goalId} style={styles.rankedChipWrap}>
                    <Pressable
                      onPress={() => promoteGoal(goalId)}
                      accessibilityRole="button"
                      accessibilityLabel={`${goal?.label ?? goalId}, rank ${idx + 1}. Tap to make first.`}
                      style={styles.rankedChipPressable}
                    >
                      <View
                        style={[
                          styles.rankBadge,
                          {
                            backgroundColor: theme.chipSelectedBackground,
                            borderWidth: 1,
                            borderColor: theme.chipSelectedBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.rankBadgeText, { color: theme.chipSelectedText }]}>
                          {idx + 1}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.rankedChipInner,
                          {
                            backgroundColor: theme.chipSelectedBackground,
                            borderWidth: 1,
                            borderColor: theme.chipSelectedBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.rankedChipLabel, { color: theme.chipSelectedText }]}
                        >
                          {goal?.label ?? goalId}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeGoal(goalId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${goal?.label ?? goalId}`}
                      style={styles.rankedChipRemove}
                    >
                      <Text style={[styles.rankedChipRemoveText, { color: theme.textMuted }]}>×</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.chipGroup}>
            {ADAPTIVE_GOALS.filter((g) => !rankedGoals.includes(g.id)).map((goal) => (
              <Chip
                key={goal.id}
                label={goal.label}
                selected={false}
                onPress={(e) => addGoal(goal.id, e)}
              />
            ))}
          </View>
          {filledAdaptiveGoals.length > 0 ? (
            <View style={[styles.subFocusSectionWrap, { borderTopColor: theme.border }]}>
              <Text style={[styles.subFocusSectionLabel, { color: theme.textMuted }]}>
                Sub-goals{" "}
                <Text style={{ fontWeight: "400" }}>
                  (optional, up to {totalSubGoalCap} total)
                </Text>
              </Text>
              {filledAdaptiveGoals.map((goalId, goalIdx) => {
                const manualLabel = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goalId];
                const goalMeta = ADAPTIVE_GOALS.find((g) => g.id === goalId);
                const allSubOptions = manualLabel
                  ? subFocusChoicesForManualPrimaryGoal(manualLabel)
                  : [];
                const subOptions =
                  !isOneDay && manualLabel
                    ? filterDeferredDayBodySubFocusChoices(manualLabel, allSubOptions)
                    : allSubOptions;
                const selectedSubs =
                  manualLabel != null
                    ? (manualPreferences.subFocusByGoal[manualLabel] ?? []).filter((sub) =>
                        subOptions.includes(sub)
                      )
                    : [];
                const canAddSub =
                  selectedSubs.length < MAX_SUB_GOALS_PER_GOAL &&
                  totalSubGoalsSelected < totalSubGoalCap;
                if (!manualLabel) return null;
                // Empty after defer (e.g. Body Recomp) → body focus is on the next page.
                if (subOptions.length === 0) {
                  if (allSubOptions.length === 0) {
                    return (
                      <Text
                        key={goalId}
                        style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}
                      >
                        {goalMeta?.label ?? goalId}: no sub-goal options.
                      </Text>
                    );
                  }
                  return null;
                }
                return (
                  <View key={goalId} style={{ marginTop: filledAdaptiveGoals.length > 1 && goalIdx > 0 ? 10 : 0 }}>
                    {filledAdaptiveGoals.length > 1 ? (
                      <View style={[styles.goalRowHeader, { marginBottom: 6 }]}>
                        <View
                          style={[
                            styles.rankBadgeSmall,
                            {
                              backgroundColor: theme.chipSelectedBackground,
                              borderWidth: 1,
                              borderColor: theme.chipSelectedBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}>
                            {goalIdx + 1}
                          </Text>
                        </View>
                        <Text style={[styles.goalRowLabel, { color: theme.textMuted, fontSize: 12 }]}>
                          {goalMeta?.label ?? goalId}
                        </Text>
                      </View>
                    ) : null}
                    {selectedSubs.length > 0 ? (
                      <View style={[styles.chipGroup, { marginBottom: 6 }]}>
                        {selectedSubs.map((sub, subIdx) => (
                          <Pressable
                            key={sub}
                            style={styles.rankedChipWrap}
                            onPress={(e) => toggleAdaptiveGoalSubGoal(manualLabel, sub, e)}
                          >
                            <View
                              style={[
                                styles.rankBadgeSmall,
                                {
                                  backgroundColor: theme.chipSelectedBackground,
                                  borderWidth: 1,
                                  borderColor: theme.chipSelectedBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}>
                                {subIdx + 1}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.rankedChipInner,
                                {
                                  backgroundColor: theme.chipSelectedBackground,
                                  borderWidth: 1,
                                  borderColor: theme.chipSelectedBorder,
                                },
                              ]}
                            >
                              <Text
                                style={[styles.rankedChipLabelSmall, { color: theme.chipSelectedText }]}
                              >
                                {sub}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <View style={styles.chipGroup}>
                      {subOptions
                        .filter((opt) => !selectedSubs.includes(opt))
                        .map((opt) => (
                          <Chip
                            key={opt}
                            label={opt}
                            selected={false}
                            disabled={!canAddSub}
                            onPress={(e) => toggleAdaptiveGoalSubGoal(manualLabel, opt, e)}
                          />
                        ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
          {!isOneDay &&
          filledAdaptiveGoals.some((goalId) => {
            const manualLabel = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goalId];
            if (!manualLabel) return false;
            return goalHasDeferredDayBodySubFocuses(
              manualLabel,
              subFocusChoicesForManualPrimaryGoal(manualLabel)
            );
          }) ? (
            <BodyFocusDeferredNote />
          ) : null}
          {!PILOT_HIDE_MATCH_PCT_ADVANCED_OPTIONS && adaptiveSubGoalsTotalCount > 0 ? (
            <Pressable
              onPress={() =>
                openAdaptiveAdvancedAndScroll({
                  nestedKey: "goalSubGoals",
                  scrollTargetRef: adaptiveGoalSubFocusBlendRef,
                })
              }
              style={styles.subGoalBlendLinkWrap}
            >
              <Text style={[styles.subGoalBlendLinkText, { color: theme.primary }]}>
                Set percentage blend (Advanced)
              </Text>
            </Pressable>
          ) : null}
        </CollapsiblePreferenceSection>

        {isOneDay ? (
          <CollapsiblePreferenceSection
            title="Body emphasis"
            subtitle="Choose full, upper, or lower."
            summary={bodySectionSummary}
            expanded={sectionBodyOpen}
            onToggle={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSectionBodyOpen((v) => !v);
            }}
          >
            <View style={styles.chipGroup}>
              {TARGET_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={
                    (opt === "Upper" && oneDayBodyBias === "upper") ||
                    (opt === "Lower" && oneDayBodyBias === "lower") ||
                    (opt === "Full" && oneDayBodyBias === "full")
                  }
                  onPress={() => setOneDayTargetBody(opt)}
                />
              ))}
            </View>
          </CollapsiblePreferenceSection>
        ) : null}

        {isOneDay ? (
          <CollapsiblePreferenceSection
            title="Session length"
            subtitle="About how long you want to train today."
            summary={sessionSectionSummary}
            expanded={sectionSessionOpen}
            onToggle={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSectionSessionOpen((v) => !v);
            }}
          >
            <View style={styles.chipGroup}>
              {DURATIONS.map((minutes) => (
                <Chip
                  key={minutes}
                  label={`${minutes} min`}
                  selected={oneDayDuration === minutes}
                  onPress={() => setOneDayDuration(minutes)}
                />
              ))}
            </View>
          </CollapsiblePreferenceSection>
        ) : null}

        <View ref={adaptiveAdvancedRef} collapsable={false}>
        <SectionLabel style={{ marginTop: 8 }}>Optional</SectionLabel>
        <Pressable
          style={[
            styles.advancedFiltersHeader,
            {
              borderBottomColor: theme.borderStrong,
              backgroundColor: theme.cardOpaque,
              borderColor: theme.borderStrong,
              ...(Platform.OS !== "web" ? { borderWidth: 1 } : {}),
            },
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAdvancedOpen((v) => !v);
          }}
        >
          <Text style={[styles.advancedFiltersTitle, { color: theme.textMuted }]}>
            {ADVANCED_OPTIONS_LABEL}
          </Text>
          <Text style={[styles.advancedFiltersChevron, { color: theme.textMuted }]}>
            {advancedOpen ? "▼" : "▶"}
          </Text>
        </Pressable>

        {advancedOpen && (
          <View
            style={[
              styles.advancedFiltersSection,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
                marginTop: 0,
                marginBottom: 16,
              },
            ]}
          >
            <CollapsiblePreferenceSection
              nested
              title={HOW_HARD_TO_TRAIN_TITLE}
              subtitle={HOW_HARD_TO_TRAIN_SUBTITLE}
              summary={energyLevelSummary(manualPreferences.energyLevel)}
              expanded={adaptiveAdvNestedOpen.intensityLevel === true}
              onToggle={() => toggleAdaptiveAdvNested("intensityLevel")}
              marginTop={0}
            >
              <View style={styles.chipGroup}>
                {ENERGY_LEVELS.map((level) => {
                  const next = level.toLowerCase() as "low" | "medium" | "high";
                  return (
                    <Chip
                      key={level}
                      label={level}
                      selected={manualPreferences.energyLevel === next}
                      onPress={() => {
                        const energy = manualPreferences.energyLevel === next ? null : next;
                        updateManualPreferences({ energyLevel: energy });
                        setIntensityLevel(sportIntensityFromEnergy(energy));
                      }}
                    />
                  );
                })}
              </View>
            </CollapsiblePreferenceSection>

            <CollapsiblePreferenceSection
              nested
              title={VOLUME_PREFERENCE_TITLE}
              subtitle={volumePreferenceSectionSubtitle({
                goalSlugs: filledAdaptiveGoals,
                primaryFocus: filledAdaptiveGoals
                  .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
                  .filter((label): label is string => !!label),
              })}
              summary={volumePreferenceDisplayLabel(manualPreferences.volumePreference, {
                goalSlugs: filledAdaptiveGoals,
                primaryFocus: filledAdaptiveGoals
                  .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
                  .filter((label): label is string => !!label),
              })}
              expanded={adaptiveAdvNestedOpen.volumePreference === true}
              onToggle={() => toggleAdaptiveAdvNested("volumePreference")}
            >
              <VolumePreferencePicker
                value={manualPreferences.volumePreference}
                goalSlugs={filledAdaptiveGoals}
                primaryFocus={filledAdaptiveGoals
                  .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
                  .filter((label): label is string => !!label)}
                onChange={(next) => updateManualPreferences({ volumePreference: next })}
              />
            </CollapsiblePreferenceSection>

            {!PILOT_HIDE_MATCH_PCT_ADVANCED_OPTIONS &&
            selectedSportSlugs.length > 0 &&
            rankedGoals.filter((g): g is string => g != null).length > 0 ? (
              <CollapsiblePreferenceSection
                nested
                title="Sport(s) vs goals"
                subtitle="What % of the workout should favor sport(s) vs your additional goals. Sum = 100%."
                summary={adaptiveAdvSportVsSummary}
                expanded={adaptiveAdvNestedOpen.sportVsGoals === true}
                onToggle={() => toggleAdaptiveAdvNested("sportVsGoals")}
                marginTop={0}
              >
                <View style={[styles.chipGroup, { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }]}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 13, color: theme.textMuted }}>Sport(s)</Text>
                    <TextInput
                      style={{
                        width: 56,
                        height: 40,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        fontSize: 15,
                        textAlign: "center",
                        color: theme.text,
                        borderColor: theme.border,
                      }}
                      keyboardType="number-pad"
                      value={String(sportVsGoalPct)}
                      onChangeText={(t) => {
                        const n = parseInt(t.replace(/\D/g, ""), 10);
                        if (!Number.isNaN(n)) setSportVsGoalPct(Math.max(0, Math.min(100, n)));
                      }}
                    />
                    <Text style={{ fontSize: 13, color: theme.textMuted }}>%</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: theme.textMuted }}>/</Text>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 13, color: theme.textMuted }}>Additional goals</Text>
                    <TextInput
                      style={{
                        width: 56,
                        height: 40,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        fontSize: 15,
                        textAlign: "center",
                        color: theme.text,
                        borderColor: theme.border,
                      }}
                      keyboardType="number-pad"
                      value={String(100 - sportVsGoalPct)}
                      onChangeText={(t) => {
                        const n = parseInt(t.replace(/\D/g, ""), 10);
                        if (!Number.isNaN(n)) setSportVsGoalPct(Math.max(0, Math.min(100, 100 - n)));
                      }}
                    />
                    <Text style={{ fontSize: 13, color: theme.textMuted }}>%</Text>
                  </View>
                </View>
              </CollapsiblePreferenceSection>
            ) : null}
            {!PILOT_HIDE_MATCH_PCT_ADVANCED_OPTIONS && filledAdaptiveGoals.length > 0 ? (
            <CollapsiblePreferenceSection
            nested
            title={GOAL_MATCH_PCT_TITLE}
            subtitle={GOAL_MATCH_PCT_SUBTITLE}
              summary={adaptiveAdvGoalMatchSummary}
              expanded={adaptiveAdvNestedOpen.goalMatch === true}
              onToggle={() => toggleAdaptiveAdvNested("goalMatch")}
            >
            {rankedGoals.filter((g): g is string => g != null).length === 2 && (
              <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                Suggested: 60% / 40%
              </Text>
            )}
            {rankedGoals.filter((g): g is string => g != null).length === 3 && (
              <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                Suggested: 50% / 30% / 20%
              </Text>
            )}
            <View style={[styles.chipGroup, { flexDirection: "column", gap: 12 }]}>
              {rankedGoals
                .filter((g): g is string => g != null)
                .slice(0, 3)
                .map((goal, idx) => {
                  const rank = (idx + 1) as 1 | 2 | 3;
                  const value =
                    rank === 1
                      ? (manualPreferences.goalMatchPrimaryPct ?? 50)
                      : rank === 2
                        ? (manualPreferences.goalMatchSecondaryPct ?? 30)
                        : (manualPreferences.goalMatchTertiaryPct ?? 20);
                  const isEditing = editingGoalMatchRank === rank;
                  const displayValue = isEditing ? editingGoalMatchValue : String(value);
                  const commitWeight = (raw: number) => {
                    const v = Math.max(0, Math.min(100, Math.round(raw)));
                    let p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
                    let p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
                    let p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
                    if (rank === 1) p1 = v;
                    else if (rank === 2) p2 = v;
                    else p3 = v;
                    const goalCount = rankedGoals.filter((g): g is string => g != null).length;
                    const norm = normalizeGoalMatchPct(p1, p2, p3, goalCount);
                    updateManualPreferences(norm);
                  };
                  return (
                    <View
                      key={goal}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: theme.textMuted }}>
                        {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} goal
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <TextInput
                          style={{
                            width: 56,
                            height: 40,
                            borderWidth: 1,
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            fontSize: 15,
                            textAlign: "center",
                            color: theme.text,
                            borderColor: theme.border,
                          }}
                          keyboardType="number-pad"
                          value={displayValue}
                          onFocus={() => {
                            setEditingGoalMatchRank(rank);
                            setEditingGoalMatchValue(String(value));
                          }}
                          onBlur={() => {
                            const n = parseInt(
                              editingGoalMatchValue.replace(/\D/g, ""),
                              10,
                            );
                            if (!Number.isNaN(n) && n >= 0 && n <= 100) {
                              commitWeight(n);
                            }
                            setEditingGoalMatchRank(null);
                            setEditingGoalMatchValue("");
                          }}
                          onChangeText={(t) => {
                            if (!isEditing) return;
                            const digits = t.replace(/\D/g, "");
                            setEditingGoalMatchValue(digits);
                          }}
                        />
                        <Text style={{ fontSize: 13, color: theme.textMuted }}>%</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
            </CollapsiblePreferenceSection>
            ) : null}

            {!PILOT_HIDE_MATCH_PCT_ADVANCED_OPTIONS &&
            filledAdaptiveGoals.length > 0 &&
            adaptiveSubGoalsTotalCount > 0 ? (
              <View ref={adaptiveGoalSubFocusBlendRef} collapsable={false}>
              <CollapsiblePreferenceSection
                nested
                title={SUB_GOAL_BLEND_TITLE}
                subtitle={SUB_GOAL_BLEND_SUBTITLE}
                summary={adaptiveAdvGoalSubGoalsSummary}
                expanded={adaptiveAdvNestedOpen.goalSubGoals === true}
                onToggle={() => toggleAdaptiveAdvNested("goalSubGoals")}
              >
                {filledAdaptiveGoals
                  .map((goalId) => {
                    const manualLabel = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goalId];
                    const selectedSubs =
                      manualLabel != null
                        ? (manualPreferences.subFocusByGoal[manualLabel] ?? [])
                        : [];
                    return { goalId, manualLabel, selectedSubs };
                  })
                  .filter((row) => row.manualLabel && row.selectedSubs.length > 0)
                  .map((row, visIdx) => {
                    const { manualLabel, selectedSubs } = row;
                    if (!manualLabel) return null;
                    return (
                      <View key={`sub-pct-${manualLabel}`} style={{ marginTop: visIdx > 0 ? 14 : 0 }}>
                        {filledAdaptiveGoals.length > 1 ? (
                          <Text style={{ fontSize: 13, color: theme.textMuted }}>
                            {ADAPTIVE_GOALS.find((g) => g.id === row.goalId)?.label ?? manualLabel}
                          </Text>
                        ) : null}
                        <SubFocusWeightsEditor
                          theme={theme}
                          goalLabel={manualLabel}
                          selectedSubsOrdered={selectedSubs}
                          pctBySub={normalizeSubFocusPctRecord(
                            selectedSubs,
                            manualPreferences.subFocusPctByGoal?.[manualLabel]
                          )}
                          onCommit={(gl, next) =>
                            updateManualPreferences({
                              subFocusPctByGoal: {
                                ...(manualPreferences.subFocusPctByGoal ?? {}),
                                [gl]: next,
                              },
                            })
                          }
                        />
                      </View>
                    );
                  })}
              </CollapsiblePreferenceSection>
              </View>
            ) : null}

            {!PILOT_HIDE_MATCH_PCT_ADVANCED_OPTIONS && selectedSportSlugs.length === 2 ? (
              <CollapsiblePreferenceSection
                nested
                title="Sport focus %"
                subtitle="What % of sport-focused training should match each sport. Sum = 100%. Sub-focuses use auto 50 / 30 / 20 by rank."
                summary={adaptiveAdvSportFocusSummary}
                expanded={adaptiveAdvNestedOpen.sportFocus === true}
                onToggle={() => toggleAdaptiveAdvNested("sportFocus")}
              >
                <View style={[styles.chipGroup, { flexDirection: "column", gap: 12 }]}>
                  {[0, 1].map((idx) => {
                    const value = sportFocusPct[idx];
                    const setPct = (raw: number) => {
                      const v = Math.max(0, Math.min(100, Math.round(raw)));
                      const other = 100 - v;
                      setSportFocusPct(idx === 0 ? [v, other] : [other, v]);
                    };
                    const slug = selectedSportSlugs[idx];
                    const sport = slug ? resolveActiveSportForSlug(sports, slug) : null;
                    return (
                      <View
                        key={idx}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: theme.textMuted, flex: 1, marginRight: 8 }}>
                          {idx === 0 ? "1st" : "2nd"} sport {sport ? `(${sport.name})` : ""}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <TextInput
                            style={{
                              width: 56,
                              height: 40,
                              borderWidth: 1,
                              borderRadius: 8,
                              paddingHorizontal: 8,
                              fontSize: 15,
                              textAlign: "center",
                              color: theme.text,
                              borderColor: theme.border,
                            }}
                            keyboardType="number-pad"
                            value={String(value)}
                            onChangeText={(t) => {
                              const n = parseInt(t.replace(/\D/g, ""), 10);
                              if (!Number.isNaN(n)) setPct(n);
                            }}
                          />
                          <Text style={{ fontSize: 13, color: theme.textMuted }}>%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </CollapsiblePreferenceSection>
            ) : null}

            <CollapsiblePreferenceSection
              nested
              title={AVOID_OR_PROTECT_TITLE}
              subtitle={AVOID_OR_PROTECT_SUBTITLE}
              summary={adaptiveAdvInjurySummary}
              expanded={adaptiveAdvNestedOpen.injury === true}
              onToggle={() => toggleAdaptiveAdvNested("injury")}
            >
              <View style={styles.chipGroup}>
                {injuryAreaOptions.map((label) => (
                  <Chip
                    key={label}
                    label={label}
                    selected={manualPreferences.injuries.includes(label)}
                    onPress={() => toggleConstraint(label)}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>
          </View>
        )}

        </View>

        {isOneDay && (
          <PreferenceConflictBanner
            conflicts={
              dailyResolveMode
                ? [
                    ...dailyBodyFocusConflicts,
                    ...sportModeConflicts.filter((c) => !isBodyFocusPreferenceConflict(c)),
                  ]
                : showDailyFocusDistribution &&
                    manualPreferences.sessionFocusDistribution === "spread"
                  ? sportModeConflicts.filter((c) => !isBodyFocusPreferenceConflict(c))
                  : sportModeConflicts
            }
            dismissedIds={dismissedConflictIds}
            currentPrefs={manualPreferences}
            resolutionRequiredIds={
              dailyResolveMode ? dailyBodyFocusConflicts.map((c) => c.id) : []
            }
            onDismiss={(id) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setDismissedConflictIds((prev) => [...prev, id]);
            }}
            onApplyResolution={(patch) => {
              updateManualPreferences(patch);
              if (patch.energyLevel != null) {
                setIntensityLevel(sportIntensityFromEnergy(patch.energyLevel));
              }
              const nextBias = oneDayBodyBiasFromTargetBody(patch.targetBody);
              if (nextBias != null) setOneDayBodyBias(nextBias);
            }}
          />
        )}

        </View>
      </ScrollView>
      <FlowPhaseNavBar
        sticky
        compact
        onLayout={setNavBarHeight}
        forward={{
          label: isOneDay
            ? isGeneratingOneDay
              ? "Generating…"
              : "Get today's workout"
            : "Next: Schedule",
          onPress: onNextToSchedule,
          disabled: !canContinueAdaptive || isGeneratingOneDay,
          loading: isGeneratingOneDay,
        }}
        hint={
          !canContinueAdaptive && isDbConfigured()
            ? !dailyFocusDistributionGate.ok
              ? dailyFocusDistributionGate.reason ?? null
              : isOneDay
                ? `${ONE_DAY_SPORT_MODE_COMBINATION_HINT} Also choose a session length.`
                : "Choose at least one sport to continue."
            : null
        }
      >
        <Pressable onPress={onSaveSportPreset} style={styles.savePresetWrap}>
          <Text style={[styles.savePresetText, { color: theme.textMuted }]}>
            Save preset
          </Text>
        </Pressable>
      </FlowPhaseNavBar>
      </View>
      <Modal visible={limitPopup != null} transparent animationType="fade" statusBarTranslucent>
        {limitPopup != null ? (
          <View pointerEvents="none" style={styles.limitPopupOverlay}>
            {(() => {
              const margin = 16;
              const caretH = 8;
              const gap = 10;
              const approxBubbleH = 92;
              const maxBubbleW = Math.min(300, windowWidth - margin * 2);
              const { pageX: ax, pageY: ay } = limitPopup.anchor;
              let placement: "above" | "below" = "above";
              let top = ay - approxBubbleH - caretH - gap;
              if (top < 52) {
                placement = "below";
                top = ay + caretH + gap + 4;
              }
              if (top + approxBubbleH > windowHeight - 24) {
                top = Math.max(52, windowHeight - approxBubbleH - 24);
              }
              const left = Math.min(
                Math.max(margin, ax - maxBubbleW / 2),
                windowWidth - margin - maxBubbleW
              );
              const bubbleCenterX = left + maxBubbleW / 2;
              const caretOffset = Math.max(
                -maxBubbleW / 2 + 22,
                Math.min(maxBubbleW / 2 - 22, ax - bubbleCenterX)
              );
              const caretLeft = maxBubbleW / 2 + caretOffset - 7;
              return (
                <View
                  style={[
                    styles.limitPopupBubble,
                    {
                      top,
                      left,
                      width: maxBubbleW,
                      backgroundColor: theme.card,
                      borderColor: theme.chipSelectedBorder,
                    },
                    placement === "above" ? { paddingBottom: 12 } : { paddingTop: 14 },
                  ]}
                >
                  {placement === "below" ? (
                    <View
                      style={[
                        styles.limitPopupCaretUp,
                        {
                          left: caretLeft,
                          borderBottomColor: theme.chipSelectedBorder,
                        },
                      ]}
                    />
                  ) : null}
                  <Text style={[styles.limitPopupTitle, { color: theme.primary }]}>Selection limit</Text>
                  <Text style={[styles.limitPopupText, { color: theme.text }]}>{limitPopup.message}</Text>
                  {placement === "above" ? (
                    <View
                      style={[
                        styles.limitPopupCaretDown,
                        {
                          left: caretLeft,
                          borderTopColor: theme.chipSelectedBorder,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              );
            })()}
          </View>
        ) : null}
      </Modal>

      {/* Save sport preset modal */}
      <Modal
        transparent
        visible={showSaveSportPresetModal}
        animationType="fade"
        onRequestClose={() => setShowSaveSportPresetModal(false)}
      >
        <View style={styles.presetModalBackdrop}>
          <Pressable
            style={styles.presetModalDismiss}
            onPress={() => setShowSaveSportPresetModal(false)}
          />
          <View
            style={[styles.presetModalSheet, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.presetModalTitle, { color: theme.text }]}>
              Save sport preset
            </Text>
            <Text style={[styles.presetModalSubtitle, { color: theme.textMuted }]}>
              Name this preset to reuse your current sports, goals, and settings later — for
              either a one-day session or a full week.
            </Text>
            <TextInput
              placeholder="e.g. Basketball in-season"
              placeholderTextColor={theme.textMuted}
              value={saveSportPresetName}
              onChangeText={setSaveSportPresetName}
              style={[
                styles.presetModalInput,
                { borderColor: theme.border, color: theme.text },
              ]}
            />
            <View style={styles.presetModalFooter}>
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={() => setShowSaveSportPresetModal(false)}
                style={styles.presetModalFooterBtn}
              />
              <PrimaryButton
                label="Save"
                onPress={onConfirmSaveSportPreset}
                style={styles.presetModalFooterBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenFill: {
    flex: 1,
  },
  scrollFill: {
    flex: 1,
    ...(Platform.OS === "web" ? ({ minHeight: 0 } as const) : null),
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  searchRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  helperHint: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  rankedSportRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  rankedChipWrap: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    marginRight: 8,
    marginBottom: 8,
  },
  rankedChipPressable: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    maxWidth: "100%",
  },
  rankBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rankedChipInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 80,
    flexShrink: 1,
    gap: 6,
  },
  rankedChipLabel: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
    maxWidth: "100%",
  },
  rankedChipPct: {
    fontSize: 11,
    fontWeight: "500",
    flexShrink: 0,
  },
  rankedChipRemove: {
    paddingLeft: 6,
    paddingVertical: 4,
    marginLeft: 2,
  },
  rankedChipRemoveText: {
    fontSize: 18,
    fontWeight: "600",
  },
  modifierLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 12,
    marginBottom: 4,
  },
  goalRow: {
    borderWidth: 1,
    borderRadius: themeRadius.card,
    padding: 12,
    marginTop: 10,
  },
  goalRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  goalRowLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    minWidth: 0,
  },
  subGoalsControl: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  subGoalsControlText: {
    fontSize: 13,
    fontWeight: "600",
  },
  subGoalsBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  rankBadgeSmall: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rankBadgeTextSmall: {
    fontSize: 11,
    fontWeight: "700",
  },
  rankedChipLabelSmall: {
    fontSize: 12,
    fontWeight: "500",
  },
  priorityStack: {
    gap: 8,
  },
  priorityRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  priorityRowInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  priorityCardChips: {
    marginTop: 10,
    gap: 8,
  },
  priorityCardChipBlock: {
    gap: 4,
  },
  priorityCardSubLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  priorityRankBadge: {
    width: 24,
    height: 24,
    borderRadius: themeRadius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityRankText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priorityTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  priorityRowTitle: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  priorityRowDetail: {
    fontSize: 14,
    fontWeight: "700",
  },
  priorityGroupBlock: {
    marginTop: 14,
  },
  priorityGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  filterBubble: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterBubbleText: {
    fontSize: 12,
    fontWeight: "500",
  },
  advancedFiltersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: themeRadius.card,
  },
  advancedFiltersTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  advancedFiltersChevron: {
    fontSize: 14,
    fontWeight: "600",
  },
  advancedFiltersSection: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderRadius: themeRadius.card,
    borderWidth: 1,
    marginTop: 12,
  },
  sportRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  sportName: {
    fontSize: 14,
    fontWeight: "600",
  },
  sportDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    marginTop: 20,
    marginBottom: 20,
  },
  footerHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 17,
    paddingHorizontal: 6,
  },
  savePresetWrap: {
    alignItems: "center",
    paddingVertical: 2,
  },
  savePresetText: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  presetModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  presetModalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  presetModalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  presetModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  presetModalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  presetModalInput: {
    borderWidth: 1,
    borderRadius: themeRadius.control,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  presetModalFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  presetModalFooterBtn: {
    flex: 1,
  },
  subGoalBlendLinkWrap: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  subGoalBlendLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  slotSeparatorLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subFocusSectionWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  subFocusSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  limitPopupOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  limitPopupBubble: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...Platform.select({
      web: {
        boxShadow: "0px 6px 12px rgba(0, 0, 0, 0.22)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
    }),
    elevation: 12,
  },
  limitPopupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.65,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  limitPopupText: {
    fontSize: 13,
    lineHeight: 19,
  },
  /** Caret pointing down (bubble sits above the tap). */
  limitPopupCaretDown: {
    position: "absolute",
    bottom: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  /** Caret pointing up (bubble sits below the tap). */
  limitPopupCaretUp: {
    position: "absolute",
    top: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
