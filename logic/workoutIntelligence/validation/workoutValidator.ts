/**
 * Phase 8: Post-assembly validation and constraint enforcement.
 * Validates generated workout against constraints and attempts simple repairs.
 */

import type { ResolvedWorkoutConstraints } from "../constraints/constraintTypes";
import {
  isExerciseAllowedByInjuries,
  matchesBodyPartFocus,
  satisfiesBlockRequirement,
  isMobilityOrStretchExercise,
  canPairInSuperset,
} from "../constraints/eligibilityHelpers";
import { getSupersetPairingScore } from "../supersetPairing";
import type { ExerciseWithQualities } from "../types";

/** Roles that must not appear in main work blocks (align with cooldownSelection.MAIN_WORK_EXCLUDED_ROLES). */
const MAIN_WORK_EXCLUDED_ROLES = new Set(["cooldown", "stretch", "mobility", "breathing"]);

/** Minimal block item for validation (generator uses items[].exercise_id). */
export interface ValidatableItem {
  exercise_id: string;
  exercise_name?: string;
  [key: string]: unknown;
}

/** Minimal block for validation. */
export interface ValidatableBlock {
  block_type: string;
  items: ValidatableItem[];
  title?: string;
  format?: string;
  estimated_minutes?: number;
  reasoning?: string;
  [key: string]: unknown;
}

/** Workout shape that validator accepts (generator WorkoutSession satisfies this). */
export interface ValidatableWorkout {
  title?: string;
  estimated_duration_minutes?: number;
  blocks: ValidatableBlock[];
  debug?: unknown;
}

export type ValidationIssueType =
  | "body_part_focus"
  | "injury_restriction"
  | "cooldown_mobility_required"
  | "block_role_placement"
  | "superset_pairing";

export interface ValidationIssue {
  type: ValidationIssueType;
  block: ValidatableBlock;
  blockIndex: number;
  exercise?: ValidatableItem;
  exerciseId?: string;
  description: string;
  repaired?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  violations: ValidationIssue[];
  repairedWorkout?: ValidatableWorkout;
}

const WORKING_BLOCK_TYPES = new Set([
  "main_strength", "main_hypertrophy", "power", "accessory", "conditioning",
]);

/** Treat generator Exercise as ExerciseWithQualities for eligibility (same ontology fields). */
function asQualities(ex: { id: string; name?: string; [k: string]: unknown }): ExerciseWithQualities {
  return ex as unknown as ExerciseWithQualities;
}

/** Deep clone workout for repair mutations. */
function cloneWorkout<T extends ValidatableWorkout>(workout: T): T {
  return JSON.parse(JSON.stringify(workout)) as T;
}

/** Get set of exercise IDs currently in the workout. */
function usedExerciseIds(workout: ValidatableWorkout): Set<string> {
  const ids = new Set<string>();
  for (const block of workout.blocks) {
    for (const item of block.items) ids.add(item.exercise_id);
  }
  return ids;
}

/** Find a replacement exercise: allowed by injuries, matches body-part, not already in workout, same block-role appropriateness. */
function findReplacement(
  currentId: string,
  blockType: string,
  constraints: ResolvedWorkoutConstraints,
  exercisesById: Map<string, ExerciseWithQualities>,
  usedIds: Set<string>,
  options: { forMainWork?: boolean; forCooldown?: boolean }
): ExerciseWithQualities | null {
  const isMain = WORKING_BLOCK_TYPES.has(blockType);
  const isCooldown = blockType === "cooldown" || blockType === "mobility" || blockType === "recovery";

  for (const ex of exercisesById.values()) {
    if (ex.id === currentId || usedIds.has(ex.id)) continue;
    if (!isExerciseAllowedByInjuries(ex, constraints)) continue;
    if (constraints.allowed_movement_families != null && constraints.allowed_movement_families.length > 0 && isMain) {
      if (!matchesBodyPartFocus(ex, constraints, blockType)) continue;
    }
    const role = ex.exercise_role?.toLowerCase().replace(/\s/g, "_");
    if (options.forMainWork && role && MAIN_WORK_EXCLUDED_ROLES.has(role)) continue;
    if (options.forCooldown && !isMobilityOrStretchExercise(ex)) continue;
    return ex;
  }
  return null;
}

/** Replace one item in a block with a new exercise (preserve item shape, swap id/name). */
function replaceItem(
  block: ValidatableBlock,
  itemIndex: number,
  newEx: { id: string; name: string }
): void {
  const item = block.items[itemIndex];
  if (!item) return;
  item.exercise_id = newEx.id;
  item.exercise_name = newEx.name;
}

/**
 * Validate workout against constraints and attempt repairs.
 * Accepts GeneratedWorkout / WorkoutSession (blocks with items, block_type).
 * Does not throw; returns violations and optional repaired workout.
 */
