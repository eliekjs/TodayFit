/**
 * Trail-running within-pool quality (NOT gating): running-specific bonuses, carry/step de-emphasis, redundancy.
 */

import { hashString } from "../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../types";
import { getTrailRunningPatternCategoriesForExercise } from "./trailRunningExerciseCategories";
import type { TrailRunningPatternCategory } from "./trailRunningTypes";

export type TrailRunningQualityScoreContext = {
  sessionTrailCategoryCounts: Map<string, number>;
  emphasisBucket: number;
  blockType?: string;
};

export type TrailRunningQualityScoreBreakdown = {
  signature_bonus: number;
  emphasis_bonus: number;
  simplicity_transfer_bonus: number;
  redundancy_penalty: number;
  near_duplicate_penalty: number;
  carry_step_penalty: number;
  bilateral_squat_only_penalty: number;
  total: number;
};

export function computeTrailRunningEmphasisBucket(seed: number): number {
  return Math.abs(hashString(`trail_running_emphasis_${seed}`)) % 5;
}

const SIGNATURE_WEIGHTS: Partial<Record<TrailRunningPatternCategory, number>> = {
  running_conditioning: 1.2,
  downhill_eccentric_control: 1.15,
  ankle_foot_stability: 1.1,
  calf_soleus_durability: 1.2,
  elastic_reactive_lower: 1.05,
  unilateral_running_stability: 0.85,
  uphill_locomotion_support: 0.75,
  locomotion_core_stability: 0.55,
};

export function isSignatureTrailMovement(ex: Exercise): boolean {
  const c = getTrailRunningPatternCategoriesForExercise(ex);
  if (c.has("running_conditioning")) return true;
  if (c.has("downhill_eccentric_control") && c.has("unilateral_running_stability")) return true;
  if (c.has("ankle_foot_stability") && c.has("calf_soleus_durability")) return true;
  if (c.has("elastic_reactive_lower")) return true;
  return false;
}

export function addExerciseToTrailRunningSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  for (const cat of getTrailRunningPatternCategoriesForExercise(ex)) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const id = ex.id.toLowerCase();
  const t = `${id} ${(ex.name ?? "").toLowerCase()}`;
  if (
    /\b(lunge|split_squat|bulgarian|rfe|ffe|single_leg)\b/i.test(t) &&
    !/\b(step_up|stepup|calf_raise)\b/i.test(t)
  ) {
    counts.set("_session_trail_lunge_shape", (counts.get("_session_trail_lunge_shape") ?? 0) + 1);
  }
}

export function computeTrailRunningWithinPoolQualityScore(
  ex: Exercise,
  ctx: TrailRunningQualityScoreContext
): TrailRunningQualityScoreBreakdown {
  const cats = getTrailRunningPatternCategoriesForExercise(ex);
  const id = ex.id.toLowerCase();
  const block = (ctx.blockType ?? "").toLowerCase();

  let signature_bonus = 0;
  for (const [cat, w] of Object.entries(SIGNATURE_WEIGHTS)) {
    if (cats.has(cat as TrailRunningPatternCategory)) signature_bonus += w;
  }

  const b = ctx.emphasisBucket % 5;
  let emphasis_bonus = 0;
  if (b === 0) {
    if (cats.has("downhill_eccentric_control") || cats.has("ankle_foot_stability")) emphasis_bonus = 0.95;
  } else if (b === 1) {
    if (cats.has("uphill_locomotion_support") || cats.has("elastic_reactive_lower")) emphasis_bonus = 0.9;
  } else if (b === 2) {
    if (cats.has("calf_soleus_durability") || cats.has("ankle_foot_stability")) emphasis_bonus = 0.95;
  } else if (b === 3) {
    if (cats.has("elastic_reactive_lower") || cats.has("locomotion_core_stability")) emphasis_bonus = 0.85;
  } else {
    if (cats.has("unilateral_running_stability") || cats.has("running_conditioning")) emphasis_bonus = 0.45;
  }

  if (block === "conditioning" && cats.has("running_conditioning")) {
    emphasis_bonus += 0.9;
  }

  let simplicity_transfer_bonus = 0;
  if (!id.startsWith("ff_") && !ex.creative_variation) simplicity_transfer_bonus += 0.45;
  if (!/\b(overhead|snatch|clean_to|double_kettlebell|thruster)\b/i.test(id)) simplicity_transfer_bonus += 0.25;
  if (cats.has("overly_complex_skill_lift")) simplicity_transfer_bonus -= 1.35;

  const counts = ctx.sessionTrailCategoryCounts;
  let redundancy_penalty = 0;
  let near_duplicate_penalty = 0;

  const uni = counts.get("unilateral_running_stability") ?? 0;
  if (cats.has("unilateral_running_stability") && uni >= 2) redundancy_penalty += 0.95;

  const lungeShape = counts.get("_session_trail_lunge_shape") ?? 0;
  const isLungeShaped =
    /\b(lunge|split_squat|bulgarian|rfe|ffe)\b/i.test(id) && !/\b(step_up|stepup)\b/i.test(id);
  if (isLungeShaped && lungeShape >= 2) near_duplicate_penalty += 0.8;
  if (isLungeShaped && lungeShape >= 1 && uni >= 1) near_duplicate_penalty += 0.35;

  let carry_step_penalty = 0;
  if (cats.has("heavy_carry_dominant") || (cats.has("pack_load_carry_primary") && cats.size <= 2)) {
    carry_step_penalty += 1.15;
  }
  if (cats.has("hiking_step_stair_identity") && block === "main_strength") {
    carry_step_penalty += 0.65;
  }
  if (cats.has("hiking_step_stair_identity") && block === "main_hypertrophy") {
    carry_step_penalty += 0.45;
  }

  /** Prefer running-transfer shapes (split/lunge/elastic/downhill) over pure bilateral squat when both gate. */
  let bilateral_squat_only_penalty = 0;
  if (
    (block === "main_strength" || block === "main_hypertrophy") &&
    cats.has("uphill_locomotion_support") &&
    !cats.has("unilateral_running_stability") &&
    !cats.has("downhill_eccentric_control") &&
    !cats.has("elastic_reactive_lower")
  ) {
    bilateral_squat_only_penalty += 0.42;
  }

  const total =
    signature_bonus +
    emphasis_bonus +
    simplicity_transfer_bonus -
    redundancy_penalty -
    near_duplicate_penalty -
    carry_step_penalty -
    bilateral_squat_only_penalty;

  return {
    signature_bonus,
    emphasis_bonus,
    simplicity_transfer_bonus,
    redundancy_penalty,
    near_duplicate_penalty,
    carry_step_penalty,
    bilateral_squat_only_penalty,
    total,
  };
}
