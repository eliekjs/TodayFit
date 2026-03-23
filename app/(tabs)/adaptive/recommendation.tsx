import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../components/Button";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { getLocalDateString, getTodayLocalDateString, parseLocalDate } from "../../../lib/dateUtils";
import { DayFocusOverrideChips } from "../../../components/DayFocusOverrideChips";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import type { GeneratedWorkout, DailyWorkoutPreferences } from "../../../lib/types";
import { normalizeGeneratedWorkout } from "../../../lib/types";
import { regenerateDay, updateDayStatus, planWeek, deriveDailyPreferencesFromDay } from "../../../services/sportPrepPlanner";
import { Chip } from "../../../components/Chip";
import type { PlannedDay } from "../../../services/sportPrepPlanner";
import { AdjustFocusModal, type FocusSection } from "../../../components/AdjustFocusModal";
import { GOAL_SLUG_TO_LABEL } from "../../../lib/preferencesConstants";
import { getWorkout } from "../../../lib/db/workoutRepository";
import { saveManualDay } from "../../../lib/db/weekPlanRepository";
import { isDbConfigured } from "../../../lib/db";

function humanizeSportSlug(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format ISO date as day of week in user's locale (e.g. "Monday"). */
function formatDayOfWeek(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString(undefined, {
    weekday: "long",
  });
}

const isWeb = Platform.OS === "web";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NestableScrollContainer } from "react-native-draggable-flatlist";

