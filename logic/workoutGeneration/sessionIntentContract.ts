/**
 * Explicit session intent for sport-prep days: planner → adapter → generator.
 * Selection logic may read this in a later phase; today it augments `GenerateWorkoutInput` only.
 */

import { getCanonicalSportSlug } from "../../data/sportSubFocus";
import {
  ALPINE_DEPRIORITIZED_CATEGORIES,
  ALPINE_MAIN_GATE_MATCH_CATEGORIES,
  ALPINE_MAIN_PREFER_CATEGORIES,
} from "./sportPatternTransfer/alpineSkiingRules";
import {
  getSnowSportDeprioritized,
  getSnowSportSelectionRules,
} from "./sportPatternTransfer/snowSportFamily/snowSportFamilyRules";
import {
  ROCK_CLIMBING_DEPRIORITIZED,
  ROCK_CLIMBING_MAIN_GATE,
  ROCK_CLIMBING_MAIN_PREFER,
} from "./sportPatternTransfer/rockClimbingRules";
import { ROAD_RUNNING_MAIN_GATE_CATEGORIES } from "./sportPatternTransfer/runningFamily/roadRunningRules";
import {
  TRAIL_RUNNING_DEPRIORITIZED_CATEGORIES,
  TRAIL_RUNNING_MAIN_GATE_CATEGORIES,
  TRAIL_SUPPORT_COVERAGE_CATEGORIES,
} from "./sportPatternTransfer/trailRunningRules";
import {
  SOCCER_MAIN_GATE_CATEGORIES,
  SOCCER_SUPPORT_COVERAGE_CATEGORIES,
  soccerSportSelectionRules,
} from "./sportPatternTransfer/fieldSportFamily/soccerRules";
import type { FocusBodyPart, PrimaryGoal, UserLevel } from "./types";

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

