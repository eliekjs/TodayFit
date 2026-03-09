/**
 * Phase 4: Session-level fatigue accumulation during selection.
 * Tracks running fatigue total and block-level consumption.
 */

import type { ExerciseWithQualities } from "../types";
import type { SessionSelectionState } from "./scoreTypes";
import type { SessionFatigueBudget } from "../types";
import { getNumericFatigueBudget } from "../sessionShaping";
import { getFatigueCostNumber } from "./scoringConfig";

const GRIP_QUALITIES = new Set(["grip_strength", "forearm_endurance"]);
/** Canonical + legacy joint-stress slugs for shoulder (see lib/ontology JOINT_STRESS_TAGS). */
const SHOULDER_STRESS = new Set(["shoulder_overhead", "shoulder_extension_load", "shoulder_extension", "grip_hanging"]);
const HEAVY_PATTERNS = new Set(["hinge", "squat"]);

function isGripHeavy(ex: ExerciseWithQualities): boolean {
  const q = ex.training_quality_weights ?? {};
  return Object.keys(q).some((k) => GRIP_QUALITIES.has(k));
}

function isShoulderLoad(ex: ExerciseWithQualities): boolean {
  const tags = ex.joint_stress ?? [];
  return tags.some((t) => SHOULDER_STRESS.has(t));
}

function isHeavyCompound(ex: ExerciseWithQualities): boolean {
  const pattern = ex.movement_pattern ?? "";
  const cost = ex.fatigue_cost ?? "medium";
  return HEAVY_PATTERNS.has(pattern) && cost === "high";
}

/**
 * Create initial session selection state from template and config.
 */
export function createSessionSelectionState(
  sessionFatigueBudget: SessionFatigueBudget,
  _config: { max_same_pattern_per_session: number }
): SessionSelectionState {
  const budget = getNumericFatigueBudget(sessionFatigueBudget);
  return {
    accumulated_fatigue: 0,
    session_fatigue_budget: budget,
    movement_pattern_counts: new Map(),
    used_exercise_ids: new Set(),
    block_fatigue_used: new Map(),
    grip_exercise_count: 0,
    shoulder_exercise_count: 0,
    heavy_compound_count: 0,
  };
}

/**
 * Fatigue contribution for one exercise (numeric).
 */
export function exerciseFatigueContribution(ex: ExerciseWithQualities): number {
  return getFatigueCostNumber(ex.fatigue_cost as "low" | "medium" | "high");
}

/**
 * Check if adding this exercise would exceed session fatigue budget.
 */
export function wouldExceedSessionFatigue(
  state: SessionSelectionState,
  exercise: ExerciseWithQualities
): boolean {
  const add = exerciseFatigueContribution(exercise);
  return state.accumulated_fatigue + add > state.session_fatigue_budget;
}

/**
 * Check if adding this exercise would exceed block fatigue share (optional).
 * blockFatigueShare is the template's fatigue_budget_share for this block.
 */
export function wouldExceedBlockFatigue(
  state: SessionSelectionState,
  blockIndex: number,
  exercise: ExerciseWithQualities,
  blockFatigueShare: number | undefined
): boolean {
  if (blockFatigueShare == null || blockFatigueShare <= 0) return false;
  const used = state.block_fatigue_used.get(blockIndex) ?? 0;
  const add = exerciseFatigueContribution(exercise);
  return used + add > blockFatigueShare;
}

/**
 * Update state after selecting an exercise. Mutates state.
 */
export function applyExerciseToState(
  state: SessionSelectionState,
  exercise: ExerciseWithQualities,
  blockIndex: number
): void {
  const cost = exerciseFatigueContribution(exercise);
  state.accumulated_fatigue += cost;
  state.used_exercise_ids.add(exercise.id);
  state.block_fatigue_used.set(blockIndex, (state.block_fatigue_used.get(blockIndex) ?? 0) + cost);
  state.movement_pattern_counts.set(
    exercise.movement_pattern ?? "unknown",
    (state.movement_pattern_counts.get(exercise.movement_pattern ?? "unknown") ?? 0) + 1
  );
  if (isGripHeavy(exercise)) state.grip_exercise_count += 1;
  if (isShoulderLoad(exercise)) state.shoulder_exercise_count += 1;
  if (isHeavyCompound(exercise)) state.heavy_compound_count += 1;
}
