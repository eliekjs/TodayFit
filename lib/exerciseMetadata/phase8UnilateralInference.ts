/**
 * Phase 8: Infer unilateral: true for single-limb / asymmetric exercises (PHASE4 §7).
 * See docs/research/exercise-metadata-phase8-unilateral.md
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import type { ExerciseInferenceInput } from "./inferenceTypes";

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function blob(input: ExerciseInferenceInput): string {
  return norm(`${input.id}_${input.name}`);
}

function tagSet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.tags.map(norm));
}

/**
 * True when id/name/tags indicate single-limb or split-stance emphasis.
 * Conservative: omit when ambiguous (e.g. generic “lunge” without split/walking/single cues).
 */
export function inferPhase8UnilateralFromInput(input: ExerciseInferenceInput, _exercise: Exercise): boolean {
  const b = blob(input);
  const tags = tagSet(input);

  if (tags.has("single_leg") || tags.has("single_leg_strength")) return true;

  if (
    b.includes("single_arm") ||
    b.includes("one_arm") ||
    b.includes("1_arm") ||
    b.includes("unilateral")
  ) {
    return true;
  }

  if (b.includes("single_leg") || b.includes("one_leg") || b.includes("1_leg")) return true;

  if (b.includes("split_squat") || b.includes("bulgarian") || b.includes("rear_foot")) return true;

  if (b.includes("suitcase_carry") || (b.includes("suitcase") && b.includes("carry"))) return true;

  if (b.includes("pistol") || b.includes("shrimp_squat")) return true;

  if (b.includes("lateral_lunge") || b.includes("cossack")) return true;

  if (
    b.includes("walking_lunge") ||
    b.includes("reverse_lunge") ||
    b.includes("forward_lunge") ||
    b.includes("deficit_lunge")
  ) {
    return true;
  }

  if (
    b.includes("single_leg_rdl") ||
    b.includes("single_leg_deadlift") ||
    b.includes("single_leg_hip") ||
    b.includes("single_leg_glute") ||
    b.includes("sl_bsq") ||
    b.includes("kickstand")
  ) {
    return true;
  }

  if (b.includes("contralateral") || b.includes("offset_squat") || b.includes("offset_lunge")) return true;

  if (b.includes("stepup") || b.includes("step_up")) return true;

  if (b.includes("single_leg_calf") || b.includes("single_leg_press")) return true;

  return false;
}

export function shouldRunPhase8UnilateralInference(exercise: Exercise): boolean {
  return typeof exercise.unilateral !== "boolean";
}

/**
 * Set unilateral: true when absent/undefined and inference matches. Does not set false.
 */
export function mergePhase8UnilateralOntologyIntoExercise(exercise: Exercise, input: ExerciseInferenceInput): void {
  if (!shouldRunPhase8UnilateralInference(exercise)) return;
  if (!inferPhase8UnilateralFromInput(input, exercise)) return;
  exercise.unilateral = true;
}
