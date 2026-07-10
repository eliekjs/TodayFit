import type { ManualWeekPlan, GeneratedWorkout, WeekDayStatus } from "./types";
import type { PlanWeekResult, PlannedDay } from "../services/sportPrepPlanner";
import { isSportDesignatedPlannedDay } from "../services/sportPrepPlanner/sportDesignatedDay";
import { getLocalDateString, getTodayLocalDateString, parseLocalDate } from "./dateUtils";
import { isSessionFlowScreen } from "./sessionDraft";
import type { SessionFlow } from "./sessionFlowTypes";

export type WeekProgressDay = {
  id: string;
  date: string;
  title: string;
  status: WeekDayStatus;
  hasGymWorkout: boolean;
  isSportDay: boolean;
  workout: GeneratedWorkout | null;
  /** Sport-mode planned day row when applicable. */
  plannedDay?: PlannedDay;
};

export type WeekProgressSnapshot = {
  flow: SessionFlow;
  weekStartDate: string;
  days: WeekProgressDay[];
  nextDay: WeekProgressDay | null;
  completedCount: number;
  totalCount: number;
  isWeekComplete: boolean;
  fullWeekRoute: string;
};

export const WEEK_PROGRESS_BANNER_HEIGHT = 56;
export const WEEK_PROGRESS_ROUTE = "/week/progress";

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export function weekDatesFromStart(weekStartDate: string): string[] {
  const start = parseLocalDate(weekStartDate);
  return Array.from({ length: 7 }, (_, i) => getLocalDateString(addDays(start, i)));
}

/** Format ISO date as day of week in user's locale (e.g. "Monday"). */
export function formatWeekDayLong(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString(undefined, { weekday: "long" });
}

