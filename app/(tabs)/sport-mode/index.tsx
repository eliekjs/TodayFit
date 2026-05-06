import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { CollapsiblePreferenceSection } from "../../../components/CollapsiblePreferenceSection";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import {
  computeDeclaredIntentSplitFromPrefs,
  buildWorkoutIntentTitle,
} from "../../../lib/workoutIntentSplit";
import { ExperienceLevelToggle } from "../../../components/ExperienceLevelToggle";
import { useAppState } from "../../../context/AppStateContext";
import type { AdaptiveSetup } from "../../../context/appStateModel";
import { useAuth } from "../../../context/AuthContext";
import { isDbConfigured } from "../../../lib/db";
import {
  CONSTRAINT_OPTIONS,
  DURATIONS,
  normalizeGoalMatchPct,
  SUB_FOCUS_BY_PRIMARY,
  ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY,
  TARGET_OPTIONS,
  goalSubFocusPayloadForAdaptiveGoals,
} from "../../../lib/preferencesConstants";
import { listSportsForPrep, getQualitiesForSport, resolveActiveSportForSlug } from "../../../lib/db/sportRepository";
import type { Sport } from "../../../lib/db/types";
import type { SportQuality } from "../../../lib/db/types";
import { SPORTS_WITH_SUB_FOCUSES, getCanonicalSportSlug } from "../../../data/sportSubFocus";
import { planWeek } from "../../../services/sportPrepPlanner";
import type { DailyWorkoutPreferences, EnergyLevel, TargetBody } from "../../../lib/types";

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
  { id: "mobility", label: "Mobility & joint health", category: "Resilience" },
  { id: "physique", label: "Physique / body comp", category: "Physique" },
  { id: "resilience", label: "Resilience / recovery", category: "Resilience" },
];

const INJURY_STATUS_OPTIONS = [
  "No Concerns",
  "Managing",
  "Rebuilding",
] as const;

/** Injury area options for sport-specific training (same body regions as Build flow, minus "No restrictions"). */
const INJURY_TYPE_OPTIONS = CONSTRAINT_OPTIONS.filter((o) => o !== "No restrictions");

const INTENSITY_LEVEL_OPTIONS = ["Fresh", "Moderate", "Fatigued"] as const;

const MAX_SUB_GOALS_PER_GOAL = 3;
const MAX_TOTAL_SUB_GOALS_DAY = 3;
const MAX_TOTAL_SUB_GOALS_WEEK = 5;
const MAX_TOTAL_PRIORITY_PICKS_DAY = 2;
const MAX_TOTAL_PRIORITY_PICKS_WEEK = 3;

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
  | "intensityLevel";

