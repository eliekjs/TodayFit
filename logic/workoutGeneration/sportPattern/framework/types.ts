/**
 * Generic sport-pattern transfer types (no sport-specific categories).
 * Sport modules (e.g. hiking) supply string category ids and slot rules that reference them.
 */

import type { Exercise } from "../../types";

/**
 * One slot’s selection/scoring contract: gate categories, preferred boosts, deprioritized penalties.
 * Sport modules define concrete category string ids (see hiking `HikingPatternCategory`).
 */
export type SportPatternSlotRule = {
  slotRuleId: string;
  blockTypes: readonly string[];
  gateMatchAnyOf: readonly string[];
  preferMatchAnyOf: readonly string[];
  deprioritizeMatchAnyOf: readonly string[];
};

/** Pool selection mode after gating. */
export type SportPatternPoolMode = "gated" | "full_pool_fallback";

/**
 * Result of slot gating: if any exercise matches the gate, selection uses only matches;
 * full-pool fallback only when matchCount === 0.
 */
export type SportPatternGateResult = {
  gated: Exercise[];
  matchCount: number;
  hasMatches: boolean;
  poolForSelection: Exercise[];
  poolMode: SportPatternPoolMode;
  usedFullPoolFallback: boolean;
  requiredCount?: number;
};

export type SportPatternGateOptions = {
  applyMainWorkExclusions?: boolean;
  requiredCount?: number;
};

/** Weights for `computeSportPatternSlotScoreAdjustment` (sport-specific constants). */
export type SportPatternSlotScoreWeights = {
  /** Boost gate match when pool is in fallback mode (full pool). */
  matchGateFallback: number;
  /** Boost preferred categories (gated or fallback). */
  matchPrefer: number;
  /** Penalty when only deprioritized patterns match. */
  deprioritized: number;
};
