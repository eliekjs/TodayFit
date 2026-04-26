/**
 * Phase 5: Duration-aware set scaling and fatigue check.
 * Reduces sets only (no exercise selection changes) to fit duration and fatigue budget.
 */

import type { GeneratedWorkout } from "../workoutTypes";
import type { BlockType } from "../types";
import { getDurationTier } from "../sessionShaping";

function minSetsForBlockType(blockType: BlockType): number {
  if (blockType === "main_strength" || blockType === "main_hypertrophy" || blockType === "accessory") {
    return 3;
  }
  return 1;
}

/** Duration tier -> scale factor for set counts (1 = full, <1 = reduce). */
const SET_SCALE_BY_DURATION: Record<number, number> = {
  20: 0.6,
  30: 0.75,
  45: 0.9,
  60: 1,
  75: 1,
};

/**
 * Scale sets down for short sessions. Returns new set count (at least 1).
 */
export function scaleSetsByDuration(
  sets: number,
  durationMinutes: number
): number {
  const tier = getDurationTier(durationMinutes);
  const scale = SET_SCALE_BY_DURATION[tier] ?? 1;
  const scaled = Math.round(sets * scale);
  const minFloor = sets >= 3 ? 3 : 1;
  return Math.max(minFloor, scaled);
}

/**
 * If total session volume (sum of sets across exercises) would exceed budget,
 * reduce sets on lower-priority blocks (accessory, core, later blocks).
 * Does NOT change exercise selection.
 */
export function reduceSetsToFitFatigue(
  workout: GeneratedWorkout,
  fatigueBudget: number
): void {
  let totalSets = 0;
  for (const block of workout.blocks) {
    for (const slot of block.exercises) {
      const p = slot.prescription;
      if (p?.sets) totalSets += p.sets;
    }
  }
  if (totalSets <= fatigueBudget * 2) return;

  const blockPriority: BlockType[] = [
    "warmup",
    "prep",
    "cooldown",
    "mobility",
    "recovery",
    "accessory",
    "core",
    "carry",
    "conditioning",
    "main_hypertrophy",
    "main_strength",
    "power",
    "skill",
  ];
  const priority = (bt: BlockType) => {
    const i = blockPriority.indexOf(bt);
    return i >= 0 ? i : 99;
  };

  const blocksByPriority = [...workout.blocks].sort(
    (a, b) => priority(a.block_type) - priority(b.block_type)
  );

  let remaining = totalSets - Math.floor(fatigueBudget * 2);
  for (const block of blocksByPriority) {
    if (remaining <= 0) break;
    for (const slot of block.exercises) {
      if (remaining <= 0) break;
      const p = slot.prescription;
      if (!p || p.sets <= 1) continue;
      const minSets = minSetsForBlockType(block.block_type);
      const reduce = Math.min(remaining, p.sets - minSets);
      if (reduce > 0) {
        p.sets = Math.max(minSets, p.sets - reduce);
        remaining -= reduce;
      }
    }
  }
}

/** Block types that count as "main" work for main vs accessory ratio. */
const MAIN_BLOCK_TYPES = new Set<BlockType>([
  "main_strength",
  "main_hypertrophy",
  "power",
]);

/**
 * Enforce: (1) never more accessory sets than main sets,
 * (2) when doing accessory, target 75% main / 25% accessory.
 * Mutates workout in place by reducing accessory block set counts if needed.
 */
export function enforceMainAccessoryRatio(workout: GeneratedWorkout): void {
  let mainSets = 0;
  let accessorySets = 0;
  const accessoryBlocks: typeof workout.blocks = [];

  for (const block of workout.blocks) {
    let blockSets = 0;
    for (const slot of block.exercises) {
      const s = slot.prescription?.sets ?? 0;
      blockSets += s;
    }
    if (MAIN_BLOCK_TYPES.has(block.block_type)) {
      mainSets += blockSets;
    } else if (block.block_type === "accessory") {
      accessorySets += blockSets;
      accessoryBlocks.push(block);
    }
  }

  if (accessoryBlocks.length === 0 || accessorySets === 0) return;

  // Never more accessory than main; when doing accessory, 75% main / 25% accessory → accessory ≤ main/3.
  const maxAccessory = Math.min(mainSets, Math.floor(mainSets / 3));
  if (accessorySets <= maxAccessory) return;

  let toRemove = accessorySets - maxAccessory;
  // Reduce sets in accessory blocks (slots with most sets first) until we're at or below maxAccessory.
  const slotsWithSets: { block: (typeof workout.blocks)[0]; slot: (typeof workout.blocks)[0]["exercises"][0] }[] = [];
  for (const block of accessoryBlocks) {
    for (const slot of block.exercises) {
      if (slot.prescription && slot.prescription.sets > 0) {
        slotsWithSets.push({ block, slot });
      }
    }
  }
  slotsWithSets.sort(
    (a, b) => (b.slot.prescription?.sets ?? 0) - (a.slot.prescription?.sets ?? 0)
  );

  for (const { slot } of slotsWithSets) {
    if (toRemove <= 0) break;
    const p = slot.prescription!;
    const minSets = minSetsForBlockType("accessory");
    const reduce = Math.min(toRemove, p.sets - minSets);
    if (reduce > 0) {
      p.sets = Math.max(minSets, p.sets - reduce);
      toRemove -= reduce;
    }
  }
}
