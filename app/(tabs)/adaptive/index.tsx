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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { CollapsiblePreferenceSection } from "../../../components/CollapsiblePreferenceSection";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { ExperienceLevelToggle } from "../../../components/ExperienceLevelToggle";
import { useAppState } from "../../../context/AppStateContext";
import type { AdaptiveSetup } from "../../../context/AppStateContext";
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

/** Spec: No Deadline, 1–3 Weeks, 4–8 Weeks, 2–4 Months, In-Season. */
const TIME_HORIZON_OPTIONS = [
  { id: "no_deadline", label: "No Deadline" },
  { id: "1_3_weeks", label: "1–3 Weeks" },
  { id: "4_8_weeks", label: "4–8 Weeks" },
  { id: "2_4_months", label: "2–4 Months" },
  { id: "in_season", label: "In-Season" },
] as const;

/** Spec: recent load (past 3–5 days). */
const RECENT_LOAD_OPTIONS = [
  "Heavy Lower",
  "Heavy Upper",
  "Long Run",
  "Big Hike",
  "Ski Day",
  "Climbing Day",
  "Light / Off",
  "Normal / Mixed",
] as const;

const INJURY_STATUS_OPTIONS = [
  "No Concerns",
  "Managing",
  "Rebuilding",
] as const;

/** Injury area options for sport-specific training (same body regions as Build flow, minus "No restrictions"). */
const INJURY_TYPE_OPTIONS = CONSTRAINT_OPTIONS.filter((o) => o !== "No restrictions");

const FATIGUE_OPTIONS = ["Fresh", "Moderate", "Fatigued"] as const;

const MAX_SUB_GOALS_PER_GOAL = 3;

type AdaptiveAdvNestedKey =
  | "additionalGoals"
  | "sportVsGoals"
  | "goalMatch"
  | "goalSubGoals"
  | "sportFocus"
  | "recentLoad"
  | "injury"
  | "fatigue"
  | "timeHorizon";

