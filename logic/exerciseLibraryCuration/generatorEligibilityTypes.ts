/**
 * Phase 6 — generator eligibility derived from pruning (no catalog deletes; reversible gating).
 */

import type { PruningRecommendation } from "./valueFilterTypes";

/** Resolved eligibility for generator pool membership (staging / feature-flagged). */
export type GeneratorEligibilityState =
  | "eligible_core"
  | "eligible_niche"
  | "excluded_merged"
  | "excluded_removed"
  | "excluded_review"
  | "excluded_unknown";

/**
 * Feature flags for future generator integration.
 * When `enable_pruning_gating` is false, the pool is not reduced by pruning (full catalog ids pass).
 */
export type PruningGateFeatureFlags = {
  /** When false, pruning eligibility is ignored for inclusion (all catalog exercises can be used). */
  enable_pruning_gating: boolean;
  /** When true (and gating on), `eligible_niche` exercises are included in the gated pool. */
  allow_niche_exercises: boolean;
  /** When true (and gating on), `excluded_review` exercises are included in the gated pool. */
  allow_review_exercises: boolean;
};

export const DEFAULT_PRUNING_GATE_FLAGS: PruningGateFeatureFlags = {
  enable_pruning_gating: false,
  allow_niche_exercises: true,
  allow_review_exercises: false,
};

export type ExerciseEligibilityEntry = {
  exercise_id: string;
  exercise_name: string;
  eligibility_state: GeneratorEligibilityState;
  pruning_recommendation: PruningRecommendation | "unknown";
  /** Target canonical when this row is `excluded_merged`. */
  merge_target_exercise_id: string | null;
  /** True when this exercise is the surviving canonical in its redundancy cluster. */
  is_canonical_in_cluster: boolean;
  cluster_id: string | null;
};

/** Canonical row retained for merging (explicit audit). */
export type CanonicalSurvivorInfo = {
  cluster_id: string;
  canonical_exercise_id: string;
  canonical_eligibility: GeneratorEligibilityState;
  merge_member_count: number;
};

export type EligibilityConflict = {
  kind: "merge_target_excluded";
  exercise_id: string;
  /** Canonical id that merge members point to. */
  merge_target_exercise_id: string;
  message: string;
};

export type CountsByEligibilityState = Record<GeneratorEligibilityState, number>;

export type PoolBreakdownByKey = {
  key: string;
  count: number;
};

export type GeneratorEligibilityBuildResult = {
  schema_version: 1;
  generated_at: string;
  pruning_artifact_path: string;
  catalog_path: string;
  feature_flags: PruningGateFeatureFlags;
  mapping_rules: string[];
  entries: ExerciseEligibilityEntry[];
  by_id: Record<string, ExerciseEligibilityEntry>;
  counts_by_state: CountsByEligibilityState;
  canonical_survivors: CanonicalSurvivorInfo[];
  conflicts: EligibilityConflict[];
  /** Ids in catalog but absent from pruning artifact (treated as excluded_unknown when gating on). */
  unknown_exercise_ids: string[];
};

export type GeneratorEligibilityPreviewStats = {
  catalog_total: number;
  counts_by_state: CountsByEligibilityState;
  /** Pool size with gating off (all catalog ids). */
  pool_size_baseline: number;
  /** Pool size with default flags and gating on. */
  pool_size_gated_default: number;
  /** Pool size with gating on and all optional cohorts enabled. */
  pool_size_gated_permissive: number;
  pool_by_movement_pattern: PoolBreakdownByKey[];
  pool_by_equipment_class: PoolBreakdownByKey[];
  pool_by_primary_role: PoolBreakdownByKey[];
  canonical_survivors_count: number;
  /** Canonicals whose own eligibility is eligible_core or eligible_niche (survivors usable under default gating). */
  canonicals_retained_eligible_count: number;
  excluded_by_pruning_reason: { pruning_recommendation: PruningRecommendation | "unknown"; count: number }[];
  example_excluded_merged: { exercise_id: string; exercise_name: string; merge_target_exercise_id: string | null }[];
  example_excluded_removed: { exercise_id: string; exercise_name: string }[];
  example_excluded_review: { exercise_id: string; exercise_name: string }[];
};

export type GeneratorEligibilityPreviewArtifact = GeneratorEligibilityBuildResult & {
  preview_stats: GeneratorEligibilityPreviewStats;
  llm_validated_path: string | null;
};