export default function AdaptiveModeScreen() {
  const theme = useTheme();
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
  } = useAppState();
  const { userId } = useAuth();
  const isOneDay = scope === "day";

  const [rankedGoals, setRankedGoals] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [intensityLevel, setIntensityLevel] =
    useState<(typeof INTENSITY_LEVEL_OPTIONS)[number]>("Moderate");
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
  const [sectionSessionOpen, setSectionSessionOpen] = useState(false);
  const [sectionBodyOpen, setSectionBodyOpen] = useState(false);
  const adaptiveScrollRef = useRef<ScrollView>(null);
  const adaptiveContentRef = useRef<View>(null);
  const adaptiveAdvancedRef = useRef<View>(null);
  const [adaptiveAdvNestedOpen, setAdaptiveAdvNestedOpen] = useState<
    Partial<Record<AdaptiveAdvNestedKey, boolean>>
  >({});
  const toggleAdaptiveAdvNested = useCallback((key: AdaptiveAdvNestedKey) => {
    setAdaptiveAdvNestedOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const [editingGoalMatchRank, setEditingGoalMatchRank] = useState<1 | 2 | 3 | null>(null);
  const [editingGoalMatchValue, setEditingGoalMatchValue] = useState("");
  const [isGeneratingOneDay, setIsGeneratingOneDay] = useState(false);
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
    const loadSports = async () => {
      if (!isDbConfigured()) return;
      try {
        setSportsError(null);
        const all = await listSportsForPrep();
        setSports(all);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setSportsError(msg);
      }
    };
    loadSports();
  }, []);

  useEffect(() => {
    setOneDayBodyBias(defaultOneDayBodyBias);
  }, [defaultOneDayBodyBias]);

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
        "For one-day Sport Mode, choose either 2 sports or 1 sport + 1 goal.",
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
    const totalGoalSubGoals = Object.values(manualPreferences.subFocusByGoal).reduce<number>(
      (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
      0
    );
    const totalSportSubGoals = Object.values(subFocusBySport).reduce<number>(
      (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
      0
    );
    if (has) {
      setSubFocusBySport((prev) => ({
        ...prev,
        [sportSlug]: current.filter((x) => x !== qualitySlug),
      }));
    } else {
      if (current.length >= 3) return;
      if (totalGoalSubGoals + totalSportSubGoals >= totalSubGoalCap) {
        showLimitPopup(
          `You can select up to ${totalSubGoalCap} total sub-goals across goals and sports in ${isOneDay ? "one-day" : "week"} mode.`,
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
      !(
        (selectedSportCount === 2 && selectedGoalCount === 0) ||
        (selectedSportCount === 1 && selectedGoalCount === 1)
      )
    ) {
      setError("For one-day Sport Mode, choose either 2 sports or 1 sport + 1 goal.");
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
        setIsGeneratingOneDay(true);
        try {
          const primary = rankedGoals[0] ?? null;
          const secondary = rankedGoals[1] ?? null;
          const tertiary = rankedGoals[2] ?? null;
          const energyFromIntensity = (level: string): EnergyLevel => {
            if (level === "Fresh") return "high";
            if (level === "Fatigued") return "low";
            return "medium";
          };
          const energyBaseline = energyFromIntensity(intensityLevel);
          const activeProfile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
          const selectedSportSlugs = rankedSportSlugs.filter((s): s is string => s != null);
          const todayDOW = (new Date().getDay() + 6) % 7;
          const rankedGoalIds = rankedGoals.filter((g): g is string => g != null);
          const plan = await planWeek({
            userId: userId ?? undefined,
            primaryGoalSlug: primary,
            secondaryGoalSlug: secondary,
            tertiaryGoalSlug: tertiary,
            goalSubFocusByGoal: goalSubFocusPayloadForAdaptiveGoals(
              rankedGoalIds,
              manualPreferences.subFocusByGoal
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
            injuries:
              injuryStatus === "No Concerns"
                ? []
                : injuryTypes.map((label) => label.toLowerCase().replace(/\s/g, "_")),
            sportSessions: [],
            gymProfile: activeProfile,
            goalMatchPrimaryPct: manualPreferences.goalMatchPrimaryPct ?? 50,
            goalMatchSecondaryPct: manualPreferences.goalMatchSecondaryPct ?? 30,
            goalMatchTertiaryPct: manualPreferences.goalMatchTertiaryPct ?? 20,
            workoutTier: manualPreferences.workoutTier ?? "intermediate",
            includeCreativeVariations: manualPreferences.includeCreativeVariations === true,
            dailyPreferences: { bodyRegionBias: oneDayBodyBias },
            adaptiveScheduleLabels: {
              intensityLevel,
              injuryStatus,
              ...(injuryStatus !== "No Concerns" && injuryTypes.length > 0
                ? { injuryAreas: [...injuryTypes] }
                : {}),
            },
          });
          setSportPrepWeekPlan(plan);
          setAdaptiveSetup(null);
          router.replace("/sport-mode/recommendation");
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setIsGeneratingOneDay(false);
        }
      })();
      return;
    }

    setAdaptiveSetup(setup);
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
  const gymSummary = activeGymProfile != null ? activeGymProfile.name : "Tap to choose";

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
          ? "For one-day Sport Mode, choose either 2 sports or 1 sport + 1 goal."
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
    if (manualLabel) delete nextSub[manualLabel];
    updateManualPreferences({ ...norm, subFocusByGoal: nextSub });
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
      updateManualPreferences({
        subFocusByGoal: {
          ...manualPreferences.subFocusByGoal,
          [manualPrimaryLabel]: current.filter((v) => v !== subOpt),
        },
      });
    } else {
      if (current.length >= MAX_SUB_GOALS_PER_GOAL) return;
      const totalOthers = Object.entries(manualPreferences.subFocusByGoal).reduce<number>(
        (n, [g, arr]) =>
          g === manualPrimaryLabel ? n : n + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      const totalSportSubGoals = Object.values(subFocusBySport).reduce<number>(
        (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      if (totalOthers + current.length + totalSportSubGoals >= totalSubGoalCap) {
        showLimitPopup(
          `You can select up to ${totalSubGoalCap} total sub-goals across goals and sports in ${isOneDay ? "one-day" : "week"} mode.`,
          anchor
        );
        return;
      }
      setError(null);
      updateManualPreferences({
        subFocusByGoal: {
          ...manualPreferences.subFocusByGoal,
          [manualPrimaryLabel]: [...current, subOpt],
        },
      });
    }
  };

  const filledAdaptiveGoals = rankedGoals.filter((g): g is string => g != null);
  const primaryGoalMeta = filledAdaptiveGoals[0]
    ? ADAPTIVE_GOALS.find((g) => g.id === filledAdaptiveGoals[0])
    : undefined;
  const adaptiveAdvAdditionalGoalsSummary =
    filledAdaptiveGoals.length === 0
      ? "None"
      : filledAdaptiveGoals.length > 1
        ? `${primaryGoalMeta?.label ?? filledAdaptiveGoals[0]} +${filledAdaptiveGoals.length - 1} more`
        : primaryGoalMeta?.label ?? filledAdaptiveGoals[0];
  const sportSectionSummary = selectedSportSlugs.length === 0
    ? "Tap to choose"
    : [primarySport?.name, secondarySport?.name].filter(Boolean).join(" · ") || "Tap to choose";
  const sessionSectionSummary = `${oneDayDuration} min`;
  const bodySectionSummary = oneDayBodyBias.charAt(0).toUpperCase() + oneDayBodyBias.slice(1);

  const setOneDayTargetBody = useCallback((target: TargetBody) => {
    if (target === "Upper") setOneDayBodyBias("upper");
    else if (target === "Lower") setOneDayBodyBias("lower");
    else setOneDayBodyBias("full");
  }, []);

  const openAdaptiveAdvancedAndScroll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAdvancedOpen(true);
    requestAnimationFrame(() => {
      const scroll = adaptiveScrollRef.current;
      const content = adaptiveContentRef.current;
      const section = adaptiveAdvancedRef.current;
      if (!scroll || !content || !section) return;
      section.measureLayout(
        content as unknown as View,
        (_x: number, y: number) => {
          scroll.scrollTo({ y: Math.max(0, y - 12), animated: true });
        },
        () => {}
      );
    });
  }, []);

  const oneDayGoalCount = rankedGoals.filter((g): g is string => g != null).length;
  const oneDaySportCount = selectedSportSlugs.length;
  const oneDayCombinationValid =
    !isOneDay ||
    (oneDaySportCount === 2 && oneDayGoalCount === 0) ||
    (oneDaySportCount === 1 && oneDayGoalCount === 1);
  const canContinueAdaptive =
    isDbConfigured() &&
    activeGymProfile != null &&
    selectedSportSlugs.length >= 1 &&
    oneDayCombinationValid &&
    (!isOneDay || oneDayDuration > 0);

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
  const adaptiveSubGoalsTotalCount = adaptiveGoalSubFocusLabels.reduce(
    (n, lab) => n + (manualPreferences.subFocusByGoal[lab]?.length ?? 0),
    0
  );
  const adaptiveAdvGoalSubGoalsSummary =
    adaptiveSubGoalsTotalCount === 0 ? "None" : `${adaptiveSubGoalsTotalCount} selected`;
  const adaptiveAdvSportFocusSummary = `${sportFocusPct[0]}/${sportFocusPct[1]}%`;
  const adaptiveAdvInjurySummary =
    injuryStatus === "No Concerns"
      ? "No concerns"
      : `${injuryStatus}${injuryTypes.length > 0 ? ` · ${injuryTypes.length} area(s)` : ""}`;
  const totalPriorityCap = isOneDay ? MAX_TOTAL_PRIORITY_PICKS_DAY : MAX_TOTAL_PRIORITY_PICKS_WEEK;
  const totalSubGoalCap = isOneDay ? MAX_TOTAL_SUB_GOALS_DAY : MAX_TOTAL_SUB_GOALS_WEEK;
  const totalPrioritySelections =
    rankedGoals.filter((g): g is string => g != null).length +
    rankedSportSlugs.filter((s): s is string => s != null).length;
  const totalGoalSubGoalsSelected = Object.values(manualPreferences.subFocusByGoal).reduce<number>(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  const totalSportSubGoalsSelected = Object.values(subFocusBySport).reduce<number>(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  const totalSubGoalsSelected = totalGoalSubGoalsSelected + totalSportSubGoalsSelected;
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
    ...(intensityLevel !== "Moderate"
      ? [{ id: "intensity", label: `Intensity level: ${intensityLevel}` }]
      : []),
    ...(injuryStatus !== "No Concerns"
      ? [{ id: "injury_status", label: `Injury status: ${injuryStatus}` }]
      : []),
    ...(injuryTypes.length > 0
      ? injuryTypes.map((injury) => ({ id: `injury_${injury}`, label: `Protect: ${injury}` }))
      : []),
    ...(isOneDay ? [{ id: "duration", label: `Session: ${oneDayDuration} min` }] : []),
  ];

  const oneDayFocusSplit = (() => {
    const goalSlugs = filledAdaptiveGoals.filter((g): g is string => Boolean(g));
    const hasSport = selectedSportSlugs.length > 0;
    const hasGoals = goalSlugs.length > 0;
    const effSportVsGoal = hasSport && hasGoals ? sportVsGoalPct : hasSport ? 100 : 0;
    return computeDeclaredIntentSplitFromPrefs({
      sportSlugs: selectedSportSlugs,
      goalSlugs,
      sportVsGoalPct: effSportVsGoal,
      goalMatchPrimaryPct: manualPreferences.goalMatchPrimaryPct ?? 50,
      goalMatchSecondaryPct: manualPreferences.goalMatchSecondaryPct ?? 30,
      goalMatchTertiaryPct: manualPreferences.goalMatchTertiaryPct ?? 20,
    });
  })();
  const oneDayWorkoutTitle =
    oneDayFocusSplit.length > 0 ? buildWorkoutIntentTitle(oneDayFocusSplit) : undefined;

  if (isGeneratingOneDay) {
    return (
      <GenerationLoadingScreen
        message="Building your session…"
        subtitle="Turning your sports and goals into today’s workout."
        focusSplit={oneDayFocusSplit.length > 0 ? oneDayFocusSplit : undefined}
        workoutTitle={oneDayWorkoutTitle}
      />
    );
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <ScrollView
        ref={adaptiveScrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View ref={adaptiveContentRef} collapsable={false}>
        <Card title="Sport Mode">
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            {isOneDay
              ? "Choose your sport to get one tailored workout today."
              : "Choose your sport to get a tailored weekly plan."}
          </Text>
        </Card>

        <ExperienceLevelToggle
          marginTop={16}
          workoutTier={manualPreferences.workoutTier ?? "intermediate"}
          includeCreativeVariations={manualPreferences.includeCreativeVariations === true}
          onChange={(patch) => updateManualPreferences(patch)}
        />

        <CollapsiblePreferenceSection
          title="Where you train"
          subtitle={
            activeGymProfile != null
              ? `Equipment from: ${activeGymProfile.name}`
              : "Choose a gym profile for equipment."
          }
          summary={gymSummary}
          expanded={false}
          onToggle={() => router.push("/profiles?from=adaptive")}
          marginTop={12}
        >
          <View />
        </CollapsiblePreferenceSection>

        {error ? (
          <Text style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <Card title="Workout priorities" style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12 }}>
            This ranked stack drives how Sport Mode builds your workout.
          </Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
            {isOneDay
              ? "Limits: either 2 sports or 1 sport + 1 goal (daily), and up to 3 total sub-goals."
              : `Limits: up to ${totalPriorityCap} total sports + goals, and up to ${totalSubGoalCap} total sub-goals.`}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
            Selected: {totalPrioritySelections}/{totalPriorityCap} priorities, {totalSubGoalsSelected}/{totalSubGoalCap} sub-goals.
          </Text>

          {topPriorityRows.length > 0 ? (
            <View style={styles.priorityStack}>
              {topPriorityRows.map((row, stackIdx) => {
                const displayRank = stackIdx + 1;
                return (
                  <View
                    key={`${row.kind}-${stackIdx}`}
                    style={[styles.priorityRow, { borderColor: theme.border }]}
                  >
                    <View style={styles.priorityRowInner}>
                      <View
                        style={[
                          styles.priorityRankBadge,
                          {
                            backgroundColor: theme.chipSelectedBackground,
                            borderColor: theme.primary,
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
                                    numberOfLines={1}
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
                                              borderColor: theme.primary,
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
                                              borderColor: theme.primary,
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
                                                borderColor: theme.primary,
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
                                                borderColor: theme.primary,
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
                      backgroundColor: theme.card,
                      borderColor: theme.border,
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
                          borderColor: theme.primary,
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
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.rankedChipLabel, { color: theme.chipSelectedText }]}
                        numberOfLines={1}
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
                  No sports loaded yet. Confirm Supabase is configured and migrations/seeds have run.
                </Text>
              )}
              {sports.length > 0 && filteredSportsFlat.length === 0 && (
                <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                  No sports match "{sportsSearch}".
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
                Sport sub-focus <Text style={{ fontWeight: "400" }}>(optional, ranked)</Text>
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
                const canAddSub = selectedQualities.length < 3;
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
                                        borderColor: theme.primary,
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
                                        borderColor: theme.primary,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[styles.rankedChipLabelSmall, { color: theme.chipSelectedText }]}
                                      numberOfLines={1}
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
          {rankedGoals.filter((g): g is string => g != null).length > 0 && (
            <View style={styles.chipGroup}>
              {rankedGoals.filter((g): g is string => g != null).map((goalId, idx) => {
                const goal = ADAPTIVE_GOALS.find((g) => g.id === goalId);
                return (
                  <View key={goalId} style={styles.rankedChipWrap}>
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: theme.chipSelectedBackground,
                          borderWidth: 1,
                          borderColor: theme.primary,
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
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.rankedChipLabel, { color: theme.chipSelectedText }]}
                        numberOfLines={1}
                      >
                        {goal?.label ?? goalId}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeGoal(goalId)}
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
        <Pressable
          style={[
            styles.advancedFiltersHeader,
            { borderBottomColor: theme.border, marginTop: 20 },
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAdvancedOpen((v) => !v);
          }}
        >
          <Text style={[styles.advancedFiltersTitle, { color: theme.textMuted }]}>
            Other filters
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
            {selectedSportSlugs.length > 0 &&
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
            {filledAdaptiveGoals.length > 0 ? (
            <CollapsiblePreferenceSection
              nested
              title="Goal match %"
              subtitle="What % of the workout should match each ranked additional goal. Sum = 100%."
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

            {filledAdaptiveGoals.length > 0 ? (
              <CollapsiblePreferenceSection
                nested
                title="Goal sub-focus"
                subtitle={`Up to ${totalSubGoalCap} total across goals + sports, ranked within each goal. Same options as Build workout.`}
                summary={adaptiveAdvGoalSubGoalsSummary}
                expanded={adaptiveAdvNestedOpen.goalSubGoals === true}
                onToggle={() => toggleAdaptiveAdvNested("goalSubGoals")}
              >
                {filledAdaptiveGoals.map((goalId, goalIdx) => {
                  const manualLabel = ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[goalId];
                  const goalMeta = ADAPTIVE_GOALS.find((g) => g.id === goalId);
                  const subOptions = manualLabel ? SUB_FOCUS_BY_PRIMARY[manualLabel] ?? [] : [];
                  const selectedSubs =
                    manualLabel != null
                      ? manualPreferences.subFocusByGoal[manualLabel] ?? []
                      : [];
                  const canAddSub =
                    selectedSubs.length < MAX_SUB_GOALS_PER_GOAL &&
                    totalSubGoalsSelected < totalSubGoalCap;
                  return (
                    <View
                      key={goalId}
                      style={[styles.goalRow, { borderColor: theme.border, marginTop: goalIdx === 0 ? 0 : 12 }]}
                    >
                      <View style={styles.goalRowHeader}>
                        <View
                          style={[
                            styles.rankBadgeSmall,
                            {
                              backgroundColor: theme.chipSelectedBackground,
                              borderWidth: 1,
                              borderColor: theme.primary,
                            },
                          ]}
                        >
                          <Text style={[styles.rankBadgeTextSmall, { color: theme.chipSelectedText }]}>
                            {goalIdx + 1}
                          </Text>
                        </View>
                        <Text style={[styles.goalRowLabel, { color: theme.text }]} numberOfLines={2}>
                          {goalMeta?.label ?? goalId}
                        </Text>
                      </View>
                      {manualLabel && subOptions.length > 0 ? (
                        <View style={[styles.subGoalsBlock, { borderTopColor: theme.border }]}>
                          {selectedSubs.length > 0 && (
                            <View style={styles.chipGroup}>
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
                                        borderColor: theme.primary,
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
                                        borderColor: theme.primary,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[styles.rankedChipLabelSmall, { color: theme.chipSelectedText }]}
                                      numberOfLines={1}
                                    >
                                      {sub}
                                    </Text>
                                  </View>
                                </Pressable>
                              ))}
                            </View>
                          )}
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
                      ) : (
                        <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                          No sub-focus options for this goal.
                        </Text>
                      )}
                    </View>
                  );
                })}
              </CollapsiblePreferenceSection>
            ) : null}

            {selectedSportSlugs.length === 2 ? (
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
                        <Text style={{ fontSize: 13, color: theme.textMuted }} numberOfLines={1}>
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
              title="Injuries & protection"
              subtitle="Status and areas to protect in generated workouts."
              summary={adaptiveAdvInjurySummary}
              expanded={adaptiveAdvNestedOpen.injury === true}
              onToggle={() => toggleAdaptiveAdvNested("injury")}
            >
              <View style={styles.chipGroup}>
                {INJURY_STATUS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={injuryStatus === opt}
                    onPress={() => {
                      setInjuryStatus(opt);
                      if (opt === "No Concerns") setInjuryTypes([]);
                    }}
                  />
                ))}
              </View>
              {(injuryStatus === "Managing" || injuryStatus === "Rebuilding") && (
                <>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: theme.textMuted,
                      marginTop: 14,
                      marginBottom: 8,
                    }}
                  >
                    Injury areas
                  </Text>
                  <View style={styles.chipGroup}>
                    {INJURY_TYPE_OPTIONS.map((label) => (
                      <Chip
                        key={label}
                        label={label}
                        selected={injuryTypes.includes(label)}
                        onPress={() => {
                          setInjuryTypes((prev) =>
                            prev.includes(label)
                              ? prev.filter((x) => x !== label)
                              : [...prev, label]
                          );
                        }}
                      />
                    ))}
                  </View>
                </>
              )}
            </CollapsiblePreferenceSection>

            <CollapsiblePreferenceSection
              nested
              title="Intensity level"
              subtitle="How hard you want training to feel."
              summary={intensityLevel}
              expanded={adaptiveAdvNestedOpen.intensityLevel === true}
              onToggle={() => toggleAdaptiveAdvNested("intensityLevel")}
            >
              <View style={styles.chipGroup}>
                {INTENSITY_LEVEL_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={intensityLevel === opt}
                    onPress={() => setIntensityLevel(opt)}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>
          </View>
        )}

        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={
              isOneDay
                ? (isGeneratingOneDay ? "Generating…" : "Get today's workout")
                : "Next: Choose your schedule"
            }
            onPress={onNextToSchedule}
            disabled={!canContinueAdaptive || isGeneratingOneDay}
          />
          {!canContinueAdaptive && isDbConfigured() ? (
            <Text style={[styles.footerHint, { color: theme.textMuted }]}>
              {isOneDay
                ? "Choose either 2 sports or 1 sport + 1 goal, and a session length."
                : "Choose at least one sport to continue."}
            </Text>
          ) : null}
          <Pressable onPress={openAdaptiveAdvancedAndScroll} style={styles.advancedLinkWrap}>
            <Text style={[styles.advancedLinkText, { color: theme.primary }]}>
              Advanced options (sport %, goal weights, fatigue, injuries…)
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
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
                      borderColor: theme.primary,
                      shadowColor: "#000",
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
                          borderBottomColor: theme.primary,
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
                          borderTopColor: theme.primary,
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
    marginRight: 8,
    marginBottom: 8,
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
    maxWidth: 260,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderBottomWidth: 1,
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
    borderRadius: 12,
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
    marginTop: 24,
    marginBottom: 24,
  },
  footerHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
  },
  advancedLinkWrap: {
    paddingVertical: 12,
    alignItems: "center",
  },
  advancedLinkText: {
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
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
