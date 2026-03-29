/**
 * Phase 11: History-aware scoring signals for exercise selection.
 * Tunable, additive, debuggable. No effect when history is absent.
 */

import type { Exercise } from "./types";
import type { TrainingHistoryContext } from "./historyTypes";
import { getCanonicalExerciseRole, getCanonicalMovementFamilies } from "./ontologyNormalization";

export type HistoryScoreBreakdown = {
  recent_exposure_penalty?: number;
  anchor_repeat_bonus?: number;
  accessory_rotation_penalty?: number;
  movement_family_rotation_bonus?: number;
  joint_stress_sensitivity_penalty?: number;
};

/** Tunable weights (additive). */
export const HISTORY_WEIGHTS = {
  recent_exposure_penalty: 1.0,
  anchor_repeat_bonus: 0.8,
  accessory_rotation_penalty: 1.0,
  movement_family_rotation_bonus: 0.5,
  joint_stress_sensitivity_penalty: 1.0,
};

const ACCESSORY_ROLES = new Set(["accessory", "isolation"]);
const WARMUP_COOLDOWN_ROLES = new Set(["warmup", "prep", "cooldown", "mobility"]);

function norm(s: string | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s/g, "_");
}

/**
 * Resolve effective history context: merge training_history with legacy recent_history.
 * Caller can pass pre-merged context; this is for when only input.recent_history exists.
 */
export function getEffectiveRecentIds(
  inputRecentIds: Set<string> | undefined,
  context: TrainingHistoryContext | undefined
): Set<string> {
  const fromContext = context?.recently_used_exercise_ids;
  if (fromContext?.length) return new Set(fromContext);
  return inputRecentIds ?? new Set();
}

/**
 * Penalty for exercises done very recently. Stronger when variety is desired (e.g. accessory block).
 * Exact repeat in last 1 session = higher penalty; in last 2–3 = smaller penalty.
 */
export function scoreRecentExposurePenalty(
  exerciseId: string,
  recentIds: Set<string>,
  options: {
    blockType?: string;
    /** When true (e.g. accessory/warmup), apply stronger penalty for exact repeat. */
    preferVariety?: boolean;
    /** Sessions back: 0 = last session, 1 = second-to-last. */
  } = {}
): { score: number; reason?: string } {
  if (!recentIds.has(exerciseId)) return { score: 0 };
  const preferVariety = options.preferVariety ?? false;
  const penalty = preferVariety ? -2.5 : -1.5;
  return { score: penalty, reason: "recent_exposure" };
}

/**
 * Legacy hook for anchor repeat scoring on main blocks. Always returns 0: selection must not bias
 * toward repeating the same compound (hub exercises dominated when this rewarded repeats).
 * Progression signals stay in the recommendation / prescription layer.
 */
export function scoreAnchorRepeatBonus(
  _exercise: Exercise,
  _exposureCount: number,
  blockType: string | undefined,
  _lastCompletionSuccess?: boolean
): { score: number; reason?: string } {
  const bt = blockType?.toLowerCase().replace(/\s/g, "_");
  if (bt !== "main_strength" && bt !== "main_hypertrophy") return { score: 0 };
  return { score: 0 };
}

/**
 * Penalty for accessories (or warmup/cooldown) that have been overused recently.
 */
export function scoreAccessoryRotationPenalty(
  exercise: Exercise,
  exposureCount: number,
  blockType: string | undefined,
  threshold = 3
): { score: number; reason?: string } {
  const role = getCanonicalExerciseRole({
    id: exercise.id,
    exercise_role: exercise.exercise_role,
  });
  if (!role) return { score: 0 };
  if (ACCESSORY_ROLES.has(role) || WARMUP_COOLDOWN_ROLES.has(role)) {
    if (exposureCount >= threshold) return { score: -1.2, reason: "accessory_overused" };
  }
  return { score: 0 };
}

/**
 * Small bonus when exercise's movement family is under-represented in recent exposure.
 */
export function scoreMovementFamilyRotationBonus(
  exercise: Exercise,
  familyExposureCount: number,
  _blockType?: string
): { score: number; reason?: string } {
  if (familyExposureCount <= 0) return { score: 0.3, reason: "family_fresh" };
  if (familyExposureCount >= 4) return { score: 0 };
  return { score: 0 };
}

