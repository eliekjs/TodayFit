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
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { SectionHeader } from "../../../components/SectionHeader";
import { Chip } from "../../../components/Chip";
import { PrimaryButton } from "../../../components/Button";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { isDbConfigured } from "../../../lib/db";
import { planWeek } from "../../../services/sportPrepPlanner";
import type { EnergyLevel } from "../../../lib/types";
import { DURATIONS, CONSTRAINT_OPTIONS } from "../../../lib/preferencesConstants";
import { listSportsForPrep } from "../../../lib/db/sportRepository";
import type { Sport } from "../../../lib/db/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental != null
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Spec-aligned: Performance, Physique, Resilience, Energy System (representative set). */
const ADAPTIVE_GOALS = [
  { id: "strength", label: "Max strength foundation", category: "Performance" },
  { id: "muscle", label: "Build visible muscle", category: "Physique" },
  { id: "endurance", label: "Endurance engine", category: "Energy System" },
  { id: "conditioning", label: "Sport-specific conditioning", category: "Energy System" },
  { id: "mobility", label: "Mobility & joint health", category: "Resilience" },
  { id: "climbing", label: "Climbing / grip performance", category: "Performance" },
  { id: "trail_running", label: "Trail running", category: "Performance" },
  { id: "ski", label: "Ski / snow", category: "Performance" },
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
  const {
    activeGymProfileId,
    gymProfiles,
    manualPreferences,
    updateManualPreferences,
    setSportPrepWeekPlan,
  } = useAppState();
  const { userId } = useAuth();

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
  const [gymDaysPerWeek, setGymDaysPerWeek] = useState<number>(3);
  const [defaultDuration, setDefaultDuration] = useState<number>(45);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsError, setSportsError] = useState<string | null>(null);
  const [sportsSearch, setSportsSearch] = useState("");
  /** [primary, secondary]; null means no sport at that rank. "No specific sport" = both null. */
  const [rankedSportSlugs, setRankedSportSlugs] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [sportSectionExpanded, setSportSectionExpanded] = useState(true);

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

  const selectGoalForRank = (rankIndex: number, goalId: string) => {
    setRankedGoals((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i += 1) {
        if (i !== rankIndex && next[i] === goalId) {
          next[i] = null;
        }
      }
      next[rankIndex] = goalId;
      return next;
    });
  };

  const energyFromFatigue = (level: (typeof FATIGUE_OPTIONS)[number]): EnergyLevel => {
    if (level === "Fresh") return "high";
    if (level === "Fatigued") return "low";
    return "medium";
  };

  const onPlanWeek = async () => {
    setError(null);
    if (!isDbConfigured()) {
      setError("Configure Supabase (env vars) to use Adaptive Mode.");
      return;
    }

    const primary = rankedGoals[0] ?? "strength";
    const secondary = rankedGoals[1] ?? null;
    const tertiary = rankedGoals[2] ?? null;

    const energyBaseline = energyFromFatigue(fatigue);
    const activeProfile =
      gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

    setIsSubmitting(true);
    try {
      const plan = await planWeek({
        userId: userId ?? undefined,
        primaryGoalSlug: primary,
        secondaryGoalSlug: secondary,
        tertiaryGoalSlug: tertiary,
        sportSlug: rankedSportSlugs[0] ?? null,
        gymDaysPerWeek,
        defaultSessionDuration: defaultDuration,
        preferredTrainingDays: undefined,
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
      });
      setSportPrepWeekPlan(plan);
      router.push("/adaptive/recommendation");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
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

  const hasNoSpecificSport = rankedSportSlugs[0] === null && rankedSportSlugs[1] === null;
  const primarySlug = rankedSportSlugs[0];
  const secondarySlug = rankedSportSlugs[1];
  const primarySport = primarySlug ? sports.find((s) => s.slug === primarySlug) : null;
  const secondarySport = secondarySlug ? sports.find((s) => s.slug === secondarySlug) : null;

  const selectNoSpecificSport = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRankedSportSlugs([null, null]);
    setSportSectionExpanded(false);
  };

  const selectSportForRank = (rankIndex: 0 | 1, slug: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRankedSportSlugs((prev) => {
      const next: [string | null, string | null] = [...prev];
      if (next[1 - rankIndex] === slug) next[1 - rankIndex] = null;
      next[rankIndex] = slug;
      return next;
    });
    setSportSectionExpanded(false);
  };

  const clearSportAtRank = (rankIndex: 0 | 1) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRankedSportSlugs((prev) => {
      const next: [string | null, string | null] = [...prev];
      next[rankIndex] = null;
      return next;
    });
  };

  const sportSummaryText =
    hasNoSpecificSport
      ? "No specific sport"
      : secondarySport
        ? `${primarySport?.name ?? primarySlug} (1st), ${secondarySport.name} (2nd)`
        : primarySport?.name ?? primarySlug ?? "Choose sport";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card title="How Adaptive Mode works">
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Rank your long-term goals and set your weekly availability. TodayFit
            will generate a 7-day plan with smart intents and a concrete workout
            for each training day.
          </Text>
        </Card>

        {error ? (
          <Text style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <SectionHeader
          title="Choose your sport(s)"
          subtitle="Optional: pick up to 2 and rank them. This anchors how we interpret your goals."
          style={{ marginTop: 20 }}
        />

        {!sportSectionExpanded ? (
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSportSectionExpanded(true);
            }}
            style={[
              styles.sportRow,
              { borderColor: theme.border, backgroundColor: theme.primarySoft },
            ]}
          >
            <Text style={[styles.sportName, { color: theme.text }]}>
              {sportSummaryText}
            </Text>
            <Text style={[styles.sportDescription, { color: theme.primary }]}>
              Tap to change
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={selectNoSpecificSport}
              style={[
                styles.sportRow,
                {
                  borderColor: hasNoSpecificSport ? theme.primary : theme.border,
                  backgroundColor: hasNoSpecificSport ? theme.primarySoft : "transparent",
                },
              ]}
            >
              <Text style={[styles.sportName, { color: theme.text }]}>
                No specific sport
              </Text>
              <Text style={[styles.sportDescription, { color: theme.textMuted }]}>
                General fitness, no sport focus
              </Text>
            </Pressable>

            <View style={styles.searchRow}>
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

        <View style={{ marginTop: 12, marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  marginBottom: 4,
                  color: theme.textMuted,
                }}
              >
                Primary sport
              </Text>
              {primarySport ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <View
                    style={[
                      styles.sportRow,
                      { flex: 1, minWidth: 120, borderColor: theme.primary, backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Text style={[styles.sportName, { color: theme.text }]}>{primarySport.name}</Text>
                  </View>
                  <Pressable onPress={() => clearSportAtRank(0)} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 13, color: theme.danger }}>Clear</Text>
                  </Pressable>
                </View>
              ) : (
                categoriesToShow.map((cat) => {
                  const list = filteredSportsByCategory.get(cat) ?? [];
                  if (!list.length) return null;
                  return (
                    <View key={cat} style={{ marginBottom: 12 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          marginBottom: 4,
                          color: theme.textMuted,
                        }}
                      >
                        {cat}
                      </Text>
                      {list.map((sport) => {
                        const selected = sport.slug === primarySlug;
                        return (
                          <Pressable
                            key={sport.id}
                            onPress={() => selectSportForRank(0, sport.slug)}
                            style={[
                              styles.sportRow,
                              {
                                borderColor: selected ? theme.primary : theme.border,
                                backgroundColor: selected ? theme.primarySoft : "transparent",
                              },
                            ]}
                          >
                            <Text style={[styles.sportName, { color: theme.text }]}>{sport.name}</Text>
                            {sport.description ? (
                              <Text
                                style={[styles.sportDescription, { color: theme.textMuted }]}
                                numberOfLines={2}
                              >
                                {sport.description}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })
              )}
            </View>

            <View style={{ marginTop: 8, marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  marginBottom: 4,
                  color: theme.textMuted,
                }}
              >
                Second sport (optional)
              </Text>
              {secondarySport ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <View
                    style={[
                      styles.sportRow,
                      { flex: 1, minWidth: 120, borderColor: theme.primary, backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Text style={[styles.sportName, { color: theme.text }]}>{secondarySport.name}</Text>
                  </View>
                  <Pressable onPress={() => clearSportAtRank(1)} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 13, color: theme.danger }}>Clear</Text>
                  </Pressable>
                </View>
              ) : (
                categoriesToShow.map((cat) => {
                  const list = (filteredSportsByCategory.get(cat) ?? []).filter(
                    (s) => s.slug !== primarySlug
                  );
                  if (!list.length) return null;
                  return (
                    <View key={cat} style={{ marginBottom: 12 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          marginBottom: 4,
                          color: theme.textMuted,
                        }}
                      >
                        {cat}
                      </Text>
                      {list.map((sport) => {
                        const selected = sport.slug === secondarySlug;
                        return (
                          <Pressable
                            key={sport.id}
                            onPress={() => selectSportForRank(1, sport.slug)}
                            style={[
                              styles.sportRow,
                              {
                                borderColor: selected ? theme.primary : theme.border,
                                backgroundColor: selected ? theme.primarySoft : "transparent",
                              },
                            ]}
                          >
                            <Text style={[styles.sportName, { color: theme.text }]}>{sport.name}</Text>
                            {sport.description ? (
                              <Text
                                style={[styles.sportDescription, { color: theme.textMuted }]}
                                numberOfLines={2}
                              >
                                {sport.description}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <SectionHeader
          title="Rank your goals"
          subtitle="Most important at the top."
          style={{ marginTop: 20 }}
        />

        {[0, 1, 2].map((rankIndex) => (
          <View key={rankIndex} style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                marginBottom: 6,
                color: theme.textMuted,
              }}
            >
              Rank {rankIndex + 1}
            </Text>
            <View style={styles.chipGroup}>
              {ADAPTIVE_GOALS.map((goal) => (
                <Chip
                  key={`${goal.id}-${rankIndex}`}
                  label={goal.label}
                  selected={rankedGoals[rankIndex] === goal.id}
                  onPress={() => selectGoalForRank(rankIndex, goal.id)}
                />
              ))}
            </View>
          </View>
        ))}

        <SectionHeader
          title="Goal matching (advanced)"
          subtitle="What % of the workout should match each ranked goal. Sum = 100%."
          style={{ marginTop: 20 }}
        />
        <View style={[styles.chipGroup, { flexDirection: "column", gap: 12 }]}>
          {[1, 2, 3].map((rank) => {
            const hasGoal = rankedGoals[rank - 1] != null;
            const value =
              rank === 1
                ? (manualPreferences.goalMatchPrimaryPct ?? 50)
                : rank === 2
                  ? (manualPreferences.goalMatchSecondaryPct ?? 30)
                  : (manualPreferences.goalMatchTertiaryPct ?? 20);
            const setPct = (raw: number) => {
              const v = Math.max(0, Math.min(100, Math.round(raw)));
              const s2 =
                rank === 1
                  ? (manualPreferences.goalMatchSecondaryPct ?? 30)
                  : rank === 2
                    ? (manualPreferences.goalMatchPrimaryPct ?? 50)
                    : (manualPreferences.goalMatchPrimaryPct ?? 50);
              const s3 =
                rank === 1
                  ? (manualPreferences.goalMatchTertiaryPct ?? 20)
                  : rank === 2
                    ? (manualPreferences.goalMatchTertiaryPct ?? 20)
                    : (manualPreferences.goalMatchSecondaryPct ?? 30);
              const otherSum = s2 + s3;
              const scale = otherSum > 0 ? (100 - v) / otherSum : 0;
              const scaled2 = otherSum > 0 ? Math.round(s2 * scale) : 0;
              const scaled3 = otherSum > 0 ? Math.round(s3 * scale) : 0;
              if (rank === 1) {
                updateManualPreferences({
                  goalMatchPrimaryPct: v,
                  goalMatchSecondaryPct: scaled2,
                  goalMatchTertiaryPct: scaled3,
                });
              } else if (rank === 2) {
                updateManualPreferences({
                  goalMatchSecondaryPct: v,
                  goalMatchPrimaryPct: scaled2,
                  goalMatchTertiaryPct: scaled3,
                });
              } else {
                updateManualPreferences({
                  goalMatchTertiaryPct: v,
                  goalMatchPrimaryPct: scaled2,
                  goalMatchSecondaryPct: scaled3,
                });
              }
            };
            return (
              <View
                key={rank}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: hasGoal ? 1 : 0.5,
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
                    value={String(value)}
                    editable={hasGoal}
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

        <SectionHeader
          title="Time horizon"
          subtitle="How long we're steering for."
          style={{ marginTop: 12 }}
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
          title="Week setup"
          subtitle="How many gym days and typical duration."
          style={{ marginTop: 24 }}
        />
        <Text
          style={{
            fontSize: 13,
            marginBottom: 6,
            color: theme.textMuted,
          }}
        >
          Gym days per week
        </Text>
        <View style={styles.chipGroup}>
          {[2, 3, 4, 5].map((d) => (
            <Chip
              key={d}
              label={`${d} days`}
              selected={gymDaysPerWeek === d}
              onPress={() => setGymDaysPerWeek(d)}
            />
          ))}
        </View>

        <Text
          style={{
            fontSize: 13,
            marginTop: 16,
            marginBottom: 6,
            color: theme.textMuted,
          }}
        >
          Default session duration
        </Text>
        <View style={styles.chipGroup}>
          {DURATIONS.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} min`}
              selected={defaultDuration === minutes}
              onPress={() => setDefaultDuration(minutes)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={isSubmitting ? "Planning your week..." : "Generate Week Plan"}
            onPress={onPlanWeek}
            disabled={isSubmitting}
          />
        </View>
      </ScrollView>
    </View>
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
