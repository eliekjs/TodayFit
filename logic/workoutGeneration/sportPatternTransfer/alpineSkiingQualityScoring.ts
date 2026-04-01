/**
 * Alpine skiing within-pool quality: eccentric/lateral/quad endurance emphasis; penalize hiking/trail identity.
 */

import { hashString } from "../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../types";
import { getAlpineSkiingPatternCategoriesForExercise } from "./alpineSkiingExerciseCategories";
import type { AlpineSkiingPatternCategory } from "./alpineSkiingTypes";

export type AlpineSkiingQualityScoreContext = {
  sessionAlpineCategoryCounts: Map<string, number>;
  emphasisBucket: number;
  blockType?: string;
};

export type AlpineSkiingQualityScoreBreakdown = {
  signature_bonus: number;
  emphasis_bonus: number;
  simplicity_transfer_bonus: number;
  redundancy_penalty: number;
  near_duplicate_penalty: number;
  sagittal_only_penalty: number;
  locomotion_identity_penalty: number;
  total: number;
};

export function computeAlpineSkiingEmphasisBucket(seed: number): number {
  return Math.abs(hashString(`alpine_skiing_emphasis_${seed}`)) % 5;
}

const SIGNATURE_WEIGHTS: Partial<Record<AlpineSkiingPatternCategory, number>> = {
  eccentric_braking_control: 1.7,
  lateral_frontal_plane_stability: 1.55,
  landing_deceleration_support: 1.2,
  sustained_tension_lower_body: 1.45,
  quad_dominant_endurance: 1.1,
  trunk_bracing_dynamic: 1.05,
  hip_knee_control: 0.45,
};

export function isSignatureAlpineMovement(ex: Exercise): boolean {
  const c = getAlpineSkiingPatternCategoriesForExercise(ex);
  if (c.has("eccentric_braking_control") && (c.has("hip_knee_control") || c.has("lateral_frontal_plane_stability")))
    return true;
  if (c.has("lateral_frontal_plane_stability") && c.has("trunk_bracing_dynamic")) return true;
  if (c.has("landing_deceleration_support") && c.has("eccentric_braking_control")) return true;
  return false;
}

export function addExerciseToAlpineSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  for (const cat of getAlpineSkiingPatternCategoriesForExercise(ex)) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const id = ex.id.toLowerCase();
  if (/\b(lateral|side_|copenhagen|skater|pallof)\b/i.test(id)) {
    counts.set("_session_alpine_lateral_shape", (counts.get("_session_alpine_lateral_shape") ?? 0) + 1);
  }
}

export function computeAlpineSkiingWithinPoolQualityScore(
  ex: Exercise,
  ctx: AlpineSkiingQualityScoreContext
): AlpineSkiingQualityScoreBreakdown {
  const cats = getAlpineSkiingPatternCategoriesForExercise(ex);
  const id = ex.id.toLowerCase();
  const block = (ctx.blockType ?? "").toLowerCase();

  let signature_bonus = 0;
  for (const [cat, w] of Object.entries(SIGNATURE_WEIGHTS)) {
    if (cats.has(cat as AlpineSkiingPatternCategory)) signature_bonus += w;
  }

  const b = ctx.emphasisBucket % 5;
  let emphasis_bonus = 0;
  if (b === 0) {
    if (cats.has("eccentric_braking_control") || cats.has("landing_deceleration_support")) emphasis_bonus = 0.95;
  } else if (b === 1) {
    if (cats.has("lateral_frontal_plane_stability") || cats.has("trunk_bracing_dynamic")) emphasis_bonus = 0.9;
  } else if (b === 2) {
    if (cats.has("quad_dominant_endurance") || cats.has("sustained_tension_lower_body")) emphasis_bonus = 0.95;
  } else if (b === 3) {
    if (cats.has("hip_knee_control") || cats.has("eccentric_braking_control")) emphasis_bonus = 0.85;
  } else {
    if (cats.has("eccentric_braking_control") || cats.has("lateral_frontal_plane_stability")) emphasis_bonus = 0.5;
  }

  if (block === "conditioning" && cats.has("ski_conditioning")) {
    emphasis_bonus += 0.85;
  }

  let simplicity_transfer_bonus = 0;
  if (!id.startsWith("ff_") && !ex.creative_variation) simplicity_transfer_bonus += 0.4;
  if (!/\b(overhead_snatch|clean_to|muscle_up|thruster_heavy)\b/i.test(id)) simplicity_transfer_bonus += 0.2;
  if (cats.has("overly_complex_skill_lift")) simplicity_transfer_bonus -= 1.35;

  const counts = ctx.sessionAlpineCategoryCounts;
  let redundancy_penalty = 0;
  let near_duplicate_penalty = 0;

  const latShape = counts.get("_session_alpine_lateral_shape") ?? 0;
  if (/\b(lateral|side_lunge|copenhagen|skater|pallof)\b/i.test(id) && latShape >= 2) near_duplicate_penalty += 0.75;

  const ecc = counts.get("eccentric_braking_control") ?? 0;
  if (cats.has("eccentric_braking_control") && ecc >= 2) redundancy_penalty += 0.65;

  let sagittal_only_penalty = 0;
  if (
    (block === "main_strength" || block === "main_hypertrophy") &&
    cats.has("low_transfer_sagittal_only") &&
    !cats.has("eccentric_braking_control") &&
    !cats.has("lateral_frontal_plane_stability")
  ) {
    sagittal_only_penalty += 0.55;
  }

  const hasStrongMainIdentity =
    cats.has("eccentric_braking_control") ||
    cats.has("sustained_tension_lower_body") ||
    cats.has("lateral_frontal_plane_stability") ||
    cats.has("landing_deceleration_support");

  if ((block === "main_strength" || block === "main_hypertrophy") && cats.has("hip_knee_control") && !hasStrongMainIdentity) {
    sagittal_only_penalty += 1.2;
  }

  let locomotion_identity_penalty = 0;
  if (cats.has("locomotion_hiking_trail_identity")) locomotion_identity_penalty += 0.95;
  if (cats.has("running_gait_identity")) locomotion_identity_penalty += 1.05;
  if (block === "main_strength" || block === "main_hypertrophy") {
    locomotion_identity_penalty += 0.15;
    if (cats.has("locomotion_hiking_trail_identity") && !hasStrongMainIdentity) {
      locomotion_identity_penalty += 1.6;
    }
  }

  if (block === "conditioning") {
    if (cats.has("ski_conditioning")) {
      emphasis_bonus += 0.55;
    } else {
      locomotion_identity_penalty += 1.1;
    }
  }

  const total =
    signature_bonus +
    emphasis_bonus +
    simplicity_transfer_bonus -
    redundancy_penalty -
    near_duplicate_penalty -
    sagittal_only_penalty -
    locomotion_identity_penalty;

  return {
    signature_bonus,
    emphasis_bonus,
    simplicity_transfer_bonus,
    redundancy_penalty,
    near_duplicate_penalty,
    sagittal_only_penalty,
    locomotion_identity_penalty,
    total,
  };
}
