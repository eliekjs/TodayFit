/**
 * Phase 6: Top-level adaptive weekly planner.
 * Orchestrates: demand resolution → allocation → ordering → rationale → WeeklyPlan.
 * Optionally generates full workouts per session via generateWorkoutWithPrescriptions.
 */

import type {
  WeeklyPlanningInput,
  WeeklyPlan,
  WeeklyPlannedSession,
  WeeklyPlannerConfig,
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
