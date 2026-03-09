/**
 * Phase 4/7: Superset pairing engine.
 * Pairing compatibility, numeric score (ontology-aware), and assembly of 2-exercise supersets.
 */

import type { ExerciseWithQualities } from "../types";
import type { PairingScore, SelectionConfig } from "./scoreTypes";
import {
  supersetCompatibility,
  getSupersetPairingScore,
  type PairingInput,
} from "../supersetPairing";
import { DEFAULT_SELECTION_CONFIG } from "./scoringConfig";

/**
 * Pairing compatibility and numeric score for A + B (ontology-aware when fields present).
 */
export function pairingScore(
  a: ExerciseWithQualities | PairingInput,
  b: ExerciseWithQualities | PairingInput,
  config: SelectionConfig = DEFAULT_SELECTION_CONFIG
): PairingScore {
  const numeric = getSupersetPairingScore(a, b);
  const compat = supersetCompatibility(a, b);
  const goodBonus = config.pairing_good_bonus;
  const badPenalty = config.pairing_bad_penalty;
  if (compat === "good") return { compatibility: "good", score: goodBonus };
  if (compat === "bad") return { compatibility: "bad", score: badPenalty, reason: "poor_pair" };
  if (numeric > 0) return { compatibility: "neutral", score: numeric };
  if (numeric < 0) return { compatibility: "bad", score: badPenalty, reason: "poor_pair" };
  return { compatibility: "neutral", score: 0 };
}

/**
 * From scored candidates, build 2-exercise superset pairs.
 * Picks best anchor by score, then best partner by pairing score; repeats until min_items reached or no more pairs.
 */
export function assembleSupersetPairs(
  scoredCandidates: { exercise: ExerciseWithQualities; score: number }[],
  usedIds: Set<string>,
  minItems: number,
  maxItems: number,
  config: SelectionConfig = DEFAULT_SELECTION_CONFIG
): ExerciseWithQualities[] {
  const available = scoredCandidates.filter((x) => !usedIds.has(x.exercise.id));
  const selected: ExerciseWithQualities[] = [];
  const used = new Set(usedIds);

  while (selected.length < maxItems && available.length > 0) {
    const remaining = available.filter((x) => !used.has(x.exercise.id));
    if (remaining.length === 0) break;

    let bestAnchor: typeof remaining[0] | null = null;
    let bestPartner: ExerciseWithQualities | null = null;
    let bestPairScore = -Infinity;

    for (const anchor of remaining) {
      for (const other of remaining) {
        if (other.exercise.id === anchor.exercise.id) continue;
        const { score: pairScore } = pairingScore(anchor.exercise, other.exercise, config);
        const total = anchor.score + other.score + pairScore;
        if (total > bestPairScore) {
          bestPairScore = total;
          bestAnchor = anchor;
          bestPartner = other.exercise;
        }
      }
    }

    if (!bestAnchor || !bestPartner) {
      if (selected.length >= minItems) break;
      const fallback = remaining.sort((a, b) => b.score - a.score)[0];
      if (fallback) {
        selected.push(fallback.exercise);
        used.add(fallback.exercise.id);
      }
      break;
    }

    selected.push(bestAnchor.exercise, bestPartner);
    used.add(bestAnchor.exercise.id);
    used.add(bestPartner.id);
  }

  return selected;
}
