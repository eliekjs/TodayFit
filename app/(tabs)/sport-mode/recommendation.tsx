import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme";
import { Card } from "../../../components/Card";
import { AppScreenWrapper } from "../../../components/AppScreenWrapper";
import { PrimaryButton } from "../../../components/Button";
import { GenerationLoadingScreen } from "../../../components/GenerationLoadingScreen";
import { useAppState } from "../../../context/AppStateContext";
import { useAuth } from "../../../context/AuthContext";
import { getLocalDateString, getTodayLocalDateString, parseLocalDate } from "../../../lib/dateUtils";
import { DayFocusOverrideChips } from "../../../components/DayFocusOverrideChips";
import { WorkoutBlockList } from "../../../components/WorkoutBlockList";
import type { GeneratedWorkout, DailyWorkoutPreferences } from "../../../lib/types";
import { normalizeGeneratedWorkout } from "../../../lib/types";
import {
  regenerateDay,
  updateDayStatus,
  updatePlanDayDate,
  planWeek,
  deriveDailyPreferencesFromDay,
} from "../../../services/sportPrepPlanner";
import { Chip } from "../../../components/Chip";
import type { PlannedDay, PlanWeekResult } from "../../../services/sportPrepPlanner";
import { AdjustFocusModal, type FocusSection } from "../../../components/AdjustFocusModal";
import { GOAL_SLUG_TO_LABEL, goalSubFocusPayloadForAdaptiveGoals } from "../../../lib/preferencesConstants";
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

/**
 * Prefer the day that actually has a generated workout. Defaulting to days[0] breaks one-day plans
 * where the session lands on e.g. Wednesday while Mon–Tue are rest rows — user would see an empty session.
 */
