/**
 * Phase 5 — combine value scores, redundancy clusters, and pruning recommendations.
 */

import type { DuplicateClusterRecord, DuplicateClustersArtifact } from "./duplicateClusterTypes";
import type { LlmValidatedArtifact } from "./llmClassificationTypes";
import { normalizeForDuplicateMatching } from "./duplicateNormalization";
import { recommendStandalonePruning, scoreExerciseValue } from "./scoreExerciseValue";
import { selectCanonicalFromValueProfiles } from "./canonicalSelectionHelpers";
import type { PrefillRunArtifact } from "./types";
import type { WorkoutExerciseCatalogFile } from "./types";
import type {
  ExerciseValueProfile,
  FamilyRollup,
  LibraryPruningConfig,
  LibraryPruningDecisionArtifact,
  LibraryPruningDecisionRecord,
  LibraryPruningSummaryStats,
  PruningRecommendation,
} from "./valueFilterTypes";
import { DEFAULT_LIBRARY_PRUNING_CONFIG } from "./valueFilterTypes";

type ClusterInfo = {
  cluster_id: string;
  phase4_canonical_id: string;
  redundancy_tier: string;
  member_ids: string[];
};

function buildClusterIndex(clusters: DuplicateClusterRecord[]): {
  byExercise: Map<string, ClusterInfo>;
  list: ClusterInfo[];
} {
  const byExercise = new Map<string, ClusterInfo>();
  const list: ClusterInfo[] = [];
  for (const c of clusters) {
    const info: ClusterInfo = {
      cluster_id: c.duplicate_cluster_id,
      phase4_canonical_id: c.canonical_exercise_id,
      redundancy_tier: c.redundancy_tier,
      member_ids: c.member_exercise_ids,
    };
    list.push(info);
    for (const id of c.member_exercise_ids) {
      byExercise.set(id, info);
    }
  }
  return { byExercise, list };
}

function quantiles(values: number[]): { p10: number; p50: number; p90: number } {
  if (!values.length) return { p10: 0, p50: 0, p90: 0 };
  const s = [...values].sort((a, b) => a - b);
  const pick = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]!;
  return { p10: pick(0.1), p50: pick(0.5), p90: pick(0.9) };
}

function countReasons(records: LibraryPruningDecisionRecord[], rec: PruningRecommendation): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of records) {
    if (r.pruning_recommendation !== rec) continue;
    for (const c of r.pruning_reason_codes) {
      m.set(c, (m.get(c) ?? 0) + 1);
    }
  }
  return m;
}

