/**
 * Explicit session intent for sport-prep days: planner → adapter → generator.
 * Selection logic may read this in a later phase; today it augments `GenerateWorkoutInput` only.
 */

import {
  ALPINE_DEPRIORITIZED_CATEGORIES,
  ALPINE_MAIN_GATE_MATCH_CATEGORIES,
  ALPINE_MAIN_PREFER_CATEGORIES,
} from "./sportPatternTransfer/alpineSkiingRules";

export type SessionIntentContractFallbackPolicy = {
  /** When true, enforcement may relax ordering/tiers stepwise (e.g. repair passes). */
  allowProgressiveRelaxation: boolean;
  /** When true, slot gating may use full-pool fallback if the gated pool is empty (current alpine behavior). */
  allowFullPoolFallback: boolean;
};

export type SessionIntentContractDegradedModeBehavior = {
  /** When true, callers should surface degraded state if required coverage is still unmet post-repair. */
  flagWhenRequirementsMissed: boolean;
};

/** Session-level coverage aligned with alpine minimum-coverage rules (other sports may extend). */
export type SessionIntentContractRequiredCoverage = {
  eccentricDecelMain: boolean;
  sustainedTensionLowerBody: boolean;
  lateralOrTrunkStability: boolean;
};

/**
 * Canonical sport-day intent. Category strings are sport-pattern ids (e.g. alpine `AlpineSkiingPatternCategory`).
 */
export type SessionIntentContract = {
  sportSlug: string;
  /**
   * Sport-specific session archetype (not generic goal labels like "endurance").
   * Examples: `alpine_downhill_transfer`, `trail_running_durability`.
   */
  sessionType: string;
  /** Optional finer block emphasis (e.g. `main_strength_lower`, `accessory_lateral`). */
  blockEmphasis?: string;
  /** Categories the session must express somewhere (gate or coverage; sport-defined). */
  mustIncludeCategories: string[];
  /** Categories to prefer when scoring or tie-breaking. */
  preferCategories: string[];
  /** Categories or pattern ids to deprioritize or avoid. */
  avoidCategories: string[];
  requiredCoverage: SessionIntentContractRequiredCoverage;
  fallbackPolicy: SessionIntentContractFallbackPolicy;
  degradedModeBehavior: SessionIntentContractDegradedModeBehavior;
};

/** Canonical slug for downhill / resort alpine skiing. */
export const ALPINE_SKIING_CONTRACT_SPORT_SLUG = "alpine_skiing";

/**
 * Alpine skiing: mirrors current slot gates, deprioritized set, and minimum-coverage expectations.
 * Does not replace `alpineSportSelectionRules`; it documents the same intent for upstream layers.
 */
export function buildAlpineSkiingSessionIntentContract(
  overrides?: Partial<Pick<SessionIntentContract, "blockEmphasis" | "sessionType">>
): SessionIntentContract {
  const preferUnique = [...new Set([...ALPINE_MAIN_PREFER_CATEGORIES])];
  return {
    sportSlug: ALPINE_SKIING_CONTRACT_SPORT_SLUG,
    sessionType: overrides?.sessionType ?? "alpine_downhill_resort_transfer",
    blockEmphasis: overrides?.blockEmphasis ?? "main_accessory_conditioning_ski_relevant",
    mustIncludeCategories: [...ALPINE_MAIN_GATE_MATCH_CATEGORIES],
    preferCategories: preferUnique,
    avoidCategories: [...ALPINE_DEPRIORITIZED_CATEGORIES],
    requiredCoverage: {
      eccentricDecelMain: true,
      sustainedTensionLowerBody: true,
      lateralOrTrunkStability: true,
    },
    fallbackPolicy: {
      allowProgressiveRelaxation: true,
      allowFullPoolFallback: true,
    },
    degradedModeBehavior: {
      flagWhenRequirementsMissed: true,
    },
  };
}

/**
 * Returns a contract for known sport-prep sports; `undefined` keeps non-contract paths unchanged.
 */
export function sessionIntentContractForSportSlug(sportSlug: string): SessionIntentContract | undefined {
  const n = sportSlug.trim().toLowerCase().replace(/\s/g, "_");
  if (n === "alpine_skiing") {
    return buildAlpineSkiingSessionIntentContract();
  }
  return undefined;
}
