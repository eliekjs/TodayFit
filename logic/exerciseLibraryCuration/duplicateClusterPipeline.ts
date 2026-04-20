/**
 * Redundancy cluster construction: library reduction tiers, near-misses, related-but-separate pairs.
 */

import type { LlmClassificationValidated } from "./llmClassificationTypes";
import type {
  DuplicateClusterConfig,
  DuplicateClusterRecord,
  DuplicateClustersArtifact,
  ExerciseDuplicateFeatures,
  LibraryReductionStats,
  NearMissPair,
  NearMissesArtifact,
  PairwiseDuplicateResult,
  RelatedButSeparatePair,
} from "./duplicateClusterTypes";
import { DEFAULT_DUPLICATE_CLUSTER_CONFIG } from "./duplicateClusterTypes";
import {
  clusterByPairwiseScores,
  computePairwiseDuplicateScore,
  enumerateCandidatePairs,
  minPairwiseScoreInCluster,
  movementEquipmentKey,
  primaryRoleEquipmentKey,
  redundancyTierFromMinScore,
} from "./duplicateSimilarity";
import { type CanonicalSelectionContext, selectCanonicalExerciseId } from "./selectCanonicalExercise";
import type { CatalogExerciseRow } from "./types";

export function buildPairwiseScoreMap(
  candidatePairKeys: Set<string>,
  features: Map<string, ExerciseDuplicateFeatures>,
  cfg: DuplicateClusterConfig
): Map<string, PairwiseDuplicateResult> {
  const out = new Map<string, PairwiseDuplicateResult>();
  for (const pk of candidatePairKeys) {
    const [a, b] = pk.split("|") as [string, string];
    const fa = features.get(a);
    const fb = features.get(b);
    if (!fa || !fb) continue;
    out.set(pk, computePairwiseDuplicateScore(fa, fb, cfg));
  }
  return out;
}

function dedupeStrings(codes: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of codes) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

function buildClusterRecord(params: {
  duplicate_cluster_id: string;
  minInternal: number;
  cfg: DuplicateClusterConfig;
  memberIds: string[];
  pairScores: Map<string, PairwiseDuplicateResult>;
  ctxById: Map<string, CanonicalSelectionContext>;
}): DuplicateClusterRecord {
  const { memberIds, pairScores, ctxById, cfg, minInternal, duplicate_cluster_id } = params;
  const { canonical_id, reasons } = selectCanonicalExerciseId(memberIds, ctxById);

  const redundancy_tier = redundancyTierFromMinScore(minInternal, cfg.redundancy_tiers);

  let bestPair: PairwiseDuplicateResult | null = null;
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const a = memberIds[i]!;
      const b = memberIds[j]!;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const pr = pairScores.get(k);
      if (pr && !pr.blocked && (!bestPair || pr.score > bestPair.score)) bestPair = pr;
    }
  }
  const topFactors = bestPair
    ? Object.entries(bestPair.factor_scores)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 6)
        .map(([k]) => k)
    : [];

  const link_codes: string[] = [];
  const ignored: string[] = [];
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const a = memberIds[i]!;
      const b = memberIds[j]!;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const pr = pairScores.get(k);
      if (pr?.reason_codes?.length) link_codes.push(...pr.reason_codes.slice(0, 4));
      if (pr?.ignored_trivia_notes?.length) ignored.push(...pr.ignored_trivia_notes);
    }
  }

  const band =
    minInternal >= cfg.bands.high ? "high" : minInternal >= cfg.bands.medium ? "medium" : "low";

  const grouping_rationale: string[] = [
    `min_internal_pairwise_score_${minInternal.toFixed(3)}`,
    `aggressiveness_${cfg.aggressiveness}`,
    `redundancy_tier_${redundancy_tier}`,
  ];
  if (bestPair?.reason_codes?.includes("shared_movement_and_equipment")) {
    grouping_rationale.push("same_movement_pattern_and_equipment_family");
  }
  if (bestPair?.reason_codes?.includes("strong_char_similarity")) {
    grouping_rationale.push("strong_normalized_name_similarity");
  }

  return {
    duplicate_cluster_id,
    redundancy_tier,
    cluster_confidence: band,
    cluster_score: minInternal,
    canonical_exercise_id: canonical_id,
    member_exercise_ids: [...memberIds].sort(),
    member_count: memberIds.length,
    top_similarity_factors: topFactors,
    canonical_selection_reasons: reasons,
    link_reason_codes: dedupeStrings(link_codes).slice(0, 14),
    grouping_rationale,
    ignored_distinctions: dedupeStrings(ignored).slice(0, 10),
  };
}

