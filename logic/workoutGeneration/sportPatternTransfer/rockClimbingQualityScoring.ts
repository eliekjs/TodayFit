/**
 * Within-pool quality for rock climbing main/hypertrophy selection.
 */

import { hashString } from "../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../types";
import { getRockClimbingPatternCategoriesForExercise } from "./rockClimbingExerciseCategories";
import type { RockClimbingPatternCategory } from "./rockClimbingTypes";
import { ROCK_CLIMBING_DEPRIORITIZED } from "./rockClimbingRules";

export type RockClimbingQualityScoreContext = {
  sessionRockCategoryCounts: Map<string, number>;
  emphasisBucket: number;
  blockType?: string;
};

export type RockClimbingQualityScoreBreakdown = {
  signature_bonus: number;
  emphasis_bonus: number;
  simplicity_transfer_bonus: number;
  redundancy_penalty: number;
  noise_penalty: number;
  total: number;
};

export function computeRockClimbingEmphasisBucket(seed: number): number {
  return Math.abs(hashString(`rock_climbing_emphasis_${seed}`)) % 5;
}

const SIGNATURE_WEIGHTS: Partial<Record<RockClimbingPatternCategory, number>> = {
  vertical_pull_transfer: 1.85,
  horizontal_pull_transfer: 1.55,
  unilateral_pull_brace: 1.35,
  scapular_stability_pull: 1.0,
  posterior_chain_climbing_support: 1.15,
  grip_hang_support: 1.05,
  trunk_bracing_climbing: 0.85,
};

export function addExerciseToRockSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  for (const cat of getRockClimbingPatternCategoriesForExercise(ex)) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
}

export function computeRockClimbingWithinPoolQualityScore(
  ex: Exercise,
  ctx: RockClimbingQualityScoreContext
): RockClimbingQualityScoreBreakdown {
  const cats = getRockClimbingPatternCategoriesForExercise(ex);
  const id = ex.id.toLowerCase();
  const counts = ctx.sessionRockCategoryCounts;

  let signature_bonus = 0;
  for (const [cat, w] of Object.entries(SIGNATURE_WEIGHTS)) {
    if (cats.has(cat as RockClimbingPatternCategory)) signature_bonus += w;
  }

  const b = ctx.emphasisBucket % 5;
  let emphasis_bonus = 0;
  if (b === 0 || b === 1) {
    if (cats.has("vertical_pull_transfer") || cats.has("grip_hang_support")) emphasis_bonus = 1.05;
  } else if (cats.has("horizontal_pull_transfer") || cats.has("unilateral_pull_brace")) {
    emphasis_bonus = 0.9;
  } else if (cats.has("posterior_chain_climbing_support")) {
    emphasis_bonus = 0.75;
  }

  let simplicity_transfer_bonus = 0.15;
  if (/(^|_)clean|snatch|muscle_up/i.test(id)) simplicity_transfer_bonus -= 0.8;
  if (cats.has("bench_horizontal_push_identity")) simplicity_transfer_bonus -= 0.5;

  let redundancy_penalty = 0;
  for (const cat of cats) {
    const n = counts.get(cat) ?? 0;
    if (n >= 1 && SIGNATURE_WEIGHTS[cat as RockClimbingPatternCategory]) redundancy_penalty += 0.35 * n;
  }

  let noise_penalty = 0;
  for (const d of ROCK_CLIMBING_DEPRIORITIZED) {
    if (cats.has(d as RockClimbingPatternCategory)) noise_penalty += 0.65;
  }

  const total = Math.max(
    0,
    signature_bonus + emphasis_bonus + simplicity_transfer_bonus - redundancy_penalty - noise_penalty
  );

  return {
    signature_bonus,
    emphasis_bonus,
    simplicity_transfer_bonus,
    redundancy_penalty,
    noise_penalty,
    total,
  };
}
