/**
 * Phase 7: Infer warmup_relevance + cooldown_relevance for ontology warmup/cooldown scoring.
 * See docs/research/exercise-metadata-phase7-warmup-cooldown-relevance.md
 */

import type { Exercise } from "../../logic/workoutGeneration/types";
import type { DemandLevel } from "../ontology/vocabularies";
import type { ExerciseInferenceInput } from "./inferenceTypes";
import { shouldRunPhase5MobilityStretchInference } from "./phase5MobilityStretchInference";

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function blob(input: ExerciseInferenceInput): string {
  return norm(`${input.id}_${input.name}`);
}

export type Phase7WarmupCooldownResult = {
  warmup_relevance?: DemandLevel;
  cooldown_relevance?: DemandLevel;
};

/** Same eligibility as Phase 5: mobility/recovery menu exercises only. */
export function shouldRunPhase7WarmupCooldownRelevanceInference(
  exercise: Exercise,
  input: ExerciseInferenceInput
): boolean {
  return shouldRunPhase5MobilityStretchInference(exercise, input);
}

/**
 * Static-stretch–biased flows: cooldown-first even if Phase 5 added a mobility slug (e.g. hip external rotation on pigeon).
 */
function staticStretchBias(b: string): boolean {
  return (
    b.includes("pigeon") ||
    b.includes("frog_stretch") ||
    b.includes("seated_hamstring") ||
    b.includes("hamstring_stretch") ||
    b.includes("quad_stretch") ||
    b.includes("calf_stretch") ||
    (b.includes("forward") && b.includes("fold")) ||
    b.includes("childs_pose") ||
    b.includes("happy_baby") ||
    b.includes("lat_stretch") ||
    b.includes("kneeling_lat")
  );
}

/** Dynamic general prep when Phase 5 did not emit targets. */
function dynamicPrepName(b: string): boolean {
  return (
    b.includes("arm_circle") ||
    b.includes("leg_swing") ||
    b.includes("jumping_jack") ||
    b.includes("dynamic_prep") ||
    b.includes("monster_walk") ||
    b.includes("band_walk") ||
    b.includes("easy_jog") ||
    b.includes("light_jog")
  );
}

export function inferPhase7WarmupCooldownFromExercise(
  input: ExerciseInferenceInput,
  exercise: Exercise
): Phase7WarmupCooldownResult {
  const b = blob(input);
  const role = norm(exercise.exercise_role ?? "");
  const hasMob = (exercise.mobility_targets?.length ?? 0) > 0;
  const hasStr = (exercise.stretch_targets?.length ?? 0) > 0;

  // Breathing / down-regulation (Phase 5 clears regional targets; still in mobility menu).
  if (
    role === "breathing" ||
    b.includes("breathing_diaphragmatic") ||
    b.includes("diaphragmatic_breathing") ||
    b.includes("box_breathing") ||
    b.includes("breath_work")
  ) {
    return { warmup_relevance: "low", cooldown_relevance: "high" };
  }

  if (staticStretchBias(b) && hasStr) {
    return { warmup_relevance: "low", cooldown_relevance: "high" };
  }

  // Multi-segment prep + stretch (Phase 5) before role === "stretch" (names like "*_stretch" from Phase 3).
  if (hasMob && hasStr) {
    return { warmup_relevance: "high", cooldown_relevance: "high" };
  }

  if (role === "stretch" || (hasStr && !hasMob)) {
    return { warmup_relevance: "none", cooldown_relevance: "high" };
  }

  if (hasMob && !hasStr) {
    return { warmup_relevance: "high", cooldown_relevance: "low" };
  }

  if (role === "prep" || role === "warmup") {
    return { warmup_relevance: "high", cooldown_relevance: "low" };
  }

  if (role === "cooldown") {
    return { warmup_relevance: "low", cooldown_relevance: "high" };
  }

  if (role === "mobility") {
    return {
      warmup_relevance: "high",
      cooldown_relevance: hasStr ? "medium" : "low",
    };
  }

  if (dynamicPrepName(b)) {
    return { warmup_relevance: "high", cooldown_relevance: "low" };
  }

  return {};
}

/**
 * Fill warmup_relevance / cooldown_relevance when DB omitted them.
 */
export function mergePhase7WarmupCooldownRelevanceIntoExercise(exercise: Exercise, input: ExerciseInferenceInput): void {
  if (!shouldRunPhase7WarmupCooldownRelevanceInference(exercise, input)) return;

  const inferred = inferPhase7WarmupCooldownFromExercise(input, exercise);
  if (exercise.warmup_relevance == null && inferred.warmup_relevance != null) {
    exercise.warmup_relevance = inferred.warmup_relevance;
  }
  if (exercise.cooldown_relevance == null && inferred.cooldown_relevance != null) {
    exercise.cooldown_relevance = inferred.cooldown_relevance;
  }
}
