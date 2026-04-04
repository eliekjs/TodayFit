/**
 * Within-pool quality for running family (road vs trail emphasis).
 */

import { hashString } from "../../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../../types";
import { getRunningPatternCategoriesForExercise } from "./exerciseRunningCategories";
import type { RunningPatternCategory, RunningSportKind } from "./runningPatternTypes";

/** Shared shape for trail + road within-pool quality (field name `sessionTrailCategoryCounts` is historical). */
export type RunningFamilyQualityContext = {
  sessionTrailCategoryCounts: Map<string, number>;
  emphasisBucket: number;
  blockType?: string;
};

const TRAIL_SIGNATURE: Partial<Record<RunningPatternCategory, number>> = {
  running_conditioning: 1.2,
  downhill_eccentric_control: 1.15,
  ankle_foot_stability: 1.1,
  calf_soleus_durability: 1.2,
  elastic_reactive_lower: 1.05,
  unilateral_running_stability: 0.85,
  uphill_locomotion_support: 0.75,
  locomotion_core_stability: 0.55,
};

const ROAD_SIGNATURE: Partial<Record<RunningPatternCategory, number>> = {
  calf_soleus_durability: 1.28,
  ankle_foot_stability: 1.22,
  unilateral_running_stability: 1.05,
  locomotion_core_stability: 0.95,
  uphill_locomotion_support: 0.88,
  downhill_eccentric_control: 0.82,
  running_conditioning: 1.12,
};

export type RunningFamilyQualityBreakdown = {
  signature_bonus: number;
  emphasis_bonus: number;
  simplicity_transfer_bonus: number;
  redundancy_penalty: number;
  near_duplicate_penalty: number;
  carry_step_penalty: number;
  bilateral_squat_only_penalty: number;
  total: number;
};

export function computeRunningEmphasisBucket(seed: number, kind: RunningSportKind): number {
  return Math.abs(hashString(`${kind}_emphasis_${seed}`)) % 5;
}

export function isSignatureRunningMovement(ex: Exercise, kind: RunningSportKind): boolean {
  const c = getRunningPatternCategoriesForExercise(ex);
  if (c.has("running_conditioning")) return true;
  if (kind === "trail_running") {
    if (c.has("downhill_eccentric_control") && c.has("unilateral_running_stability")) return true;
    if (c.has("ankle_foot_stability") && c.has("calf_soleus_durability")) return true;
    if (c.has("elastic_reactive_lower")) return true;
  } else {
    if (c.has("calf_soleus_durability") && c.has("ankle_foot_stability")) return true;
    if (c.has("unilateral_running_stability") && (c.has("uphill_locomotion_support") || c.has("locomotion_core_stability"))) {
      return true;
    }
  }
  return false;
}

