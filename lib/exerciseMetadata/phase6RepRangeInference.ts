/**
 * Phase 6: Infer rep_range_min / rep_range_max to intersect with goal prescription in dailyGenerator.
 * See docs/research/exercise-metadata-phase6-rep-range-bounds.md
 */

import type { Exercise, Modality } from "../../logic/workoutGeneration/types";
import type { ExerciseInferenceInput } from "./inferenceTypes";

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

function blob(input: ExerciseInferenceInput): string {
  return norm(`${input.id}_${input.name}`);
}

function modalitySet(input: ExerciseInferenceInput): Set<string> {
  return new Set(input.modalities.map(norm));
}

const STRENGTH_LIKE_MODS = new Set(["strength", "hypertrophy", "power", "skill"]);

const SKIP_MODALITY: Set<Modality> = new Set(["conditioning", "mobility", "recovery"]);

export function shouldRunPhase6RepRangeInference(exercise: Exercise, input: ExerciseInferenceInput): boolean {
  const mods = modalitySet(input);
  if (![...STRENGTH_LIKE_MODS].some((m) => mods.has(m))) return false;
  if (SKIP_MODALITY.has(exercise.modality)) return false;
  return true;
}

export type RepRangePair = { rep_range_min: number; rep_range_max: number };

/**
 * Returns null when the exercise should use goal-only rep ranges (main compounds, ambiguous).
 */
export function inferPhase6RepRangeFromInput(input: ExerciseInferenceInput, exercise: Exercise): RepRangePair | null {
  const b = blob(input);
  const role = norm(exercise.exercise_role ?? "");

  // Olympic lifts / triple-extension barbell lifts: low reps (NSCA; technique + power).
  // Slug-style ids use underscores; \b does not treat "_" as a boundary, so use substring checks.
  const olympicLike =
    b.includes("power_clean") ||
    b.includes("hang_clean") ||
    b.includes("squat_clean") ||
    b.includes("muscle_clean") ||
    b.includes("power_snatch") ||
    b.includes("hang_snatch") ||
    b.includes("split_jerk") ||
    b.includes("push_jerk") ||
    b.includes("high_pull") ||
    b.includes("kettlebell_clean") ||
    b.includes("barbell_clean") ||
    b.includes("dumbbell_clean");

  if (olympicLike) {
    return { rep_range_min: 1, rep_range_max: 5 };
  }

  // Small-muscle / common high-rep isolation (ACSM muscular-endurance flavor).
  if (b.includes("calf_raise") || /\b(wrist_curl|forearm)\b/.test(b) || b.includes("shrug")) {
    return { rep_range_min: 15, rep_range_max: 25 };
  }

  // Biceps curls: exclude Olympic "clean" slugs (hang_clean, power_clean, etc.).
  const isBicepsCurl = b.includes("hammer_curl") || (b.includes("curl") && !b.includes("clean"));

  const isolationName =
    /\b(leg_extension|leg_curl|lateral_raise|front_raise|fly|flies|pushdown|kickback|pec_deck|preacher|concentration_curl|skull|triceps_extension|face_pull)\b/.test(b) ||
    b.includes("leg_extension") ||
    b.includes("leg_curl") ||
    b.includes("pushdown") ||
    b.includes("lateral_raise") ||
    isBicepsCurl;

  if (role === "isolation" || isolationName) {
    return { rep_range_min: 10, rep_range_max: 20 };
  }

  return null;
}

/**
 * Set rep_range_min/max when both absent (DB curation wins if either bound is set).
 */
export function mergePhase6RepRangeOntologyIntoExercise(exercise: Exercise, input: ExerciseInferenceInput): void {
  if (!shouldRunPhase6RepRangeInference(exercise, input)) return;
  if (exercise.rep_range_min != null || exercise.rep_range_max != null) return;

  const pair = inferPhase6RepRangeFromInput(input, exercise);
  if (!pair) return;

  const { rep_range_min: lo, rep_range_max: hi } = pair;
  if (lo > hi) return;

  exercise.rep_range_min = lo;
  exercise.rep_range_max = hi;
}
