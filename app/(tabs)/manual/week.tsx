import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { PrimaryButton } from "../../../components/Button";
import { saveManualWeek } from "../../../lib/db/weekPlanRepository";
import { isDbConfigured } from "../../../lib/db";
import { generateWorkoutAsync } from "../../../lib/generator";
import {
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "../../../lib/preferencesConstants";
import { getPreferredExerciseNamesForSportAndGoals } from "../../../lib/db/starterExerciseRepository";
import type { ManualWeekPlan } from "../../../lib/types";

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
  return d.toISOString().slice(0, 10);
}

export default function ManualWeekScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    manualPreferences,
    activeGymProfileId,
    gymProfiles,
    manualWeekPlan,
    setManualWeekPlan,
    setGeneratedWorkout,
    setResumeProgress,
  } = useAppState();
  const { userId } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateWeek = useCallback(async () => {
    setError(null);
    setGenerating(true);
    const profile = gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
    const weekStart = startOfWeekMonday(new Date());
    const weekStartStr = dateToISO(weekStart);

    let preferredNames: string[] | undefined;
    if (isDbConfigured() && manualPreferences.primaryFocus.length > 0) {
      try {
        const goalSlugs = manualPreferences.primaryFocus
          .map((f) => PRIMARY_FOCUS_TO_GOAL_SLUG[f])
          .filter(Boolean);
        const goalWeightsPct = [
          manualPreferences.goalMatchPrimaryPct ?? 50,
          manualPreferences.goalMatchSecondaryPct ?? 30,
          manualPreferences.goalMatchTertiaryPct ?? 20,
        ];
        preferredNames = await getPreferredExerciseNamesForSportAndGoals(
          null,
          goalSlugs,
          goalWeightsPct.slice(0, goalSlugs.length)
        );
      } catch {
        preferredNames = undefined;
      }
    }

    try {
      const days: ManualWeekPlan["days"] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const workout = await generateWorkoutAsync(
          manualPreferences,
          profile,
          dateToISO(date),
          preferredNames
        );
        days.push({ date: dateToISO(date), workout });
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
  ]);

  useEffect(() => {
    if (manualWeekPlan?.days.length === 7) return;
    generateWeek();
  }, []);

  const onStartDay = (date: string, workout: ManualWeekPlan["days"][0]["workout"]) => {
    setGeneratedWorkout(workout);
    setResumeProgress(null);
    router.push("/manual/execute");
  };

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

  if (generating && !manualWeekPlan) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Generating this week's workouts…
        </Text>
      </View>
    );
  }

  if (error && !manualWeekPlan) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        <PrimaryButton label="Retry" onPress={generateWeek} />
      </View>
    );
  }

  const plan = manualWeekPlan;
  if (!plan || plan.days.length === 0) {
    return null;
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          Week of {new Date(plan.weekStartDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </Text>

        {plan.days.map(({ date, workout }, idx) => {
          const d = new Date(date + "T12:00:00");
          const dayName = dayNames[(d.getDay() + 6) % 7];
          const label = `${dayName} ${d.getDate()}`;
          const focus = workout.focus.join(" • ") || "General";
          const dur = workout.durationMinutes != null ? `${workout.durationMinutes} min` : "—";

          return (
            <View
              key={date}
              style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: theme.text }]}>{label}</Text>
                <Text style={[styles.dayFocus, { color: theme.textMuted }]} numberOfLines={1}>
                  {focus}
                </Text>
                <Text style={[styles.dayMeta, { color: theme.textMuted }]}>{dur}</Text>
              </View>
              <PrimaryButton
                label="Start"
                onPress={() => onStartDay(date, workout)}
                style={styles.startBtn}
              />
            </View>
          );
        })}

        <PrimaryButton
          label={saving ? "Saving…" : "Save week"}
          onPress={onSaveWeek}
          variant="secondary"
          style={styles.saveWeekBtn}
          disabled={saving}
        />
        {error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        ) : null}
      </ScrollView>
    </View>
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
  loadingText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  dayCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  dayHeader: {
    gap: 4,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  dayFocus: {
    fontSize: 14,
  },
  dayMeta: {
    fontSize: 13,
  },
  startBtn: {
    alignSelf: "flex-start",
  },
  saveWeekBtn: {
    marginTop: 24,
  },
});
