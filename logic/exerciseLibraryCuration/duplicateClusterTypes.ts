/**
 * Phase 4 — redundancy clustering for library reduction (types + presets).
 * Goal: surface merge candidates for a sport cross-training catalog, not biomechanical identity.
 */

import type { CurationKeepCategory } from "./enums";

/** Legacy UI band (min internal pairwise score). */
export type ClusterConfidenceBand = "high" | "medium" | "low";

/**
 * Product-oriented relationship: should both survive as separate exercises in TodayFit?
 */
export type RedundancyRelationship =
  | "exact_duplicate"
  | "near_duplicate"
  | "practical_merge_candidate"
  | "related_but_keep_separate"
  | "clearly_distinct";

export type LibraryReductionAggressiveness = "conservative" | "balanced" | "aggressive";

/** Score cutoffs for classifying a cluster’s tightest link (min internal pairwise score). */
export type RedundancyTierThresholds = {
  /** At or above: treat as same exercise name/implementation for curation. */
  exact_duplicate: number;
  /** At or above: very likely redundant in practice. */
  near_duplicate: number;
  /** At or above: worth merging or holding back one unless there is a strong reason not to. */
  practical_merge_candidate: number;
};

export type DuplicateClusterConfig = {
  /** Preset name; default aggressive for library reduction. */
  aggressiveness: LibraryReductionAggressiveness;
  /** Minimum pairwise score to add a merge edge (union-find). */
  edge_threshold: number;
  /** Minimum internal pairwise score to emit a cluster (complete-linkage style). */
  min_internal_pair_score: number;
  max_cluster_size: number;
  weights: {
    name_token_jaccard: number;
    name_char_similarity: number;
    alias_overlap: number;
    movement_patterns_jaccard: number;
    equipment_match: number;
    primary_role_match: number;
    muscle_jaccard: number;
    tag_jaccard: number;
    keep_category_alignment: number;
  };
  /** Legacy bands for cluster_confidence field. */
  bands: { high: number; medium: number };
  /** Tier assignment from min internal score. */
  redundancy_tiers: RedundancyTierThresholds;
  /** Candidate generation (see enumerateCandidatePairs). */
  candidate_generation: {
    /** Sliding window on sorted normalized names. */
    sorted_name_window: number;
    /** Min bigram Jaccard to add pair in window pass. */
    window_bigram_min: number;
    /** Min bigram for token-index pass (single-token bucket). */
    token_bucket_bigram_min: number;
    /** Share at least this many name tokens (after aggressive tokenization), or use bigram fallback. */
    min_shared_name_tokens: number;
    /** Max ids per inverted-index bucket before subsampling pairs. */
    max_ids_per_token_bucket: number;
    /** Max pairs per movement+equipment bucket (0 = unlimited within cap). */
    max_pairs_per_me_bucket: number;
    /** Max pairs per primary_role+equipment bucket. */
    max_pairs_per_role_bucket: number;
    /** Include pairs with overlapping muscles if |intersection|/min >= this and equipment matches. */
    muscle_overlap_min_ratio: number;
  };
};