export function isTrailForwardSteppingLungePattern(ex: Exercise): boolean {
  const t = `${ex.id} ${ex.name ?? ""}`.toLowerCase();
  if (/\b(bulgarian|split\s*squat|rfe|ffe|rear\s*foot|cyclist\s*squat|step[\s._-]*up|box\s*step)\b/i.test(t)) {
    return false;
  }
  if (/\b(reverse|lateral|curtsy|side)\s*lunge|lunge\s*\(?\s*reverse|lunge.*\blateral\b/i.test(t)) {
    return false;
  }
  return /\blunge\b/.test(t);
}

export function addExerciseToRunningSessionCounts(ex: Exercise, counts: Map<string, number>, kind: RunningSportKind): void {
  for (const cat of getRunningPatternCategoriesForExercise(ex)) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  if (kind !== "trail_running") return;
  const id = ex.id.toLowerCase();
  const t = `${id} ${(ex.name ?? "").toLowerCase()}`;
  if (
    /\b(lunge|split_squat|bulgarian|rfe|ffe|single_leg)\b/i.test(t) &&
    !/\b(step_up|stepup|calf_raise)\b/i.test(t)
  ) {
    counts.set("_session_trail_lunge_shape", (counts.get("_session_trail_lunge_shape") ?? 0) + 1);
  }
  if (isTrailForwardSteppingLungePattern(ex)) {
    counts.set(
      "_session_trail_forward_lunge_family",
      (counts.get("_session_trail_forward_lunge_family") ?? 0) + 1
    );
  }
}

export function computeRunningWithinPoolQualityScore(
  ex: Exercise,
  ctx: RunningFamilyQualityContext,
  kind: RunningSportKind
): RunningFamilyQualityBreakdown {
  const cats = getRunningPatternCategoriesForExercise(ex);
  const id = ex.id.toLowerCase();
  const block = (ctx.blockType ?? "").toLowerCase();
  const sigW = kind === "road_running" ? ROAD_SIGNATURE : TRAIL_SIGNATURE;

  let signature_bonus = 0;
  for (const [cat, w] of Object.entries(sigW)) {
    if (cats.has(cat as RunningPatternCategory)) signature_bonus += w;
  }

  const b = ctx.emphasisBucket % 5;
  let emphasis_bonus = 0;
  if (kind === "trail_running") {
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
  } else {
    if (b === 0) {
      if (cats.has("calf_soleus_durability") || cats.has("ankle_foot_stability")) emphasis_bonus = 1.05;
    } else if (b === 1) {
      if (cats.has("unilateral_running_stability") || cats.has("locomotion_core_stability")) emphasis_bonus = 0.95;
    } else if (b === 2) {
      if (cats.has("uphill_locomotion_support") || cats.has("downhill_eccentric_control")) emphasis_bonus = 0.9;
    } else if (b === 3) {
      if (cats.has("locomotion_core_stability")) emphasis_bonus = 0.88;
    } else {
      if (cats.has("running_conditioning")) emphasis_bonus = 0.55;
    }
  }

  if (block === "conditioning" && cats.has("running_conditioning")) {
    emphasis_bonus += kind === "road_running" ? 0.85 : 0.9;
  }

  let simplicity_transfer_bonus = 0;
  if (!id.startsWith("ff_") && !ex.creative_variation) simplicity_transfer_bonus += 0.45;
  if (!/\b(overhead|snatch|clean_to|double_kettlebell|thruster)\b/i.test(id)) simplicity_transfer_bonus += 0.25;
  if (cats.has("overly_complex_skill_lift")) simplicity_transfer_bonus -= 1.35;
  if (kind === "road_running" && cats.has("lateral_agility_flashy")) simplicity_transfer_bonus -= 0.95;

  const counts = ctx.sessionTrailCategoryCounts;
  let redundancy_penalty = 0;
  let near_duplicate_penalty = 0;

  const uni = counts.get("unilateral_running_stability") ?? 0;
  if (cats.has("unilateral_running_stability") && uni >= 2) redundancy_penalty += kind === "road_running" ? 0.88 : 0.95;

  const lungeShape = counts.get("_session_trail_lunge_shape") ?? 0;
  const isLungeShaped =
    /\b(lunge|split_squat|bulgarian|rfe|ffe)\b/i.test(id) && !/\b(step_up|stepup)\b/i.test(id);
  if (kind === "trail_running") {
    if (isLungeShaped && lungeShape >= 1) near_duplicate_penalty += 0.5;
    if (isLungeShaped && lungeShape >= 2) near_duplicate_penalty += 0.85;
    if (isLungeShaped && lungeShape >= 3) near_duplicate_penalty += 1.35;
    if (isLungeShaped && lungeShape >= 1 && uni >= 1) near_duplicate_penalty += 0.35;

    const forwardLunge = counts.get("_session_trail_forward_lunge_family") ?? 0;
    const isForwardLunge = isTrailForwardSteppingLungePattern(ex);
    if (isForwardLunge && forwardLunge >= 1) near_duplicate_penalty += 0.75;
    if (isForwardLunge && forwardLunge >= 2) near_duplicate_penalty += 1.25;
    if (isForwardLunge && forwardLunge >= 3) near_duplicate_penalty += 2.1;
  } else {
    if (isLungeShaped && lungeShape >= 2) near_duplicate_penalty += 0.55;
    if (isLungeShaped && lungeShape >= 3) near_duplicate_penalty += 1.0;
  }

  let carry_step_penalty = 0;
  if (cats.has("heavy_carry_dominant") || (cats.has("pack_load_carry_primary") && cats.size <= 2)) {
    carry_step_penalty += kind === "road_running" ? 1.35 : 1.15;
  }
  if (cats.has("hiking_step_stair_identity") && block === "main_strength") {
    carry_step_penalty += kind === "road_running" ? 0.95 : 0.65;
  }
  if (cats.has("hiking_step_stair_identity") && block === "main_hypertrophy") {
    carry_step_penalty += kind === "road_running" ? 0.72 : 0.45;
  }
  if (kind === "road_running" && cats.has("lateral_agility_flashy") && (block === "main_strength" || block === "main_hypertrophy")) {
    carry_step_penalty += 1.05;
  }

  let bilateral_squat_only_penalty = 0;
  const squatOnlyThreshold = kind === "road_running" ? 0.58 : 0.42;
  if (
    (block === "main_strength" || block === "main_hypertrophy") &&
    cats.has("uphill_locomotion_support") &&
    !cats.has("unilateral_running_stability") &&
    !cats.has("downhill_eccentric_control") &&
    !cats.has("elastic_reactive_lower")
  ) {
    bilateral_squat_only_penalty += squatOnlyThreshold;
  }
  if (kind === "road_running" && cats.has("elastic_reactive_lower") && (block === "main_strength" || block === "main_hypertrophy")) {
    bilateral_squat_only_penalty += 0.35;
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