export function formatWeekRangeLabel(weekStartDate: string): string {
  const start = parseLocalDate(weekStartDate);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

function resolveSportWorkout(plan: PlanWeekResult, day: PlannedDay): GeneratedWorkout | null {
  const guest = plan.guestWorkouts ?? {};
  if (guest[day.id]) return guest[day.id]!;
  if (guest[day.date]) return guest[day.date]!;
  if (plan.today?.id === day.id && plan.todayWorkout) return plan.todayWorkout;
  return null;
}

function sportDayHasSession(plan: PlanWeekResult, day: PlannedDay): boolean {
  if (resolveSportWorkout(plan, day)) return true;
  if (day.generatedWorkoutId != null) return true;
  if (isSportDesignatedPlannedDay(day)) return true;
  if (day.intentLabel?.trim()) return true;
  if (day.title?.trim()) return true;
  if (day.dayLevelFocus?.displayTitle?.trim()) return true;
  return false;
}

function sportDayTitle(day: PlannedDay, workout: GeneratedWorkout | null): string {
  if (day.dayLevelFocus?.displayTitle?.trim()) return day.dayLevelFocus.displayTitle.trim();
  if (day.title?.trim()) return day.title.trim();
  if (workout?.focus?.length) return workout.focus.join(" · ");
  if (day.intentLabel?.trim()) return day.intentLabel.trim();
  if (isSportDesignatedPlannedDay(day) && day.sportSlug) {
    return day.sportSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Training session";
}

export function buildManualWeekProgress(manualWeekPlan: ManualWeekPlan): WeekProgressSnapshot {
  const days: WeekProgressDay[] = manualWeekPlan.days.map((d) => ({
    id: d.workout.id,
    date: d.date,
    title: d.displayTitle ?? d.workout.focus?.join(" · ") ?? "Workout",
    status: d.status ?? "planned",
    hasGymWorkout: true,
    isSportDay: false,
    workout: d.workout,
  }));
  days.sort((a, b) => a.date.localeCompare(b.date));
  const nextDay = pickNextUpcomingDay(days);
  const completedCount = days.filter((d) => d.status === "completed").length;
  const totalCount = days.length;
  return {
    flow: "goal_week",
    weekStartDate: manualWeekPlan.weekStartDate,
    days,
    nextDay,
    completedCount,
    totalCount,
    isWeekComplete: totalCount > 0 && days.every((d) => d.status === "completed" || d.status === "skipped"),
    fullWeekRoute: "/manual/week",
  };
}

export function buildSportWeekProgress(sportPrepWeekPlan: PlanWeekResult): WeekProgressSnapshot {
  const sessionDays = sportPrepWeekPlan.days.filter((d) => sportDayHasSession(sportPrepWeekPlan, d));
  const days: WeekProgressDay[] = sessionDays.map((d) => {
    const workout = resolveSportWorkout(sportPrepWeekPlan, d);
    return {
      id: d.id,
      date: d.date,
      title: sportDayTitle(d, workout),
      status: d.status,
      hasGymWorkout: workout != null && !isSportDesignatedPlannedDay(d),
      isSportDay: isSportDesignatedPlannedDay(d),
      workout,
      plannedDay: d,
    };
  });
  days.sort((a, b) => a.date.localeCompare(b.date));
  const nextDay = pickNextUpcomingDay(days);
  const completedCount = days.filter((d) => d.status === "completed").length;
  const totalCount = days.length;
  return {
    flow: "sport_week",
    weekStartDate: sportPrepWeekPlan.weekStartDate,
    days,
    nextDay,
    completedCount,
    totalCount,
    isWeekComplete: totalCount > 0 && days.every((d) => d.status === "completed" || d.status === "skipped"),
    fullWeekRoute: "/sport-mode/recommendation",
  };
}

export function buildWeekProgressSnapshot(input: {
  manualWeekPlan: ManualWeekPlan | null;
  sportPrepWeekPlan: PlanWeekResult | null;
}): WeekProgressSnapshot | null {
  if (input.manualWeekPlan?.days.length) {
    return buildManualWeekProgress(input.manualWeekPlan);
  }
  if (input.sportPrepWeekPlan?.days.length) {
    return buildSportWeekProgress(input.sportPrepWeekPlan);
  }
  return null;
}

/** Next training day that is still planned — prefer today or later, else earliest remaining. */
export function pickNextUpcomingDay(days: WeekProgressDay[]): WeekProgressDay | null {
  const planned = days.filter((d) => d.status === "planned");
  if (!planned.length) return null;
  const todayIso = getTodayLocalDateString();
  const todayOrLater = planned.find((d) => d.date >= todayIso);
  return todayOrLater ?? planned[0] ?? null;
}

export function shouldShowWeekProgressBanner(
  pathname: string,
  snapshot: WeekProgressSnapshot | null
): boolean {
  if (!snapshot || snapshot.days.length === 0) return false;
  if (snapshot.isWeekComplete) return false;
  if (isSessionFlowScreen(pathname)) return false;
  if (pathname.includes("/week/progress")) return false;
  return true;
}

export function markManualWeekDayByWorkoutId(
  plan: ManualWeekPlan,
  workoutId: string,
  status: WeekDayStatus
): ManualWeekPlan {
  return {
    ...plan,
    days: plan.days.map((d) =>
      d.workout.id === workoutId ? { ...d, status } : d
    ),
  };
}

export function markSportWeekDayByWorkoutId(
  plan: PlanWeekResult,
  workoutId: string,
  status: WeekDayStatus
): PlanWeekResult {
  const updatedDays = plan.days.map((d) => {
    const guest = plan.guestWorkouts ?? {};
    const workout =
      guest[d.id] ?? guest[d.date] ?? (plan.today?.id === d.id ? plan.todayWorkout : null);
    const matches =
      d.generatedWorkoutId === workoutId ||
      workout?.id === workoutId ||
      d.id === workoutId;
    return matches ? { ...d, status } : d;
  });
  const today =
    plan.today && updatedDays.find((d) => d.id === plan.today!.id)
      ? updatedDays.find((d) => d.id === plan.today!.id)!
      : plan.today;
  return { ...plan, days: updatedDays, today };
}

export function markSportWeekDayByPlannedDayId(
  plan: PlanWeekResult,
  plannedDayId: string,
  status: WeekDayStatus
): PlanWeekResult {
  const updatedDays = plan.days.map((d) => (d.id === plannedDayId ? { ...d, status } : d));
  const today =
    plan.today?.id === plannedDayId
      ? updatedDays.find((d) => d.id === plannedDayId) ?? plan.today
      : plan.today;
  return { ...plan, days: updatedDays, today };
}