/**
 * Soft penalty when exercise has high joint stress and that region has been stressed often recently.
 */
export function scoreJointStressSensitivityPenalty(
  exercise: Exercise,
  stressRegionExposureCount: number,
  threshold = 3
): { score: number; reason?: string } {
  const tags = exercise.joint_stress_tags ?? exercise.tags?.joint_stress ?? [];
  if (!tags.length) return { score: 0 };
  if (stressRegionExposureCount >= threshold) return { score: -0.4, reason: "joint_stress_recent" };
  return { score: 0 };
}

/**
 * Get exposure count for an exercise from context.
 */
export function getExerciseExposureCount(
  exerciseId: string,
  context: TrainingHistoryContext | undefined
): number {
  return context?.exposure?.by_exercise?.[exerciseId] ?? 0;
}

/**
 * Get movement-family exposure (sum over families for this exercise).
 */
export function getMovementFamilyExposureForExercise(
  exercise: Exercise,
  context: TrainingHistoryContext | undefined
): number {
  const { primary } = getCanonicalMovementFamilies({
    id: exercise.id,
    primary_movement_family: exercise.primary_movement_family,
    movement_pattern: exercise.movement_pattern,
    muscle_groups: exercise.muscle_groups,
  });
  if (!primary) return 0;
  return context?.exposure?.by_movement_family?.[primary] ?? 0;
}

/**
 * Compute all history-based score components for one exercise. Returns total and breakdown.
 */
export function computeHistoryScoreComponents(
  exercise: Exercise,
  options: {
    recentIds: Set<string>;
    blockType?: string;
    preferVariety?: boolean;
    historyContext?: TrainingHistoryContext;
    /** Last time this exercise was performed: completed well (true), poorly (false), or unknown (undefined). */
    lastCompletionSuccess?: boolean;
  }
): { total: number; breakdown: HistoryScoreBreakdown } {
  const breakdown: HistoryScoreBreakdown = {};
  let total = 0;
  const { recentIds, blockType, preferVariety, historyContext, lastCompletionSuccess } = options;

  const exposureCount = getExerciseExposureCount(exercise.id, historyContext);
  const familyExposure = getMovementFamilyExposureForExercise(exercise, historyContext);

  const exposurePenalty = scoreRecentExposurePenalty(exercise.id, recentIds, {
    blockType,
    // Stronger exact-repeat penalty on main work too (same hub compounds dominated when this was weak).
    preferVariety: preferVariety ?? true,
  });
  if (exposurePenalty.score !== 0) {
    breakdown.recent_exposure_penalty = exposurePenalty.score * HISTORY_WEIGHTS.recent_exposure_penalty;
    total += breakdown.recent_exposure_penalty!;
  }

  const anchorBonus = scoreAnchorRepeatBonus(exercise, exposureCount, blockType, lastCompletionSuccess);
  if (anchorBonus.score !== 0) {
    breakdown.anchor_repeat_bonus = anchorBonus.score * HISTORY_WEIGHTS.anchor_repeat_bonus;
    total += breakdown.anchor_repeat_bonus!;
  }

  const accessoryPenalty = scoreAccessoryRotationPenalty(exercise, exposureCount, blockType);
  if (accessoryPenalty.score !== 0) {
    breakdown.accessory_rotation_penalty = accessoryPenalty.score * HISTORY_WEIGHTS.accessory_rotation_penalty;
    total += breakdown.accessory_rotation_penalty!;
  }

  const familyBonus = scoreMovementFamilyRotationBonus(exercise, familyExposure, blockType);
  if (familyBonus.score !== 0) {
    breakdown.movement_family_rotation_bonus = familyBonus.score * HISTORY_WEIGHTS.movement_family_rotation_bonus;
    total += breakdown.movement_family_rotation_bonus!;
  }

  const stressPenalty = scoreJointStressSensitivityPenalty(exercise, exposureCount);
  if (stressPenalty.score !== 0) {
    breakdown.joint_stress_sensitivity_penalty = stressPenalty.score * HISTORY_WEIGHTS.joint_stress_sensitivity_penalty;
    total += breakdown.joint_stress_sensitivity_penalty!;
  }

  return { total, breakdown };
}
