import {
  getCurrentWeekStartMonday,
  getLocalDateString,
  getTodayLocalDateString,
  parseLocalDate,
} from "./dateUtils";
import type { GeneratedWorkout, ManualWeekPlan, SavedWeek } from "./types";
import type { PlanWeekResult, PlannedDay } from "../services/sportPrepPlanner";

function cloneWorkoutForRedo(workout: GeneratedWorkout): GeneratedWorkout {
  return {
    ...workout,
    id: `workout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

/** Shift saved week dates to the current calendar week and assign fresh workout ids. */
export function remapSavedWeekToCurrentWeek(saved: SavedWeek): ManualWeekPlan {
  const currentStart = getCurrentWeekStartMonday();
  const oldStart = parseLocalDate(saved.weekStartDate);
  const newStart = parseLocalDate(currentStart);
  const days = saved.days.map(({ date, workout, displayTitle }) => {
    const oldDate = parseLocalDate(date);
    const dayOffset = Math.round(
      (oldDate.getTime() - oldStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    const newDate = new Date(newStart);
    newDate.setDate(newDate.getDate() + dayOffset);
    return {
      date: getLocalDateString(newDate),
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