export function validateWorkoutAgainstConstraints(
  workout: ValidatableWorkout,
  constraints: ResolvedWorkoutConstraints,
  exercises: Array<{ id: string; name?: string; [k: string]: unknown }>
): ValidationResult {
  const violations: ValidationIssue[] = [];
  const exercisesById = new Map<string, ExerciseWithQualities>();
  for (const ex of exercises) exercisesById.set(ex.id, asQualities(ex));

  let repaired = cloneWorkout(workout);
  let usedIds = usedExerciseIds(repaired);
  let anyRepair = false;

  // 1) Injury constraints
  for (let bi = 0; bi < repaired.blocks.length; bi++) {
    const block = repaired.blocks[bi];
    for (let ii = 0; ii < block.items.length; ii++) {
      const item = block.items[ii];
      const ex = exercisesById.get(item.exercise_id);
      if (!ex) continue;
      if (!isExerciseAllowedByInjuries(ex, constraints)) {
        const replacement = findReplacement(
          item.exercise_id,
          block.block_type,
          constraints,
          exercisesById,
          usedIds,
          { forMainWork: WORKING_BLOCK_TYPES.has(block.block_type), forCooldown: block.block_type === "cooldown" }
        );
        if (replacement) {
          replaceItem(block, ii, replacement);
          usedIds = usedExerciseIds(repaired);
          anyRepair = true;
        } else {
          violations.push({
            type: "injury_restriction",
            block,
            blockIndex: bi,
            exercise: item,
            exerciseId: item.exercise_id,
            description: `Exercise ${ex.name ?? item.exercise_id} violates injury/restriction rules.`,
            repaired: false,
          });
        }
      }
    }
  }

  // 2) Body-part focus (main work only)
  usedIds = usedExerciseIds(repaired);
  for (let bi = 0; bi < repaired.blocks.length; bi++) {
    const block = repaired.blocks[bi];
    if (constraints.allowed_movement_families == null || constraints.allowed_movement_families.length === 0) continue;
    if (!WORKING_BLOCK_TYPES.has(block.block_type)) continue;
    for (let ii = 0; ii < block.items.length; ii++) {
      const item = block.items[ii];
      const ex = exercisesById.get(item.exercise_id);
      if (!ex) continue;
      if (!matchesBodyPartFocus(ex, constraints, block.block_type)) {
        const replacement = findReplacement(
          item.exercise_id,
          block.block_type,
          constraints,
          exercisesById,
          usedIds,
          { forMainWork: true }
        );
        if (replacement) {
          replaceItem(block, ii, replacement);
          exercisesById.set(replacement.id, replacement);
          usedIds = usedExerciseIds(repaired);
          anyRepair = true;
        } else {
          violations.push({
            type: "body_part_focus",
            block,
            blockIndex: bi,
            exercise: item,
            exerciseId: item.exercise_id,
            description: `Exercise does not match body-part focus (${constraints.allowed_movement_families.join(", ")}).`,
            repaired: false,
          });
        }
      }
    }
  }

  // 3) Block role placement: main work must not contain cooldown/stretch/mobility/breathing roles
  usedIds = usedExerciseIds(repaired);
  for (let bi = 0; bi < repaired.blocks.length; bi++) {
    const block = repaired.blocks[bi];
    if (!WORKING_BLOCK_TYPES.has(block.block_type)) continue;
    for (let ii = 0; ii < block.items.length; ii++) {
      const item = block.items[ii];
      const ex = exercisesById.get(item.exercise_id);
      if (!ex) continue;
      const role = ex.exercise_role?.toLowerCase().replace(/\s/g, "_");
      if (role && MAIN_WORK_EXCLUDED_ROLES.has(role)) {
        const replacement = findReplacement(
          item.exercise_id,
          block.block_type,
          constraints,
          exercisesById,
          usedIds,
          { forMainWork: true }
        );
        if (replacement) {
          replaceItem(block, ii, replacement);
          usedIds = usedExerciseIds(repaired);
          anyRepair = true;
        } else {
          violations.push({
            type: "block_role_placement",
            block,
            blockIndex: bi,
            exercise: item,
            exerciseId: item.exercise_id,
            description: `Exercise with role "${role}" should not appear in main work block.`,
            repaired: false,
          });
        }
      }
    }
  }

  // 4) Required cooldown mobility
  if (constraints.min_cooldown_mobility_exercises > 0) {
    const cooldownBlockIndex = repaired.blocks.findIndex(
      (b) => b.block_type === "cooldown" || b.block_type === "mobility" || b.block_type === "recovery"
    );
    const byIdRepaired = new Map<string, ExerciseWithQualities>();
    for (const ex of exercises) byIdRepaired.set(ex.id, asQualities(ex));
    for (const block of repaired.blocks) {
      for (const item of block.items) {
        const ex = exercisesById.get(item.exercise_id) ?? byIdRepaired.get(item.exercise_id);
        if (ex) byIdRepaired.set(item.exercise_id, ex);
      }
    }

    if (cooldownBlockIndex === -1) {
      const pool = exercises.filter((ex) => {
        const q = asQualities(ex);
        return isMobilityOrStretchExercise(q) && !usedIds.has(ex.id);
      });
      const need = constraints.min_cooldown_mobility_exercises;
      const toAdd = pool.slice(0, need).map((ex) => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        sets: 1,
        reps: 8,
        time_seconds: 45,
        rest_seconds: 15,
        coaching_cues: "Controlled, full range of motion.",
        reasoning_tags: ["cooldown", "mobility"],
      }));
      if (toAdd.length >= need) {
        const newBlock: ValidatableBlock = {
          block_type: "cooldown",
          title: "Cooldown",
          format: "straight_sets",
          items: toAdd as ValidatableItem[],
        };
        repaired.blocks.push(newBlock);
        for (const item of toAdd) usedIds.add(item.exercise_id);
        anyRepair = true;
      } else {
        violations.push({
          type: "cooldown_mobility_required",
          block: repaired.blocks[repaired.blocks.length - 1]!,
          blockIndex: repaired.blocks.length - 1,
          description: "Missing cooldown/mobility block; required when mobility is a secondary goal.",
          repaired: false,
        });
      }
    } else {
      const cooldownBlock = repaired.blocks[cooldownBlockIndex]!;
      const slots = cooldownBlock.items.map((i) => ({ exercise_id: i.exercise_id }));
      const check = satisfiesBlockRequirement(
        cooldownBlock.block_type,
        slots,
        byIdRepaired,
        constraints
      );
      if (!check.satisfied && check.missing_mobility_count != null && check.missing_mobility_count > 0) {
        const pool = exercises.filter((ex) => {
          const q = asQualities(ex);
          return isMobilityOrStretchExercise(q) && !usedIds.has(ex.id);
        });
        const need = check.missing_mobility_count;
        const toAdd = pool.slice(0, need).map((ex) => ({
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets: 1,
          reps: 8,
          time_seconds: 45,
          rest_seconds: 15,
          coaching_cues: "Controlled, full range of motion.",
          reasoning_tags: ["cooldown", "mobility"],
        }));
        if (toAdd.length >= need) {
          for (const item of toAdd) {
            cooldownBlock.items.push(item as ValidatableItem);
            usedIds.add(item.exercise_id);
          }
          anyRepair = true;
        } else {
          violations.push({
            type: "cooldown_mobility_required",
            block: cooldownBlock,
            blockIndex: cooldownBlockIndex,
            description: `Cooldown requires ${constraints.min_cooldown_mobility_exercises} mobility/stretch exercises; found ${constraints.min_cooldown_mobility_exercises - check.missing_mobility_count}.`,
            repaired: false,
          });
        }
      }
    }
  }

  // 5) Superset compatibility (pairs in superset blocks)
  for (let bi = 0; bi < repaired.blocks.length; bi++) {
    const block = repaired.blocks[bi]!;
    if (block.format !== "superset" || block.items.length < 2) continue;
    for (let i = 0; i < block.items.length - 1; i += 2) {
      const itemA = block.items[i];
      const itemB = block.items[i + 1];
      if (!itemA || !itemB) continue;
      const exA = exercisesById.get(itemA.exercise_id);
      const exB = exercisesById.get(itemB.exercise_id);
      if (!exA || !exB) continue;
      if (!canPairInSuperset(exA, exB, constraints)) {
        const score = getSupersetPairingScore(exA, exB);
        const candidates = [...exercisesById.values()].filter(
          (c) => c.id !== exA.id && c.id !== exB.id && !usedIds.has(c.id) && canPairInSuperset(exA, c, constraints)
        );
        let best: ExerciseWithQualities | null = null;
        let bestScore = -Infinity;
        for (const c of candidates) {
          const s = getSupersetPairingScore(exA, c);
          if (s > bestScore) {
            bestScore = s;
            best = c;
          }
        }
        if (best) {
          replaceItem(block, i + 1, best);
          usedIds = usedExerciseIds(repaired);
          anyRepair = true;
        } else {
          violations.push({
            type: "superset_pairing",
            block,
            blockIndex: bi,
            exercise: itemB,
            exerciseId: itemB.exercise_id,
            description: `Superset pair (${exA.name}, ${exB.name}) violates pairing rules (score ${score}).`,
            repaired: false,
          });
        }
      }
    }
  }

  const valid = violations.length === 0;
  return {
    valid,
    violations,
    repairedWorkout: anyRepair ? repaired : undefined,
  };
}
