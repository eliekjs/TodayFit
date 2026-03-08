/**
 * Phase 5: Resolve actual sets, reps, and rest from prescription style and context.
 * Heuristics: fatigue cost, duration tier, block position, energy level.
 */

import type { PrescriptionStyle } from "../types";
import type { DurationTier } from "../types";

export type ResolverContext = {
  /** Prescription style for this block. */
  style: PrescriptionStyle;
  /** Exercise fatigue cost (fewer sets if high). */
  fatigueCost: "low" | "medium" | "high";
  /** Duration tier (short = fewer sets). */
  durationTier: DurationTier;
  /** Energy level (low = fewer sets). */
  energyLevel: "low" | "medium" | "high";
  /** Block index (later blocks may get slightly fewer sets in long sessions). */
  blockIndex: number;
  /** Total blocks in session (for relative position). */
  totalBlocks: number;
};

/**
 * Resolve number of sets within style range.
 * High fatigue → toward min. Short duration → toward min. Low energy → toward min.
 */
export function resolveSets(ctx: ResolverContext): number {
  const { style, fatigueCost, durationTier, energyLevel } = ctx;
  let min = style.set_range_min;
  let max = style.set_range_max;
  if (min >= max) return min;

  let bias = 0.5;
  if (fatigueCost === "high") bias -= 0.3;
  else if (fatigueCost === "low") bias += 0.1;
  if (durationTier <= 30) bias -= 0.25;
  else if (durationTier >= 60) bias += 0.15;
  if (energyLevel === "low") bias -= 0.2;
  else if (energyLevel === "high") bias += 0.1;
  if (ctx.blockIndex >= ctx.totalBlocks - 1 && ctx.totalBlocks > 3) bias -= 0.1;

  bias = Math.max(0, Math.min(1, bias));
  const sets = Math.round(min + (max - min) * bias);
  return Math.max(min, Math.min(max, sets));
}

/**
 * Resolve rep range. Returns single number or "min-max" string.
 * Time-based styles (aerobic_steady, anaerobic_intervals) return 0 or special.
 */
export function resolveReps(ctx: ResolverContext): number | string {
  const { style } = ctx;
  if (style.rep_range_min === 0 && style.rep_range_max === 0) {
    return 0;
  }
  const min = style.rep_range_min;
  const max = style.rep_range_max;
  if (min >= max) return min;
  const mid = Math.round((min + max) / 2);
  if (max - min <= 3) return mid;
  return `${min}-${max}`;
}

/**
 * Resolve rest in seconds within style range.
 * High fatigue / strength → toward max. Density / short session → toward min.
 */
export function resolveRest(ctx: ResolverContext): number | undefined {
  const { style, fatigueCost, durationTier } = ctx;
  const min = style.rest_seconds_min ?? 60;
  const max = style.rest_seconds_max ?? 90;
  if (min >= max) return min;

  let bias = 0.5;
  if (fatigueCost === "high") bias += 0.3;
  else if (fatigueCost === "low") bias -= 0.2;
  if (durationTier <= 30) bias -= 0.3;
  else if (durationTier >= 60) bias += 0.1;

  bias = Math.max(0, Math.min(1, bias));
  const rest = Math.round(min + (max - min) * bias);
  return Math.max(min, Math.min(max, rest));
}