function computeFamilyTop(
  clusters: DuplicateClusterRecord[],
  features: Map<string, ExerciseDuplicateFeatures>,
  kind: "me" | "role"
): { key: string; member_slots: number }[] {
  const counts = new Map<string, number>();
  for (const c of clusters) {
    for (const id of c.member_exercise_ids) {
      const f = features.get(id);
      if (!f) continue;
      const key = kind === "me" ? movementEquipmentKey(f) : primaryRoleEquipmentKey(f);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, member_slots]) => ({ key, member_slots }))
    .sort((a, b) => b.member_slots - a.member_slots)
    .slice(0, 25);
}

function buildNearMisses(
  pairScores: Map<string, PairwiseDuplicateResult>,
  cfg: DuplicateClusterConfig,
  limit: number
): NearMissPair[] {
  const out: NearMissPair[] = [];
  for (const [k, r] of pairScores) {
    const [a, b] = k.split("|") as [string, string];
    const top = Object.entries(r.factor_scores)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 5)
      .map(([x]) => x);

    if (r.blocked && r.hypothetical_unblocked_score >= cfg.edge_threshold - 0.02) {
      out.push({
        exercise_id_a: a,
        exercise_id_b: b,
        score: r.score,
        hypothetical_unblocked_score: r.hypothetical_unblocked_score,
        near_miss_reason: "blocked_hard_distinction_despite_high_hypothetical_similarity",
        top_factors: top,
      });
      continue;
    }
    if (!r.blocked && r.score >= cfg.edge_threshold - 0.14 && r.score < cfg.edge_threshold) {
      out.push({
        exercise_id_a: a,
        exercise_id_b: b,
        score: r.score,
        hypothetical_unblocked_score: r.hypothetical_unblocked_score,
        near_miss_reason: "just_below_merge_edge_threshold",
        top_factors: top,
      });
    }
  }
  out.sort((x, y) => {
    const bx = x.near_miss_reason.startsWith("blocked") ? 1 : 0;
    const by = y.near_miss_reason.startsWith("blocked") ? 1 : 0;
    if (by !== bx) return by - bx;
    return y.hypothetical_unblocked_score - x.hypothetical_unblocked_score;
  });
  return out.slice(0, limit);
}

function buildClearlyDistinctSample(pairScores: Map<string, PairwiseDuplicateResult>, limit: number): DuplicateClustersArtifact["clearly_distinct_pair_sample"] {
  const out: DuplicateClustersArtifact["clearly_distinct_pair_sample"] = [];
  for (const [k, r] of pairScores) {
    if (out.length >= limit) break;
    if (r.blocked) continue;
    const mp = r.factor_scores.movement_patterns_jaccard ?? 0;
    if (r.score <= 0.22 && mp <= 0.34) {
      const [a, b] = k.split("|") as [string, string];
      out.push({
        a,
        b,
        score: r.score,
        note: "low_redundancy_score_different_or_weak_family_overlap",
      });
    }
  }
  return out;
}

function buildRelatedButSeparate(pairScores: Map<string, PairwiseDuplicateResult>, limit: number): RelatedButSeparatePair[] {
  const out: RelatedButSeparatePair[] = [];
  for (const [k, r] of pairScores) {
    if (out.length >= limit) break;
    if (!r.blocked || !r.block_reason) continue;
    const [a, b] = k.split("|") as [string, string];
    out.push({
      exercise_id_a: a,
      exercise_id_b: b,
      relationship: "related_but_keep_separate",
      reason_codes: r.reason_codes.slice(0, 6),
      distinction_code: r.block_reason,
    });
  }
  return out;
}

