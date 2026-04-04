/**
 * Within-pool quality for snow family — kind-aware penalties (snowboard lateral, XC poling, etc.).
 */

import { hashString } from "../../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../../types";
import { getSnowSportPatternCategoriesForExercise } from "./snowSportExerciseCategories";
import type { SnowSportKind, SnowSportPatternCategory } from "./snowSportTypes";

export type SnowSportQualityScoreContext = {
  /** Session category counts; optional when legacy `sessionAlpineCategoryCounts` is set on alpine context. */
  sessionSnowCategoryCounts?: Map<string, number>;
  emphasisBucket: number;
  blockType?: string;
};

/** Passed to `scoreExercise` for mountain snow family (any kind via `snowSportKind`). */
export type AlpineSkiingQualityScoreContext = SnowSportQualityScoreContext & {
  sessionAlpineCategoryCounts?: Map<string, number>;
  snowSportKind?: SnowSportKind;
};

export type SnowSportQualityScoreBreakdown = {
  signature_bonus: number;
  emphasis_bonus: number;
  simplicity_transfer_bonus: number;
  redundancy_penalty: number;
  near_duplicate_penalty: number;
  sagittal_only_penalty: number;
  locomotion_identity_penalty: number;
  total: number;
};

export function computeSnowSportEmphasisBucket(seed: number, kind: SnowSportKind): number {
  return Math.abs(hashString(`snow_sport_emphasis_${kind}_${seed}`)) % 5;
}

/** Alpine seed hash preserved for test stability when kind is alpine. */
export function computeAlpineSkiingEmphasisBucket(seed: number): number {
  return computeSnowSportEmphasisBucket(seed, "alpine_skiing");
}

const SIGNATURE_WEIGHTS: Partial<Record<SnowSportPatternCategory, number>> = {
  eccentric_braking_control: 1.7,
  lateral_frontal_plane_stability: 1.55,
  landing_deceleration_support: 1.2,
  sustained_tension_lower_body: 1.45,
  quad_dominant_endurance: 1.1,
  trunk_bracing_dynamic: 1.05,
  hip_knee_control: 0.45,
  nordic_poling_pull_endurance: 1.35,
  uphill_skin_travel_endurance: 1.25,
  snowboard_asymmetric_stance: 1.4,
};

export function isSignatureSnowSportMovement(ex: Exercise, kind: SnowSportKind): boolean {
  const c = getSnowSportPatternCategoriesForExercise(ex);
  if (kind === "snowboarding") {
    if (c.has("snowboard_asymmetric_stance") && (c.has("lateral_frontal_plane_stability") || c.has("eccentric_braking_control")))
      return true;
  }
  if (c.has("eccentric_braking_control") && (c.has("hip_knee_control") || c.has("lateral_frontal_plane_stability")))
    return true;
  if (c.has("lateral_frontal_plane_stability") && c.has("trunk_bracing_dynamic")) return true;
  if (c.has("landing_deceleration_support") && c.has("eccentric_braking_control")) return true;
  if (kind === "xc_skiing" && c.has("nordic_poling_pull_endurance") && c.has("trunk_bracing_dynamic")) return true;
  return false;
}

export function isSignatureAlpineMovement(ex: Exercise): boolean {
  return isSignatureSnowSportMovement(ex, "alpine_skiing");
}

export function addExerciseToSnowSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  for (const cat of getSnowSportPatternCategoriesForExercise(ex)) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const id = ex.id.toLowerCase();
  if (/\b(lateral|side_|copenhagen|skater|pallof)\b/i.test(id)) {
    counts.set("_session_snow_lateral_shape", (counts.get("_session_snow_lateral_shape") ?? 0) + 1);
  }
}

export function addExerciseToAlpineSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  addExerciseToSnowSessionCounts(ex, counts);
}

function getCounts(ctx: SnowSportQualityScoreContext): Map<string, number> {
  const legacy = (ctx as AlpineSkiingQualityScoreContext).sessionAlpineCategoryCounts;
  return ctx.sessionSnowCategoryCounts ?? legacy ?? new Map();
}

