import { getSupabase } from "./client";
import { saveGeneratedWorkout, getWorkout } from "./workoutRepository";
import type { GeneratedWorkout } from "../types";
import type { PlannedDay } from "../../services/sportPrepPlanner";

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

  for (const { date, workout } of days) {
    const workoutId = await saveGeneratedWorkout(userId, workout);
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

  const days: PlannedDay[] = [];
  const guestWorkouts: Record<string, GeneratedWorkout> = {};
  for (const row of dayRows ?? []) {
    const date = row.date as string;
    const workoutId = row.generated_workout_id as string | null;
    const planned: PlannedDay = {
      id: row.id as string,
      date,
      intentLabel: (row.intent_label as string) ?? null,
      status: (row.status as "planned" | "completed" | "skipped") ?? "planned",
      generatedWorkoutId: workoutId,
    };
    days.push(planned);
    if (workoutId) {
      const workout = await getWorkout(userId, workoutId);
      if (workout) guestWorkouts[date] = workout;
    }
  }

  return {
    weeklyPlanInstanceId: instance.id as string,
    weekStartDate: instance.week_start_date as string,
    days,
    guestWorkouts,
  };
}
