/**
 * Multi-factor exercise scoring for workout intelligence.
 * Scores a candidate exercise against session target, balance, fatigue, variety, etc.
 */

import type { SessionTargetVector } from "../types";
import type { ExerciseScoreBreakdown } from "../types";
import type { ExerciseWithQualities } from "../types";
import { alignmentScore } from "../targetVector";
import type { FatigueState } from "../../../lib/generation/fatigueRules";
import { fatiguePenaltyForExercise } from "../../../lib/generation/fatigueRules";
import { balanceBonusForExercise } from "../../../lib/generation/movementBalance";
import { MAX_SAME_PATTERN_PER_SESSION, BALANCE_CATEGORY_PATTERNS } from "../../../lib/workoutRules";

export type ScoreExerciseInput = {
  exercise: ExerciseWithQualities;
  targetVector: SessionTargetVector;
  /** Movement pattern counts so far in session (for balance). */
  movementPatternCounts: Map<string, number>;
  /** Exercise IDs used in recent sessions (for variety). */
  recentExerciseIds: Set<string>;
  /** Current block type (for session fit). */
  blockType?: string;
  /** User energy level. */
  energyLevel?: "low" | "medium" | "high";
  /** Session duration (minutes); short sessions prefer lower time_cost. */
  durationMinutes?: number;
  /** Optional fatigue state from recent history. */
  fatigueState?: FatigueState;
  /** Include per-factor breakdown in result. */
  includeBreakdown?: boolean;
};

/** Tunable weights (can move to config). */
const WEIGHTS = {
  goal_alignment: 3.0,
  balance_bonus: 1.0,
  variety_penalty: -2.0,
  session_fit: 0.5,
  energy_fit: 1.0,
  duration_fit_low_cost_bonus: 0.5,
  duration_fit_high_cost_penalty: -1.0,
};

export function scoreExercise(input: ScoreExerciseInput): {
  score: number;
  breakdown?: ExerciseScoreBreakdown;
} {
  const {
    exercise,
    targetVector,
    movementPatternCounts,
    recentExerciseIds,
    blockType,
    energyLevel,
    durationMinutes,
    fatigueState,
    includeBreakdown,
  } = input;

  const breakdown: ExerciseScoreBreakdown = {
    exercise_id: exercise.id,
    total: 0,
    goal_alignment: 0,
  };

  // 1. Goal/sport alignment (dot product with target vector)
  const alignment = alignmentScore(exercise.training_quality_weights, targetVector);
  const goalScore = WEIGHTS.goal_alignment * alignment;
  breakdown.goal_alignment = goalScore;

  // 2. Balance bonus (reuse lib movement balance)
  const balance = balanceBonusForExercise(
    exercise.movement_pattern,
    movementPatternCounts,
    3,
    [...BALANCE_CATEGORY_PATTERNS]
  );
  const balanceScore = WEIGHTS.balance_bonus * balance;
  if (balanceScore !== 0) breakdown.balance_bonus = balanceScore;

  // 3. Fatigue penalty (reuse lib fatigue rules)
  const fatigue = fatigueState
    ? fatiguePenaltyForExercise(exercise.muscle_groups, fatigueState)
    : 0;
  if (fatigue !== 0) breakdown.fatigue_penalty = fatigue;

  // 4. Variety penalty (recent use)
  let varietyPenalty = 0;
  if (recentExerciseIds.has(exercise.id)) varietyPenalty = WEIGHTS.variety_penalty;
  if (varietyPenalty !== 0) breakdown.variety_penalty = varietyPenalty;

  // 5. Session fit (block type vs modality / quality)
  let sessionFit = 0;
  if (blockType) {
    if (blockType === "main_strength" && (exercise.modality === "strength" || exercise.modality === "power"))
      sessionFit = 1;
    else if (blockType === "main_hypertrophy" && (exercise.modality === "hypertrophy" || exercise.modality === "strength"))
      sessionFit = 1;
    else if (blockType === "warmup" && (exercise.modality === "mobility" || exercise.modality === "recovery"))
      sessionFit = 1;
    else if (blockType === "conditioning" && exercise.modality === "conditioning")
      sessionFit = 1;
  }
  if (sessionFit !== 0) breakdown.session_fit = WEIGHTS.session_fit * sessionFit;

  // 6. Energy fit
  let energyFit = 0;
  if (energyLevel && exercise.energy_fit?.includes(energyLevel)) energyFit = 1;
  if (energyFit !== 0) breakdown.energy_fit = WEIGHTS.energy_fit * energyFit;

  // 7. Duration fit (short session: prefer low time_cost)
  let durationFit = 0;
  if (durationMinutes != null) {
    if (durationMinutes <= 30 && exercise.time_cost === "high")
      durationFit = WEIGHTS.duration_fit_high_cost_penalty;
    else if (durationMinutes <= 30 && exercise.time_cost === "low")
      durationFit = WEIGHTS.duration_fit_low_cost_bonus;
  }
  if (durationFit !== 0) breakdown.duration_fit = durationFit;

  const total =
    goalScore +
    balanceScore +
    fatigue +
    varietyPenalty +
    WEIGHTS.session_fit * sessionFit +
    WEIGHTS.energy_fit * energyFit +
    durationFit;
  breakdown.total = total;

  return {
    score: total,
    breakdown: includeBreakdown ? breakdown : undefined,
  };
}