export function computeSnowSportWithinPoolQualityScore(
  ex: Exercise,
  ctx: SnowSportQualityScoreContext,
  kind: SnowSportKind
): SnowSportQualityScoreBreakdown {
  const cats = getSnowSportPatternCategoriesForExercise(ex);
  const id = ex.id.toLowerCase();
  const block = (ctx.blockType ?? "").toLowerCase();
  const counts = getCounts(ctx);

  let signature_bonus = 0;
  for (const [cat, w] of Object.entries(SIGNATURE_WEIGHTS)) {
    if (cats.has(cat as SnowSportPatternCategory)) signature_bonus += w;
  }

  const b = ctx.emphasisBucket % 5;
  let emphasis_bonus = 0;
  if (kind === "xc_skiing") {
    if (b === 0 || b === 1) {
      if (cats.has("nordic_poling_pull_endurance")) emphasis_bonus = 1.0;
    } else if (cats.has("quad_dominant_endurance") || cats.has("sustained_tension_lower_body")) {
      emphasis_bonus = 0.9;
    } else if (cats.has("hip_knee_control")) emphasis_bonus = 0.75;
  } else if (kind === "snowboarding") {
    if (b === 0 || b === 1) {
      if (cats.has("lateral_frontal_plane_stability") || cats.has("snowboard_asymmetric_stance")) emphasis_bonus = 1.05;
    } else if (cats.has("eccentric_braking_control") || cats.has("landing_deceleration_support")) {
      emphasis_bonus = 0.95;
    } else if (cats.has("trunk_bracing_dynamic")) emphasis_bonus = 0.85;
  } else {
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
  }

  if (kind === "backcountry_skiing") {
    if (cats.has("uphill_skin_travel_endurance")) emphasis_bonus += 0.55;
    if (cats.has("locomotion_hiking_trail_identity") && block !== "main_strength") emphasis_bonus += 0.25;
  }

  if (block === "conditioning" && cats.has("ski_conditioning")) {
    emphasis_bonus += 0.85;
  }

  let simplicity_transfer_bonus = 0;
  if (!id.startsWith("ff_") && !ex.creative_variation) simplicity_transfer_bonus += 0.4;
  if (!/\b(overhead_snatch|clean_to|muscle_up|thruster_heavy)\b/i.test(id)) simplicity_transfer_bonus += 0.2;
  if (cats.has("overly_complex_skill_lift")) simplicity_transfer_bonus -= 1.35;

  let redundancy_penalty = 0;
  let near_duplicate_penalty = 0;

  const latShape = counts.get("_session_snow_lateral_shape") ?? 0;
  if (/\b(lateral|side_lunge|copenhagen|skater|pallof)\b/i.test(id) && latShape >= 2) near_duplicate_penalty += 0.75;

  const ecc = counts.get("eccentric_braking_control") ?? 0;
  if (cats.has("eccentric_braking_control") && ecc >= 2) redundancy_penalty += 0.65;

  let sagittal_only_penalty = 0;
  const sagittalMult = kind === "snowboarding" ? 1.35 : kind === "xc_skiing" ? 0.85 : 1;
  if (
    (block === "main_strength" || block === "main_hypertrophy") &&
    cats.has("low_transfer_sagittal_only") &&
    !cats.has("eccentric_braking_control") &&
    !cats.has("lateral_frontal_plane_stability") &&
    !(kind === "xc_skiing" && cats.has("nordic_poling_pull_endurance"))
  ) {
    sagittal_only_penalty += 0.55 * sagittalMult;
  }

  const hasStrongMainIdentity =
    cats.has("eccentric_braking_control") ||
    cats.has("sustained_tension_lower_body") ||
    cats.has("lateral_frontal_plane_stability") ||
    cats.has("landing_deceleration_support") ||
    (kind === "xc_skiing" && cats.has("nordic_poling_pull_endurance")) ||
    (kind === "snowboarding" && cats.has("snowboard_asymmetric_stance"));

  if ((block === "main_strength" || block === "main_hypertrophy") && cats.has("hip_knee_control") && !hasStrongMainIdentity) {
    sagittal_only_penalty += kind === "snowboarding" ? 1.45 : 1.2;
  }

  let locomotion_identity_penalty = 0;
  const hikingPen = kind === "backcountry_skiing" ? 0.35 : 0.95;
  if (cats.has("locomotion_hiking_trail_identity")) locomotion_identity_penalty += hikingPen;
  if (cats.has("running_gait_identity")) locomotion_identity_penalty += kind === "xc_skiing" ? 0.2 : 1.05;
  if (block === "main_strength" || block === "main_hypertrophy") {
    locomotion_identity_penalty += 0.15;
    if (cats.has("locomotion_hiking_trail_identity") && !hasStrongMainIdentity && kind !== "backcountry_skiing") {
      locomotion_identity_penalty += 1.6;
    }
  }

  if (block === "conditioning") {
    if (cats.has("ski_conditioning")) {
      emphasis_bonus += 0.55;
    } else {
      locomotion_identity_penalty += kind === "xc_skiing" ? 0.4 : 1.1;
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

export function computeAlpineSkiingWithinPoolQualityScore(
  ex: Exercise,
  ctx: AlpineSkiingQualityScoreContext
): SnowSportQualityScoreBreakdown {
  const kind = ctx.snowSportKind ?? "alpine_skiing";
  const merged: SnowSportQualityScoreContext = {
    ...ctx,
    sessionSnowCategoryCounts: ctx.sessionSnowCategoryCounts ?? ctx.sessionAlpineCategoryCounts ?? new Map(),
  };
  return computeSnowSportWithinPoolQualityScore(ex, merged, kind);
}
