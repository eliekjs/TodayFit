/**
 * Merges goal and sport weights into a single session target vector.
 * Used by the generator to score exercises against "what this session is for."
 */

import { TRAINING_QUALITY_SLUGS } from "./trainingQualities";
import type { TrainingQualitySlug } from "./trainingQualities";
import type { SessionTargetVector } from "./types";
import { getGoalQualityWeights } from "./goalQualityWeights";
import { getSportQualityWeights } from "./sportQualityWeights";

export type MergeTargetInput = {
  primary_goal: string;
  secondary_goals?: string[];
  sport_slugs?: string[];
  /** Weights for [primary, secondary, tertiary]; should sum to 1. Default [0.6, 0.3, 0.1]. */
  goal_weights?: number[];
  /** When sports present: weight for sport vector vs goal vector (0 = goals only, 1 = sport only). Default 0.5. */
  sport_weight?: number;
};

const DEFAULT_GOAL_WEIGHTS = [0.6, 0.3, 0.1];

/**
 * Build a single normalized target vector from goals and optional sports.
 * Each quality gets a 0–1 weight; vector is normalized so max weight is 1.
 */
export function mergeTargetVector(input: MergeTargetInput): SessionTargetVector {
  const out = new Map<TrainingQualitySlug, number>();

  const goalOrder = [
    input.primary_goal,
    ...(input.secondary_goals ?? []),
  ].filter(Boolean);
  const goalWeights = input.goal_weights ?? DEFAULT_GOAL_WEIGHTS.slice(0, goalOrder.length);
  // Normalize goal weights to sum to 1
  const goalSum = goalWeights.reduce((a, b) => a + b, 0) || 1;
  const normalizedGoalWeights = goalWeights.map((w) => w / goalSum);

  // Goal contribution
  const sportWeight = input.sport_slugs?.length
    ? (input.sport_weight ?? 0.5)
    : 0;
  const goalBlend = 1 - sportWeight;

  for (let i = 0; i < goalOrder.length; i++) {
    const w = (normalizedGoalWeights[i] ?? 0) * goalBlend;
    const qualities = getGoalQualityWeights(goalOrder[i]);
    for (const [q, v] of Object.entries(qualities)) {
      if (typeof v === "number" && v > 0)
        out.set(q as TrainingQualitySlug, (out.get(q as TrainingQualitySlug) ?? 0) + w * v);
    }
  }

  // Sport contribution (average across selected sports)
  if (input.sport_slugs?.length && sportWeight > 0) {
    const perSport = sportWeight / input.sport_slugs.length;
    for (const slug of input.sport_slugs) {
      const qualities = getSportQualityWeights(slug);
      for (const [q, v] of Object.entries(qualities)) {
        if (typeof v === "number" && v > 0)
          out.set(q as TrainingQualitySlug, (out.get(q as TrainingQualitySlug) ?? 0) + perSport * v);
      }
    }
  }

  // Normalize so max = 1 (keeps relative emphasis, scales to 0–1)
  let max = 0;
  out.forEach((v) => {
    if (v > max) max = v;
  });
  if (max > 0) {
    out.forEach((v, k) => out.set(k, v / max));
  }

  return out;
}

/**
 * Dot product of exercise quality vector with target vector (both 0–1).
 * Returns 0–1 alignment score. Missing qualities treated as 0.
 */
export function alignmentScore(
  exerciseWeights: Partial<Record<TrainingQualitySlug, number>>,
  targetVector: SessionTargetVector
): number {
  let dot = 0;
  let targetNorm = 0;
  targetVector.forEach((tw, q) => {
    const ew = exerciseWeights[q] ?? 0;
    dot += ew * tw;
    targetNorm += tw * tw;
  });
  if (targetNorm <= 0) return 0;
  return Math.min(1, dot / Math.sqrt(targetNorm));
}
