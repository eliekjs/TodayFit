/**
 * Sports Prep: sub-focus and exercise tag mapping types.
 * Used so the weekly training generator can bias exercise selection toward tags
 * that match the user's sport sub-focuses.
 */

/** A single sub-focus option under a sport (e.g. "Finger Strength" for Rock Climbing). */
export type SportSubFocus = {
  slug: string;
  name: string;
  description?: string;
  /** 1 = highest priority when multiple sub-focuses selected. */
  priority_weight?: number;
};

/** One sport with 3–6 sub-focus options. */
export type SportWithSubFocuses = {
  slug: string;
  name: string;
  category: string;
  /** Sub-focus options for this sport. */
  sub_focuses: SportSubFocus[];
};

/** Mapping: sub_focus slug → exercise tag slugs with optional weight (1 = default). */
export type SubFocusTagMapEntry = {
  tag_slug: string;
  weight?: number;
};

/** Full map: composite key "sport_slug:sub_focus_slug" → tag slugs + weights. */
export type SubFocusTagMap = Record<string, SubFocusTagMapEntry[]>;

/** Canonical exercise tag for taxonomy / display. */
export type ExerciseTagTaxonomyEntry = {
  slug: string;
  tag_type: "movement_pattern" | "strength_quality" | "athletic_attribute" | "joint_stability" | "climbing" | "modality" | "energy_system" | "general";
  display_name: string;
  description?: string | null;
};

/**
 * Standard sport-prep definition: biomechanics, energy systems, programming guardrails,
 * and weekly session-type bias. Keys must use canonical sport slugs (see `getCanonicalSportSlug`).
 */
export type RankedMovementPattern = {
  /** 1 = highest priority */
  rank: number;
  label: string;
};

export type SportEnergySystems = {
  primary: string;
  secondary: string;
};

/** Generator movement_pattern slugs (see `logic/workoutGeneration/types` MovementPattern). */
export type SportEngineMovementPatternSlug =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "carry"
  | "rotate"
  | "locomotion";

/**
 * Registry keys → implemented in `sportProfileEngine` (no arbitrary code in JSON).
 * Add keys there when extending bans.
 */
export type SportBanPredicateKey =
  | "heavy_lower_only_squat_hinge"
  | "leg_press_family"
  | "alpine_upper_only_push_pull_strength";

/** Registry keys → scoring penalties in `computeSportProfileScoreComponents`. */
export type SportScoringPenaltyKey =
  | "climbing_heavy_lower_squat_hinge_penalty"
  | "climbing_bilateral_squat_hypertrophy_penalty"
  | "alpine_upper_hypertrophy_mismatch_penalty";

/**
 * Machine-readable sport profile: single source of truth for pool filter + scoring + composition nudges.
 * Human prose fields (`mustInclude`, etc.) document intent; **engine** drives the generator.
 *
 * Semantics:
 * - **requiredTagBoosts** — scoring only; exercises are NOT mandatory in-session.
 * - **hardBannedTagSlugs** / **hardBanPredicateKeys** — never relaxed in pool filter.
 * - **softBannedTagSlugs** / **softBanPredicateKeys** — relaxed when the pool is too small.
 */
export type SportDefinitionEngine = {
  /** When false, sport profile engine skips this sport. Default true if `engine` is present. */
  enabled?: boolean;
  movementPatterns: Array<{ slug: SportEngineMovementPatternSlug; rank: number; weight?: number }>;
  topPatterns: SportEngineMovementPatternSlug[];
  secondaryPatterns: SportEngineMovementPatternSlug[];
  /** Tag slugs → score boost when matched on exercise (NOT hard requirements). */
  requiredTagBoosts: Array<{ tag: string; weight: number }>;
  hardBannedTagSlugs?: string[];
  softBannedTagSlugs?: string[];
  hardBanPredicateKeys?: SportBanPredicateKey[];
  softBanPredicateKeys?: SportBanPredicateKey[];
  energySystemBias: {
    favorStimulusTags?: string[];
    /** Applied to conditioning block duration after assembly (post multiplier). */
    conditioningMinutesScale?: number;
  };
  structureBias: {
    emphasis?: "strength" | "conditioning" | "hybrid";
    strengthShare?: number;
    conditioningShare?: number;
    hybridShare?: number;
    lowerBodyBias?: number;
    upperBodyBias?: number;
    fullBodyBias?: number;
  };
  /** Single-session nudges (incremental; not full weekly planner). */
  compositionNudge?: {
    /** Multiplies conditioning block duration after `conditioningMinutesScale`. */
    conditioningBlockExtraScale?: number;
    /** Multiplies target minutes when picking time-based cardio (`appendEnduranceTimeBasedCardioBlock`). */
    conditioningPickerMinutesMultiplier?: number;
    /** Apply climbing-style strength domain gate in pool filter. */
    climbingStyleDomainGate?: boolean;
    /** Multiply sport-profile movement-pattern match score on main strength/hypertrophy picks. */
    mainStrengthPatternScoreMultiplier?: number;
  };
  scoringPenaltyKeys?: SportScoringPenaltyKey[];
};

export type SportDefinition = {
  slug: string;
  displayName: string;
  movementPatternsRanked: RankedMovementPattern[];
  energySystems: SportEnergySystems;
  /**
   * Human-readable: themes that should appear regularly in prep weeks.
   * Generator does **not** parse these strings — use `engine.requiredTagBoosts` for scoring.
   */
  mustInclude: string[];
  /** Human-readable guardrails; operational bans live in `engine` predicate/tag keys. */
  mustAvoidOrLimit: string[];
  weeklyStructureBias: string[];
  /** Canonical config for sport profile engine. When absent, engine does not run for this sport. */
  engine?: SportDefinitionEngine;
};
