/**
 * Post-assembly validation: ensure the generated workout complies with resolved constraints.
 */

import type { GeneratedWorkout, GeneratedBlock } from "../workoutTypes";
import type { ExerciseWithQualities } from "../types";
import type { ResolvedWorkoutConstraints } from "./constraintTypes";
import {
  deriveMovementFamily,
  isExerciseAllowedByInjuries,
  matchesBodyPartFocus,
  satisfiesBlockRequirement,
} from "./eligibilityHelpers";

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  /** Block index and exercise id to replace (for fix suggestions). */
  offending?: { blockIndex: number; exerciseId: string; reason: string }[];
}

/**
 * Validate a generated workout against resolved constraints.
 * Returns violations for hard_exclude, hard_include, and required_finishers.
 */
export function validateWorkoutAgainstConstraints(
  workout: GeneratedWorkout,
  exercisePool: ExerciseWithQualities[],
  constraints: ResolvedWorkoutConstraints
): ValidationResult {
  const violations: string[] = [];
  const offending: { blockIndex: number; exerciseId: string; reason: string }[] = [];
  const byId = new Map<string, ExerciseWithQualities>();
  for (const ex of exercisePool) byId.set(ex.id, ex);

  const workingBlockTypes = new Set([
    "main_strength",
    "main_hypertrophy",
    "power",
    "accessory",
    "conditioning",
  ]);

  for (let i = 0; i < workout.blocks.length; i++) {
    const block = workout.blocks[i];
    const blockType = block.block_type;

    for (const slot of block.exercises) {
      const ex = byId.get(slot.exercise_id);
      if (!ex) continue;

      if (!isExerciseAllowedByInjuries(ex, constraints)) {
        violations.push(`Exercise ${ex.name} (${ex.id}) violates injury/restriction rules.`);
        offending.push({ blockIndex: i, exerciseId: ex.id, reason: "injury_restriction" });
      }

      if (
        constraints.allowed_movement_families != null &&
        constraints.allowed_movement_families.length > 0 &&
        workingBlockTypes.has(blockType)
      ) {
        if (!matchesBodyPartFocus(ex, constraints, blockType)) {
          violations.push(
            `Exercise ${ex.name} (${ex.id}) does not match body-part focus (${constraints.allowed_movement_families.join(", ")}).`
          );
          offending.push({ blockIndex: i, exerciseId: ex.id, reason: "body_part_focus" });
        }
      }
    }

    const cooldownCheck = satisfiesBlockRequirement(
      blockType,
      block.exercises,
      byId,
      constraints
    );
    if (!cooldownCheck.satisfied && cooldownCheck.missing_mobility_count != null) {
      violations.push(
        `Block "${block.title}" (${blockType}) requires ${constraints.min_cooldown_mobility_exercises} mobility/stretch exercises; found ${constraints.min_cooldown_mobility_exercises - cooldownCheck.missing_mobility_count}.`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    offending: offending.length > 0 ? offending : undefined,
  };
}
