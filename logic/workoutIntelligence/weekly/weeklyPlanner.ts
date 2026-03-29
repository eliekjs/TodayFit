/**
 * Phase 6: Top-level adaptive weekly planner.
 * Phase 12: Optional path that uses the daily generator (logic/workoutGeneration) per day with rolling state.
 */

import type {
  WeeklyPlanningInput,
  WeeklyPlan,
  WeeklyPlannedSession,
  WeeklyPlannerConfig,
  WeeklyPlanWithWorkouts,
  WeeklyDayWithWorkout,
} from "./weeklyTypes";
import { DEFAULT_WEEKLY_PLANNER_CONFIG } from "./weeklyTypes";
import { resolveWeeklyDemand } from "./weeklyDemandResolution";
import { allocateWeeklySessions } from "./weeklyAllocation";
import {
  orderSessionsAcrossWeek,
  buildDownstreamInput,
} from "./weeklyOrdering";
import {
  generateSessionRationale,
  generateWeeklySummary,
} from "./weeklyRationale";
import {
  weeklySessionToDailyInput,
  workoutSessionToRecentSummary,
  buildRollingTrainingHistory,
  buildWeeklyStateSnapshot,
} from "./weeklyDailyGeneratorBridge";
import { collectWeekMainLiftExerciseIds } from "../../workoutGeneration/collectWeekMainLiftExerciseIds";
import { generateWorkoutSession } from "../../workoutGeneration/dailyGenerator";
import {
  pushPullBalanceOk,
  recoveryMinimumOk,
  gripDistribution,
  lowerBodySpacingOk,
} from "./weeklyBalanceRules";

/**
 * Generate an adaptive weekly plan (session intents with day assignment and handoff inputs).
 * Does NOT call the daily workout generator; use generateWeeklyPlanWithWorkouts for that.
 */
export function generateAdaptiveWeeklyPlan(
  input: WeeklyPlanningInput,
  config?: WeeklyPlannerConfig
): WeeklyPlan {
  const cfg = { ...DEFAULT_WEEKLY_PLANNER_CONFIG, ...config };
  const demand = resolveWeeklyDemand(input);
  const intents = allocateWeeklySessions(input, demand);
  const ordered = orderSessionsAcrossWeek(input, intents, cfg);

  const sessions: WeeklyPlannedSession[] = ordered.map((o) => {
    const rationale = generateSessionRationale(
      {
        session_type: o.session_type,
        stimulus_profile: o.stimulus_profile,
        label: o.label,
        expected_fatigue: o.expected_fatigue,
        target_qualities: o.target_qualities,
      },
      input
    );
    const downstream_generation_input = buildDownstreamInput(input, {
      ...o,
      planned_duration_minutes: o.planned_duration_minutes,
      load_hints: o.load_hints,
    });
    return {
      day_index: o.day_index,
      label: o.label,
      session_type: o.session_type,
      stimulus_profile: o.stimulus_profile,
      priority: o.priority,
      target_qualities: o.target_qualities,
      planned_duration_minutes: o.planned_duration_minutes,
      expected_fatigue: o.expected_fatigue,
      rationale,
      downstream_generation_input,
      load_hints: o.load_hints,
    };
  });

  const plan: WeeklyPlan = {
    id: `weekly_${Date.now()}`,
    primary_goal: input.primary_goal,
    sports: input.sports ?? [],
    total_days: input.days_available_per_week,
    sessions,
    summary: "",
    notes: [],
  };
  plan.summary = generateWeeklySummary(plan, input);
  return plan;
}

/**
 * Generate a weekly plan and fully instantiate workouts for each planned session.
 * Requires an exercise pool (with qualities) and the session template resolver.
 * Returns the plan plus generated workouts keyed by day_index.
 */
export function generateWeeklyPlanWithWorkouts(
  input: WeeklyPlanningInput,
  options: {
    config?: WeeklyPlannerConfig;
    exercisePool: import("../types").ExerciseWithQualities[];
    resolveSessionTemplate: (
      sessionType: import("../types").SessionTypeSlug,
      stimulusProfile: import("../types").StimulusProfileSlug,
      durationMinutes: number
    ) => import("../types").SessionTemplateV2;
    generateWorkout: (input: import("../selection/sessionAssembler").AssembleSessionInput) => import("../workoutTypes").GeneratedWorkout;
  }
): {
  plan: WeeklyPlan;
  workoutsByDay: Map<number, import("../workoutTypes").GeneratedWorkout>;
} {
  const plan = generateAdaptiveWeeklyPlan(input, options.config);
  const workoutsByDay = new Map<number, import("../workoutTypes").GeneratedWorkout>();

  for (const session of plan.sessions) {
    const genInput = session.downstream_generation_input;
    const template = options.resolveSessionTemplate(
      genInput.preferred_session_type,
      genInput.preferred_stimulus_profile,
      genInput.duration_minutes
    );
    const workout = options.generateWorkout({
      input: {
        primary_goal: genInput.primary_goal,
        secondary_goals: genInput.secondary_goals,
        tertiary_goals: genInput.tertiary_goals,
        sports: genInput.sports,
        sport_sub_focus: genInput.sport_sub_focus,
        target_training_qualities: genInput.target_training_qualities,
        available_equipment: genInput.available_equipment,
        duration_minutes: genInput.duration_minutes,
        energy_level: genInput.energy_level,
        injuries_or_limitations: genInput.injuries_or_limitations,
        preferred_session_type: genInput.preferred_session_type,
        preferred_stimulus_profile: genInput.preferred_stimulus_profile,
      },
      template,
      exercisePool: options.exercisePool,
      title: session.label,
    });
    workoutsByDay.set(session.day_index, workout);
  }
  return { plan, workoutsByDay };
}

