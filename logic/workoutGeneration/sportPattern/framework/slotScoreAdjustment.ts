import type { Exercise } from "../../types";
import type { SportPatternSlotRule, SportPatternSlotScoreWeights } from "./types";

/**
 * Generic slot scoring delta for pattern transfer (gate/prefer/deprioritize).
 * Sport supplies category sets and numeric weights (e.g. hiking `HIKING_SCORE_*`).
 */
export function computeSportPatternSlotScoreAdjustment(
  ex: Exercise,
  rule: SportPatternSlotRule,
  mode: "gated" | "fallback" | undefined,
  getCategoriesForExercise: (ex: Exercise) => Set<string>,
  weights: SportPatternSlotScoreWeights
): {
  delta: number;
  matchedGate: boolean;
  matchedPrefer: boolean;
  matchedDeprioritized: boolean;
} {
  const cats = getCategoriesForExercise(ex);
  const matchedGate = rule.gateMatchAnyOf.some((c) => cats.has(c));
  const matchedPrefer = rule.preferMatchAnyOf.some((c) => cats.has(c));
  const matchedDeprioritized = rule.deprioritizeMatchAnyOf.some((c) => cats.has(c));

  let delta = 0;
  if (mode === "fallback") {
    if (matchedGate) delta += weights.matchGateFallback;
    else if (matchedPrefer) delta += weights.matchPrefer;
  } else if (mode === "gated") {
    if (matchedPrefer) delta += weights.matchPrefer;
    const preferHits = rule.preferMatchAnyOf.filter((c) => cats.has(c)).length;
    if (preferHits > 1) delta += 0.35 * (preferHits - 1);
  }
  if (matchedDeprioritized && !matchedGate && !matchedPrefer) {
    delta -= weights.deprioritized;
  }
  return { delta, matchedGate, matchedPrefer, matchedDeprioritized };
}
