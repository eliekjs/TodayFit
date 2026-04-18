/**
 * Phase 4 — duplicate clustering and canonical selection (types + default thresholds).
 */

import type { CurationKeepCategory } from "./enums";

export type ClusterConfidenceBand = "high" | "medium" | "low";

export type DuplicateClusterConfig = {
  /** Minimum pairwise score to add an edge (union-find). */
  edge_threshold: number;
  /** Minimum internal edge to keep a cluster from splitting (complete-linkage check). */
  min_internal_pair_score: number;
  /** Do not emit clusters larger than this (split or skip weak edges). */
  max_cluster_size: number;
  /** Weights for similarity components (sum need not be 1; scores are blended then sigmoid-scaled). */
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
  /** Band thresholds on final pairwise score. */
  bands: { high: number; medium: number };
};

export const DEFAULT_DUPLICATE_CLUSTER_CONFIG: DuplicateClusterConfig = {
  edge_threshold: 0.78,
  min_internal_pair_score: 0.62,
  max_cluster_size: 24,
  weights: {
    name_token_jaccard: 0.28,
    name_char_similarity: 0.18,
    alias_overlap: 0.1,
    movement_patterns_jaccard: 0.14,
    equipment_match: 0.08,
    primary_role_match: 0.06,
    muscle_jaccard: 0.08,
    tag_jaccard: 0.05,
    keep_category_alignment: 0.03,
  },
  bands: { high: 0.88, medium: 0.72 },
};

/** Shallow merge for CLI / env overrides (nested `weights` and `bands` merge). */
export function mergeDuplicateClusterConfig(
  base: DuplicateClusterConfig,
  patch: Partial<DuplicateClusterConfig>
): DuplicateClusterConfig {
  return {
    ...base,
    ...patch,
    weights: patch.weights ? { ...base.weights, ...patch.weights } : base.weights,
    bands: patch.bands ? { ...base.bands, ...patch.bands } : base.bands,
  };
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
  /** 0–1 simple completeness heuristic. */
  metadata_completeness: number;
  llm_confidence: number | null;
  ambiguity_flag_count: number;
};

export type PairwiseDuplicateResult = {
  exercise_id_a: string;
  exercise_id_b: string;
  score: number;
  band: ClusterConfidenceBand;
  factor_scores: Record<string, number>;
  reason_codes: string[];
  blocked: boolean;
  block_reason?: string;
};

export type DuplicateClusterRecord = {
  duplicate_cluster_id: string;
  cluster_confidence: ClusterConfidenceBand;
  /** Representative edge / internal min score used for cluster confidence. */
  cluster_score: number;
  canonical_exercise_id: string;
  member_exercise_ids: string[];
  member_count: number;
  top_similarity_factors: string[];
  canonical_selection_reasons: string[];
  /** Human-readable why this cluster formed. */
  link_reason_codes: string[];
};

export type DuplicateClustersArtifact = {
  schema_version: 1;
  generated_at: string;
  catalog_path: string;
  prefill_path: string;
  llm_validated_path: string;
  config: DuplicateClusterConfig;
  clusters: DuplicateClusterRecord[];
  /** Pairs that scored above a debug threshold but were blocked (sample). */
  blocked_pair_sample: { a: string; b: string; score: number; reason: string }[];
  stats: DuplicateClusterStats;
};

export type DuplicateClusterStats = {
  total_clusters: number;
  /** Exercises passed into the feature map for this run. */
  input_exercise_count: number;
  /** Distinct ids that appear in at least one emitted duplicate cluster. */
  exercises_clustered_unique: number;
  /** Input exercises with no duplicate neighbor above thresholds (singletons). */
  exercises_not_clustered: number;
  by_band: Record<ClusterConfidenceBand, number>;
  largest_clusters: { duplicate_cluster_id: string; member_count: number; canonical_exercise_id: string }[];
  clusters_with_multiple_core: number;
  /** Components skipped because size > max_cluster_size. */
  dropped_oversized: number;
  /** Components skipped because min pairwise score < min_internal_pair_score. */
  dropped_low_internal: number;
  suspicious_oversized_sample: { member_count: number }[];
  suspicious_low_internal_sample: { member_count: number; min_internal_score: number }[];
  /** keep_category counts across all member slots in emitted clusters (one row per membership). */
  member_keep_category_distribution: Record<string, number>;
};
