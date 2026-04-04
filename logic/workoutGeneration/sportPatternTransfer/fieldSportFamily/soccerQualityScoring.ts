/**
 * Within-pool quality for soccer (field sport) sessions.
 */

import { hashString } from "../../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../../types";
import { getSoccerPatternCategoriesForExercise } from "./soccerExerciseCategories";
import type { SoccerPatternCategory } from "./soccerPatternTypes";

export type SoccerQualityScoreContext = {
  sessionSoccerCategoryCounts: Map<string, number>;
  emphasisBucket: number;
  blockType?: string;
};

export type SoccerQualityBreakdown = {
  signature_bonus: number;
  emphasis_bonus: number;
  redundancy_penalty: number;
  total: number;
};

const SIGNATURE_WEIGHTS: Partial<Record<SoccerPatternCategory, number>> = {
  soccer_unilateral_strength: 1.15,
  soccer_deceleration_eccentric: 1.2,
  soccer_cod_lateral: 1.1,
  soccer_posterior_durability: 1.12,
  soccer_trunk_locomotion_brace: 0.95,
  soccer_sprint_loc_support: 1.05,
};

export function computeSoccerEmphasisBucket(seed: number): number {
  return Math.abs(hashString(`soccer_emphasis_${seed}`)) % 5;
}

export function isSignatureSoccerMovement(ex: Exercise): boolean {
  const c = getSoccerPatternCategoriesForExercise(ex);
  if (c.has("soccer_deceleration_eccentric") && c.has("soccer_unilateral_strength")) return true;
  if (c.has("soccer_cod_lateral") && (c.has("soccer_unilateral_strength") || c.has("soccer_posterior_durability"))) {
    return true;
  }
  if (c.has("soccer_sprint_loc_support") && c.has("soccer_unilateral_strength")) return true;
  return false;
}

export function addExerciseToSoccerSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  for (const cat of getSoccerPatternCategoriesForExercise(ex)) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
}

export function computeSoccerWithinPoolQualityScore(ex: Exercise, ctx: SoccerQualityScoreContext): SoccerQualityBreakdown {
  const cats = getSoccerPatternCategoriesForExercise(ex);
  let signature_bonus = 0;
  for (const [cat, w] of Object.entries(SIGNATURE_WEIGHTS)) {
    if (cats.has(cat as SoccerPatternCategory)) signature_bonus += w;
  }

  const b = ctx.emphasisBucket % 5;
  let emphasis_bonus = 0;
  if (b === 0 && (cats.has("soccer_deceleration_eccentric") || cats.has("soccer_posterior_durability"))) emphasis_bonus = 1;
  else if (b === 1 && (cats.has("soccer_cod_lateral") || cats.has("soccer_sprint_loc_support"))) emphasis_bonus = 1;
  else if (b === 2 && cats.has("soccer_unilateral_strength")) emphasis_bonus = 0.9;
  else if (b === 3 && cats.has("soccer_trunk_locomotion_brace")) emphasis_bonus = 0.85;
  else if (b === 4 && cats.has("soccer_posterior_durability")) emphasis_bonus = 0.95;

  let redundancy_penalty = 0;
  const sess = ctx.sessionSoccerCategoryCounts;
  for (const cat of cats) {
    const n = sess.get(cat) ?? 0;
    if (n >= 2) redundancy_penalty += 0.55 + (n - 2) * 0.35;
  }

  const total = signature_bonus + emphasis_bonus - redundancy_penalty;
  return { signature_bonus, emphasis_bonus, redundancy_penalty, total };
}
