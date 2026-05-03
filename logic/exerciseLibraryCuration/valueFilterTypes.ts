/**
 * Phase 5 — exercise value filtering & pruning recommendations (staging only).
 */

import type { CurationKeepCategory } from "./enums";

/** Final pruning stance for an exercise row (reporting; no DB writes). */
export type PruningRecommendation =
  | "keep_core"
  | "keep_niche"
  | "merge_into_canonical"
  | "remove_niche_or_low_value"
  | "review";

/** Tunable weights and thresholds for value scoring + pruning bands. */
export type LibraryPruningConfig = {
  schema_version: 1;
  /** Blend weights for `overall_value_score` (should sum ~1). */
  weights: {
    simplicity: number;
    general_usefulness: number;
    substitutability: number;
    /** Contributes positively when setup burden is low. */
    inverse_setup_burden: number;
    /** Contributes positively when niche penalty is low. */
    inverse_niche: number;
    /** Contributes positively when technicality penalty is low. */
    inverse_technicality: number;
    /** Contributes positively when confusion penalty is low. */
    inverse_confusion: number;
    /** Alignment with LLM keep_category + confidence (when present). */
    llm_keep_alignment: number;
  };
  /** Penalty applied to intrinsic overall when exercise is a non-canonical member of a merge cluster. */
  merge_member_overall_multiplier: number;
  /** Thresholds on intrinsic overall_value_score (before merge penalty) for standalone exercises. */
  thresholds: {
    keep_core_min: number;
    keep_niche_min: number;
    remove_below: number;
    /** Between these → `review` if no stronger rule applies. */
    review_low: number;
    review_high: number;
  };
  /** If true, standalone `merge_candidate` from LLM biases toward remove/review when score is weak. */
  merge_candidate_not_in_cluster_penalty: number;
};

export function mergeLibraryPruningConfig(
  base: LibraryPruningConfig,
  patch: Partial<LibraryPruningConfig>
): LibraryPruningConfig {
  return {
    ...base,
    ...patch,
    weights: patch.weights ? { ...base.weights, ...patch.weights } : base.weights,
    thresholds: patch.thresholds ? { ...base.thresholds, ...patch.thresholds } : base.thresholds,
  };
}

/** Weights rebalanced: stronger inverse_niche / inverse_technicality / inverse_confusion; simplicity & usefulness nearly unchanged. */
export const DEFAULT_LIBRARY_PRUNING_CONFIG: LibraryPruningConfig = {
  schema_version: 1,
  weights: {
    simplicity: 0.17,
    general_usefulness: 0.22,
    substitutability: 0.1,
    inverse_setup_burden: 0.07,
    inverse_niche: 0.18,
    inverse_technicality: 0.12,
    inverse_confusion: 0.12,
    llm_keep_alignment: 0.02,
  },
  merge_member_overall_multiplier: 0.35,
  thresholds: {
    keep_core_min: 0.925,
    keep_niche_min: 0.905,
    remove_below: 0.83,
    review_low: 0.83,
    review_high: 0.905,
  },
  merge_candidate_not_in_cluster_penalty: 0.06,
};

export type ExerciseValueProfile = {
  exercise_id: string;
  exercise_name: string;
  /** Intrinsic product value [0,1] before merge-cluster adjustment. */
  intrinsic_overall_value_score: number;
  /** Final overall score [0,1] after merge penalty (if any). */
  overall_value_score: number;
  simplicity_score: number;
  general_usefulness_score: number;
  substitutability_score: number;
  /** 0 = minimal setup, 1 = heavy / awkward setup. */
  setup_complexity_score: number;
  /** 0 = broadly useful, 1 = niche. */
  niche_penalty_score: number;
  /** 0 = simple to coach, 1 = highly technical / skill-limited. */
  technicality_penalty_score: number;
  /** 0 = clear naming/intent, 1 = confusing / overloaded. */
  confusion_penalty_score: number;
  /** 0 = not redundant vs cluster, 1 = should merge away (non-canonical member). */
  redundancy_penalty_score: number;
  /** Higher = better default representative for a redundancy family. */
  canonical_preference_score: number;
  pruning_recommendation: PruningRecommendation;
  pruning_reason_codes: string[];
  /** LLM signals echoed for inspection. */
  llm_keep_category: CurationKeepCategory | null;
  llm_complexity: string | null;
  llm_confidence: number | null;
};

export type LibraryPruningDecisionRecord = {
  exercise_id: string;
  exercise_name: string;
  cluster_id: string | null;
  /** Phase 5 canonical within this cluster (may differ from phase 4 artifact). */
  canonical_exercise_id: string | null;
  /** Canonical id from phase 4 duplicate artifact (audit). */
  phase4_cluster_canonical_exercise_id: string | null;
  redundancy_tier: string | null;
  value_profile: ExerciseValueProfile;
  pruning_recommendation: PruningRecommendation;
  pruning_reason_codes: string[];
};

export type FamilyRollup = {
  family_key: string;
  label: string;
  exercise_count: number;
  projected_kept: number;
  projected_removed_or_merged: number;
  example_exercise_ids: string[];
};

export type LibraryPruningSummaryStats = {
  total_exercises: number;
  counts_by_recommendation: Record<PruningRecommendation, number>;
  projected_rows_retained: number;
  projected_rows_removed: number;
  projected_rows_merged_into_canonical: number;
  top_remove_reason_codes: { code: string; count: number }[];
  /** Same frequency table as removals — explicit label for reports (“what drove drops”). */
  top_removal_drivers: { code: string; count: number }[];
  top_merge_reason_codes: { code: string; count: number }[];
  top_canonical_selections: {
    cluster_id: string;
    canonical_exercise_id: string;
    member_count: number;
    phase4_canonical_exercise_id: string | null;
    changed_from_phase4: boolean;
  }[];
  family_rollups: FamilyRollup[];
  intrinsic_overall_score_quantiles: { p10: number; p50: number; p90: number };
};

export type LibraryPruningDecisionArtifact = {
  schema_version: 1;
  generated_at: string;
  catalog_path: string;
  prefill_path: string;
  llm_validated_path: string;
  duplicate_clusters_path: string;
  library_pruning_config: LibraryPruningConfig;
  duplicate_aggressiveness: string;
  records: LibraryPruningDecisionRecord[];
  summary: LibraryPruningSummaryStats;
};