export default function AdaptiveWeekPlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const {
    sportPrepWeekPlan,
    setSportPrepWeekPlan,
    manualPreferences,
    updateManualPreferences,
    activeGymProfileId,
    gymProfiles,
  } = useAppState();

  const [selectedSession, setSelectedSession] = useState<PlannedDay | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<GeneratedWorkout | null>(null);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustFocusModal, setShowAdjustFocusModal] = useState(false);
  /** Override preferences for the selected day when regenerating (goal, body, energy). */
  const [dailyPrefsOverride, setDailyPrefsOverride] = useState<DailyWorkoutPreferences | null>(null);

  const todayIso = getTodayLocalDateString();

  const focusSectionsForModal = useMemo((): FocusSection[] => {
    const plan = sportPrepWeekPlan;
    if (!plan) return [];
    const sections: FocusSection[] = [];
    const goalSlugs = plan.goalSlugs ?? [];
    if (goalSlugs.length > 0) {
      const p1 = manualPreferences.goalMatchPrimaryPct ?? 50;
      const p2 = manualPreferences.goalMatchSecondaryPct ?? 30;
      const p3 = manualPreferences.goalMatchTertiaryPct ?? 20;
      const percentages = [p1, p2, p3].slice(0, goalSlugs.length);
      const sum = percentages.reduce((a, b) => a + b, 0);
      if (sum !== 100 && percentages.length > 0) {
        percentages[0] = Math.max(0, (percentages[0] ?? 0) + (100 - sum));
      }
      sections.push({
        title: "Goals",
        items: goalSlugs.map((slug) => ({
          id: slug,
          label: GOAL_SLUG_TO_LABEL[slug] ?? humanizeSportSlug(slug),
        })),
        percentages,
      });
    }
    const snapshot = plan.scheduleSnapshot;
    const rankedSports = snapshot?.rankedSportSlugs ?? (plan.sportSlug ? [plan.sportSlug] : []);
    if (rankedSports.length === 2 && snapshot?.sportFocusPct) {
      sections.push({
        title: "Sports",
        items: rankedSports.map((slug) => ({
          id: slug,
          label: humanizeSportSlug(slug),
        })),
        percentages: [...snapshot.sportFocusPct],
      });
    }
    return sections;
  }, [sportPrepWeekPlan, manualPreferences.goalMatchPrimaryPct, manualPreferences.goalMatchSecondaryPct, manualPreferences.goalMatchTertiaryPct]);

  const handleAdjustFocusApply = useCallback(
    async (sections: FocusSection[]) => {
      const plan = sportPrepWeekPlan;
      if (!plan) return;
      setError(null);
      setShowAdjustFocusModal(false);
      const goalsSection = sections.find((s) => s.title === "Goals");
      const sportsSection = sections.find((s) => s.title === "Sports");
      const p1 = goalsSection?.percentages[0] ?? 50;
      const p2 = goalsSection?.percentages[1] ?? 30;
      const p3 = goalsSection?.percentages[2] ?? 20;
      if (goalsSection?.items?.length) {
        updateManualPreferences({
          goalMatchPrimaryPct: p1,
          goalMatchSecondaryPct: p2,
          goalMatchTertiaryPct: p3,
        });
      }
      const goalWeightsPct = [p1, p2, p3];
      const snapshot = plan.scheduleSnapshot;
      if (snapshot) {
        const sportFocusPct =
          sportsSection?.items?.length === 2
            ? [sportsSection.percentages[0] ?? 60, sportsSection.percentages[1] ?? 40]
            : undefined;
        const activeProfile =
          gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];
        setIsReplanning(true);
        try {
          const newPlan = await planWeek({
            userId: userId ?? undefined,
            weekStartDate: snapshot.weekStartDate,
            primaryGoalSlug: snapshot.primaryGoalSlug,
            secondaryGoalSlug: snapshot.secondaryGoalSlug ?? null,
            tertiaryGoalSlug: snapshot.tertiaryGoalSlug ?? null,
            sportSlug: snapshot.sportSlug ?? null,
            sportQualitySlugs: snapshot.sportQualitySlugs,
            sportSubFocusSlugs: snapshot.sportSubFocusSlugs,
            gymDaysPerWeek: snapshot.gymDaysPerWeek,
            sportDaysAllocation: snapshot.sportDaysAllocation,
            rankedSportSlugs: snapshot.rankedSportSlugs,
            sportFocusPct: (() => {
          if (sportFocusPct && sportFocusPct.length === 2) {
            return [sportFocusPct[0], sportFocusPct[1]] as [number, number];
          }
          if (snapshot.sportFocusPct?.length === 2) {
            return [snapshot.sportFocusPct[0], snapshot.sportFocusPct[1]] as [number, number];
          }
          return undefined;
        })(),
            preferredTrainingDays: snapshot.preferredTrainingDays,
            defaultSessionDuration: snapshot.defaultSessionDuration,
            energyBaseline: snapshot.energyBaseline,
            recentLoad: snapshot.recentLoad,
            injuries: snapshot.injuries,
            gymProfile: activeProfile,
            goalMatchPrimaryPct: p1,
            goalMatchSecondaryPct: p2,
            goalMatchTertiaryPct: p3,
            emphasis: snapshot.emphasis ?? undefined,
            workoutTier: snapshot.workoutTier ?? manualPreferences.workoutTier ?? "intermediate",
            includeCreativeVariations:
              (snapshot.includeCreativeVariations ?? manualPreferences.includeCreativeVariations) === true,
          });
          setSportPrepWeekPlan(newPlan);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setIsReplanning(false);
        }
      } else {
        setIsReplanning(true);
        try {
          const trainingDays = plan.days.filter(
            (d) => d.generatedWorkoutId || plan.guestWorkouts?.[d.date]
          );
          let nextPlan = { ...plan };
          const updatedGuestWorkouts = { ...(plan.guestWorkouts ?? {}) };
          for (const day of trainingDays) {
            const result = await regenerateDay({
              userId: userId ?? undefined,
              weeklyPlanInstanceId: plan.weeklyPlanInstanceId,
              date: day.date,
              sportSlug: plan.sportSlug ?? undefined,
              goalSlugs: plan.goalSlugs,
              sportSubFocusSlugs: plan.sportSubFocusSlugs,
              rankedSportSlugs: plan.rankedSportSlugs,
              sportFocusPct: plan.sportFocusPct,
              sportVsGoalPct: plan.sportVsGoalPct,
              sportSubFocusSlugsBySport: plan.sportSubFocusSlugsBySport,
              intentLabel: day.intentLabel,
              goalWeightsPct,
              workoutTier: plan.scheduleSnapshot?.workoutTier ?? manualPreferences.workoutTier ?? "intermediate",
              includeCreativeVariations:
                (plan.scheduleSnapshot?.includeCreativeVariations ??
                  manualPreferences.includeCreativeVariations) === true,
            });
            if (result.workout) {
              updatedGuestWorkouts[result.day.id] = result.workout;
              updatedGuestWorkouts[result.day.date] = result.workout;
            }
            nextPlan = {
              ...nextPlan,
              days: nextPlan.days.map((d) =>
                d.id === result.day.id ? result.day : d
              ),
              guestWorkouts: updatedGuestWorkouts,
              today:
                nextPlan.today?.id === result.day.id
                  ? result.day
                  : nextPlan.today,
              todayWorkout:
                nextPlan.today?.id === result.day.id
                  ? result.workout
                  : nextPlan.todayWorkout,
            };
          }
          setSportPrepWeekPlan(nextPlan);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setIsReplanning(false);
        }
      }
    },
    [
      sportPrepWeekPlan,
      updateManualPreferences,
      manualPreferences,
      gymProfiles,
      activeGymProfileId,
      userId,
      setSportPrepWeekPlan,
    ]
  );

  /** Week dates Mon–Sun in order (local timezone). */
  const weekDates = useMemo(() => {
    if (!sportPrepWeekPlan) return [];
    const start = parseLocalDate(sportPrepWeekPlan.weekStartDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return getLocalDateString(d);
    });
  }, [sportPrepWeekPlan]);

  /** Group sessions by date (7 day slots, Mon–Sun). Each slot can have one or more sessions. */
  const daySlots = useMemo(() => {
    if (!sportPrepWeekPlan) return [];
    const byDate = new Map<string, PlannedDay[]>();
    for (const date of weekDates) {
      byDate.set(date, []);
    }
    for (const day of sportPrepWeekPlan.days) {
      if (byDate.has(day.date)) {
        byDate.get(day.date)!.push(day);
      } else {
        byDate.set(day.date, [day]);
      }
    }
    return weekDates.map((date) => ({
      date,
      sessions: byDate.get(date) ?? [],
    }));
  }, [sportPrepWeekPlan, weekDates]);

  /** Workouts keyed by session id (and by date for initial API response). */
  const guestWorkoutsById = useMemo(() => {
    const plan = sportPrepWeekPlan;
    if (!plan?.guestWorkouts) return {} as Record<string, GeneratedWorkout>;
    const out = { ...plan.guestWorkouts };
    for (const d of plan.days) {
      if (out[d.id] == null && plan.guestWorkouts![d.date] != null) {
        out[d.id] = plan.guestWorkouts![d.date]!;
      }
    }
    return out;
  }, [sportPrepWeekPlan]);

  useEffect(() => {
    if (!sportPrepWeekPlan) return;
    if (!selectedSession) {
      const plan = sportPrepWeekPlan;
      const first = plan.days[0];
      setSelectedSession(first ?? null);
    }
  }, [sportPrepWeekPlan, selectedSession]);

  useEffect(() => {
    const loadWorkout = async () => {
      if (!sportPrepWeekPlan || !selectedSession) {
        setSelectedWorkout(null);
        return;
      }

      const gw = guestWorkoutsById[selectedSession.id] ?? sportPrepWeekPlan.guestWorkouts?.[selectedSession.date];
      if (gw) {
        setSelectedWorkout(gw);
        return;
      }
      if (
        sportPrepWeekPlan.today?.id === selectedSession.id &&
        sportPrepWeekPlan.todayWorkout
      ) {
        setSelectedWorkout(sportPrepWeekPlan.todayWorkout);
        return;
      }
      if (!userId || !selectedSession.generatedWorkoutId) {
        setSelectedWorkout(null);
        return;
      }

      setIsLoadingWorkout(true);
      try {
        const workout = await getWorkout(userId, selectedSession.generatedWorkoutId);
        setSelectedWorkout(workout);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    loadWorkout();
  }, [sportPrepWeekPlan, selectedSession, userId, guestWorkoutsById]);

  if (!sportPrepWeekPlan) {
    return (
      <AppScreenWrapper>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No week plan yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Set your training priorities first, then we’ll build a 7-day plan.
          </Text>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Set Training Priorities"
              onPress={() => {
              router.replace("/adaptive");
            }}
            />
          </View>
        </View>
      </AppScreenWrapper>
    );
  }

  const selectedDay = selectedSession ?? sportPrepWeekPlan.days[0];

  const onSelectSession = (session: PlannedDay) => {
    setSelectedSession(session);
  };

  const onRegenerate = async () => {
    if (!sportPrepWeekPlan || !selectedDay) return;
    setError(null);
    setIsRegenerating(true);
    try {
      // When user changed only one thing (e.g. energy), merge with existing day goals/intent so the rest stay the same.
      const existingPrefs = deriveDailyPreferencesFromDay(selectedDay);
      const mergedPrefs =
        dailyPrefsOverride && Object.keys(dailyPrefsOverride).length > 0
          ? { ...existingPrefs, ...dailyPrefsOverride }
          : undefined;

      const result = await regenerateDay({
        userId: userId ?? undefined,
        weeklyPlanInstanceId: sportPrepWeekPlan.weeklyPlanInstanceId,
        date: selectedDay.date,
        sportSlug: sportPrepWeekPlan.sportSlug ?? undefined,
        goalSlugs: sportPrepWeekPlan.goalSlugs,
        sportSubFocusSlugs: sportPrepWeekPlan.sportSubFocusSlugs,
        rankedSportSlugs: sportPrepWeekPlan.rankedSportSlugs,
        sportFocusPct: sportPrepWeekPlan.sportFocusPct,
        sportVsGoalPct: sportPrepWeekPlan.sportVsGoalPct,
        sportSubFocusSlugsBySport: sportPrepWeekPlan.sportSubFocusSlugsBySport,
        intentLabel: selectedDay.intentLabel,
        goalWeightsPct: [
          manualPreferences.goalMatchPrimaryPct ?? 50,
          manualPreferences.goalMatchSecondaryPct ?? 30,
          manualPreferences.goalMatchTertiaryPct ?? 20,
        ],
        dailyPreferences: mergedPrefs,
        workoutTier:
          sportPrepWeekPlan.scheduleSnapshot?.workoutTier ??
          manualPreferences.workoutTier ??
          "intermediate",
        includeCreativeVariations:
          (sportPrepWeekPlan.scheduleSnapshot?.includeCreativeVariations ??
            manualPreferences.includeCreativeVariations) === true,
      });

      const updatedDays = sportPrepWeekPlan.days.map((d) =>
        d.id === result.day.id ? result.day : d
      );
      const updatedGuestWorkouts =
        sportPrepWeekPlan.guestWorkouts && result.workout
          ? { ...sportPrepWeekPlan.guestWorkouts, [result.day.id]: result.workout, [result.day.date]: result.workout }
          : sportPrepWeekPlan.guestWorkouts;
      const updatedPlan = {
        ...sportPrepWeekPlan,
        days: updatedDays,
        today:
          sportPrepWeekPlan.today?.id === result.day.id
            ? result.day
            : sportPrepWeekPlan.today,
        todayWorkout:
          sportPrepWeekPlan.today?.id === result.day.id
            ? result.workout
            : sportPrepWeekPlan.todayWorkout,
        ...(updatedGuestWorkouts && { guestWorkouts: updatedGuestWorkouts }),
      };
      setSportPrepWeekPlan(updatedPlan);
      setSelectedWorkout(result.workout);
      setDailyPrefsOverride(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRegenerating(false);
    }
  };

  const onUpdateDayStatus = async (status: "planned" | "completed" | "skipped") => {
    if (!sportPrepWeekPlan || !selectedDay) return;
    setError(null);
    const updatedDay: typeof selectedDay = { ...selectedDay, status };
    const updatedDays = sportPrepWeekPlan.days.map((d) =>
      d.id === updatedDay.id ? updatedDay : d
    );
    const nextPlan = {
      ...sportPrepWeekPlan,
      days: updatedDays,
      today:
        sportPrepWeekPlan.today?.id === updatedDay.id
          ? updatedDay
          : sportPrepWeekPlan.today,
    };
    if (userId) {
      setIsUpdatingStatus(true);
      try {
        const persisted = await updateDayStatus({
          userId,
          weeklyPlanInstanceId: sportPrepWeekPlan.weeklyPlanInstanceId,
          date: selectedDay.date,
          status,
        });
        setSportPrepWeekPlan({
          ...nextPlan,
          days: nextPlan.days.map((d) => (d.id === persisted.id ? persisted : d)),
          today: nextPlan.today?.id === persisted.id ? persisted : nextPlan.today,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsUpdatingStatus(false);
      }
    } else {
      setSportPrepWeekPlan(nextPlan);
    }
  };

  const onSaveDay = async () => {
    if (!selectedDay || !selectedWorkout || !userId || !isDbConfigured()) {
      if (!userId || !isDbConfigured()) {
        setError("Sign in and enable sync to save days.");
      }
      return;
    }
    setError(null);
    setSavingDay(true);
    try {
      await saveManualDay(userId, selectedDay.date, selectedWorkout);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDay(false);
    }
  };

  /** Move session to previous day (up). */
  const moveSessionUp = useCallback(
    (day: PlannedDay) => {
      if (!sportPrepWeekPlan) return;
      const idx = weekDates.indexOf(day.date);
      if (idx <= 0) return;
      const newDate = weekDates[idx - 1];
      const updatedDays = sportPrepWeekPlan.days.map((d) =>
        d.id === day.id ? { ...d, date: newDate } : d
      );
      const guestWorkouts = sportPrepWeekPlan.guestWorkouts ?? {};
      const workout = guestWorkouts[day.id] ?? guestWorkouts[day.date];
      const updatedGuestWorkouts = { ...guestWorkouts };
      if (workout) {
        updatedGuestWorkouts[newDate] = workout;
        updatedGuestWorkouts[day.id] = workout;
        delete updatedGuestWorkouts[day.date];
      }
      setSportPrepWeekPlan({
        ...sportPrepWeekPlan,
        days: updatedDays,
        today: sportPrepWeekPlan.today?.id === day.id ? { ...day, date: newDate } : sportPrepWeekPlan.today,
        guestWorkouts: Object.keys(updatedGuestWorkouts).length ? updatedGuestWorkouts : undefined,
      });
    },
    [sportPrepWeekPlan, setSportPrepWeekPlan, weekDates]
  );

  /** Move session to next day (down). */
  const moveSessionDown = useCallback(
    (day: PlannedDay) => {
      if (!sportPrepWeekPlan) return;
      const idx = weekDates.indexOf(day.date);
      if (idx < 0 || idx >= weekDates.length - 1) return;
      const newDate = weekDates[idx + 1];
      const updatedDays = sportPrepWeekPlan.days.map((d) =>
        d.id === day.id ? { ...d, date: newDate } : d
      );
      const guestWorkouts = sportPrepWeekPlan.guestWorkouts ?? {};
      const workout = guestWorkouts[day.id] ?? guestWorkouts[day.date];
      const updatedGuestWorkouts = { ...guestWorkouts };
      if (workout) {
        updatedGuestWorkouts[newDate] = workout;
        updatedGuestWorkouts[day.id] = workout;
        delete updatedGuestWorkouts[day.date];
      }
      setSportPrepWeekPlan({
        ...sportPrepWeekPlan,
        days: updatedDays,
        today: sportPrepWeekPlan.today?.id === day.id ? { ...day, date: newDate } : sportPrepWeekPlan.today,
        guestWorkouts: Object.keys(updatedGuestWorkouts).length ? updatedGuestWorkouts : undefined,
      });
    },
    [sportPrepWeekPlan, setSportPrepWeekPlan, weekDates]
  );

  const summaryLines: string[] = [];
  if (selectedWorkout?.focus?.length) {
    summaryLines.push(selectedWorkout.focus.join(" • "));
  }
  if (selectedWorkout?.durationMinutes != null) {
    summaryLines.push(`${selectedWorkout.durationMinutes} min`);
  }
  if (selectedWorkout?.energyLevel) {
    const e = selectedWorkout.energyLevel;
    summaryLines.push(`${e.charAt(0).toUpperCase()}${e.slice(1)} energy`);
  }

  /** Only show days that have at least one session with an actual workout (not rest days). One-day plan = 1 such slot. */
  const daySlotsWithSessions = useMemo(() => {
    if (!sportPrepWeekPlan) return [];
    const guestWorkouts = sportPrepWeekPlan.guestWorkouts ?? {};
    return daySlots.filter((slot) =>
      slot.sessions.some(
        (s) =>
          s.generatedWorkoutId != null ||
          guestWorkouts[s.date] != null ||
          (sportPrepWeekPlan.today?.id === s.id && sportPrepWeekPlan.todayWorkout != null)
      )
    );
  }, [daySlots, sportPrepWeekPlan]);

  /** Treat plans with a single training session as "one-day" for display. */
  const isSingleSessionPlan = daySlotsWithSessions.length === 1;

  const weekOverviewContent = (
    <View>
      {daySlotsWithSessions.map((slot) => {
        const dayIdx = weekDates.indexOf(slot.date);
        const canMoveUp = dayIdx > 0;
        const canMoveDown = dayIdx >= 0 && dayIdx < weekDates.length - 1;
        return (
          <View key={slot.date}>
            <View style={[styles.dayHeaderRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dayHeaderText, { color: theme.text }]}>
                {new Date(slot.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}
              </Text>
              {slot.date === todayIso && (
                <Text style={[styles.todayBadge, { color: theme.primary, borderColor: theme.primary, marginLeft: 8 }]}>
                  Today
                </Text>
              )}
            </View>
            {slot.sessions.map((session) => {
              const day = session;
              const isSelected = selectedDay?.id === day.id;
              const rawLabel = day.dayLevelFocus?.displayTitle ?? day.title ?? day.intentLabel ?? "Rest / low-load day";
              const label = rawLabel.replace(/\s*\(sport-specific\)\s*/gi, "").trim() || rawLabel;
              const statusBadge = day.status === "completed" ? "Completed" : day.status === "skipped" ? "Skipped" : null;
              return (
                <View key={day.id} style={[styles.sessionRow, { marginLeft: 12 }]}>
                  <View style={styles.moveButtons}>
                    <Pressable
                      onPress={() => canMoveUp && moveSessionUp(day)}
                      disabled={!canMoveUp}
                      style={({ pressed }) => ({
                        padding: 8,
                        opacity: canMoveUp ? (pressed ? 0.7 : 1) : 0.3,
                      })}
                    >
                      <Ionicons name="chevron-up" size={20} color={theme.textMuted} />
                    </Pressable>
                    <Pressable
                      onPress={() => canMoveDown && moveSessionDown(day)}
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
                    onPress={() => onSelectSession(day)}
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
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.dayLabel, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                        {label}
                      </Text>
                      {statusBadge ? (
                        <Text
                          style={[
                            styles.todayBadge,
                            {
                              color: day.status === "completed" ? theme.primary : theme.textMuted,
                              borderColor: day.status === "completed" ? theme.primary : theme.border,
                            },
                          ]}
                        >
                          {statusBadge}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );

  const mainContent = (
    <>
      <Card
        title={isSingleSessionPlan ? "Your session" : "Your Week Plan"}
        subtitle={
          isSingleSessionPlan && selectedDay
            ? `${formatDayOfWeek(selectedDay.date)} • ${selectedDay.date}`
            : `Week starting ${sportPrepWeekPlan.weekStartDate}`
        }
      >
        <Text style={{ fontSize: 13, color: theme.textMuted }}>
          {isSingleSessionPlan
            ? "We'll focus on just this one session today. You can still tweak or regenerate it below."
            : "Tap a session to view it. Use the arrows to move sessions between days. You can regenerate an individual day without changing the rest of the plan."}
        </Text>
        {userId && sportPrepWeekPlan.weeklyPlanInstanceId ? (
          <Text style={[styles.savedWeekBadge, { color: theme.textMuted }]}>
            Week saved — find it in Library
          </Text>
        ) : !userId ? (
          <Text style={[styles.savedWeekBadge, { color: theme.textMuted }]}>
            Sign in to save this week to History.
          </Text>
        ) : null}
      </Card>

      {error ? (
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
      ) : null}

      {!isSingleSessionPlan && (
        <Card
          title="Week overview"
          style={{ marginTop: 16 }}
          subtitle="Use ↑↓ arrows to move sessions to different days. Tap a session to view or regenerate it."
        >
          {weekOverviewContent}
        </Card>
      )}

      <Card
        title={
          selectedDay?.date === todayIso
            ? "Today's session"
            : selectedDay
              ? `Session for ${formatDayOfWeek(selectedDay.date)}`
              : "Session"
        }
        subtitle={summaryLines.join(" • ")}
        style={{ marginTop: 16 }}
      >
        {isLoadingWorkout && (
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Loading session…
          </Text>
        )}
        {!isLoadingWorkout && !selectedWorkout && (
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            No session generated for this day (rest / low-load day).
          </Text>
        )}
        {!isLoadingWorkout && selectedWorkout && (
          <WorkoutBlockList
            workout={normalizeGeneratedWorkout(selectedWorkout)}
          />
        )}

        <View style={styles.footer}>
          {selectedDay.status === "planned" ? (
            <>
              <PrimaryButton
                label={isUpdatingStatus ? "Updating…" : "Mark completed"}
                variant="secondary"
                onPress={() => onUpdateDayStatus("completed")}
                disabled={isUpdatingStatus}
              />
              <PrimaryButton
                label="Skip"
                variant="ghost"
                onPress={() => onUpdateDayStatus("skipped")}
                disabled={isUpdatingStatus}
                style={{ marginTop: 8 }}
              />
            </>
          ) : (
            <PrimaryButton
              label={isUpdatingStatus ? "Updating…" : "Mark as planned"}
              variant="ghost"
              onPress={() => onUpdateDayStatus("planned")}
              disabled={isUpdatingStatus}
            />
          )}
          <DayFocusOverrideChips
            dailyPrefsOverride={dailyPrefsOverride}
            onOverrideChange={(update) =>
              setDailyPrefsOverride((p) => ({ ...(p ?? {}), ...update }))
            }
            onRegenerate={onRegenerate}
            isRegenerating={isRegenerating}
            showAdjustFocusLink={focusSectionsForModal.length > 0}
            onAdjustFocusPress={() => setShowAdjustFocusModal(true)}
            showChips={!!(selectedDay.generatedWorkoutId || guestWorkoutsById[selectedDay.id])}
          />
          {userId && isDbConfigured() && selectedWorkout ? (
            <PrimaryButton
              label={savingDay ? "Saving…" : "Save this day"}
              variant="secondary"
              onPress={onSaveDay}
              disabled={savingDay}
              style={{ marginTop: 8 }}
            />
          ) : null}
          <PrimaryButton
            label="Back to Setup"
            variant="ghost"
            onPress={() => {
              router.replace("/adaptive");
            }}
            style={{ marginTop: 8 }}
          />
        </View>
      </Card>

      <AdjustFocusModal
        visible={showAdjustFocusModal}
        onClose={() => setShowAdjustFocusModal(false)}
        sections={focusSectionsForModal}
        onApply={handleAdjustFocusApply}
        title="Adjust focus areas and days"
      />
    </>
  );

  if (isWeb) {
    return (
      <AppScreenWrapper>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {mainContent}
        </ScrollView>
      </AppScreenWrapper>
    );
  }

  return (
    <AppScreenWrapper>
      <StatusBar style="light" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NestableScrollContainer contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {mainContent}
        </NestableScrollContainer>
      </GestureHandlerRootView>
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
    paddingBottom: 32,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    marginTop: 4,
  },
  savedWeekBadge: {
    fontSize: 13,
    marginTop: 12,
    fontStyle: "italic",
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
  dayRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayWeekday: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    marginTop: 16,
  },
});
