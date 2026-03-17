import React, { useEffect, useMemo, useState } from "react";
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
import { SectionHeader } from "../../../components/SectionHeader";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { useAppState } from "../../../context/AppStateContext";
import type { AdaptiveSetup } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { isDbConfigured } from "../../../lib/db";
import { CONSTRAINT_OPTIONS, DURATIONS, normalizeGoalMatchPct } from "../../../lib/preferencesConstants";
import { listSportsForPrep, getQualitiesForSport } from "../../../lib/db/sportRepository";
import type { Sport } from "../../../lib/db/types";
import type { SportQuality } from "../../../lib/db/types";
import { SPORTS_WITH_SUB_FOCUSES } from "../../../data/sportSubFocus";
import { planWeek } from "../../../services/sportPrepPlanner";
import type { EnergyLevel } from "../../../lib/types";

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
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f90b2a'},body:JSON.stringify({sessionId:'f90b2a',location:'adaptive/index.tsx:mount',message:'Adaptive mount scope param',data:{scope:scope ?? null,isOneDay},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  }, [scope]);
  // #endregion

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
  /** Ranked sports (up to 2). Empty = no specific sport. */
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
  const [editingGoalMatchRank, setEditingGoalMatchRank] = useState<1 | 2 | 3 | null>(null);
  const [editingGoalMatchValue, setEditingGoalMatchValue] = useState("");
  const [isGeneratingOneDay, setIsGeneratingOneDay] = useState(false);
  const [oneDayDuration, setOneDayDuration] = useState<number>(45);

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
      // #region agent log
      fetch('http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f90b2a'},body:JSON.stringify({sessionId:'f90b2a',location:'adaptive/index.tsx:onNextOneDay',message:'One-day path: generating single session',data:{isOneDay},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      (async () => {
        setIsGeneratingOneDay(true);
        try {
          const primary = rankedGoals[0] ?? "strength";
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
          const activeProfile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
          const selectedSportSlugs = rankedSportSlugs.filter((s): s is string => s != null);
          const todayDOW = (new Date().getDay() + 6) % 7;
          const plan = await planWeek({
            userId: userId ?? undefined,
            primaryGoalSlug: primary,
            secondaryGoalSlug: secondary,
            tertiaryGoalSlug: tertiary,
            sportSlug: rankedSportSlugs[0] ?? null,
            sportSubFocusSlugs:
              rankedSportSlugs[0] && SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === rankedSportSlugs[0])
                ? (subFocusBySport[rankedSportSlugs[0]] ?? []).slice(0, 3)
                : undefined,
            sportQualitySlugs:
              rankedSportSlugs[0] && !SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === rankedSportSlugs[0])
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

    // #region agent log
    fetch('http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f90b2a'},body:JSON.stringify({sessionId:'f90b2a',location:'adaptive/index.tsx:onNextToSchedule',message:'Week path: navigating to schedule',data:{isOneDay:false},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    setAdaptiveSetup(setup);
    router.push("/adaptive/schedule");
  };

  const canonicalCategoryOrder = [
    "Endurance",
    "Strength/Power",
    "Mountain/Snow/Board",
    "Court/Field",
    "Combat/Grappling",
    "Water/Wind",
    "Climbing",
  ];

  const filteredSportsByCategory = useMemo(() => {
    if (!sports.length) return new Map<string, Sport[]>();
    const q = sportsSearch.trim().toLowerCase();
    const byCategory = new Map<string, Sport[]>();
    for (const s of sports) {
      if (q && !s.name.toLowerCase().includes(q)) continue;
      const list = byCategory.get(s.category) ?? [];
      list.push(s);
      byCategory.set(s.category, list);
    }
    return byCategory;
  }, [sports, sportsSearch]);

  const categoriesToShow = useMemo(() => {
    const keys = Array.from(filteredSportsByCategory.keys());
    if (!keys.length) return [];
    const canonicalFirst = canonicalCategoryOrder.filter((c) => keys.includes(c));
    const rest = keys.filter((k) => !canonicalCategoryOrder.includes(k)).sort();
    return [...canonicalFirst, ...rest];
  }, [filteredSportsByCategory]);

  const selectedSportSlugs = rankedSportSlugs.filter((s): s is string => s != null);

  /** Available sports to show in the picker (excludes already selected). Normalize slugs for comparison. */
  const availableSportsForPicker = useMemo(() => {
    const selected = new Set(selectedSportSlugs.map((s) => s.toLowerCase().trim()));
    return categoriesToShow.flatMap((cat) =>
      (filteredSportsByCategory.get(cat) ?? []).filter(
        (s) => !selected.has((s.slug ?? "").toLowerCase().trim())
      )
    );
  }, [categoriesToShow, filteredSportsByCategory, selectedSportSlugs]);
  const hasNoSpecificSport = selectedSportSlugs.length === 0;
  const primarySlug = rankedSportSlugs[0] ?? null;
  const secondarySlug = rankedSportSlugs[1] ?? null;
  const primarySport = primarySlug ? sports.find((s) => s.slug === primarySlug) : null;
  const secondarySport = secondarySlug ? sports.find((s) => s.slug === secondarySlug) : null;

  const clearAllSports = () => {
    setRankedSportSlugs([null, null]);
    setSubFocusBySport({});
    setExpandedSportForSubFocus(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

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
    updateManualPreferences(norm);
  };

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card title="How Sport Mode works">
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            {isOneDay
              ? "Pick at least one goal (and optionally a sport), then get a single workout tailored to today."
              : "Pick at least one goal (and optionally a second to balance your plan), choose your sport(s) if any, and set your weekly availability. TodayFit will generate a 7-day sport plan with smart intents and a concrete workout for each training day."}
          </Text>
        </Card>

        {error ? (
          <Text style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <SectionHeader
          title="Rank your sport(s)"
          subtitle="Pick up to 2, ranked. Optional: leave empty for general fitness. Sport days in Advanced."
          style={{ marginTop: 20 }}
        />

        {selectedSportSlugs.length > 0 && (
              <View style={styles.rankedSportRow}>
                {selectedSportSlugs.map((slug, idx) => {
                  const sport = sports.find((s) => (s.slug ?? "").toLowerCase() === (slug ?? "").toLowerCase()) ?? sports.find((s) => s.slug === slug);
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
        {sports.length > 0 && Array.from(filteredSportsByCategory.keys()).length === 0 && (
          <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
            No sports match “{sportsSearch}”.
          </Text>
        )}

                <View style={styles.chipGroup} key={`sport-picker-${selectedSportSlugs.join(",")}`}>
                  {selectedSportSlugs.length === 0 && (
                    <Chip
                      label="No specific sport"
                      selected={hasNoSpecificSport}
                      onPress={clearAllSports}
                    />
                  )}
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
                const sport = sports.find((s) => s.slug === slug);
                const sportSubFocus = SPORTS_WITH_SUB_FOCUSES.find((s) => s.slug === slug);
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

        {isOneDay && (
          <>
            <SectionHeader
              title="Session duration"
              subtitle="Approximate length for today's workout."
              style={{ marginTop: 20 }}
            />
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
          </>
        )}

        <SectionHeader
          title="Any additional goals"
          subtitle="Pick 1–3 goals."
          style={{ marginTop: 20 }}
        />

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
          {ADAPTIVE_GOALS.filter(
            (g) => !rankedGoals.includes(g.id)
          ).map((goal) => (
            <Chip
              key={goal.id}
              label={goal.label}
              selected={false}
              onPress={() => addGoal(goal.id)}
            />
          ))}
        </View>

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
            Advanced
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
            {selectedSportSlugs.length > 0 && rankedGoals.filter((g): g is string => g != null).length > 0 && (
              <>
                <SectionHeader
                  title="Sport(s) vs Additional goals"
                  subtitle="What % of the workout should favor sport(s) vs your additional goals. Sum = 100%."
                  style={{ marginTop: 0 }}
                />
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
              </>
            )}
            <SectionHeader
              title="Goal match %"
              subtitle="What % of the workout should match each ranked goal. Sum = 100%."
              style={{ marginTop: 0 }}
            />
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

            {selectedSportSlugs.length === 2 && (
              <>
                <SectionHeader
                  title="Sport focus %"
                  subtitle="What % of sport-focused training should match each sport. Sum = 100%. Sub-focuses use auto 50 / 30 / 20 by rank."
                  style={{ marginTop: 20 }}
                />
                <View style={[styles.chipGroup, { flexDirection: "column", gap: 12 }]}>
                  {[0, 1].map((idx) => {
                    const value = sportFocusPct[idx];
                    const otherValue = sportFocusPct[1 - idx];
                    const setPct = (raw: number) => {
                      const v = Math.max(0, Math.min(100, Math.round(raw)));
                      const other = 100 - v;
                      setSportFocusPct(idx === 0 ? [v, other] : [other, v]);
                    };
                    const sport = sports.find((s) => s.slug === selectedSportSlugs[idx]);
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
              </>
            )}

            <SectionHeader
              title="Recent load"
              subtitle="Past 3–5 days."
              style={{ marginTop: 20 }}
            />
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

            <SectionHeader
              title="Injury status"
              subtitle="Rebuilding, managing, or no concerns."
              style={{ marginTop: 20 }}
            />
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
                <SectionHeader
                  title="Injury areas"
                  subtitle="Select any areas to protect. We'll avoid exercises that stress them."
                  style={{ marginTop: 16 }}
                />
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

            <SectionHeader
              title="Fatigue"
              subtitle="How you generally feel heading into this week."
              style={{ marginTop: 20 }}
            />
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

            <SectionHeader
              title="Time horizon"
              subtitle="Farther from your event = we can push intensity more. Closer = lighter so you're fresh."
              style={{ marginTop: 20 }}
            />
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
          </View>
        )}

        <View style={styles.footer}>
          <PrimaryButton
            label={
              isOneDay
                ? (isGeneratingOneDay ? "Generating…" : "Get today's workout")
                : "Next: Set your schedule"
            }
            onPress={onNextToSchedule}
            disabled={!isDbConfigured() || isGeneratingOneDay}
          />
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
});
