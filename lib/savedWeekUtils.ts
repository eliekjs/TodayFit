import {
  addDaysToIsoDate,
  dayOffsetBetweenIsoDates,
  getTodayLocalDateString,
} from "./dateUtils";
import { defaultInitiatedWeekStartMonday } from "./weekDesignation";
import type { GeneratedWorkout, ManualWeekPlan, SavedWeek } from "./types";
import type { PlanWeekResult, PlannedDay } from "../services/sportPrepPlanner";

export function cloneWorkoutForRedo(workout: GeneratedWorkout): GeneratedWorkout {
  return {
    ...workout,
    id: `workout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

/** Shift saved week dates to the designated initiation week and assign fresh workout ids. */
export function remapSavedWeekToCurrentWeek(saved: SavedWeek): ManualWeekPlan {
  const currentStart = defaultInitiatedWeekStartMonday();
  const days = saved.days.map(({ date, workout, displayTitle }) => {
    const dayOffset = dayOffsetBetweenIsoDates(saved.weekStartDate, date);
    return {
      date: addDaysToIsoDate(currentStart, dayOffset),
      workout: cloneWorkoutForRedo(workout),
      displayTitle,
    };
  });
  return { weekStartDate: currentStart, days };
}

export function savedWeekToManualWeekPlan(saved: SavedWeek): ManualWeekPlan {
  return remapSavedWeekToCurrentWeek(saved);
}

export function savedWeekToSportPrepWeekPlan(saved: SavedWeek): PlanWeekResult {
  const remapped = remapSavedWeekToCurrentWeek(saved);
  const todayIso = getTodayLocalDateString();
  const guestWorkouts: Record<string, GeneratedWorkout> = {};
  const days: PlannedDay[] = remapped.days.map((day, index) => {
    guestWorkouts[day.date] = day.workout;
    return {
      id: `saved_day_${saved.id}_${index}`,
      date: day.date,
      title: day.displayTitle ?? null,
      intentLabel: day.displayTitle ?? day.workout.focus?.join(" • ") ?? null,
      status: "planned",
      generatedWorkoutId: day.workout.id,
    };
  });
  const todayDay = days.find((d) => d.date === todayIso) ?? days[0] ?? null;
  const todayWorkout = todayDay ? guestWorkouts[todayDay.date] ?? null : null;
  return {
    weeklyPlanInstanceId: saved.id,
    weekStartDate: remapped.weekStartDate,
    days,
    today: todayDay,
    todayWorkout,
    guestWorkouts,
  };
}