export default function AdaptiveModeScreen() {
  const theme = useTheme();
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
  const [horizon, setHorizon] = useState<string>("4_8_weeks");
  const [recentLoad, setRecentLoad] =
    useState<(typeof RECENT_LOAD_OPTIONS)[number]>("Normal / Mixed");
  const [injuryStatus, setInjuryStatus] =
    useState<(typeof INJURY_STATUS_OPTIONS)[number]>("No Concerns");
  /** Selected injury areas when status is Managing or Rebuilding (labels, e.g. "Knee", "Shoulder"). */
  const [injuryTypes, setInjuryTypes] = useState<string[]>([]);
  const [fatigue, setFatigue] =
    useState<(typeof FATIGUE_OPTIONS)[number]>("Moderate");
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
  const [expandedSportForSubFocus, setExpandedSportForSubFocus] = useState<string | null>(null);
  /** When 1 sport is selected, true = show picker to add second. */
  const [showAddSecondSport, setShowAddSecondSport] = useState(false);
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
  const defaultOneDayBodyBias = useMemo<NonNullable<DailyWorkoutPreferences["bodyRegionBias"]>>(() => {
    if (manualPreferences.targetBody === "Upper") return "upper";
    if (manualPreferences.targetBody === "Lower") return "lower";
    return "full";
  }, [manualPreferences.targetBody]);
  const [oneDayBodyBias, setOneDayBodyBias] =
    useState<NonNullable<DailyWorkoutPreferences["bodyRegionBias"]>>(defaultOneDayBodyBias);

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

  const addSport = (slug: string) => {
    const current = rankedSportSlugs.filter((s): s is string => s != null);
    if (current.includes(slug) || current.length >= 2) return;
    const next: (string | null)[] = [...rankedSportSlugs];
    const idx = next.findIndex((s) => s == null);
    if (idx >= 0) next[idx] = slug;
    setRankedSportSlugs(next);
    if (current.length === 1) setShowAddSecondSport(false);
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
    if (expandedSportForSubFocus === slug) setExpandedSportForSubFocus(null);
    setShowAddSecondSport(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const toggleSportSubFocus = (sportSlug: string, qualitySlug: string) => {
    const current = subFocusBySport[sportSlug] ?? [];
    const has = current.includes(qualitySlug);
    if (has) {
      setSubFocusBySport((prev) => ({
        ...prev,
        [sportSlug]: current.filter((x) => x !== qualitySlug),
      }));
    } else {
      if (current.length >= 3) return;
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
    if (selectedSportCount < 1) {
      setError("Choose at least one sport.");
      return;
    }
    if (isOneDay && !(oneDayDuration > 0)) {
      setError("Choose a session length.");
      return;
    }
    const setup: AdaptiveSetup = {
      rankedGoals: [...rankedGoals],
      horizon,
      fatigue,
      recentLoad,
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
          const energyFromFatigue = (level: string): EnergyLevel => {
            if (level === "Fresh") return "high";
            if (level === "Fatigued") return "low";
            return "medium";
          };
          const energyFromHorizon = (level: EnergyLevel, timeHorizon: string): EnergyLevel => {
            if (timeHorizon === "in_season") return "low";
            if (timeHorizon === "1_3_weeks" && level === "high") return "medium";
            return level;
          };
          const energyBaseline = energyFromHorizon(energyFromFatigue(fatigue), horizon);
          const horizonLabel =
            TIME_HORIZON_OPTIONS.find((o) => o.id === horizon)?.label ?? horizon;
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
            recentLoad,
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
              fatigue,
              horizonLabel,
              recentLoad,
              injuryStatus,
              ...(injuryStatus !== "No Concerns" && injuryTypes.length > 0
                ? { injuryAreas: [...injuryTypes] }
                : {}),
            },
          });
          setSportPrepWeekPlan(plan);
          setAdaptiveSetup(null);
          router.replace("/adaptive/recommendation");
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setIsGeneratingOneDay(false);
        }
      })();
      return;
    }

    setAdaptiveSetup(setup);
    router.push("/adaptive/schedule");
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

  const addGoal = (goalId: string) => {
    const currentCount = rankedGoals.filter((g): g is string => g != null).length;
    if (currentCount >= 3 || rankedGoals.includes(goalId)) return;
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

  const toggleAdaptiveGoalSubGoal = (manualPrimaryLabel: string, subOpt: string) => {
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

  const canContinueAdaptive =
    isDbConfigured() &&
    activeGymProfile != null &&
    selectedSportSlugs.length >= 1 &&
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
  const adaptiveAdvGoalSubGoalsSummary = (() => {
    const labels = filledAdaptiveGoals
      .map((id) => ADAPTIVE_GOAL_ID_TO_MANUAL_PRIMARY[id])
      .filter(Boolean);
    let n = 0;
    for (const lab of labels) {
      n += (manualPreferences.subFocusByGoal[lab] ?? []).length;
    }
    return n === 0 ? "None" : `${n} selected`;
  })();
  const adaptiveAdvSportFocusSummary = `${sportFocusPct[0]}/${sportFocusPct[1]}%`;
  const adaptiveAdvInjurySummary =
    injuryStatus === "No Concerns"
      ? "No concerns"
      : `${injuryStatus}${injuryTypes.length > 0 ? ` · ${injuryTypes.length} area(s)` : ""}`;
  const horizonLabel =
    TIME_HORIZON_OPTIONS.find((o) => o.id === horizon)?.label ?? horizon;

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
              ? "Pick your sport and session length—then get one tailored workout. Optional additional goals live in Advanced options."
              : "Pick your sport, then your schedule. Additional goals, fatigue, injuries, and more are in Advanced options."}
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
        />

        {error ? (
          <Text style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <CollapsiblePreferenceSection
          title="Your sport"
          subtitle="Choose at least one (up to two), ranked."
          summary={sportSectionSummary}
          expanded={sectionSportOpen}
          onToggle={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSectionSportOpen((v) => !v);
          }}
          marginTop={16}
        >

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

            {(selectedSportSlugs.length === 0 || (selectedSportSlugs.length === 1 && showAddSecondSport)) && (
              <>
                <View style={[styles.searchRow, { marginTop: selectedSportSlugs.length > 0 ? 12 : 0 }]}>
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
            No sports match “{sportsSearch}”.
          </Text>
        )}

                <View style={styles.chipGroup} key={`sport-picker-${selectedSportSlugs.join(",")}`}>
                  {availableSportsForPicker.map((sport) => (
                    <Chip
                      key={sport.id}
                      label={sport.name}
                      selected={false}
                      onPress={() => addSport(sport.slug)}
                    />
                  ))}
                </View>
                {selectedSportSlugs.length === 1 && showAddSecondSport && (
                  <Pressable
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowAddSecondSport(false);
                    }}
                    style={{ marginTop: 8, marginBottom: 4, alignSelf: "flex-start" }}
                  >
                    <Text style={{ fontSize: 13, color: theme.textMuted }}>− Hide list</Text>
                  </Pressable>
                )}
              </>
            )}

            {selectedSportSlugs.length === 1 && !showAddSecondSport && (
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowAddSecondSport(true);
                }}
                style={[styles.goalRowHeader, { marginTop: 12 }]}
              >
                <Text style={[styles.subGoalsControlText, { color: theme.primary }]}>
                  + Add second sport
                </Text>
              </Pressable>
            )}

            {selectedSportSlugs.length > 0 && (
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedSportForSubFocus((prev) => (prev === "all" ? null : "all"));
                }}
                style={[styles.goalRowHeader, { marginTop: 12 }]}
              >
                <Text style={[styles.subGoalsControlText, { color: theme.primary }]}>
                  {expandedSportForSubFocus === "all" ? "− Sport sub-focus" : "+ Sport sub-focus"}
                </Text>
              </Pressable>
            )}
            {expandedSportForSubFocus === "all" &&
              selectedSportSlugs.map((slug) => {
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
                  <View key={slug} style={[styles.subGoalsBlock, { borderTopColor: theme.border, marginTop: 8 }]}>
                    <Text style={[styles.modifierLabel, { color: theme.textMuted }]}>
                      {sport?.name ?? slug}
                    </Text>
                    {options.length > 0 ? (
                      <>
                        <View style={styles.chipGroup}>
                          {selectedQualities.map((qSlug) => {
                            const opt = options.find((o) => o.slug === qSlug);
                            return (
                              <Pressable
                                key={qSlug}
                                style={styles.rankedChipWrap}
                                onPress={() => toggleSportSubFocus(slug, qSlug)}
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
                        <View style={styles.chipGroup}>
                          {options
                            .filter((o) => !selectedQualities.includes(o.slug))
                            .map((o) => (
                              <Chip
                                key={o.slug}
                                label={o.name}
                                selected={false}
                                disabled={!canAddSub}
                                onPress={() => toggleSportSubFocus(slug, o.slug)}
                              />
                            ))}
                        </View>
                      </>
                    ) : (
                      <Text style={{ fontSize: 12, color: theme.textMuted }}>No sub-focus options for this sport.</Text>
                    )}
                  </View>
                );
              })}
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
            Advanced options
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
              title="Additional goals"
              subtitle="Optional — rank up to 3 training goals to blend with your sport(s). Leave empty for sport-focused plans."
              summary={adaptiveAdvAdditionalGoalsSummary}
              expanded={adaptiveAdvNestedOpen.additionalGoals === true}
              onToggle={() => toggleAdaptiveAdvNested("additionalGoals")}
              marginTop={0}
            >
              {rankedGoals.filter((g): g is string => g != null).length > 0 && (
                <View style={styles.chipGroup}>
                  {rankedGoals.filter((g): g is string => g != null).map((goalId, idx) => {
                    const goal = ADAPTIVE_GOALS.find((g) => g.id === goalId);
                    const pct =
                      idx === 0
                        ? (manualPreferences.goalMatchPrimaryPct ?? 50)
                        : idx === 1
                          ? (manualPreferences.goalMatchSecondaryPct ?? 30)
                          : (manualPreferences.goalMatchTertiaryPct ?? 20);
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
                          <Text style={[styles.rankedChipPct, { color: theme.textMuted }]}>
                            {pct}%
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
                    onPress={() => addGoal(goal.id)}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>

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
                subtitle="Up to 3 per goal, ranked. Same options as Build workout."
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
                  const canAddSub = selectedSubs.length < MAX_SUB_GOALS_PER_GOAL;
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
                                  onPress={() => toggleAdaptiveGoalSubGoal(manualLabel, sub)}
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
                                  onPress={() => toggleAdaptiveGoalSubGoal(manualLabel, opt)}
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
              title="Recent load"
              subtitle="Past 3–5 days."
              summary={recentLoad}
              expanded={adaptiveAdvNestedOpen.recentLoad === true}
              onToggle={() => toggleAdaptiveAdvNested("recentLoad")}
            >
              <View style={styles.chipGroup}>
                {RECENT_LOAD_OPTIONS.map((load) => (
                  <Chip
                    key={load}
                    label={load}
                    selected={recentLoad === load}
                    onPress={() => setRecentLoad(load)}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>

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
              title="Fatigue"
              subtitle="How you generally feel heading into this week."
              summary={fatigue}
              expanded={adaptiveAdvNestedOpen.fatigue === true}
              onToggle={() => toggleAdaptiveAdvNested("fatigue")}
            >
              <View style={styles.chipGroup}>
                {FATIGUE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={fatigue === opt}
                    onPress={() => setFatigue(opt)}
                  />
                ))}
              </View>
            </CollapsiblePreferenceSection>

            <CollapsiblePreferenceSection
              nested
              title="Time horizon"
              subtitle="Farther from your event = we can push intensity more. Closer = lighter so you're fresh."
              summary={horizonLabel}
              expanded={adaptiveAdvNestedOpen.timeHorizon === true}
              onToggle={() => toggleAdaptiveAdvNested("timeHorizon")}
            >
              <View style={styles.chipGroup}>
                {TIME_HORIZON_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.id}
                    label={opt.label}
                    selected={horizon === opt.id}
                    onPress={() => setHorizon(opt.id)}
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
              Choose at least one sport
              {isOneDay ? " and a session length" : ""} to continue.
            </Text>
          ) : null}
          <Pressable onPress={openAdaptiveAdvancedAndScroll} style={styles.advancedLinkWrap}>
            <Text style={[styles.advancedLinkText, { color: theme.primary }]}>
              Advanced options (additional goals, fatigue, injuries…)
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
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
});