/**
 * Phase 12: Generate an adaptive weekly plan and fill each day using the daily generator
 * (logic/workoutGeneration.generateWorkoutSession). Uses rolling recent_history and
 * training_history so later days see prior days' workouts. Returns WeeklyPlanWithWorkouts.
 * Does not affect Manual mode (session-first); this is the Adaptive week-first path.
 */
export function generateAdaptiveWeekWithDailyGenerator(
  input: WeeklyPlanningInput,
  options: {
    config?: WeeklyPlannerConfig;
    /** Exercise pool in generator shape (Exercise[] from workoutGeneration). */
    exercisePool: import("../../workoutGeneration/types").Exercise[];
  }
): WeeklyPlanWithWorkouts {
  const cfg = { ...DEFAULT_WEEKLY_PLANNER_CONFIG, ...options.config };
  const plan = generateAdaptiveWeeklyPlan(input, cfg);
  const sessionsByDay = [...plan.sessions].sort((a, b) => a.day_index - b.day_index);

  const rollingSummaries: { exercise_ids: string[]; muscle_groups: string[]; modality: string }[] = [];
  const days: WeeklyDayWithWorkout[] = [];
  const seedBase = typeof input.variation_seed === "number" ? input.variation_seed : (input.variation_seed ?? "").toString().length * 1000;
  const weekMainLiftIds: string[] = [];

  for (const session of sessionsByDay) {
    const trainingHistory = rollingSummaries.length > 0 ? buildRollingTrainingHistory(rollingSummaries) : undefined;
    const dailyInput = weeklySessionToDailyInput(
      session,
      input,
      rollingSummaries,
      trainingHistory,
      seedBase,
      weekMainLiftIds
    );
    const workout = generateWorkoutSession(dailyInput, options.exercisePool);
    weekMainLiftIds.push(...collectWeekMainLiftExerciseIds(workout));
    const summary = workoutSessionToRecentSummary(workout, options.exercisePool);
    rollingSummaries.push(summary);

    days.push({
      day_index: session.day_index,
      session_label: session.label,
      planned_session: session,
      workout,
      day_summary: `${session.label}, ${session.planned_duration_minutes} min`,
      recovery_note: session.expected_fatigue === "low" ? "Low fatigue / recovery-friendly." : undefined,
    });
  }

  const snapshot = buildWeeklyStateSnapshot(
    rollingSummaries,
    plan.sessions
  );

  const balanceNotes: string[] = [];
  const pushPull = pushPullBalanceOk(plan.sessions, cfg);
  if (!pushPull.ok && pushPull.note) balanceNotes.push(pushPull.note);
  const recovery = recoveryMinimumOk(plan.sessions, cfg);
  if (!recovery.ok && recovery.note) balanceNotes.push(recovery.note);
  const grip = gripDistribution(plan.sessions);
  if (grip.consecutive_grip_days > 0) {
    balanceNotes.push(`Grip-intensive sessions: ${grip.grip_intensive_count}, max consecutive: ${grip.consecutive_grip_days}.`);
  }
  const lower = lowerBodySpacingOk(plan.sessions, cfg);
  if (!lower.ok && lower.note) balanceNotes.push(lower.note);

  const result: WeeklyPlanWithWorkouts = {
    id: plan.id,
    primary_goal: plan.primary_goal,
    sports: plan.sports,
    total_days: plan.total_days,
    week_summary: plan.summary,
    recovery_notes: [...(plan.notes ?? []), ...balanceNotes],
    days,
    debug: {
      allocation_rationale: `Allocated ${sessionsByDay.length} sessions across ${plan.total_days} days; stress distribution: ${snapshot.stress_distribution.high} high, ${snapshot.stress_distribution.moderate} moderate, ${snapshot.stress_distribution.low} low.`,
      weekly_state_snapshot: snapshot,
      config_used: cfg,
    },
  };
  return result;
}