function computeLibraryReductionStats(
  clusters: DuplicateClusterRecord[],
  mergedById: Map<string, LlmClassificationValidated>,
  inputExerciseCount: number,
  dropped_oversized: number,
  dropped_low_internal: number,
  suspicious_oversized_sample: LibraryReductionStats["suspicious_oversized_sample"],
  suspicious_low_internal_sample: LibraryReductionStats["suspicious_low_internal_sample"],
  features: Map<string, ExerciseDuplicateFeatures>
): LibraryReductionStats {
  const exact = clusters.filter((c) => c.redundancy_tier === "exact_duplicate");
  const near = clusters.filter((c) => c.redundancy_tier === "near_duplicate");
  const practical = clusters.filter((c) => c.redundancy_tier === "practical_merge_candidate");

  const sumRemovable = (arr: DuplicateClusterRecord[]) =>
    arr.reduce((s, c) => s + Math.max(0, c.member_count - 1), 0);

  const rowsExact = sumRemovable(exact);
  const rowsNear = sumRemovable(near);
  const rowsPractical = sumRemovable(practical);

  const clusteredIds = new Set<string>();
  const member_keep_category_distribution: Record<string, number> = {};
  for (const c of clusters) {
    for (const id of c.member_exercise_ids) {
      clusteredIds.add(id);
      const kc = mergedById.get(id)?.keep_category ?? "unknown";
      member_keep_category_distribution[kc] = (member_keep_category_distribution[kc] ?? 0) + 1;
    }
  }

  const by_band = { high: 0, medium: 0, low: 0 };
  for (const c of clusters) {
    by_band[c.cluster_confidence] += 1;
  }

  const largest = [...clusters]
    .sort((a, b) => b.member_count - a.member_count)
    .slice(0, 15)
    .map((c) => ({
      duplicate_cluster_id: c.duplicate_cluster_id,
      member_count: c.member_count,
      canonical_exercise_id: c.canonical_exercise_id,
      redundancy_tier: c.redundancy_tier,
    }));

  let clusters_with_multiple_core = 0;
  for (const c of clusters) {
    let coreN = 0;
    for (const id of c.member_exercise_ids) {
      if (mergedById.get(id)?.keep_category === "core") coreN += 1;
    }
    if (coreN >= 2) clusters_with_multiple_core += 1;
  }

  return {
    input_exercise_count: inputExerciseCount,
    exercises_clustered_unique: clusteredIds.size,
    exercises_not_clustered: Math.max(0, inputExerciseCount - clusteredIds.size),
    rows_removable_exact_duplicate_clusters: rowsExact,
    rows_removable_near_duplicate_clusters: rowsNear,
    rows_removable_practical_merge_clusters: rowsPractical,
    cumulative_rows_removable_if_exact_only: rowsExact,
    cumulative_rows_removable_if_exact_and_near: rowsExact + rowsNear,
    cumulative_rows_removable_if_all_merge_tiers: rowsExact + rowsNear + rowsPractical,
    clusters_exact_duplicate: exact.length,
    clusters_near_duplicate: near.length,
    clusters_practical_merge_candidate: practical.length,
    by_band,
    largest_clusters: largest,
    clusters_with_multiple_core,
    dropped_oversized,
    dropped_low_internal,
    suspicious_oversized_sample,
    suspicious_low_internal_sample,
    member_keep_category_distribution,
    redundancy_family_top_movement_equipment: computeFamilyTop(clusters, features, "me"),
    redundancy_family_top_primary_role: computeFamilyTop(clusters, features, "role"),
  };
}

