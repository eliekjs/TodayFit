/**
 * Types for sport profile engine (filtering, scoring, composition). Used by mapper + dailyGenerator.
 */

import type { SportScoringPenaltyKey } from "../../data/sportSubFocus/types";
import type { Exercise } from "./types";
import type { MovementPattern } from "./types";

export type StructureBiasKind = "strength" | "conditioning" | "hybrid";

export type NormalizedSportProfile = {
  sportSlug: string;
  displayName: string;
  weightedMovementPatterns: { pattern: MovementPattern; weight: number; rank: number }[];
  /** Tag-based scoring boosts — not mandatory exercise inclusion. */
  requiredTagBoosts: { tag: string; weight: number }[];
  bannedTagSlugs: string[];
  softBannedTagSlugs: string[];
  softBanPredicates: Array<(exercise: Exercise) => boolean>;
  hardBanPredicates: Array<(exercise: Exercise) => boolean>;
  energySystemBias: {
    conditioningMinutesScale: number;
    favorStimulusTags: string[];
  };
  structureBias: Record<StructureBiasKind, number>;
  topPatterns: MovementPattern[];
  secondaryPatterns: MovementPattern[];
  climbingStyleDomainGate: boolean;
  scoringPenaltyKeys: SportScoringPenaltyKey[];
  compositionNudge: {
    conditioningBlockExtraScale: number;
    conditioningPickerMinutesMultiplier: number;
    mainStrengthPatternScoreMultiplier: number;
  };
  /** Optional body-region bias for future hooks (0–1). */
  lowerBodyBias?: number;
  upperBodyBias?: number;
  fullBodyBias?: number;
  structureEmphasis?: "strength" | "conditioning" | "hybrid";
};

/** Rich summary of the normalized profile (for debug / verification scripts). */
export type NormalizedSportProfileSummary = {
  sport_slug: string;
  display_name: string;
  top_patterns: string[];
  secondary_patterns: string[];
  weighted_movement_patterns: Array<{ pattern: string; rank: number; weight: number }>;
  required_tag_boosts: Array<{ tag: string; weight: number }>;
  hard_banned_tag_slugs: string[];
  soft_banned_tag_slugs: string[];
  hard_ban_predicate_count: number;
  soft_ban_predicate_count: number;
  conditioning_minutes_scale: number;
  favor_stimulus_tags: string[];
  structure_bias: Record<StructureBiasKind, number>;
  structure_emphasis?: string;
  composition_nudge: {
    conditioning_block_extra_scale: number;
    conditioning_picker_minutes_multiplier: number;
    main_strength_pattern_score_multiplier: number;
    climbing_style_domain_gate: boolean;
  };
  scoring_penalty_keys: string[];
};

export type SportProfileMappingDebug = {
  /** Same as canonical_sport_definition_slug; kept for older readers. */
  sourceDefinitionSlug: string;
  /** Canonical row in `sportDefinitions.ts` that was mapped. */
  canonical_sport_definition_slug: string;
  /** True only when `mapSportDefinitionToNormalizedProfile` succeeded. */
  canonical_profile_loaded: boolean;
  /** Fields from `SportDefinition.engine` that influenced the profile (see mapper `fieldsUsed`). */
  canonical_fields_used: string[];
  /** Mapper-applied defaults (e.g. missing conditioning scale). Non-empty ⇒ not fully explicit in canonical. */
  mapper_defaults_applied: string[];
  /** True when mapping failed OR any mapper default was applied. */
  fallback_used: boolean;
  /** Mapping errors, or joined default reasons, or null when clean. */
  fallback_reason: string | null;
  normalized_profile_summary: NormalizedSportProfileSummary | null;
  mappingOk: boolean;
  mappingErrors?: string[];
  mappingWarnings?: string[];
  /** @deprecated Use canonical_fields_used */
  canonicalFieldsUsed: string[];
  normalizedSummary: {
    topPatterns: string[];
    hardBanPredicateCount: number;
    softBanPredicateCount: number;
    conditioningMinutesScale: number;
    conditioningBlockExtraScale: number;
    conditioningPickerMinutesMultiplier: number;
    mainStrengthPatternScoreMultiplier: number;
    climbingStyleDomainGate: boolean;
    scoringPenaltyKeys: string[];
  };
};

export type SportProfileAppliedSnapshot = {
  profile: NormalizedSportProfile;
  relaxLevel: number;
  poolBefore: number;
  poolAfter: number;
  enforcedBiasLabel: string;
  mapping?: SportProfileMappingDebug;
  /** Single-session hooks from structure bias (see `sportProfileBiasedTowardConditioning`). */
  compositionHooks?: {
    forced_session_conditioning_block: boolean;
    conditioning_pool_sorted_by_profile: boolean;
    min_conditioning_minutes_applied?: number;
  };
};
