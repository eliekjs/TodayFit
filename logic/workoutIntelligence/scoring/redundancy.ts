/**
 * Phase 4: Anti-redundancy rules.
 * Penalize exercises too similar to already-selected (same pattern, same quality focus).
 */

import type { ExerciseWithQualities } from "../types";
import type { SessionSelectionState } from "./scoreTypes";

/**
 * Redundancy penalty: same movement pattern already used multiple times.
 */
export function redundancyPenaltyForPattern(
  exercise: ExerciseWithQualities,
  state: SessionSelectionState,
  maxSamePattern: number
): number {
  const pattern = exercise.movement_pattern ?? "";
  const count = state.movement_pattern_counts.get(pattern) ?? 0;
  if (count >= maxSamePattern) return -2;
  if (count === 1) return -0.5;
  return 0;
}

/**
 * Redundancy penalty: exercise ID already used in this session.
 */
export function redundancyPenaltyForUsed(
  exercise: ExerciseWithQualities,
  state: SessionSelectionState
): number {
  return state.used_exercise_ids.has(exercise.id) ? -10 : 0;
}

/**
 * Combined novelty/redundancy score component (to add to total).
 * Negative = penalty.
 */
export function noveltyScore(
  exercise: ExerciseWithQualities,
  state: SessionSelectionState,
  recentExerciseIds: Set<string>,
  config: { novelty_penalty: number; max_same_pattern_per_session: number }
): number {
  if (state.used_exercise_ids.has(exercise.id)) return config.novelty_penalty * 2;
  let score = 0;
  if (recentExerciseIds.has(exercise.id)) score += config.novelty_penalty;
  score += redundancyPenaltyForPattern(exercise, state, config.max_same_pattern_per_session);
  return score;
}