export function buildDuplicateClustersArtifact(params: {
  catalog_path: string;
  prefill_path: string;
  llm_validated_path: string;
  features: Map<string, ExerciseDuplicateFeatures>;
  mergedById: Map<string, LlmClassificationValidated>;
  /** When provided, canonical selection uses full catalog rows for phase-5 value scoring. */
  catalog_by_id?: Map<string, CatalogExerciseRow>;
  config?: DuplicateClusterConfig;
}): { artifact: DuplicateClustersArtifact; pair_scores: Map<string, PairwiseDuplicateResult> } {
  const cfg = params.config ?? DEFAULT_DUPLICATE_CLUSTER_CONFIG;
  const { features, mergedById } = params;

  const candidates = enumerateCandidatePairs(features, cfg);
  const pairScores = buildPairwiseScoreMap(candidates, features, cfg);

  const blocked_sample: DuplicateClustersArtifact["blocked_pair_sample"] = [];
  for (const [k, r] of pairScores) {
    if (r.blocked && blocked_sample.length < 120) {
      const [a, b] = k.split("|") as [string, string];
      blocked_sample.push({ a, b, score: r.score, reason: r.block_reason ?? "blocked" });
    }
  }

  const related_but_keep_separate = buildRelatedButSeparate(pairScores, 4000);
  const clearly_distinct_pair_sample = buildClearlyDistinctSample(pairScores, 200);

  const { components } = clusterByPairwiseScores(features, pairScores, cfg);

  const ctxById = new Map<string, CanonicalSelectionContext>();
  const catalogById = params.catalog_by_id;
  for (const [id, f] of features) {
    ctxById.set(id, {
      features: f,
      merged: mergedById.get(id) ?? null,
      catalog_row: catalogById?.get(id) ?? null,
    });
  }

  const clusters_exact: DuplicateClusterRecord[] = [];
  const clusters_near: DuplicateClusterRecord[] = [];
  const clusters_practical: DuplicateClusterRecord[] = [];

  const suspicious_oversized_sample: LibraryReductionStats["suspicious_oversized_sample"] = [];
  const suspicious_low_internal_sample: LibraryReductionStats["suspicious_low_internal_sample"] = [];
  let dropped_oversized = 0;
  let dropped_low_internal = 0;

  let ci = 0;
  for (const memberIds of components) {
    if (memberIds.length > cfg.max_cluster_size) {
      dropped_oversized += 1;
      if (suspicious_oversized_sample.length < 30) {
        suspicious_oversized_sample.push({ member_count: memberIds.length });
      }
      ci += 1;
      continue;
    }

    const minInternal = minPairwiseScoreInCluster(memberIds, pairScores);
    if (minInternal < cfg.min_internal_pair_score) {
      dropped_low_internal += 1;
      if (suspicious_low_internal_sample.length < 50) {
        suspicious_low_internal_sample.push({ member_count: memberIds.length, min_internal_score: minInternal });
      }
      ci += 1;
      continue;
    }

    const rec = buildClusterRecord({
      duplicate_cluster_id: `dup_${String(ci).padStart(5, "0")}`,
      minInternal,
      cfg,
      memberIds,
      pairScores,
      ctxById,
    });

    if (rec.redundancy_tier === "exact_duplicate") clusters_exact.push(rec);
    else if (rec.redundancy_tier === "near_duplicate") clusters_near.push(rec);
    else clusters_practical.push(rec);

    ci += 1;
  }

  const clusters = [...clusters_exact, ...clusters_near, ...clusters_practical];

  const stats = computeLibraryReductionStats(
    clusters,
    mergedById,
    features.size,
    dropped_oversized,
    dropped_low_internal,
    suspicious_oversized_sample,
    suspicious_low_internal_sample,
    features
  );

  const artifact: DuplicateClustersArtifact = {
    schema_version: 2,
    generated_at: new Date().toISOString(),
    catalog_path: params.catalog_path,
    prefill_path: params.prefill_path,
    llm_validated_path: params.llm_validated_path,
    aggressiveness: cfg.aggressiveness,
    config: cfg,
    clusters_exact_duplicate: clusters_exact,
    clusters_near_duplicate: clusters_near,
    clusters_practical_merge_candidate: clusters_practical,
    clusters,
    related_but_keep_separate,
    clearly_distinct_pair_sample,
    blocked_pair_sample: blocked_sample,
    stats,
  };
  return { artifact, pair_scores: pairScores };
}

export function buildNearMissesArtifact(params: {
  pairScores: Map<string, PairwiseDuplicateResult>;
  config: DuplicateClusterConfig;
  sample_limit?: number;
}): NearMissesArtifact {
  const limit = params.sample_limit ?? 800;
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    aggressiveness: params.config.aggressiveness,
    near_misses: buildNearMisses(params.pairScores, params.config, limit),
    sample_limit: limit,
  };
}
