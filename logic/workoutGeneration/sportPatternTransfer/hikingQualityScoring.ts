/**
 * Within-pool hiking/backpacking quality (NOT gating): bonuses, redundancy, seed-based emphasis.
 * Used after the gated pool is fixed so sessions favor transferable patterns and variety.
 */

import { hashString } from "../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../types";
import { getHikingPatternCategoriesForExercise } from "./hikingExerciseCategories";
import type { HikingPatternCategory } from "./types";

export type HikingQualityScoreContext = {
  sessionHikingCategoryCounts: Map<string, number>;
  emphasisBucket: number;
  blockType?: string;
};

export type HikingQualityScoreBreakdown = {
  signature_bonus: number;
  emphasis_bonus: number;
  simplicity_transfer_bonus: number;
  redundancy_penalty: number;
  near_duplicate_penalty: number;
  total: number;
};

/** 0–4: rotates which hiking families get a small extra nudge for the session. */
export function computeHikingEmphasisBucket(seed: number): number {
  return Math.abs(hashString(`hiking_emphasis_${seed}`)) % 5;
}

const SIGNATURE_CAT_WEIGHTS: Partial<Record<HikingPatternCategory, number>> = {
  locomotion_step_up: 1.55,
  descent_eccentric_control: 0.55,
  loaded_carry_pack_tolerance: 1.28,
  incline_stair_conditioning: 1.34,
  calf_ankle_durability: 0.75,
  tibialis_shin_strength: 0.7,
  trunk_bracing_under_load: 0.48,
  unilateral_knee_dominant: 0.2,
};

export function isSignatureHikingMovement(ex: Exercise): boolean {
  const cats = getHikingPatternCategoriesForExercise(ex);
  if (cats.has("locomotion_step_up") || cats.has("loaded_carry_pack_tolerance")) return true;
  if (cats.has("incline_stair_conditioning")) return true;
  return cats.has("descent_eccentric_control") && cats.has("unilateral_knee_dominant");
}

export function addExerciseToHikingSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  for (const c of getHikingPatternCategoriesForExercise(ex)) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const id = ex.id.toLowerCase();
  const t = `${id} ${(ex.name ?? "").toLowerCase()}`;
  if (
    /\b(lunge|split_squat|bulgarian|rear_foot_elevated|rear foot|ffe|rfe)\b/i.test(t) &&
    !/\b(step_up|stepup|box_step|bench_step)\b/i.test(t)
  ) {
    counts.set("_session_lunge_shape", (counts.get("_session_lunge_shape") ?? 0) + 1);
  }
}

export function computeHikingWithinPoolQualityScore(
  ex: Exercise,
  ctx: HikingQualityScoreContext
): HikingQualityScoreBreakdown {
  const cats = getHikingPatternCategoriesForExercise(ex);
  const id = ex.id.toLowerCase();
  const block = (ctx.blockType ?? "").toLowerCase();

  let signature_bonus = 0;
  for (const [cat, w] of Object.entries(SIGNATURE_CAT_WEIGHTS)) {
    if (cats.has(cat as HikingPatternCategory)) signature_bonus += w;
  }

  const b = ctx.emphasisBucket % 5;
  let emphasis_bonus = 0;
  if (b === 0) {
    if (cats.has("locomotion_step_up") || cats.has("descent_eccentric_control")) emphasis_bonus = 0.95;
  } else if (b === 1) {
    if (cats.has("loaded_carry_pack_tolerance") || cats.has("trunk_bracing_under_load")) emphasis_bonus = 0.9;
  } else if (b === 2) {
    if (cats.has("descent_eccentric_control") || cats.has("locomotion_step_up")) emphasis_bonus = 0.75;
    else if (cats.has("unilateral_knee_dominant")) emphasis_bonus = 0.35;
  } else if (b === 3) {
    if (cats.has("calf_ankle_durability") || cats.has("tibialis_shin_strength")) emphasis_bonus = 0.95;
  } else {
    if (
      cats.has("locomotion_step_up") ||
      cats.has("loaded_carry_pack_tolerance") ||
      cats.has("incline_stair_conditioning")
    ) {
      emphasis_bonus = 0.45;
    }
  }

  if (block === "conditioning" && cats.has("incline_stair_conditioning")) {
    emphasis_bonus += 0.85;
  }

  let simplicity_transfer_bonus = 0;
  if (!id.startsWith("ff_") && !ex.creative_variation) simplicity_transfer_bonus += 0.45;
  if (!/\b(overhead|snatch|clean_to|double_kettlebell|double_dumbbell|pistol)\b/i.test(id)) simplicity_transfer_bonus += 0.25;
  if (cats.has("overly_complex_skill_lift")) simplicity_transfer_bonus -= 1.4;

  const counts = ctx.sessionHikingCategoryCounts;
  let redundancy_penalty = 0;
  let near_duplicate_penalty = 0;

  const uni = counts.get("unilateral_knee_dominant") ?? 0;
  if (cats.has("unilateral_knee_dominant") && uni >= 2) redundancy_penalty += 1.05;

  const lungeShape = counts.get("_session_lunge_shape") ?? 0;
  const isLungeShaped =
    /\b(lunge|split_squat|bulgarian|rear_foot|ffe|rfe)\b/i.test(id) && !/\b(step_up|stepup|box_step)\b/i.test(id);
  if (isLungeShaped && lungeShape >= 2) near_duplicate_penalty += 0.85;
  if (isLungeShaped && lungeShape >= 1 && uni >= 1) near_duplicate_penalty += 0.35;

  const stepUpCount = counts.get("locomotion_step_up") ?? 0;
  if (cats.has("locomotion_step_up") && stepUpCount >= 2) near_duplicate_penalty += 0.25;

  const total =
    signature_bonus +
    emphasis_bonus +
    simplicity_transfer_bonus -
    redundancy_penalty -
    near_duplicate_penalty;

  return {
    signature_bonus,
    emphasis_bonus,
    simplicity_transfer_bonus,
    redundancy_penalty,
    near_duplicate_penalty,
    total,
  };
}