export const REDUNDANCY_PRESETS: Record<LibraryReductionAggressiveness, DuplicateClusterConfig> = {
  conservative: {
    aggressiveness: "conservative",
    edge_threshold: 0.72,
    min_internal_pair_score: 0.58,
    max_cluster_size: 20,
    weights: {
      name_token_jaccard: 0.26,
      name_char_similarity: 0.2,
      alias_overlap: 0.1,
      movement_patterns_jaccard: 0.14,
      equipment_match: 0.1,
      primary_role_match: 0.06,
      muscle_jaccard: 0.08,
      tag_jaccard: 0.04,
      keep_category_alignment: 0.02,
    },
    bands: { high: 0.88, medium: 0.75 },
    redundancy_tiers: {
      exact_duplicate: 0.94,
      near_duplicate: 0.85,
      practical_merge_candidate: 0.72,
    },
    candidate_generation: {
      sorted_name_window: 24,
      window_bigram_min: 0.78,
      token_bucket_bigram_min: 0.88,
      min_shared_name_tokens: 2,
      max_ids_per_token_bucket: 100,
      max_pairs_per_me_bucket: 4000,
      max_pairs_per_role_bucket: 3000,
      muscle_overlap_min_ratio: 0.55,
    },
  },
  balanced: {
    aggressiveness: "balanced",
    edge_threshold: 0.62,
    min_internal_pair_score: 0.5,
    max_cluster_size: 28,
    weights: {
      name_token_jaccard: 0.24,
      name_char_similarity: 0.17,
      alias_overlap: 0.09,
      movement_patterns_jaccard: 0.16,
      equipment_match: 0.11,
      primary_role_match: 0.07,
      muscle_jaccard: 0.09,
      tag_jaccard: 0.05,
      keep_category_alignment: 0.02,
    },
    bands: { high: 0.86, medium: 0.74 },
    redundancy_tiers: {
      exact_duplicate: 0.93,
      near_duplicate: 0.82,
      practical_merge_candidate: 0.62,
    },
    candidate_generation: {
      sorted_name_window: 36,
      window_bigram_min: 0.72,
      token_bucket_bigram_min: 0.82,
      min_shared_name_tokens: 1,
      max_ids_per_token_bucket: 150,
      max_pairs_per_me_bucket: 8000,
      max_pairs_per_role_bucket: 6000,
      muscle_overlap_min_ratio: 0.45,
    },
  },
  aggressive: {
    aggressiveness: "aggressive",
    edge_threshold: 0.52,
    min_internal_pair_score: 0.42,
    max_cluster_size: 40,
    weights: {
      name_token_jaccard: 0.2,
      name_char_similarity: 0.14,
      alias_overlap: 0.08,
      movement_patterns_jaccard: 0.19,
      equipment_match: 0.14,
      primary_role_match: 0.09,
      muscle_jaccard: 0.1,
      tag_jaccard: 0.04,
      keep_category_alignment: 0.02,
    },
    bands: { high: 0.84, medium: 0.68 },
    redundancy_tiers: {
      exact_duplicate: 0.92,
      near_duplicate: 0.78,
      practical_merge_candidate: 0.52,
    },
    candidate_generation: {
      sorted_name_window: 56,
      window_bigram_min: 0.64,
      token_bucket_bigram_min: 0.74,
      min_shared_name_tokens: 1,
      max_ids_per_token_bucket: 220,
      max_pairs_per_me_bucket: 25000,
      max_pairs_per_role_bucket: 18000,
      muscle_overlap_min_ratio: 0.35,
    },
  },
};

/** Default: aggressive library reduction. */
export const DEFAULT_DUPLICATE_CLUSTER_CONFIG: DuplicateClusterConfig = REDUNDANCY_PRESETS.aggressive;

export function mergeDuplicateClusterConfig(
  base: DuplicateClusterConfig,
  patch: Partial<DuplicateClusterConfig>
): DuplicateClusterConfig {
  return {
    ...base,
    ...patch,
    aggressiveness: patch.aggressiveness ?? base.aggressiveness,
    weights: patch.weights ? { ...base.weights, ...patch.weights } : base.weights,
    bands: patch.bands ? { ...base.bands, ...patch.bands } : base.bands,
    redundancy_tiers: patch.redundancy_tiers
      ? { ...base.redundancy_tiers, ...patch.redundancy_tiers }
      : base.redundancy_tiers,
    candidate_generation: patch.candidate_generation
      ? { ...base.candidate_generation, ...patch.candidate_generation }
      : base.candidate_generation,
  };
}

export function configForAggressiveness(mode: LibraryReductionAggressiveness): DuplicateClusterConfig {
  return REDUNDANCY_PRESETS[mode];
}

export type ExerciseDuplicateFeatures = {
  exercise_id: string;
  raw_name: string;
  normalized_name: string;
  name_tokens: string[];
  aliases: string[];
  movement_patterns: string[];
  equipment_class: string | null;
  primary_role: string | null;
  keep_category: CurationKeepCategory | null;
  muscles: string[];
  tags: string[];
  metadata_completeness: number;
  llm_confidence: number | null;
  ambiguity_flag_count: number;
};

export type PairwiseDuplicateResult = {
  exercise_id_a: string;
  exercise_id_b: string;
  score: number;
  /** Hypothetical similarity ignoring hard merge blocks (for diagnostics / near-misses). */
  hypothetical_unblocked_score: number;
  band: ClusterConfidenceBand;
  factor_scores: Record<string, number>;
  reason_codes: string[];
  blocked: boolean;
  block_reason?: string;
  /** Meaningful programming distinction — pair should not merge. */
  hard_distinction?: boolean;
  /** Trivia we intentionally downweight (transparency). */
  ignored_trivia_notes: string[];
};

