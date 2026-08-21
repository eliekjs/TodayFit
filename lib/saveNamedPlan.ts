import { parseLocalDate } from "./dateUtils";
import type { GeneratedWorkout, ManualWeekPlan, SavedWeek } from "./types";
import type { PlanWeekResult } from "../services/sportPrepPlanner";

export type SavedPlanKind = "day" | "week";

/** In-session guard so the same day/week cannot be saved again from another screen. */
const savedFingerprintsThisSession = new Set<string>();

export function rememberSavedPlanFingerprint(fingerprint: string): void {
  savedFingerprintsThisSession.add(fingerprint);
}

export function wasPlanSavedThisSession(fingerprint: string): boolean {
  return savedFingerprintsThisSession.has(fingerprint);
}

export function savedDayFingerprint(date: string, workoutId: string): string {
  return `day:${date}:${workoutId}`;
}

export function savedWeekFingerprint(
  weekStartDate: string,
  days: { date: string; workout: { id: string } }[]
): string {
  const dayKeys = days.map((day) => `${day.date}:${day.workout.id}`).join(",");
  return `week:${weekStartDate}:${dayKeys}`;
}

function savedWeekDayDatesKey(
  weekStartDate: string,
  days: { date: string }[]
): string {
  return `${weekStartDate}:${[...days.map((day) => day.date)].sort().join(",")}`;
}

/** True when this library week is already the plan on the Workout tab. */
export function isSavedWeekTheActivePlan(
  saved: Pick<SavedWeek, "weekStartDate" | "days" | "source">,
  active: {
    manualWeekPlan: Pick<ManualWeekPlan, "weekStartDate" | "days"> | null;
    sportPrepWeekPlan: PlanWeekResult | null;
  }
): boolean {
  const savedKey = savedWeekDayDatesKey(saved.weekStartDate, saved.days);
  if (saved.source === "manual") {
    const plan = active.manualWeekPlan;
    if (!plan?.days.length) return false;
    return savedKey === savedWeekDayDatesKey(plan.weekStartDate, plan.days);
  }
  const plan = active.sportPrepWeekPlan;
  if (!plan) return false;
  const days = savedPlanDaysFromSportPrep(plan);
  if (days.length === 0) return false;
  return savedKey === savedWeekDayDatesKey(plan.weekStartDate, days);
}

export function isSavedDayPlan(plan: Pick<SavedWeek, "singleDay">): boolean {
  return plan.singleDay === true;
}

export function defaultSavedDayName(
  date: string,
  workout: GeneratedWorkout,
  displayTitle?: string
): string {
  const title = displayTitle?.trim();
  if (title) return title;
  if (workout.focus.length > 0) return workout.focus.join(" · ");
  return parseLocalDate(date).toLocaleDateString(undefined, { weekday: "long" });
}

export function defaultSavedWeekName(weekStartDate: string): string {
  const weekStart = parseLocalDate(weekStartDate);
  return `Week of ${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function savedPlanLibraryTitle(plan: SavedWeek): string {
  const named = plan.name?.trim();
  if (named) return named;
  if (isSavedDayPlan(plan)) {
    const day = plan.days[0];
    if (!day) return "Saved day";
    return defaultSavedDayName(day.date, day.workout, day.displayTitle);
  }
  return defaultSavedWeekName(plan.weekStartDate);
}

/** User-facing flow label for library cards (matches Goal / Sport product language). */
export function savedPlanSourceLabel(source: SavedWeek["source"]): "Goal" | "Sport" {
  return source === "manual" ? "Goal" : "Sport";
}

export function resolveSportPrepWorkout(
  plan: PlanWeekResult,
  date: string,
  dayId?: string
): GeneratedWorkout | null {
  const guest = plan.guestWorkouts ?? {};
  if (dayId && guest[dayId]) return guest[dayId]!;
  if (guest[date]) return guest[date]!;
  if (plan.today && (plan.today.id === dayId || plan.today.date === date) && plan.todayWorkout) {
    return plan.todayWorkout;
  }
  return null;
}

export function savedPlanDaysFromSportPrep(plan: PlanWeekResult): ManualWeekPlan["days"] {
  return plan.days
    .map((day) => {
      const workout = resolveSportPrepWorkout(plan, day.date, day.id);
      if (!workout) return null;
      const displayTitle =
        day.dayLevelFocus?.displayTitle?.trim() ||
        day.title?.trim() ||
        day.intentLabel?.trim() ||
        undefined;
      return {
        date: day.date,
        workout,
        displayTitle,
      };
    })
    .filter((day): day is NonNullable<typeof day> => day != null);
}

export function saveDayButtonLabel(args: {
  saved: boolean;
  busy: boolean;
  compact?: boolean;
}): string {
  if (args.busy) return "Saving…";
  if (args.saved) return "Saved";
  return args.compact ? "Save" : "Save this day";
}

export function saveWeekButtonLabel(args: { saved: boolean; busy: boolean }): string {
  if (args.busy) return "Saving…";
  if (args.saved) return "Saved";
  return "Save this week";
}
