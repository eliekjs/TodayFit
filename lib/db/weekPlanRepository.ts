import { getSupabase } from "./client";
import { saveGeneratedWorkout, getWorkoutsByIds } from "./workoutRepository";
import type { GeneratedWorkout } from "../types";
import type { PlannedDay } from "../../services/sportPrepPlanner";
import { parseLocalDate } from "../dateUtils";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

export type SavedWeekSummary = {
  id: string;
  week_start_date: string;
  created_at: string;
  goals_snapshot: Record<string, unknown>;
};

/**
 * Save a manually generated week: create weekly_plan_instance and 7 weekly_plan_days
 * with generated workouts. goals_snapshot stores { source: "manual" } for later distinction.
 */
export async function saveManualWeek(
  userId: string,
  weekStartDate: string,
  days: { date: string; workout: GeneratedWorkout }[]
): Promise<string> {
  const supabase = requireClient();

  const { data: instanceRow, error: instanceError } = await supabase
    .from("weekly_plan_instances")
    .insert({
      user_id: userId,
      week_start_date: weekStartDate,
      plan_id: null,
      goals_snapshot: { source: "manual" },
      rationale: null,
    })
    .select("id")
    .single();
  if (instanceError) throw new Error(instanceError.message);
  const instanceId = instanceRow.id as string;
  const createdWorkoutIds: string[] = [];

  try {
    for (const { date, workout } of days) {
      const workoutId = await saveGeneratedWorkout(userId, workout);
      createdWorkoutIds.push(workoutId);
      const { error: dayError } = await supabase.from("weekly_plan_days").insert({
        weekly_plan_instance_id: instanceId,
        date,
        intent_id: null,
        intent_label: workout.focus?.join(" • ") ?? "Manual",
        goal_contribution: {},
        fatigue_score: null,
        status: "planned",
        generated_workout_id: workoutId,
      });
      if (dayError) throw new Error(dayError.message);
    }
  } catch (originalError) {
    await rollbackManualPlanPersistence(supabase, userId, instanceId, createdWorkoutIds);
    throw originalError;
  }

  return instanceId;
}

/** Monday of the week containing the given ISO date (local timezone). */
function weekStartMonday(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dayNum = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

/**
 * Best-effort compensating cleanup for partially persisted manual plan artifacts.
 * This never throws so callers can deterministically rethrow the original failure.
 */
async function rollbackManualPlanPersistence(
  supabase: ReturnType<typeof requireClient>,
  userId: string,
  instanceId: string,
  createdWorkoutIds: string[]
): Promise<void> {
  try {
    const { error: daysCleanupError } = await supabase
      .from("weekly_plan_days")
      .delete()
      .eq("weekly_plan_instance_id", instanceId);
    if (daysCleanupError) {
      console.error("weekPlanRepository.rollbackManualPlanPersistence.days_cleanup_failed", {
        userId,
        instanceId,
        reason: daysCleanupError.message,
      });
    }
  } catch (cleanupFailure) {
    console.error("weekPlanRepository.rollbackManualPlanPersistence.days_cleanup_failed", {
      userId,
      instanceId,
      cleanupFailure,
    });
  }

  try {
    const { error: instanceCleanupError } = await supabase
      .from("weekly_plan_instances")
      .delete()
      .eq("id", instanceId)
      .eq("user_id", userId);
    if (instanceCleanupError) {
      console.error("weekPlanRepository.rollbackManualPlanPersistence.instance_cleanup_failed", {
        userId,
        instanceId,
        reason: instanceCleanupError.message,
      });
    }
  } catch (cleanupFailure) {
    console.error("weekPlanRepository.rollbackManualPlanPersistence.instance_cleanup_failed", {
      userId,
      instanceId,
      cleanupFailure,
    });
  }

  const uniqueWorkoutIds = [...new Set(createdWorkoutIds)];
  if (uniqueWorkoutIds.length === 0) return;

  for (const workoutId of uniqueWorkoutIds) {
    try {
      const { error: workoutCleanupError } = await supabase
        .from("workouts")
        .delete()
        .eq("id", workoutId)
        .eq("user_id", userId);
      if (workoutCleanupError) {
        console.error("weekPlanRepository.rollbackManualPlanPersistence.workout_cleanup_failed", {
          userId,
          instanceId,
          workoutId,
          reason: workoutCleanupError.message,
        });
      }
    } catch (cleanupFailure) {
      console.error("weekPlanRepository.rollbackManualPlanPersistence.workout_cleanup_failed", {
        userId,
        instanceId,
        workoutId,
        cleanupFailure,
      });
    }
  }
}

/**
 * Save a single day as its own plan (one weekly_plan_instance with one weekly_plan_day).
 * Stored with goals_snapshot { source: "manual", singleDay: true }. Appears in Library with other saved weeks.
 */
export async function saveManualDay(
  userId: string,
  date: string,
  workout: GeneratedWorkout
): Promise<string> {
  const supabase = requireClient();
  const weekStartDate = weekStartMonday(date);

  const { data: instanceRow, error: instanceError } = await supabase
    .from("weekly_plan_instances")
    .insert({
      user_id: userId,
      week_start_date: weekStartDate,
      plan_id: null,
      goals_snapshot: { source: "manual", singleDay: true },
      rationale: null,
    })
    .select("id")
    .single();
  if (instanceError) throw new Error(instanceError.message);
  const instanceId = instanceRow.id as string;
  const createdWorkoutIds: string[] = [];

  try {
    const workoutId = await saveGeneratedWorkout(userId, workout);
    createdWorkoutIds.push(workoutId);
    const { error: dayError } = await supabase.from("weekly_plan_days").insert({
      weekly_plan_instance_id: instanceId,
      date,
      intent_id: null,
      intent_label: workout.focus?.join(" • ") ?? "Manual",
      goal_contribution: {},
      fatigue_score: null,
      status: "planned",
      generated_workout_id: workoutId,
    });
    if (dayError) throw new Error(dayError.message);
  } catch (originalError) {
    await rollbackManualPlanPersistence(supabase, userId, instanceId, createdWorkoutIds);
    throw originalError;
  }

  return instanceId;
}

/**
 * List saved weekly plan instances for the user (manual and adaptive).
 */
export async function listWeeklyPlanInstances(userId: string): Promise<SavedWeekSummary[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("weekly_plan_instances")
    .select("id, week_start_date, created_at, goals_snapshot")
    .eq("user_id", userId)
    .order("week_start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    week_start_date: r.week_start_date,
    created_at: r.created_at,
    goals_snapshot: (r.goals_snapshot as Record<string, unknown>) ?? {},
  }));
}

