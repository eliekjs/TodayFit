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

/** Pool selection mode after gating (and progressive relaxation when enabled). */
export type SportPatternPoolMode =
  | "gated"
  | "sport_preferred_pool"
  | "sport_quality_pool"
  | "full_pool_fallback";

/**
 * Which relaxation tier produced `poolForSelection`.
 * `strict_gate` = primary gate matches (after optional main-work refine).
 */
export type SportPatternSelectionTier =
  | "strict_gate"
  | "sport_preferred"
  | "sport_quality_aligned"
  | "full_pool_degraded";

/**
 * Result of slot gating: if any exercise matches the gate, selection uses only matches;
 * With progressive ladder: try prefer → quality-aligned → full pool before degrading.
 */
export type SportPatternGateTelemetry = {
  full_pool_count: number;
  raw_gate_match_count: number;
  refined_gated_count: number;
  /** Tier-2 pool size (sport-preferred categories), when ladder ran. */
  prefer_match_count?: number;
  /** Tier-3 pool size (sport quality / alignment filter), when ladder ran. */
  quality_aligned_count?: number;
  selection_tier?: SportPatternSelectionTier;
};

export type SportPatternGateResult = {
  /** Exercises matching strict tier-1 gate (after refine); may be empty when a relaxed tier supplied the pool. */
  gated: Exercise[];
  /** Count of strict tier-1 matches (refined); 0 when selection uses prefer/quality/full pool. */
  matchCount: number;
  /** True only when `selectionTier === "strict_gate"` (primary gate supplied the pool). */
  hasMatches: boolean;
  poolForSelection: Exercise[];
  poolMode: SportPatternPoolMode;
  /** True only for `full_pool_degraded` (generic full pool as last resort). */
  usedFullPoolFallback: boolean;
  selectionTier: SportPatternSelectionTier;
  requiredCount?: number;
  /** Intent-survival: pool sizes at each gate stage (no effect on selection). */
  telemetry?: SportPatternGateTelemetry;
};

export type SportPatternGateOptions = {
  applyMainWorkExclusions?: boolean;
  requiredCount?: number;
};

/**
 * Optional progressive fallback (tier 2 = prefer, tier 3 = quality-aligned subset, tier 4 = full pool).
 * When omitted, behavior is binary: strict gate or immediate full pool (hiking/trail default).
 */
export type SportPatternProgressiveLadderHooks = {
  exerciseMatchesPrefer: (ex: Exercise, preferCategories: readonly string[]) => boolean;
  filterQualityAlignedPool: (args: {
    fullPool: Exercise[];
    blockType: string;
    rule: SportPatternSlotRule;
  }) => Exercise[];
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
