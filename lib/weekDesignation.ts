import {
  addDaysToIsoDate,
  dayOffsetBetweenIsoDates,
  getDesignatedWeekStartMonday,
  getWeekStartMonday,
} from "./dateUtils";
import type { ManualWeekPlan } from "./types";
import type { PlanWeekResult } from "../services/sportPrepPlanner";

/** Normalize any ISO date to that week's Monday (Mon–Sun weeks). */
export function normalizeWeekStartMonday(isoDate: string): string {
  return getWeekStartMonday(isoDate);
}

/** Shift a Monday week start by whole weeks (negative = earlier). */
export function shiftWeekStartByWeeks(weekStartMonday: string, weeks: number): string {
  return addDaysToIsoDate(getWeekStartMonday(weekStartMonday), weeks * 7);
}

function shiftDateKeyedRecord<T>(
  record: Record<string, T> | undefined,
  deltaDays: number
): Record<string, T> | undefined {
  if (!record) return undefined;
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    const newKey = /^\d{4}-\d{2}-\d{2}$/.test(key) ? addDaysToIsoDate(key, deltaDays) : key;
    next[newKey] = value;
  }
  return next;
}

/** Remap a manual week onto a different Monday week start (preserves DOW offsets). */
export function remapManualWeekToStart(
  plan: ManualWeekPlan,
  newWeekStartDate: string
): ManualWeekPlan {
  const newStart = getWeekStartMonday(newWeekStartDate);
  const delta = dayOffsetBetweenIsoDates(plan.weekStartDate, newStart);
  if (delta === 0) return { ...plan, weekStartDate: newStart };
  return {
    weekStartDate: newStart,
    days: plan.days.map((day) => ({
      ...day,
      date: addDaysToIsoDate(day.date, delta),
    })),
  };
}

/** Remap a sport/adaptive week onto a different Monday week start. */
export function remapSportPrepWeekToStart(
  plan: PlanWeekResult,
  newWeekStartDate: string
): PlanWeekResult {
  const newStart = getWeekStartMonday(newWeekStartDate);
  const delta = dayOffsetBetweenIsoDates(plan.weekStartDate, newStart);
  if (delta === 0) {
    return {
      ...plan,
      weekStartDate: newStart,
      scheduleSnapshot: plan.scheduleSnapshot
        ? { ...plan.scheduleSnapshot, weekStartDate: newStart }
        : plan.scheduleSnapshot,
    };
  }

  const days = plan.days.map((day) => ({
    ...day,
    date: addDaysToIsoDate(day.date, delta),
  }));
  const todayShifted =
    plan.today != null ? { ...plan.today, date: addDaysToIsoDate(plan.today.date, delta) } : null;

  return {
    ...plan,
    weekStartDate: newStart,
    days,
    today: todayShifted,
    guestWorkouts: shiftDateKeyedRecord(plan.guestWorkouts, delta),
    scheduleSnapshot: plan.scheduleSnapshot
      ? { ...plan.scheduleSnapshot, weekStartDate: newStart }
      : plan.scheduleSnapshot,
  };
}

/** Remap date-keyed overrides (prefs, etc.) when the week start changes. */
export function remapDateKeyedRecord<T>(
  record: Record<string, T>,
  fromWeekStart: string,
  toWeekStart: string
): Record<string, T> {
  const delta = dayOffsetBetweenIsoDates(fromWeekStart, getWeekStartMonday(toWeekStart));
  if (delta === 0) return record;
  return shiftDateKeyedRecord(record, delta) ?? {};
}

/** Default week start when initiating or redoing into “this” training week. */
export function defaultInitiatedWeekStartMonday(): string {
  return getDesignatedWeekStartMonday();
}
