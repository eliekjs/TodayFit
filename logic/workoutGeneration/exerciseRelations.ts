/**
 * Phase 11: Lightweight exercise relationship support (progressions, regressions, alternatives).
 * Optional; fallback when mappings absent.
 */

import type { Exercise } from "./types";

export type ExerciseRelations = {
  progressions: string[];
  regressions: string[];
  /** Same difficulty / sibling variations (e.g. same pattern, different implement). */
  alternatives?: string[];
};

/**
 * Get progressions, regressions, and optional alternatives for an exercise.
 * Uses exercise.progressions / exercise.regressions; alternatives not populated from Exercise type yet.
 */
export function getExerciseRelations(exercise: Exercise): ExerciseRelations {
  return {
    progressions: exercise.progressions ?? [],
    regressions: exercise.regressions ?? [],
    alternatives: undefined,
  };
}

/**
 * Pick a regression (easier) variant from pool when recommendation is regress.
 * Prefers exercise.regressions that exist in pool; otherwise returns undefined.
 */
export function pickRegressionInPool(
  exercise: Exercise,
  pool: Exercise[]
): Exercise | undefined {
  const ids = new Set(pool.map((e) => e.id));
  const regressions = exercise.regressions ?? [];
  for (const id of regressions) {
    const found = pool.find((e) => e.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Pick a progression (harder) or alternative for rotate when recommendation is rotate.
 * Prefers progressions first, then alternatives; returns undefined if none in pool.
 */
export function pickProgressionOrAlternativeInPool(
  exercise: Exercise,
  pool: Exercise[]
): Exercise | undefined {
  const progressions = exercise.progressions ?? [];
  for (const id of progressions) {
    const found = pool.find((e) => e.id === id);
    if (found) return found;
  }
  return undefined;
}
