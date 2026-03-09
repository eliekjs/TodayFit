/**
 * Phase 4: Movement balance guardrails for session-level selection.
 * Prevents bad workouts: duplicate patterns, grip stacking, shoulder overload, etc.
 */

import type { ExerciseWithQualities } from "../types";
import type { SessionSelectionState } from "./scoreTypes";
import type { SelectionConfig } from "./scoreTypes";

const GRIP_QUALITIES = new Set(["grip_strength", "forearm_endurance"]);
/** Canonical + legacy joint-stress slugs for shoulder (see lib/ontology JOINT_STRESS_TAGS). */
const SHOULDER_STRESS = new Set(["shoulder_overhead", "shoulder_extension_load", "shoulder_extension", "grip_hanging"]);
const HEAVY_PATTERNS = new Set(["hinge", "squat"]);

function isGripHeavy(ex: ExerciseWithQualities): boolean {
  const q = ex.training_quality_weights ?? {};
  return Object.keys(q).some((k) => GRIP_QUALITIES.has(k));
}

function isShoulderLoad(ex: ExerciseWithQualities): boolean {
  return (ex.joint_stress ?? []).some((t) => SHOULDER_STRESS.has(t));
}

function isHeavyCompound(ex: ExerciseWithQualities): boolean {
  const pattern = ex.movement_pattern ?? "";
  const cost = ex.fatigue_cost ?? "high";
  return HEAVY_PATTERNS.has(pattern) && cost === "high";
}

/** Returns true if adding this exercise would violate a guardrail. */
export function wouldViolateGuardrail(
  exercise: ExerciseWithQualities,
  state: SessionSelectionState,
  config: SelectionConfig
): boolean {
  const pattern = exercise.movement_pattern ?? "";
  const patternCount = state.movement_pattern_counts.get(pattern) ?? 0;
  if (patternCount >= config.max_same_pattern_per_session) return true;
  if (isGripHeavy(exercise) && state.grip_exercise_count >= config.max_grip_exercises_per_session)
    return true;
  if (isShoulderLoad(exercise) && state.shoulder_exercise_count >= config.max_shoulder_exercises_per_session)
    return true;
  if (isHeavyCompound(exercise) && state.heavy_compound_count >= config.max_heavy_compounds_per_session)
    return true;
  return false;
}

/** Penalty for approaching a guardrail (so scorer can demote but not hard-exclude). */
export function guardrailApproachPenalty(
  exercise: ExerciseWithQualities,
  state: SessionSelectionState,
  config: SelectionConfig
): number {
  let penalty = 0;
  const pattern = exercise.movement_pattern ?? "";
  const patternCount = state.movement_pattern_counts.get(pattern) ?? 0;
  if (patternCount === config.max_same_pattern_per_session - 1) penalty -= 0.5;
  if (isGripHeavy(exercise) && state.grip_exercise_count === config.max_grip_exercises_per_session - 1)
    penalty -= 0.5;
  if (isShoulderLoad(exercise) && state.shoulder_exercise_count === config.max_shoulder_exercises_per_session - 1)
    penalty -= 0.5;
  return penalty;
}