export type WeeklyPlanWithWorkouts = {
  weeklyPlanInstanceId: string;
  weekStartDate: string;
  days: PlannedDay[];
  guestWorkouts: Record<string, GeneratedWorkout>;
};

type WeeklyPlanInstanceRow = {
  id: string;
  week_start_date: string;
};

type WeeklyPlanDayRow = {
  id: string;
  date: string;
  intent_label: string | null;
  status: "planned" | "completed" | "skipped" | null;
  generated_workout_id: string | null;
};

export function buildWeeklyPlanWithWorkoutsFromRows(
  instance: WeeklyPlanInstanceRow,
  dayRows: WeeklyPlanDayRow[],
  workoutsById: Record<string, GeneratedWorkout>
): WeeklyPlanWithWorkouts {
  const days: PlannedDay[] = [];
  const guestWorkouts: Record<string, GeneratedWorkout> = {};

  for (const row of dayRows) {
    const date = row.date;
    const workoutId = row.generated_workout_id;
    const planned: PlannedDay = {
      id: row.id,
      date,
      intentLabel: row.intent_label ?? null,
      status: row.status ?? "planned",
      generatedWorkoutId: workoutId,
    };
    days.push(planned);
    if (workoutId) {
      const workout = workoutsById[workoutId];
      if (workout) guestWorkouts[date] = workout;
    }
  }

  return {
    weeklyPlanInstanceId: instance.id,
    weekStartDate: instance.week_start_date,
    days,
    guestWorkouts,
  };
}

/**
 * Load one weekly plan instance with its days and generated workouts (for Load week).
 */
export async function getWeeklyPlanWithWorkouts(
  userId: string,
  instanceId: string
): Promise<WeeklyPlanWithWorkouts | null> {
  const supabase = requireClient();
  const { data: instance, error: instErr } = await supabase
    .from("weekly_plan_instances")
    .select("id, week_start_date")
    .eq("id", instanceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (instErr) throw new Error(instErr.message);
  if (!instance) return null;

  const { data: dayRows, error: daysErr } = await supabase
    .from("weekly_plan_days")
    .select("id, date, intent_label, status, generated_workout_id")
    .eq("weekly_plan_instance_id", instanceId)
    .order("date");
  if (daysErr) throw new Error(daysErr.message);

  const typedDayRows = (dayRows ?? []) as WeeklyPlanDayRow[];
  const workoutIds = [...new Set(typedDayRows
    .map((row) => row.generated_workout_id)
    .filter((id): id is string => Boolean(id)))];
  const workoutsById =
    workoutIds.length > 0 ? await getWorkoutsByIds(userId, workoutIds) : {};
  return buildWeeklyPlanWithWorkoutsFromRows(
    instance as WeeklyPlanInstanceRow,
    typedDayRows,
    workoutsById
  );
}
