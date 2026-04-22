/**
 * Feature flags + application of `public.exercises.curation_*` columns to generator `Exercise` objects.
 * When disabled, behavior matches pre-curation (ontology + inference only).
 */

import type { Exercise } from "../logic/workoutGeneration/types";
import type { ExerciseCurationDbColumns } from "./db/exerciseCurationColumns";
import { getLegacyMovementPattern } from "./ontology/legacyMapping";

type DbRowCurationOverlay = ExerciseCurationDbColumns & { movement_pattern: string | null };

function readEnvTrue(name: string): boolean | undefined {
  try {
    const v = typeof process !== "undefined" ? process.env?.[name] : undefined;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * When true, `mapDbExerciseToGeneratorExercise` overlays `curation_*` columns onto the `Exercise`
 * (role, movement patterns, sport transfer via tags is not auto-merged here — patterns + role only).
 *
 * Env: `EXPO_PUBLIC_USE_CURATED_EXERCISE_COLUMNS=1` or `CURATION_USE_EXERCISE_COLUMNS=1`.
 * Default: **false** until Supabase has been synced, then enable in app config.
 */
export function getUseCuratedExerciseColumnsInGenerator(): boolean {
  return (
    readEnvTrue("EXPO_PUBLIC_USE_CURATED_EXERCISE_COLUMNS") ??
    readEnvTrue("CURATION_USE_EXERCISE_COLUMNS") ??
    false
  );
}

/**
 * When true, pruning gate eligibility prefers per-exercise `curation_*` fields from the DB row (attached on
 * `Exercise`) when set, and falls back to bundled `data/generator-eligibility-by-id.json` per id.
 * Defaults to **true** so a synced Supabase catalog drives the gate; disable to force JSON-only.
 */
export function getUseCuratedEligibilityFromExercisePool(): boolean {
  return (
    readEnvTrue("EXPO_PUBLIC_USE_CURATED_EXERCISE_ELIGIBILITY") ??
    readEnvTrue("CURATION_USE_EXERCISE_ELIGIBILITY") ??
    true
  );
}

/**
 * Copies durable curation **eligibility / cluster** fields from the DB row onto `Exercise` whenever present.
 * Does not depend on feature flags so pruning gate can use Supabase after sync even when ontology overlay is off.
 */
export function attachCurationSnapshotFromDbRow(exercise: Exercise, row: ExerciseCurationDbColumns): void {
  if (row.curation_generator_eligibility_state != null && row.curation_generator_eligibility_state !== "") {
    exercise.curation_generator_eligibility_state = row.curation_generator_eligibility_state;
  }
  if (row.curation_pruning_recommendation != null && row.curation_pruning_recommendation !== "") {
    exercise.curation_pruning_recommendation = row.curation_pruning_recommendation;
  }
  if (row.curation_merge_target_exercise_id != null) {
    exercise.curation_merge_target_exercise_id = row.curation_merge_target_exercise_id;
  }
  if (row.curation_cluster_id != null) {
    exercise.curation_cluster_id = row.curation_cluster_id;
  }
  if (row.curation_canonical_exercise_id != null) {
    exercise.curation_canonical_exercise_id = row.curation_canonical_exercise_id;
  }
  if (row.curation_is_canonical != null) {
    exercise.curation_is_canonical = row.curation_is_canonical;
  }
}

/**
 * Overwrites generator role / movement patterns from curated columns when enabled (steady-state ontology).
 */
export function applyCuratedExerciseColumnsFromDbRow(exercise: Exercise, row: DbRowCurationOverlay): void {
  if (!getUseCuratedExerciseColumnsInGenerator()) return;

  const role = row.curation_primary_role;
  if (role != null && role !== "") {
    exercise.exercise_role = role;
  }

  const mps = row.curation_movement_patterns;
  if (mps && mps.length > 0) {
    exercise.movement_patterns = mps;
    exercise.movement_pattern = getLegacyMovementPattern({
      movement_patterns: mps,
      movement_pattern: row.movement_pattern ?? undefined,
    }) as Exercise["movement_pattern"];
  }
}
