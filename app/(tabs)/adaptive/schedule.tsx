import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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
import type { BodyEmphasisKey } from "../../../lib/types";
import { DURATIONS } from "../../../lib/preferencesConstants";
import { listSportsForPrep } from "../../../lib/db/sportRepository";
import type { Sport } from "../../../lib/db/types";
import { SPORTS_WITH_SUB_FOCUSES } from "../../../data/sportSubFocus";

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
    setAdaptiveSetup,
    setSportPrepWeekPlan,
    activeGymProfileId,
    gymProfiles,
    manualPreferences,
  } = useAppState();
  const { userId } = useAuth();

  const [gymTrainingDays, setGymTrainingDays] = useState<number[]>([0, 2, 4]);
  const [sportDaysBySlug, setSportDaysBySlug] = useState<Record<string, number[]>>({});
  const [defaultDuration, setDefaultDuration] = useState<number>(45);
  const [weeklyEmphasis, setWeeklyEmphasis] = useState<BodyEmphasisKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    if (!adaptiveSetup) return;
    const slugs = adaptiveSetup.rankedSportSlugs.filter((s): s is string => s != null);
    setSportDaysBySlug((prev) => {
      const next = { ...prev };
      slugs.forEach((slug) => {
        if (next[slug] == null) next[slug] = [0, 2];
      });
      return next;
    });
  }, [adaptiveSetup?.rankedSportSlugs.join(",")]);

  useEffect(() => {
    const load = async () => {
      if (!isDbConfigured()) return;
      try {
        const all = await listSportsForPrep();
        setSports(all);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!adaptiveSetup) {
      router.replace("/adaptive");
    }
  }, [adaptiveSetup, router]);

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

  const onGenerate = useCallback(async () => {
    if (!adaptiveSetup) return;
    setError(null);
    if (!isDbConfigured()) {
      setError("Configure Supabase (env vars) to use Adaptive Mode.");
      return;
    }
    if (gymTrainingDays.length === 0) {
      setError("Select at least one gym day.");
      return;
    }

    const primary = adaptiveSetup.rankedGoals[0] ?? "strength";
    const secondary = adaptiveSetup.rankedGoals[1] ?? null;
    const tertiary = adaptiveSetup.rankedGoals[2] ?? null;

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
    const energyBaseline = energyFromHorizon(
      energyFromFatigue(adaptiveSetup.fatigue),
      adaptiveSetup.horizon
    );

    const activeProfile =
      gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const selectedSportSlugs = adaptiveSetup.rankedSportSlugs.filter((s): s is string => s != null);

    const sportDaysAllocation: Record<string, number> = {};
    selectedSportSlugs.forEach((slug) => {
      const days = sportDaysBySlug[slug] ?? [];
      sportDaysAllocation[slug] = days.length;
    });

    // Union of gym days and all sport-designated days (our dow: 0=Mon..6=Sun)
    const allTrainingDows = new Set<number>(gymTrainingDays);
    selectedSportSlugs.forEach((slug) => {
      (sportDaysBySlug[slug] ?? []).forEach((d) => allTrainingDows.add(d));
    });
    const preferredTrainingDays = toPreferredTrainingDays(
      Array.from(allTrainingDows).sort((a, b) => a - b)
    );

    setIsSubmitting(true);
    try {
      const plan = await planWeek({
        userId: userId ?? undefined,
        primaryGoalSlug: primary,
        secondaryGoalSlug: secondary,
        tertiaryGoalSlug: tertiary,
        sportSlug: adaptiveSetup.rankedSportSlugs[0] ?? null,
        sportSubFocusSlugs:
          adaptiveSetup.rankedSportSlugs[0] &&
          SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === adaptiveSetup.rankedSportSlugs[0])
            ? (adaptiveSetup.subFocusBySport[adaptiveSetup.rankedSportSlugs[0]] ?? []).slice(0, 3)
            : undefined,
        sportQualitySlugs:
          adaptiveSetup.rankedSportSlugs[0] &&
          !SPORTS_WITH_SUB_FOCUSES.some((s) => s.slug === adaptiveSetup.rankedSportSlugs[0])
            ? (adaptiveSetup.subFocusBySport[adaptiveSetup.rankedSportSlugs[0]] ?? []).slice(0, 3)
            : undefined,
        gymDaysPerWeek: gymTrainingDays.length,
        preferredTrainingDays,
        sportDaysAllocation:
          Object.keys(sportDaysAllocation).length > 0 ? sportDaysAllocation : undefined,
        rankedSportSlugs: selectedSportSlugs.length > 0 ? selectedSportSlugs : undefined,
        sportFocusPct: selectedSportSlugs.length === 2 ? adaptiveSetup.sportFocusPct : undefined,
        sportVsGoalPct: adaptiveSetup.sportVsGoalPct ?? 50,
        sportSubFocusSlugsBySport: Object.keys(adaptiveSetup.subFocusBySport).length > 0 ? adaptiveSetup.subFocusBySport : undefined,
        defaultSessionDuration: defaultDuration,
        energyBaseline,
        recentLoad: adaptiveSetup.recentLoad,
        injuries:
          adaptiveSetup.injuryStatus === "No Concerns"
            ? []
            : adaptiveSetup.injuryTypes.map((label) =>
                label.toLowerCase().replace(/\s/g, "_")
              ),
        sportSessions: [],
        gymProfile: activeProfile,
        goalMatchPrimaryPct: manualPreferences.goalMatchPrimaryPct ?? 50,
        goalMatchSecondaryPct: manualPreferences.goalMatchSecondaryPct ?? 30,
        goalMatchTertiaryPct: manualPreferences.goalMatchTertiaryPct ?? 20,
        emphasis: weeklyEmphasis ?? undefined,
      });
      setSportPrepWeekPlan(plan);
      setAdaptiveSetup(null);
      router.replace("/adaptive/recommendation");
    } catch (e) {
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
    setAdaptiveSetup,
    activeGymProfileId,
    gymProfiles,
    manualPreferences,
    userId,
    router,
  ]);

  const selectedSportSlugs = adaptiveSetup
    ? adaptiveSetup.rankedSportSlugs.filter((s): s is string => s != null)
    : [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card
          title="Set your weekly schedule"
          subtitle="Choose which days you want gym and sport sessions. Same pattern as the manual week planner."
        />

        {error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        ) : null}

        <SectionHeader
          title="Gym days"
          subtitle="Which days do you want gym workouts?"
          style={{ marginTop: 20 }}
        />
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

        {selectedSportSlugs.length > 0 && (
          <>
            <SectionHeader
              title="Sport days"
              subtitle="Which days for each sport? You can overlap with gym days."
              style={{ marginTop: 24 }}
            />
            {selectedSportSlugs.map((slug) => {
              const sport = sports.find((s) => s.slug === slug);
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
          </>
        )}

        <SectionHeader
          title="Which area should we emphasize this week?"
          subtitle="Workouts will still train the whole body, but we'll prioritize this area more."
          style={{ marginTop: 24 }}
        />
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

        <SectionHeader
          title="Session duration"
          subtitle="Default length for each session."
          style={{ marginTop: 24 }}
        />
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
            label={isSubmitting ? "Planning your week…" : "Generate Week Plan"}
            onPress={onGenerate}
            disabled={isSubmitting || gymTrainingDays.length === 0}
          />
          <PrimaryButton
            label="Back to priorities"
            variant="ghost"
            onPress={() => router.back()}
            style={{ marginTop: 12 }}
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
  footer: {
    marginTop: 28,
  },
});