export type DuplicateClusterRecord = {
  duplicate_cluster_id: string;
  /** Primary product classification. */
  redundancy_tier: RedundancyRelationship;
  cluster_confidence: ClusterConfidenceBand;
  cluster_score: number;
  canonical_exercise_id: string;
  member_exercise_ids: string[];
  member_count: number;
  top_similarity_factors: string[];
  canonical_selection_reasons: string[];
  link_reason_codes: string[];
  /** Why grouped for library reduction. */
  grouping_rationale: string[];
  /** Naming/setup trivia treated as non-distinct for this cluster. */
  ignored_distinctions: string[];
};

export type RelatedButSeparatePair = {
  exercise_id_a: string;
  exercise_id_b: string;
  relationship: "related_but_keep_separate";
  reason_codes: string[];
  /** If blocked, the hard-distinction code. */
  distinction_code?: string;
};

export type LibraryReductionStats = {
  input_exercise_count: number;
  exercises_clustered_unique: number;
  exercises_not_clustered: number;
  /** Rows removable = sum(max(0, member_count - 1)) per tier. */
  rows_removable_exact_duplicate_clusters: number;
  rows_removable_near_duplicate_clusters: number;
  rows_removable_practical_merge_clusters: number;
  /** Cumulative: if all exact clusters collapsed to canonical. */
  cumulative_rows_removable_if_exact_only: number;
  cumulative_rows_removable_if_exact_and_near: number;
  cumulative_rows_removable_if_all_merge_tiers: number;
  clusters_exact_duplicate: number;
  clusters_near_duplicate: number;
  clusters_practical_merge_candidate: number;
  by_band: Record<ClusterConfidenceBand, number>;
  largest_clusters: { duplicate_cluster_id: string; member_count: number; canonical_exercise_id: string; redundancy_tier: RedundancyRelationship }[];
  clusters_with_multiple_core: number;
  dropped_oversized: number;
  dropped_low_internal: number;
  suspicious_oversized_sample: { member_count: number }[];
  suspicious_low_internal_sample: { member_count: number; min_internal_score: number }[];
  member_keep_category_distribution: Record<string, number>;
  /** Top movement_pattern + equipment_class keys by member count in clusters. */
  redundancy_family_top_movement_equipment: { key: string; member_slots: number }[];
  redundancy_family_top_primary_role: { key: string; member_slots: number }[];
};

export type DuplicateClustersArtifact = {
  schema_version: 2;
  generated_at: string;
  catalog_path: string;
  prefill_path: string;
  llm_validated_path: string;
  aggressiveness: LibraryReductionAggressiveness;
  config: DuplicateClusterConfig;
  clusters_exact_duplicate: DuplicateClusterRecord[];
  clusters_near_duplicate: DuplicateClusterRecord[];
  clusters_practical_merge_candidate: DuplicateClusterRecord[];
  /** All merge-tier clusters (duplicate of the three lists) for backward compatibility. */
  clusters: DuplicateClusterRecord[];
  related_but_keep_separate: RelatedButSeparatePair[];
  /** Sample of evaluated pairs that are clearly different exercises (low score, not blocked). */
  clearly_distinct_pair_sample: { a: string; b: string; score: number; note: string }[];
  blocked_pair_sample: { a: string; b: string; score: number; reason: string }[];
  stats: LibraryReductionStats;
};

export type NearMissPair = {
  exercise_id_a: string;
  exercise_id_b: string;
  score: number;
  hypothetical_unblocked_score: number;
  /** Just below edge_threshold or blocked with high hypothetical. */
  near_miss_reason: string;
  top_factors: string[];
};

export type NearMissesArtifact = {
  schema_version: 1;
  generated_at: string;
  aggressiveness: LibraryReductionAggressiveness;
  /** Pairs that almost merged or were blocked despite high hypothetical similarity. */
  near_misses: NearMissPair[];
  sample_limit: number;
};

export type LibraryReductionSummaryArtifact = {
  schema_version: 1;
  generated_at: string;
  aggressiveness: LibraryReductionAggressiveness;
  config: DuplicateClusterConfig;
  stats: LibraryReductionStats;
};
