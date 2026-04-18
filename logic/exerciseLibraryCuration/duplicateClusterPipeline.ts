/**
 * End-to-end duplicate cluster construction from feature maps and pairwise scores.
 */

import type { LlmClassificationValidated } from "./llmClassificationTypes";
import type {
  DuplicateClusterConfig,
  DuplicateClusterRecord,
  DuplicateClusterStats,
  DuplicateClustersArtifact,
  ExerciseDuplicateFeatures,
  PairwiseDuplicateResult,
} from "./duplicateClusterTypes";
import { DEFAULT_DUPLICATE_CLUSTER_CONFIG } from "./duplicateClusterTypes";
import {
  clusterByPairwiseScores,
  computePairwiseDuplicateScore,
  enumerateCandidatePairs,
  minPairwiseScoreInCluster,
} from "./duplicateSimilarity";
import { type CanonicalSelectionContext, selectCanonicalExerciseId } from "./selectCanonicalExercise";

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

export function buildDuplicateClustersArtifact(params: {
  catalog_path: string;
  prefill_path: string;
  llm_validated_path: string;
  features: Map<string, ExerciseDuplicateFeatures>;
  mergedById: Map<string, LlmClassificationValidated>;
  config?: DuplicateClusterConfig;
}): DuplicateClustersArtifact {
  const cfg = params.config ?? DEFAULT_DUPLICATE_CLUSTER_CONFIG;
  const { features, mergedById } = params;

  const candidates = enumerateCandidatePairs(features);
  const pairScores = buildPairwiseScoreMap(candidates, features, cfg);

  const blocked_sample: DuplicateClustersArtifact["blocked_pair_sample"] = [];
  for (const [k, r] of pairScores) {
    if (r.blocked && blocked_sample.length < 80) {
      const [a, b] = k.split("|") as [string, string];
      blocked_sample.push({ a, b, score: r.score, reason: r.block_reason ?? "blocked" });
    }
  }

  const { components } = clusterByPairwiseScores(features, pairScores, cfg);

  const ctxById = new Map<string, CanonicalSelectionContext>();
  for (const [id, f] of features) {
    ctxById.set(id, { features: f, merged: mergedById.get(id) ?? null });
  }

  const clusters: DuplicateClusterRecord[] = [];
  const suspicious_oversized_sample: DuplicateClusterStats["suspicious_oversized_sample"] = [];
  const suspicious_low_internal_sample: DuplicateClusterStats["suspicious_low_internal_sample"] = [];
  let dropped_oversized = 0;
  let dropped_low_internal = 0;

  let ci = 0;
  for (const memberIds of components) {
    if (memberIds.length > cfg.max_cluster_size) {
      dropped_oversized += 1;
      if (suspicious_oversized_sample.length < 25) {
        suspicious_oversized_sample.push({ member_count: memberIds.length });
      }
      ci += 1;
      continue;
    }

    const minInternal = minPairwiseScoreInCluster(memberIds, pairScores);
    if (minInternal < cfg.min_internal_pair_score) {
      dropped_low_internal += 1;
      if (suspicious_low_internal_sample.length < 40) {
        suspicious_low_internal_sample.push({ member_count: memberIds.length, min_internal_score: minInternal });
      }
      ci += 1;
      continue;
    }

    const { canonical_id, reasons } = selectCanonicalExerciseId(memberIds, ctxById);

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
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const a = memberIds[i]!;
        const b = memberIds[j]!;
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        const pr = pairScores.get(k);
        if (pr?.reason_codes?.length) link_codes.push(...pr.reason_codes.slice(0, 3));
      }
    }

    const band =
      minInternal >= cfg.bands.high ? "high" : minInternal >= cfg.bands.medium ? "medium" : "low";

    clusters.push({
      duplicate_cluster_id: `dup_${String(ci).padStart(5, "0")}`,
      cluster_confidence: band,
      cluster_score: minInternal,
      canonical_exercise_id: canonical_id,
      member_exercise_ids: [...memberIds].sort(),
      member_count: memberIds.length,
      top_similarity_factors: topFactors,
      canonical_selection_reasons: reasons,
      link_reason_codes: dedupeStrings(link_codes).slice(0, 12),
    });
    ci += 1;
  }

  const stats = computeDuplicateClusterStats(
    clusters,
    mergedById,
    features.size,
    dropped_oversized,
    dropped_low_internal,
    suspicious_oversized_sample,
    suspicious_low_internal_sample
  );

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    catalog_path: params.catalog_path,
    prefill_path: params.prefill_path,
    llm_validated_path: params.llm_validated_path,
    config: cfg,
    clusters,
    blocked_pair_sample: blocked_sample,
    stats,
  };
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

function computeDuplicateClusterStats(
  clusters: DuplicateClusterRecord[],
  mergedById: Map<string, LlmClassificationValidated>,
  inputExerciseCount: number,
  dropped_oversized: number,
  dropped_low_internal: number,
  suspicious_oversized_sample: DuplicateClusterStats["suspicious_oversized_sample"],
  suspicious_low_internal_sample: DuplicateClusterStats["suspicious_low_internal_sample"]
): DuplicateClusterStats {
  const by_band = { high: 0, medium: 0, low: 0 };
  for (const c of clusters) {
    by_band[c.cluster_confidence] += 1;
  }

  const clusteredIds = new Set<string>();
  const member_keep_category_distribution: Record<string, number> = {};
  for (const c of clusters) {
    for (const id of c.member_exercise_ids) {
      clusteredIds.add(id);
      const kc = mergedById.get(id)?.keep_category ?? "unknown";
      member_keep_category_distribution[kc] = (member_keep_category_distribution[kc] ?? 0) + 1;
    }
  }

  const largest = [...clusters]
    .sort((a, b) => b.member_count - a.member_count)
    .slice(0, 15)
    .map((c) => ({
      duplicate_cluster_id: c.duplicate_cluster_id,
      member_count: c.member_count,
      canonical_exercise_id: c.canonical_exercise_id,
    }));

  let clusters_with_multiple_core = 0;
  for (const c of clusters) {
    let coreN = 0;
    for (const id of c.member_exercise_ids) {
      const m = mergedById.get(id)?.keep_category;
      if (m === "core") coreN += 1;
    }
    if (coreN >= 2) clusters_with_multiple_core += 1;
  }

  return {
    total_clusters: clusters.length,
    input_exercise_count: inputExerciseCount,
    exercises_clustered_unique: clusteredIds.size,
    exercises_not_clustered: Math.max(0, inputExerciseCount - clusteredIds.size),
    by_band,
    largest_clusters: largest,
    clusters_with_multiple_core,
    dropped_oversized,
    dropped_low_internal,
    suspicious_oversized_sample,
    suspicious_low_internal_sample,
    member_keep_category_distribution,
  };
}