/** Session-level coverage — snow fields for descent sports; optional flags for rock climbing. */
export type SessionIntentContractRequiredCoverage = {
  eccentricDecelMain: boolean;
  sustainedTensionLowerBody: boolean;
  lateralOrTrunkStability: boolean;
  /** Rock climbing: primary session work should express wall-relevant pull transfer. */
  climbingPullTransfer?: boolean;
  /** Rock climbing: trunk / bodyline emphasis is part of session intent. */
  climbingTrunkBracing?: boolean;
  /** Rock climbing: scapular / shoulder-health layer in intent. */
  climbingScapularLayer?: boolean;
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

/**
 * Flat, ranked intent entry for scoring and exercise–intent traceability.
 * Built by the adapter from selected goals / sub-goals / sports / sport sub-focuses.
 */
export type IntentEntry = {
  kind: "goal" | "goal_sub_focus" | "sport" | "sport_sub_focus";
  /** e.g. "endurance", "threshold_tempo", "trail_running", "uphill_endurance" */
  slug: string;
  /** For sub-focuses: which goal/sport owns this entry. */
  parent_slug?: string;
  /** 1 = highest priority. Assigned after weight-sorting. */
  rank: number;
  /** Normalized 0..1 across all entries (sums to 1). */
  weight: number;
  /** Exercise tag slugs (goal_tags / sport_tags / attribute_tags) to match against. */
  tag_slugs: string[];
};

/**
 * Direct user intent payload for a single generated session.
 * This is separate from sport-pattern contracts and captures the exact selections
 * from UI/adapter so generator stages can consume intent without lossy translation.
 */
export type SessionIntentSelection = {
  selected_goals: PrimaryGoal[];
  selected_sports: string[];
  goal_sub_focus_by_goal: Record<string, string[]>;
  sport_sub_focus_by_sport: Record<string, string[]>;
  user_level?: UserLevel;
  focus_body_parts?: FocusBodyPart[];
  sport_vs_goal_pct?: number;
  goal_weights?: number[];
  sport_weight?: number;
  /**
   * Flat ranked list of all intent entries (goals + sub-goals + sports + sport sub-focuses),
   * sorted descending by weight. Built by the adapter so generator stages and coverage
   * can score and link exercises directly to user intent without lossy translation.
   */
  ranked_intent_entries?: IntentEntry[];
};

/** Canonical slug for downhill / resort alpine skiing. */
export const ALPINE_SKIING_CONTRACT_SPORT_SLUG = "alpine_skiing";

/** Canonical slug for consolidated rock climbing prep (boulder / sport / trad / ice mapped upstream). */
export const ROCK_CLIMBING_CONTRACT_SPORT_SLUG = "rock_climbing";

export const ROAD_RUNNING_CONTRACT_SPORT_SLUG = "road_running";
export const TRAIL_RUNNING_CONTRACT_SPORT_SLUG = "trail_running";

export const SOCCER_CONTRACT_SPORT_SLUG = "soccer";

/**
 * Rock climbing: pull + shoulder/trunk support; avoids Oly / flashy metcon as session-defining work.
 */
/**
 * Road running: sagittal economy, calf/ankle/tendon, single-leg, trunk stiffness; avoids lateral/novelty as mains.
 */
export function buildRoadRunningSessionIntentContract(
  overrides?: Partial<Pick<SessionIntentContract, "blockEmphasis" | "sessionType">>
): SessionIntentContract {
  const preferUnique = [
    ...new Set([
      ...ROAD_RUNNING_MAIN_GATE_CATEGORIES,
      "calf_soleus_durability",
      "ankle_foot_stability",
      "running_conditioning",
    ]),
  ];
  return {
    sportSlug: ROAD_RUNNING_CONTRACT_SPORT_SLUG,
    sessionType: overrides?.sessionType ?? "road_running_locomotion_economy",
    blockEmphasis: overrides?.blockEmphasis ?? "main_accessory_conditioning_road_support",
    mustIncludeCategories: [...ROAD_RUNNING_MAIN_GATE_CATEGORIES],
    preferCategories: preferUnique,
    avoidCategories: [
      "lateral_agility_flashy",
      "elastic_reactive_lower",
      "pack_load_carry_primary",
      "heavy_carry_dominant",
      "hiking_step_stair_identity",
      "low_transfer_running_accessory",
      "unrelated_upper_body_dominant",
      "overly_complex_skill_lift",
    ],
    requiredCoverage: {
      eccentricDecelMain: false,
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
 * Trail running: terrain durability, uphill/downhill, eccentric braking, lateral/ankle layers.
 */
export function buildTrailRunningSessionIntentContract(
  overrides?: Partial<Pick<SessionIntentContract, "blockEmphasis" | "sessionType">>
): SessionIntentContract {
  const preferUnique = [
    ...new Set([
      ...TRAIL_RUNNING_MAIN_GATE_CATEGORIES,
      ...TRAIL_SUPPORT_COVERAGE_CATEGORIES,
    ]),
  ];
  return {
    sportSlug: TRAIL_RUNNING_CONTRACT_SPORT_SLUG,
    sessionType: overrides?.sessionType ?? "trail_running_terrain_durability",
    blockEmphasis: overrides?.blockEmphasis ?? "main_accessory_conditioning_trail_support",
    mustIncludeCategories: [...TRAIL_RUNNING_MAIN_GATE_CATEGORIES],
    preferCategories: preferUnique,
    avoidCategories: [...TRAIL_RUNNING_DEPRIORITIZED_CATEGORIES],
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

export function buildRockClimbingSessionIntentContract(
  overrides?: Partial<Pick<SessionIntentContract, "blockEmphasis" | "sessionType">>
): SessionIntentContract {
  const preferUnique = [...new Set([...ROCK_CLIMBING_MAIN_PREFER])];
  return {
    sportSlug: ROCK_CLIMBING_CONTRACT_SPORT_SLUG,
    sessionType: overrides?.sessionType ?? "rock_climbing_wall_transfer",
    blockEmphasis: overrides?.blockEmphasis ?? "main_pull_trunk_scap_accessory",
    mustIncludeCategories: [...ROCK_CLIMBING_MAIN_GATE],
    preferCategories: preferUnique,
    avoidCategories: [...ROCK_CLIMBING_DEPRIORITIZED],
    requiredCoverage: {
      eccentricDecelMain: false,
      sustainedTensionLowerBody: false,
      lateralOrTrunkStability: true,
      climbingPullTransfer: true,
      climbingTrunkBracing: true,
      climbingScapularLayer: true,
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
 * Alpine skiing: mirrors current slot gates, deprioritized set, and minimum-coverage expectations.
 * Does not replace `alpineSportSelectionRules`; it documents the same intent for upstream layers.
 */
/**
 * Soccer (field sport): repeat sprint, COD, deceleration, unilateral + posterior durability; not generic HIIT or linear-only running.
 */
export function buildSoccerSessionIntentContract(
  overrides?: Partial<Pick<SessionIntentContract, "blockEmphasis" | "sessionType">>
): SessionIntentContract {
  const preferUnique = [
    ...new Set([
      ...SOCCER_MAIN_GATE_CATEGORIES,
      ...SOCCER_SUPPORT_COVERAGE_CATEGORIES,
    ]),
  ];
  const deprioritized = soccerSportSelectionRules.slots.find((s) => s.slotRuleId === "soccer_main_strength")
    ?.deprioritizeMatchAnyOf ?? [];
  return {
    sportSlug: SOCCER_CONTRACT_SPORT_SLUG,
    sessionType: overrides?.sessionType ?? "soccer_field_repeat_sprint_cod",
    blockEmphasis: overrides?.blockEmphasis ?? "main_accessory_conditioning_soccer_transfer",
    mustIncludeCategories: [...SOCCER_MAIN_GATE_CATEGORIES],
    preferCategories: preferUnique,
    avoidCategories: [...deprioritized, "soccer_crossfit_mixed_noise", "soccer_skill_olympic_noise"],
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
function snowContractFromKind(
  sportSlug: "snowboarding" | "backcountry_skiing" | "xc_skiing",
  sessionType: string,
  requiredCoverage: SessionIntentContractRequiredCoverage
): SessionIntentContract {
  const mainSlot = getSnowSportSelectionRules(sportSlug).slots.find((s) =>
    s.blockTypes.includes("main_strength")
  );
  const prefer = mainSlot?.preferMatchAnyOf ?? [];
  return {
    sportSlug,
    sessionType,
    blockEmphasis: "main_accessory_conditioning_snow_family",
    mustIncludeCategories: [...(mainSlot?.gateMatchAnyOf ?? [])],
    preferCategories: [...prefer],
    avoidCategories: [...getSnowSportDeprioritized(sportSlug)],
    requiredCoverage,
    fallbackPolicy: {
      allowProgressiveRelaxation: true,
      allowFullPoolFallback: true,
    },
    degradedModeBehavior: {
      flagWhenRequirementsMissed: true,
    },
  };
}

export function sessionIntentContractForSportSlug(sportSlug: string): SessionIntentContract | undefined {
  const n = getCanonicalSportSlug(sportSlug).trim().toLowerCase().replace(/\s/g, "_");
  if (n === "alpine_skiing") {
    return buildAlpineSkiingSessionIntentContract();
  }
  if (n === "snowboarding") {
    return snowContractFromKind("snowboarding", "snowboard_resort_transfer", {
      eccentricDecelMain: true,
      sustainedTensionLowerBody: true,
      lateralOrTrunkStability: true,
    });
  }
  if (n === "backcountry_skiing") {
    return snowContractFromKind("backcountry_skiing", "backcountry_uphill_downhill_hybrid", {
      eccentricDecelMain: true,
      sustainedTensionLowerBody: true,
      lateralOrTrunkStability: true,
    });
  }
  if (n === "xc_skiing") {
    return snowContractFromKind("xc_skiing", "nordic_engine_transfer", {
      eccentricDecelMain: false,
      sustainedTensionLowerBody: true,
      lateralOrTrunkStability: true,
    });
  }
  if (n === "rock_climbing") {
    return buildRockClimbingSessionIntentContract();
  }
  if (n === "road_running") {
    return buildRoadRunningSessionIntentContract();
  }
  if (n === "trail_running") {
    return buildTrailRunningSessionIntentContract();
  }
  if (n === "soccer") {
    return buildSoccerSessionIntentContract();
  }
  return undefined;
}
