/**
 * Post-assembly session duration enforcement: scale power-block volume before dropping whole blocks.
 */

import type { BlockType, WorkoutBlock, WorkoutItem } from "./types";

function estimateItemMinutes(item: WorkoutItem): number {
  if (item.time_seconds != null && item.time_seconds > 0) {
    return (item.sets ?? 1) * (item.time_seconds / 60);
  }
  const sets = item.sets ?? 3;
  const restSec = item.rest_seconds ?? 60;
  return sets * (0.5 + Math.min(restSec, 120) / 60);
}

function blockMinutes(block: WorkoutBlock): number {
  if (block.estimated_minutes != null && block.estimated_minutes > 0) {
    return block.estimated_minutes;
  }
  return block.items.reduce((sum, item) => sum + estimateItemMinutes(item), 0);
}

function recomputeBlockEstimate(block: WorkoutBlock): void {
  block.estimated_minutes = Math.max(2, Math.round(block.items.reduce((s, i) => s + estimateItemMinutes(i), 0)));
}

function durationHardCap(targetMinutes: number): number {
  return targetMinutes <= 30 ? targetMinutes + 6 : targetMinutes + 8;
}

const POWER_BLOCK_TYPE: BlockType = "power";

/**
 * When session exceeds budget after post-passes, trim power-block sets and drop lowest-priority items.
 * Mutates blocks in place.
 */
export function enforceSessionDurationBudget(blocks: WorkoutBlock[], targetMinutes: number | undefined): void {
  if (!targetMinutes || targetMinutes <= 0) return;
  const hardCap = durationHardCap(targetMinutes);

  let total = blocks.reduce((s, b) => s + blockMinutes(b), 0);
  if (total <= hardCap) return;

  const powerBlocks = blocks.filter((b) => b.block_type === POWER_BLOCK_TYPE);

  for (const block of powerBlocks) {
    while (total > hardCap) {
      let reduced = false;
      for (const item of block.items) {
        const sets = item.sets ?? 3;
        if (sets <= 2) continue;
        item.sets = sets - 1;
        total -= 0.5 + Math.min(item.rest_seconds ?? 60, 120) / 60;
        reduced = true;
        recomputeBlockEstimate(block);
        if (total <= hardCap) break;
      }
      if (!reduced) break;
    }
  }

  for (const block of blocks) {
    if (block.block_type === POWER_BLOCK_TYPE) recomputeBlockEstimate(block);
  }
}

/** Max power exercises by session duration tier. */
export function maxPowerExercisesForDuration(durationMinutes: number): number {
  if (durationMinutes <= 30) return 2;
  if (durationMinutes <= 45) return 3;
  return 4;
}
