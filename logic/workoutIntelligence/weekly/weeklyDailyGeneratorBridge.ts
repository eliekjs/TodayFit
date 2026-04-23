/**
 * Phase 12: Bridge from Adaptive weekly plan to the daily generator (logic/workoutGeneration).
 * Maps session intents to GenerateWorkoutInput and runs generateWorkoutSession per day with rolling state.
 */

import type { WeeklyPlanningInput, WeeklyPlannedSession, WeeklyStateSnapshot } from "./weeklyTypes";
import type { GenerateWorkoutInput, WorkoutSession } from "../../workoutGeneration/types";
import type { TrainingHistoryContext } from "../../workoutGeneration/historyTypes";
import { generateWorkoutSession } from "../../workoutGeneration/dailyGenerator";
import type { Exercise } from "../../workoutGeneration/types";

/** Allowed duration values for the daily generator. */
const ALLOWED_DURATIONS = [20, 30, 45, 60, 75] as const;

function clampDuration(mins: number): 20 | 30 | 45 | 60 | 75 {
  if (mins <= 25) return 20;
  if (mins <= 37) return 30;
  if (mins <= 52) return 45;
  if (mins <= 67) return 60;
  return 75;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function deriveSessionCardioTargetShare(
  planned: WeeklyPlannedSession,
  baseInput: WeeklyPlanningInput
): number {
  const sessionType = planned.session_type.toLowerCase();
  const primaryCardioWeek = ["conditioning", "endurance"].includes(baseInput.primary_goal.toLowerCase());
  if (sessionType.includes("conditioning") || sessionType.includes("aerobic")) return 0.82;
  if (sessionType.includes("recovery") || sessionType.includes("mobility")) return 0.2;
  if (sessionType.includes("mixed_sport_support")) return 0.5;
  const qualityConditioning = planned.target_qualities.conditioning ?? 0;
  const qualityEndurance = planned.target_qualities.endurance ?? 0;
  const qualityShare = clamp01((qualityConditioning + qualityEndurance) / 2);
  const weeklyCardioBias = primaryCardioWeek ? 0.2 : 0;
  const weeklyFloor = primaryCardioWeek ? 0.45 : 0.18;
  return clamp01(Math.max(weeklyFloor, qualityShare + weeklyCardioBias));
}

/**
 * Map weekly session type + stimulus to daily generator primary_goal and focus_body_parts.
 */
function sessionIntentToGoalAndFocus(
  sessionType: string,
  _stimulusProfile: string
): { primary_goal: GenerateWorkoutInput["primary_goal"]; focus_body_parts?: GenerateWorkoutInput["focus_body_parts"] } {
  switch (sessionType) {
    case "pull_strength":
      return { primary_goal: "strength", focus_body_parts: ["upper_pull"] };
    case "push_strength":
      return { primary_goal: "strength", focus_body_parts: ["upper_push"] };
    case "lower_hypertrophy":
      return { primary_goal: "hypertrophy", focus_body_parts: ["lower"] };
    case "lower_power":
      return { primary_goal: "power", focus_body_parts: ["lower"] };
    case "upper_hypertrophy":
      return { primary_goal: "hypertrophy", focus_body_parts: ["upper_push", "upper_pull"] };
    case "full_body_strength":
      return { primary_goal: "strength", focus_body_parts: ["full_body"] };
    case "mixed_sport_support":
      return { primary_goal: "athletic_performance", focus_body_parts: ["full_body"] };
    case "conditioning_only":
      return { primary_goal: "conditioning" };
    case "resilience_recovery":
      return { primary_goal: "recovery", focus_body_parts: ["core"] };
    case "core_and_mobility":
      return { primary_goal: "mobility", focus_body_parts: ["core"] };
    case "aerobic_builder":
      return { primary_goal: "endurance" };
    default:
      return { primary_goal: "hypertrophy", focus_body_parts: ["full_body"] };
  }
}

/**
 * Build GenerateWorkoutInput for one day from the weekly plan session and rolling state.
 */
export function weeklySessionToDailyInput(
  planned: WeeklyPlannedSession,
  baseInput: WeeklyPlanningInput,
  rollingRecentHistory: { exercise_ids: string[]; muscle_groups: string[]; modality: string }[],
  rollingTrainingHistory: TrainingHistoryContext | undefined,
  seedOffset: number,
  weekMainLiftIdsUsedSoFar: string[] = []
): GenerateWorkoutInput {
  const { primary_goal, focus_body_parts } = sessionIntentToGoalAndFocus(
    planned.session_type,
    planned.stimulus_profile
  );
  const equipment = baseInput.equipment_by_day?.[planned.day_index] ?? baseInput.available_equipment;
  const energy = baseInput.energy_profile_by_day?.[planned.day_index] ?? "medium";
  const duration = clampDuration(planned.planned_duration_minutes);
  const sessionCardioTargetShare = deriveSessionCardioTargetShare(planned, baseInput);
  const weeklyCardioEmphasis = ["conditioning", "endurance"].includes(baseInput.primary_goal.toLowerCase())
    ? 0.85
    : (baseInput.secondary_goals ?? []).some((goal) => {
          const normalized = goal.toLowerCase().replace(/\s/g, "_");
          return normalized === "conditioning" || normalized === "endurance";
        })
      ? 0.45
      : 0;

  const style_prefs = baseInput.style_prefs
    ? {
        ...baseInput.style_prefs,
        preferred_exercise_ids: baseInput.style_prefs.preferred_exercise_ids,
      }
    : undefined;

  return {
    duration_minutes: duration,
    primary_goal,
    focus_body_parts,
    energy_level: energy,
    available_equipment: equipment,
    injuries_or_constraints: baseInput.injuries_or_limitations ?? [],
    recent_history: rollingRecentHistory.length > 0 ? rollingRecentHistory : undefined,
    training_history: rollingTrainingHistory,
    seed: seedOffset + planned.day_index,
    style_prefs,
    sport_slugs: baseInput.sports,
    goal_sub_focus: baseInput.goal_sub_focus,
    sport_sub_focus: baseInput.sport_sub_focus,
    goal_weights: baseInput.goal_weights,
    sport_weight: baseInput.sport_weight,
    session_target_qualities: planned.target_qualities,
    session_cardio_target_share: sessionCardioTargetShare,
    weekly_cardio_emphasis: weeklyCardioEmphasis,
    week_main_strength_lift_ids_used: [...weekMainLiftIdsUsedSoFar],
  };
}

/**
 * Extract exercise IDs and muscle groups from a generated WorkoutSession (for rolling history).
 */
export function workoutSessionToRecentSummary(
  session: WorkoutSession,
  exercisePool: Exercise[]
): { exercise_ids: string[]; muscle_groups: string[]; modality: string } {
  const byId = new Map(exercisePool.map((e) => [e.id, e]));
  const exerciseIds: string[] = [];
  const muscleSet = new Set<string>();
  for (const block of session.blocks) {
    for (const item of block.items) {
      exerciseIds.push(item.exercise_id);
      const ex = byId.get(item.exercise_id);
      if (ex) ex.muscle_groups.forEach((m) => muscleSet.add(m));
    }
  }
  const primaryGoal = session.blocks.some((b) =>
    ["main_strength", "main_hypertrophy"].includes(b.block_type)
  )
    ? "strength"
    : session.blocks.some((b) => b.block_type === "conditioning")
      ? "conditioning"
      : "mobility";
  return {
    exercise_ids: exerciseIds,
    muscle_groups: [...muscleSet],
    modality: primaryGoal,
  };
}

/**
 * Build a TrainingHistoryContext from the list of prior days' summaries (for next day).
 */
export function buildRollingTrainingHistory(
  priorSummaries: { exercise_ids: string[]; muscle_groups: string[]; modality: string }[]
): TrainingHistoryContext {
  const recent_sessions = priorSummaries.map((s) => ({
    exercise_ids: s.exercise_ids,
    muscle_groups: s.muscle_groups,
    modality: s.modality,
    completed: true,
  }));
  const recently_used_exercise_ids = [...new Set(priorSummaries.flatMap((s) => s.exercise_ids))];
  const by_exercise: Record<string, number> = {};
  for (const s of priorSummaries) {
    for (const id of s.exercise_ids) {
      by_exercise[id] = (by_exercise[id] ?? 0) + 1;
    }
  }
  return {
    recent_sessions,
    recently_used_exercise_ids,
    exposure: { by_exercise },
  };
}

/**
 * Build weekly state snapshot from all generated days (for debug / next week).
 */
export function buildWeeklyStateSnapshot(
  daySummaries: { exercise_ids: string[]; muscle_groups: string[]; modality: string }[],
  plannedSessions: WeeklyPlannedSession[]
): WeeklyStateSnapshot {
  const exercise_ids_used = [...new Set(daySummaries.flatMap((s) => s.exercise_ids))];
  const movement_family_exposure: Record<string, number> = {};
  const fatigue_region_exposure: Record<string, number> = {};
  const body_region_exposure: Record<string, number> = {};
  const sessionTypeToFamilies: Record<string, string[]> = {
    push_strength: ["upper_push"],
    pull_strength: ["upper_pull"],
    upper_hypertrophy: ["upper_push", "upper_pull"],
    lower_hypertrophy: ["lower_body"],
    lower_power: ["lower_body"],
    full_body_strength: ["upper_push", "upper_pull", "lower_body", "core"],
    mixed_sport_support: ["upper_pull", "lower_body", "core"],
    resilience_recovery: ["core"],
    core_and_mobility: ["core"],
  };
  for (const s of plannedSessions) {
    const families = sessionTypeToFamilies[s.session_type] ?? [];
    for (const f of families) {
      movement_family_exposure[f] = (movement_family_exposure[f] ?? 0) + 1;
    }
    const regions = s.session_type.includes("lower")
      ? ["lower"]
      : s.session_type.includes("push")
        ? ["upper_push"]
        : s.session_type.includes("pull")
          ? ["upper_pull"]
          : s.session_type.includes("core") || s.session_type.includes("resilience")
            ? ["core"]
            : [];
    for (const r of regions) {
      body_region_exposure[r] = (body_region_exposure[r] ?? 0) + 1;
    }
  }
  let high = 0, moderate = 0, low = 0;
  for (const s of plannedSessions) {
    if (s.expected_fatigue === "high") high++;
    else if (s.expected_fatigue === "moderate") moderate++;
    else low++;
  }
  return {
    exercise_ids_used,
    movement_family_exposure,
    fatigue_region_exposure,
    body_region_exposure,
    stress_distribution: { high, moderate, low },
  };
}