function pickDefaultPlannedDay(plan: PlanWeekResult): PlannedDay | null {
  if (!plan.days.length) return null;
  const gw = plan.guestWorkouts ?? {};
  const hasWorkoutForDay = (d: PlannedDay) =>
    d.generatedWorkoutId != null ||
    gw[d.date] != null ||
    gw[d.id] != null ||
    (plan.today?.id === d.id && plan.todayWorkout != null);

  const todayIso = getTodayLocalDateString();
  const todayRow = plan.days.find((d) => d.date === todayIso);
  if (todayRow && hasWorkoutForDay(todayRow)) return todayRow;

  const withWorkout = plan.days.find(hasWorkoutForDay);
  if (withWorkout) return withWorkout;

  return plan.days[0] ?? null;
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
    setGeneratedWorkout,
    setResumeProgress,
    setManualSessionProgress,
    setManualExecutionStarted,
  } = useAppState();

  const [selectedSession, setSelectedSession] = useState<PlannedDay | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<GeneratedWorkout | null>(null);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isMovingSession, setIsMovingSession] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustFocusModal, setShowAdjustFocusModal] = useState(false);
  /** Override preferences for the selected day when regenerating (goal, body, intensity). */
  const [dailyPrefsOverride, setDailyPrefsOverride] = useState<DailyWorkoutPreferences | null>(null);

  const todayIso = getTodayLocalDateString();

  const activeProfile =
    gymProfiles.find((p) => p.id === activeGymProfileId) ?? gymProfiles[0];

  /** Match `planWeek` / `buildWorkoutForSlot` inputs so regenerate uses the same generator context. */
  const regenerateGeneratorContext = useMemo(() => {
    const plan = sportPrepWeekPlan;
    const snap = plan?.scheduleSnapshot;
    const snapshotGoalIds = snap
      ? [snap.primaryGoalSlug, snap.secondaryGoalSlug, snap.tertiaryGoalSlug].filter(
          (g): g is string => Boolean(g)
        )
      : (plan?.goalSlugs ?? []).filter((g): g is string => Boolean(g));
    return {
      gymProfile: snap?.gymProfile ?? activeProfile,
      injuries: snap?.injuries,
      subFocusByGoal: goalSubFocusPayloadForAdaptiveGoals(
        snapshotGoalIds,
        manualPreferences.subFocusByGoal
      ),
    };
  }, [sportPrepWeekPlan, activeProfile, manualPreferences.subFocusByGoal]);

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
          const snapshotGoalIds = [
            snapshot.primaryGoalSlug,
            snapshot.secondaryGoalSlug,
            snapshot.tertiaryGoalSlug,
          ].filter((g): g is string => g != null && g !== "");
          const newPlan = await planWeek({
            userId: userId ?? undefined,
            weekStartDate: snapshot.weekStartDate,
            primaryGoalSlug: snapshot.primaryGoalSlug,
            secondaryGoalSlug: snapshot.secondaryGoalSlug ?? null,
            tertiaryGoalSlug: snapshot.tertiaryGoalSlug ?? null,
            goalSubFocusByGoal: goalSubFocusPayloadForAdaptiveGoals(
              snapshotGoalIds,
              manualPreferences.subFocusByGoal
            ),
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
            injuries: snapshot.injuries,
            gymProfile: activeProfile,
            goalMatchPrimaryPct: p1,
            goalMatchSecondaryPct: p2,
            goalMatchTertiaryPct: p3,
            emphasis: snapshot.emphasis ?? undefined,
            workoutTier: snapshot.workoutTier ?? manualPreferences.workoutTier ?? "intermediate",
            includeCreativeVariations:
              (snapshot.includeCreativeVariations ?? manualPreferences.includeCreativeVariations) === true,
            adaptiveScheduleLabels: snapshot.adaptiveScheduleLabels,
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
          const snap = plan.scheduleSnapshot;
          const snapshotGoalIds = snap
            ? [snap.primaryGoalSlug, snap.secondaryGoalSlug, snap.tertiaryGoalSlug].filter(
                (g): g is string => Boolean(g)
              )
            : (plan.goalSlugs ?? []).filter((g): g is string => Boolean(g));
          const loopProfile = snap?.gymProfile ?? activeProfile;
          const subFocusByGoal = goalSubFocusPayloadForAdaptiveGoals(
            snapshotGoalIds,
            manualPreferences.subFocusByGoal
          );
          for (const day of trainingDays) {
            const result = await regenerateDay({
              userId: userId ?? undefined,
              weeklyPlanInstanceId: plan.weeklyPlanInstanceId,
              date: day.date,
              gymProfile: loopProfile,
              sportSlug: plan.sportSlug ?? undefined,
              goalSlugs: plan.goalSlugs,
              sportSubFocusSlugs: plan.sportSubFocusSlugs,
              rankedSportSlugs: plan.rankedSportSlugs,
              sportFocusPct: plan.sportFocusPct,
              sportVsGoalPct: plan.sportVsGoalPct,
              sportSubFocusSlugsBySport: plan.sportSubFocusSlugsBySport,
              intentLabel: day.intentLabel,
              goalWeightsPct,
              injuries: snap?.injuries,
              subFocusByGoal,
              workoutTier: snap?.workoutTier ?? manualPreferences.workoutTier ?? "intermediate",
              includeCreativeVariations:
                (snap?.includeCreativeVariations ??
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
      activeProfile,
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
    const validIds = new Set(sportPrepWeekPlan.days.map((d) => d.id));
    if (selectedSession != null && !validIds.has(selectedSession.id)) {
      setSelectedSession(pickDefaultPlannedDay(sportPrepWeekPlan));
      return;
    }
    if (selectedSession == null) {
      setSelectedSession(pickDefaultPlannedDay(sportPrepWeekPlan));
    }
  }, [sportPrepWeekPlan, selectedSession]);

  useEffect(() => {
    const loadWorkout = async () => {
      if (!sportPrepWeekPlan || !selectedSession) {
        setSelectedWorkout(null);
        return;
      }

      // Always use the row from the current plan so `generatedWorkoutId` updates after regenerate
      // (stale `selectedSession` would fetch the wrong id or get null and clear the UI).
      const session =
        sportPrepWeekPlan.days.find((d) => d.id === selectedSession.id) ?? selectedSession;

      const gw =
        guestWorkoutsById[session.id] ??
        sportPrepWeekPlan.guestWorkouts?.[session.date];
      if (gw) {
        setSelectedWorkout(gw);
        return;
      }
      if (
        sportPrepWeekPlan.today?.id === session.id &&
        sportPrepWeekPlan.todayWorkout
      ) {
        setSelectedWorkout(sportPrepWeekPlan.todayWorkout);
        return;
      }
      if (!userId || !session.generatedWorkoutId) {
        setSelectedWorkout(null);
        return;
      }

      setIsLoadingWorkout(true);
      try {
        const workout = await getWorkout(userId, session.generatedWorkoutId);
        setSelectedWorkout(workout);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    loadWorkout();
  }, [sportPrepWeekPlan, selectedSession, userId, guestWorkoutsById]);

  /** Days to list in Week overview: any planned training session (gym or sport), not empty rest rows.
   * Include (1) workouts keyed by date or id in guest mode, (2) persisted workout ids, (3) sport/gym days
   * with intent/title when a workout is not loaded yet — so sport days still appear.
   * Must run before any conditional return — same hook order when plan is null vs loaded. */
  const daySlotsWithSessions = useMemo(() => {
    if (!sportPrepWeekPlan) return [];
    const guestWorkouts = sportPrepWeekPlan.guestWorkouts ?? {};
    const hasWorkoutForSession = (s: PlannedDay) =>
      s.generatedWorkoutId != null ||
      guestWorkouts[s.date] != null ||
      guestWorkouts[s.id] != null ||
      (sportPrepWeekPlan.today?.id === s.id && sportPrepWeekPlan.todayWorkout != null);
    const hasPlannedSessionLabel = (s: PlannedDay) =>
      (s.intentLabel != null && s.intentLabel.trim() !== "") ||
      (s.title != null && s.title.trim() !== "") ||
      (s.dayLevelFocus?.displayTitle != null && s.dayLevelFocus.displayTitle.trim() !== "");
    return daySlots.filter((slot) =>
      slot.sessions.some((s) => hasWorkoutForSession(s) || hasPlannedSessionLabel(s))
    );
  }, [daySlots, sportPrepWeekPlan]);

  const moveSessionByOffset = useCallback(
    async (day: PlannedDay, offset: -1 | 1) => {
      if (!sportPrepWeekPlan) return;
      const idx = weekDates.indexOf(day.date);
      if (idx < 0) return;
      const targetIdx = idx + offset;
      if (targetIdx < 0 || targetIdx >= weekDates.length) return;

      const newDate = weekDates[targetIdx];
      const previousPlan = sportPrepWeekPlan;
      const updatedDays = previousPlan.days.map((d) =>
        d.id === day.id ? { ...d, date: newDate } : d
      );
      const guestWorkouts = previousPlan.guestWorkouts ?? {};
      const workout = guestWorkouts[day.id] ?? guestWorkouts[day.date];
      const updatedGuestWorkouts = { ...guestWorkouts };
      if (workout) {
        updatedGuestWorkouts[newDate] = workout;
        updatedGuestWorkouts[day.id] = workout;
        delete updatedGuestWorkouts[day.date];
      }

      const optimisticPlan = {
        ...previousPlan,
        days: updatedDays,
        today: previousPlan.today?.id === day.id ? { ...day, date: newDate } : previousPlan.today,
        guestWorkouts: Object.keys(updatedGuestWorkouts).length ? updatedGuestWorkouts : undefined,
      };
      setSportPrepWeekPlan(optimisticPlan);

      if (!userId || !isDbConfigured()) {
        return;
      }

      setIsMovingSession(true);
      try {
        const persisted = await updatePlanDayDate({
          userId,
          weeklyPlanInstanceId: previousPlan.weeklyPlanInstanceId,
          dayId: day.id,
          date: day.date,
          newDate,
        });
        setSportPrepWeekPlan((current) => {
          if (!current || current.weeklyPlanInstanceId !== previousPlan.weeklyPlanInstanceId) {
            return current;
          }
          return {
            ...current,
            days: current.days.map((d) => (d.id === persisted.id ? { ...d, date: persisted.date } : d)),
            today:
              current.today?.id === persisted.id
                ? { ...current.today, date: persisted.date }
                : current.today,
          };
        });
      } catch (e) {
        setSportPrepWeekPlan(previousPlan);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsMovingSession(false);
      }
    },
    [sportPrepWeekPlan, setSportPrepWeekPlan, userId, weekDates]
  );

  /** Move session to previous day (up). */
  const moveSessionUp = useCallback(
    (day: PlannedDay) => {
      void moveSessionByOffset(day, -1);
    },
    [moveSessionByOffset]
  );

  /** Move session to next day (down). */
  const moveSessionDown = useCallback(
    (day: PlannedDay) => {
      void moveSessionByOffset(day, 1);
    },
    [moveSessionByOffset]
  );

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
              router.replace("/sport-mode");
            }}
            />
          </View>
        </View>
      </AppScreenWrapper>
    );
  }

  if (isReplanning) {
    return <GenerationLoadingScreen message="Regenerating your week..." />;
  }

  if (isRegenerating) {
    return <GenerationLoadingScreen message="Regenerating your workout..." />;
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
      // When user changed only one thing (e.g. intensity), merge with existing day goals/intent so the rest stay the same.
      const existingPrefs = deriveDailyPreferencesFromDay(selectedDay);
      const mergedPrefs =
        dailyPrefsOverride && Object.keys(dailyPrefsOverride).length > 0
          ? { ...existingPrefs, ...dailyPrefsOverride }
          : undefined;

      const result = await regenerateDay({
        userId: userId ?? undefined,
        weeklyPlanInstanceId: sportPrepWeekPlan.weeklyPlanInstanceId,
        date: selectedDay.date,
        gymProfile: regenerateGeneratorContext.gymProfile,
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
        injuries: regenerateGeneratorContext.injuries,
        subFocusByGoal: regenerateGeneratorContext.subFocusByGoal,
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
        result.workout != null
          ? {
              ...(sportPrepWeekPlan.guestWorkouts ?? {}),
              [result.day.id]: result.workout,
              [result.day.date]: result.workout,
            }
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
        ...(updatedGuestWorkouts != null ? { guestWorkouts: updatedGuestWorkouts } : {}),
      };
      setSportPrepWeekPlan(updatedPlan);
      setSelectedSession(result.day);
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
                      disabled={!canMoveUp || isMovingSession}
                      style={({ pressed }) => ({
                        padding: 8,
                        opacity: canMoveUp && !isMovingSession ? (pressed ? 0.7 : 1) : 0.3,
                      })}
                    >
                      <Ionicons name="chevron-up" size={20} color={theme.textMuted} />
                    </Pressable>
                    <Pressable
                      onPress={() => canMoveDown && moveSessionDown(day)}
                      disabled={!canMoveDown || isMovingSession}
                      style={({ pressed }) => ({
                        padding: 8,
                        opacity: canMoveDown && !isMovingSession ? (pressed ? 0.7 : 1) : 0.3,
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
            ? "Tweak or regenerate below."
            : "Tap a session to view it. Use arrows to move days."}
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
        <Card title="Week overview" style={{ marginTop: 16 }}>
          {weekOverviewContent}
        </Card>
      )}

      {isLoadingWorkout && (
        <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 16 }}>
          Loading session…
        </Text>
      )}
      {!isLoadingWorkout && !selectedWorkout && (
        <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 16 }}>
          {daySlotsWithSessions.length > 1
            ? "No session for this day — tap another day in the week overview above."
            : "No session generated for this day (rest / low-load day). Try Regenerate workout or Back to Setup."}
        </Text>
      )}
      {!isLoadingWorkout && selectedWorkout && (
        <View style={{ marginTop: 16, gap: 16 }}>
          {selectedWorkout.notes != null && String(selectedWorkout.notes).trim() !== "" ? (
            <Card title="Coach notes" style={styles.summaryCard}>
              <Text style={[styles.notes, { color: theme.textMuted }]}>{selectedWorkout.notes}</Text>
            </Card>
          ) : null}
          {selectedWorkout.durationMinutes != null ? (
            <Text style={[styles.sessionMeta, { color: theme.textMuted }]}>
              {selectedWorkout.durationMinutes} min
            </Text>
          ) : null}

          <WorkoutBlockList workout={normalizeGeneratedWorkout(selectedWorkout)} />

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
              helperText={isSingleSessionPlan ? "Then tap Regenerate." : undefined}
              regenerateLabel={isSingleSessionPlan ? "Regenerate workout" : "Regenerate this day"}
              showChips={!!(
                selectedDay.generatedWorkoutId ||
                guestWorkoutsById[selectedDay.id] ||
                guestWorkoutsById[selectedDay.date]
              )}
              baseWorkoutTier={
                sportPrepWeekPlan.scheduleSnapshot?.workoutTier ??
                manualPreferences.workoutTier ??
                "intermediate"
              }
              baseIncludeCreativeVariations={
                (sportPrepWeekPlan.scheduleSnapshot?.includeCreativeVariations ??
                  manualPreferences.includeCreativeVariations) === true
              }
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
            {selectedWorkout && selectedDay?.status === "planned" ? (
              <PrimaryButton
                label={
                  selectedDay.date === todayIso
                    ? "Start today's workout"
                    : "Start this session"
                }
                onPress={() => {
                  setGeneratedWorkout(normalizeGeneratedWorkout(selectedWorkout));
                  setResumeProgress(null);
                  setManualSessionProgress(null);
                  setManualExecutionStarted(true);
                  router.push("/manual/execute");
                }}
                style={{ marginTop: 8 }}
              />
            ) : null}
            <PrimaryButton
              label="Back to Setup"
              variant="ghost"
              onPress={() => {
                router.replace("/sport-mode");
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      )}

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
    marginBottom: 24,
  },
  summaryCard: {
    marginBottom: 8,
  },
  sessionMeta: {
    fontSize: 13,
  },
  notes: {
    fontSize: 13,
  },
});