function topReasons(m: Map<string, number>, limit: number): { code: string; count: number }[] {
  return [...m.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Coarse movement family for rollup tables (deterministic). */
export function inferExerciseFamilyKey(name: string, exerciseId: string): { key: string; label: string } {
  const n = normalizeForDuplicateMatching(name);
  const id = exerciseId.toLowerCase();

  const test = (pred: boolean, key: string, label: string) => (pred ? { key, label } : null);

  return (
    test(n.includes("push up") || n.includes("pushup") || id.includes("push_up"), "push_up", "Push-up family") ??
    test(n.includes("goblet") && n.includes("squat"), "goblet_squat", "Goblet squat family") ??
    test(n.includes("squat") || id.includes("squat"), "squat", "Squat family") ??
    test(n.includes("fly") || n.includes("flies"), "fly", "Fly family") ??
    test(n.includes("chop") || n.includes("woodchop"), "chop", "Chop / lift family") ??
    test(n.includes("split squat") || n.includes("rear foot elevated") || id.includes("split_squat") || id.includes("rfess"), "split_squat", "Split squat / RFESS family") ??
    test(n.includes("carry") || n.includes("farmer") || n.includes("suitcase"), "carry", "Carry family") ??
    test(n.includes("plank") || n.includes("pallof") || n.includes("dead bug") || n.includes("bird dog"), "plank_core", "Plank / core stability family") ??
    test(/^ff[\s_-]/i.test(name) || id.startsWith("ff_") || id.startsWith("ff-"), "ff_technical", "FF-prefixed / technical codes") ??
    test(n.includes("front lever") || n.includes("planche") || n.includes("human flag"), "skill_gymnastics", "Gymnastics skill family") ??
    { key: "other", label: "Other / unclassified" }
  );
}

function buildFamilyRollups(records: LibraryPruningDecisionRecord[]): FamilyRollup[] {
  const byKey = new Map<string, { label: string; ids: Set<string>; kept: number; out: number }>();
  for (const r of records) {
    const { key, label } = inferExerciseFamilyKey(r.exercise_name, r.exercise_id);
    let slot = byKey.get(key);
    if (!slot) {
      slot = { label, ids: new Set(), kept: 0, out: 0 };
      byKey.set(key, slot);
    }
    slot.ids.add(r.exercise_id);
    const drop = r.pruning_recommendation === "remove_niche_or_low_value" || r.pruning_recommendation === "merge_into_canonical";
    if (drop) slot.out += 1;
    else slot.kept += 1;
  }

  const rollups: FamilyRollup[] = [...byKey.entries()]
    .map(([family_key, v]) => ({
      family_key,
      label: v.label,
      exercise_count: v.ids.size,
      projected_kept: v.kept,
      projected_removed_or_merged: v.out,
      example_exercise_ids: [...v.ids].sort().slice(0, 8),
    }))
    .sort((a, b) => b.exercise_count - a.exercise_count);

  return rollups.slice(0, 35);
}

export function buildLibraryPruningDecision(params: {
  catalog: WorkoutExerciseCatalogFile;
  prefillArtifact: PrefillRunArtifact | null;
  llmArtifact: LlmValidatedArtifact;
  duplicateArtifact: DuplicateClustersArtifact;
  duplicate_clusters_path?: string;
  config?: LibraryPruningConfig;
}): LibraryPruningDecisionArtifact {
  const cfg = params.config ?? DEFAULT_LIBRARY_PRUNING_CONFIG;
  const mergedById = new Map(params.llmArtifact.records.map((r) => [r.exercise_id, r.merged_with_locked_prefill]));
  const prefillById = new Map((params.prefillArtifact?.records ?? []).map((r) => [r.exercise_id, r]));

  const catalogIds = new Set(params.catalog.exercises.map((e) => e.id));
  const clustersInCatalog = (params.duplicateArtifact.clusters ?? []).filter((c) =>
    c.member_exercise_ids.every((id) => catalogIds.has(id))
  );
  const { byExercise: clusterOf, list: clusterList } = buildClusterIndex(clustersInCatalog);

  /** Phase 5 canonical per cluster (may differ from phase 4). */
  const phase5CanonicalByCluster = new Map<string, string>();
  const profiles = new Map<string, ExerciseValueProfile>();

  for (const ex of params.catalog.exercises) {
    const merged = mergedById.get(ex.id) ?? null;
    const prefill = prefillById.get(ex.id) ?? null;
    profiles.set(
      ex.id,
      scoreExerciseValue(ex, merged, prefill, cfg, {
        not_in_redundancy_cluster: !clusterOf.has(ex.id),
      })
    );
  }

  for (const cl of clusterList) {
    const allRemove = cl.member_ids.every((id) => mergedById.get(id)?.keep_category === "remove_candidate");
    const { canonical_id } = selectCanonicalFromValueProfiles(cl.member_ids, profiles, {
      all_members_remove_candidate: allRemove,
    });
    phase5CanonicalByCluster.set(cl.cluster_id, canonical_id);
  }

  const records: LibraryPruningDecisionRecord[] = [];

  for (const ex of params.catalog.exercises) {
    const base = profiles.get(ex.id)!;
    const merged = mergedById.get(ex.id) ?? null;
    const cl = clusterOf.get(ex.id) ?? null;
    const phase5Canonical = cl ? phase5CanonicalByCluster.get(cl.cluster_id)! : null;
    const isNonCanonical = cl && phase5Canonical && ex.id !== phase5Canonical;

    let profile: ExerciseValueProfile = { ...base };
    let recommendation: PruningRecommendation = "review";
    const extraReasons: string[] = [];

    if (isNonCanonical) {
      const mergedOverall = base.intrinsic_overall_value_score * cfg.merge_member_overall_multiplier;
      profile = {
        ...base,
        redundancy_penalty_score: 1,
        overall_value_score: mergedOverall,
        intrinsic_overall_value_score: base.intrinsic_overall_value_score,
      };
      recommendation = "merge_into_canonical";
      extraReasons.push(`merge_into_cluster_${cl!.cluster_id}`, `merge_tier_${cl!.redundancy_tier}`, `canonical_target_${phase5Canonical}`);
    } else {
      const { recommendation: rec, reason_codes } = recommendStandalonePruning(base.intrinsic_overall_value_score, merged, cfg, {
        simplicity_score: base.simplicity_score,
        niche_penalty_score: base.niche_penalty_score,
        keyword_hit_count: base.pruning_reason_codes.filter((c) => c.startsWith("name_keyword_family_")).length,
      });
      recommendation = rec;
      extraReasons.push(...reason_codes);

      if (cl && ex.id === phase5Canonical && recommendation === "remove_niche_or_low_value") {
        recommendation = "review";
        extraReasons.push("weak_cluster_survivor_reserved");
      }
    }

    profile = {
      ...profile,
      pruning_recommendation: recommendation,
      pruning_reason_codes: dedupe([...base.pruning_reason_codes, ...extraReasons]),
      overall_value_score: profile.overall_value_score,
    };

    records.push({
      exercise_id: ex.id,
      exercise_name: ex.name,
      cluster_id: cl?.cluster_id ?? null,
      canonical_exercise_id: isNonCanonical ? phase5Canonical : null,
      phase4_cluster_canonical_exercise_id: cl?.phase4_canonical_id ?? null,
      redundancy_tier: cl?.redundancy_tier ?? null,
      value_profile: profile,
      pruning_recommendation: recommendation,
      pruning_reason_codes: profile.pruning_reason_codes,
    });
  }

  const summary = buildSummary(records, params.catalog.exercises.length, clusterList);

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    catalog_path: params.duplicateArtifact.catalog_path,
    prefill_path: params.prefillArtifact?.catalog_path ?? "",
    llm_validated_path: params.llmArtifact.catalog_path,
    duplicate_clusters_path: params.duplicate_clusters_path ?? "",
    library_pruning_config: cfg,
    duplicate_aggressiveness: params.duplicateArtifact.aggressiveness,
    records,
    summary,
  };
}

function dedupe(xs: string[]): string[] {
  const out: string[] = [];
  const s = new Set<string>();
  for (const x of xs) {
    if (!s.has(x)) {
      s.add(x);
      out.push(x);
    }
  }
  return out;
}

function buildSummary(records: LibraryPruningDecisionRecord[], totalExercises: number, clusterList: ClusterInfo[]): LibraryPruningSummaryStats {
  const counts_by_recommendation: LibraryPruningSummaryStats["counts_by_recommendation"] = {
    keep_core: 0,
    keep_niche: 0,
    merge_into_canonical: 0,
    remove_niche_or_low_value: 0,
    review: 0,
  };
  for (const r of records) {
    counts_by_recommendation[r.pruning_recommendation] += 1;
  }

  const projected_rows_merged_into_canonical = counts_by_recommendation.merge_into_canonical;
  const projected_rows_removed = counts_by_recommendation.remove_niche_or_low_value;
  const projected_rows_retained =
    counts_by_recommendation.keep_core + counts_by_recommendation.keep_niche + counts_by_recommendation.review;

  const intrinsic = records.map((r) => r.value_profile.intrinsic_overall_value_score);

  const top_canonical_selections = clusterList
    .map((cl) => {
      const canonRecord = records.find((r) => r.cluster_id === cl.cluster_id && r.pruning_recommendation !== "merge_into_canonical");
      const p5canon = canonRecord?.exercise_id ?? cl.phase4_canonical_id;
      return {
        cluster_id: cl.cluster_id,
        canonical_exercise_id: p5canon,
        member_count: cl.member_ids.length,
        phase4_canonical_exercise_id: cl.phase4_canonical_id,
        changed_from_phase4: p5canon !== cl.phase4_canonical_id,
      };
    })
    .sort((a, b) => b.member_count - a.member_count)
    .slice(0, 40);

  return {
    total_exercises: totalExercises,
    counts_by_recommendation,
    projected_rows_retained,
    projected_rows_removed,
    projected_rows_merged_into_canonical,
    top_remove_reason_codes: topReasons(countReasons(records, "remove_niche_or_low_value"), 18),
    top_removal_drivers: topReasons(countReasons(records, "remove_niche_or_low_value"), 28),
    top_merge_reason_codes: topReasons(countReasons(records, "merge_into_canonical"), 18),
    top_canonical_selections,
    family_rollups: buildFamilyRollups(records),
    intrinsic_overall_score_quantiles: quantiles(intrinsic),
  };
}
