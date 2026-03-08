/**
 * Phase 5: Duration-aware set scaling and fatigue check.
 * Reduces sets only (no exercise selection changes) to fit duration and fatigue budget.
 */

import type { GeneratedWorkout } from "../workoutTypes";
import type { BlockType } from "../types";
import { getDurationTier } from "../sessionShaping";

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
  return Math.max(1, scaled);
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
      const reduce = Math.min(remaining, p.sets - 1);
      if (reduce > 0) {
        p.sets = Math.max(1, p.sets - reduce);
        remaining -= reduce;
      }
    }
  }
}
