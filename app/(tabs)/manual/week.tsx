import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { PrimaryButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { AdjustFocusModal, type FocusSection } from "../../../components/AdjustFocusModal";
import { saveManualWeek } from "../../../lib/db/weekPlanRepository";
import { getLocalDateString, getTodayLocalDateString, parseLocalDate } from "../../../lib/dateUtils";
import { isDbConfigured } from "../../../lib/db";
import { generateWorkoutAsync } from "../../../lib/generator";
import { PRIMARY_FOCUS_TO_GOAL_SLUG, GOAL_SLUG_TO_PRIMARY_FOCUS } from "../../../lib/preferencesConstants";
import { getBodyEmphasisDistribution } from "../../../services/sportPrepPlanner/weeklyEmphasis";
import { formatDayTitle, isSpecificFocusRelevantForBody } from "../../../lib/dayTitle";
import { getPreferredExerciseNamesForSportAndGoals } from "../../../lib/db/starterExerciseRepository";
import type { ManualWeekPlan } from "../../../lib/types";
import { formatPrescription, normalizeGeneratedWorkout } from "../../../lib/types";

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
  } = useAppState();
  const { userId } = useAuth();

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustFocusModal, setShowAdjustFocusModal] = useState(false);
  /** Override preferences for the selected day when regenerating (goal, body, energy). */
  const [dailyPrefsOverride, setDailyPrefsOverride] = useState<DailyWorkoutPreferences | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  /** Which weekdays to generate workouts for. 0 = Mon, 6 = Sun. Default Mon, Wed, Fri. */
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<number[]>([0, 2, 4]);
  /** Selected session (date + workout) for detail view, matching adaptive mode. */
  const [selectedSession, setSelectedSession] = useState<{ date: string; workout: ManualWeekPlan["days"][0]["workout"]; displayTitle?: string } | null>(null);

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
      const dedicateDays = manualPreferences.goalDistributionStyle === "dedicate_days" && manualPreferences.primaryFocus.length > 0;
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
      for (let i = 0; i < selectedTrainingDays.length; i++) {
        const dow = selectedTrainingDays[i];
        const date = addDays(weekStart, dow);
        const bodyBias = bodyDistribution[i];
        const bodyKey = bodyBias.targetBody.toLowerCase() as "upper" | "lower" | "full";
        const specificForDay = specificEmphasis.filter((k) => isSpecificFocusRelevantForBody(k, bodyKey));
        const dayFocus = dedicateDays && manualPreferences.primaryFocus.length
          ? [manualPreferences.primaryFocus[goalIndices[i] ?? 0] ?? manualPreferences.primaryFocus[0]]
          : manualPreferences.primaryFocus;
        const dayPrefs: typeof manualPreferences = {
          ...manualPreferences,
          primaryFocus: dayFocus.length ? dayFocus : manualPreferences.primaryFocus,
          targetBody: bodyBias.targetBody,
          targetModifier: bodyBias.targetModifier,
        };
        const workout = await generateWorkoutAsync(
          dayPrefs,
          profile,
          dateToISO(date),
          preferredNames
        );
        const goalLabel = dayFocus[0] ?? "Workout";
        const displayTitle = formatDayTitle(goalLabel, bodyKey, specificForDay.length ? specificForDay : undefined);
        days.push({ date: dateToISO(date), workout, displayTitle });
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
    selectedTrainingDays,
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
      router.push("/manual/execute");
    },
    [setGeneratedWorkout, setResumeProgress, router]
  );

  const onSelectSession = useCallback(
    (date: string, workout: ManualWeekPlan["days"][0]["workout"], displayTitle?: string) => {
      setSelectedSession({ date, workout, displayTitle });
    },
    []
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
    }
    let preferredNames: string[] | undefined;
    if (isDbConfigured() && dayPrefs.primaryFocus.length > 0) {
      try {
        const goalSlugs = dayPrefs.primaryFocus.map((f) => PRIMARY_FOCUS_TO_GOAL_SLUG[f]).filter(Boolean);
        const goalWeightsPct = [dayPrefs.goalMatchPrimaryPct ?? 50, dayPrefs.goalMatchSecondaryPct ?? 30, dayPrefs.goalMatchTertiaryPct ?? 20];
        preferredNames = await getPreferredExerciseNamesForSportAndGoals(null, goalSlugs, goalWeightsPct.slice(0, goalSlugs.length));
      } catch {
        preferredNames = undefined;
      }
    }
    try {
      const workout = await generateWorkoutAsync(dayPrefs, profile, selectedSession.date, preferredNames);
      const bodyKey = (dayPrefs.targetBody ?? "Full").toLowerCase() as "upper" | "lower" | "full";
      const specificEmphasis = (dayPrefs.targetModifier ?? []).map((m) => m.toLowerCase()).filter(Boolean);
      const displayTitle = formatDayTitle(dayPrefs.primaryFocus[0] ?? "Workout", bodyKey, specificEmphasis.length ? specificEmphasis : undefined);
      const newDays = plan.days.map((d) =>
        d.date === selectedSession.date ? { ...d, workout, displayTitle } : d
      );
      setManualWeekPlan({ ...plan, days: newDays });
      setSelectedSession((prev) => (prev ? { ...prev, workout, displayTitle } : null));
      setDailyPrefsOverride(null);
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
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.centered]}
          showsVerticalScrollIndicator={false}
        >
          <Card title="Generate your week" subtitle="Choose which days you want workouts for. You can change this and regenerate anytime.">
            <Text style={{ fontSize: 13, marginBottom: 10, color: theme.textMuted }}>
              Training days
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
            label={generating ? "Generating…" : "Generate week"}
            onPress={generateWeek}
            disabled={generating || selectedTrainingDays.length === 0}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      </View>
    );
  }

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
  if (selectedDay?.workout.focus?.length) {
    summaryLines.push(selectedDay.displayTitle ?? selectedDay.workout.focus.join(" • "));
  }
  if (selectedDay?.workout.durationMinutes != null) {
    summaryLines.push(`${selectedDay.workout.durationMinutes} min`);
  }
  if (selectedDay?.workout.energyLevel) {
    const e = selectedDay.workout.energyLevel;
    summaryLines.push(`${e.charAt(0).toUpperCase()}${e.slice(1)} energy`);
  }

  const scrollContent = (
    <>
      <Card
        title="Your Week Plan"
        subtitle={`Week of ${parseLocalDate(plan.weekStartDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
      >
        <Text style={{ fontSize: 13, color: theme.textMuted }}>
          Tap a day to view its workout. Use arrows to move workouts between days.
        </Text>
        {manualPreferences.primaryFocus.length > 0 ? (
          <Pressable
            onPress={() => setShowAdjustFocusModal(true)}
            style={({ pressed }) => ({
              marginTop: 12,
              paddingVertical: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: theme.primary, fontWeight: "500" }}>
              Focus not quite right? Adjust focus areas and days
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {error ? (
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
      ) : null}

      <Card title="Training days" subtitle="Change which days get workouts, then tap Regenerate week." style={{ marginTop: 0 }}>
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
          label={generating ? "Regenerating…" : "Regenerate week"}
          variant="ghost"
          onPress={generateWeek}
          disabled={generating}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card
        title="Week overview"
        style={{ marginTop: 16 }}
        subtitle="Use ↑↓ arrows to move workouts to different days."
      >
        {weekOverviewContent}
      </Card>

      <Card
        title={
          selectedDay?.date === todayIso
            ? "Today's workout"
            : selectedDay
              ? `Workout for ${formatDayOfWeek(selectedDay.date)}`
              : "Workout"
        }
        subtitle={summaryLines.join(" • ")}
        style={{ marginTop: 16 }}
      >
        {selectedDay ? (
          <>
            {(() => {
              const displayWorkout = normalizeGeneratedWorkout(selectedDay.workout);
              return displayWorkout.blocks.map((block, blockIdx) => (
                <View key={`${block.block_type}-${blockIdx}`} style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {block.title ?? block.block_type}
                  </Text>
                  {block.reasoning ? (
                    <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>
                      {block.reasoning}
                    </Text>
                  ) : null}
                  {block.items.map((item) => (
                    <View key={item.exercise_id} style={styles.exerciseRow}>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>
                        {item.exercise_name}
                      </Text>
                      <Text
                        style={[styles.exercisePrescription, { color: theme.textMuted }]}
                      >
                        {formatPrescription(item)}
                      </Text>
                    </View>
                  ))}
                </View>
              ));
            })()}
            <View style={styles.footer}>
              <PrimaryButton
                label="Start"
                onPress={() => onStartDay(selectedDay.date, selectedDay.workout)}
              />
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 8 }]}>
                  Change focus for this day (optional)
                </Text>
                <Text style={[styles.sectionReasoning, { color: theme.textMuted, marginBottom: 8 }]}>
                  Then tap Regenerate to rebuild only this workout.
                </Text>
                <View style={[styles.chipGroup, { marginBottom: 8 }]}>
                  <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Goal: </Text>
                  {(["strength", "hypertrophy", "endurance", "mobility", "recovery", "power"] as const).map((g) => (
                    <Chip
                      key={g}
                      label={g.charAt(0).toUpperCase() + g.slice(1)}
                      selected={dailyPrefsOverride?.goalBias === g}
                      onPress={() =>
                        setDailyPrefsOverride((p) => ({ ...(p ?? {}), goalBias: p?.goalBias === g ? undefined : g }))
                      }
                    />
                  ))}
                </View>
                <View style={[styles.chipGroup, { marginBottom: 8 }]}>
                  <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Body: </Text>
                  {(["upper", "lower", "full", "pull", "push", "core"] as const).map((b) => (
                    <Chip
                      key={b}
                      label={b.charAt(0).toUpperCase() + b.slice(1)}
                      selected={dailyPrefsOverride?.bodyRegionBias === b}
                      onPress={() =>
                        setDailyPrefsOverride((p) => ({ ...(p ?? {}), bodyRegionBias: p?.bodyRegionBias === b ? undefined : b }))
                      }
                    />
                  ))}
                </View>
                <View style={[styles.chipGroup, { marginBottom: 8 }]}>
                  <Text style={[styles.sectionReasoning, { color: theme.textMuted }]}>Energy: </Text>
                  {(["low", "medium", "high"] as const).map((e) => (
                    <Chip
                      key={e}
                      label={e.charAt(0).toUpperCase() + e.slice(1)}
                      selected={dailyPrefsOverride?.energyLevel === e}
                      onPress={() =>
                        setDailyPrefsOverride((p) => ({ ...(p ?? {}), energyLevel: p?.energyLevel === e ? undefined : e }))
                      }
                    />
                  ))}
                </View>
                <PrimaryButton
                  label={isRegenerating ? "Regenerating…" : "Regenerate this day"}
                  variant="secondary"
                  onPress={onRegenerateDay}
                  disabled={isRegenerating}
                  style={{ marginTop: 8 }}
                />
              </View>
              <PrimaryButton
                label="Back to Preferences"
                variant="ghost"
                onPress={() => router.push("/manual/preferences")}
                style={{ marginTop: 8 }}
              />
            </View>
          </>
        ) : (
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Tap a workout above to view its details.
          </Text>
        )}
      </Card>

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
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {scrollContent}
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
  sectionBlock: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionReasoning: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
  },
  exerciseRow: {
    marginTop: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
  },
  exercisePrescription: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    marginTop: 16,
  },
  saveWeekBtn: {
    marginTop: 24,
  },
});
