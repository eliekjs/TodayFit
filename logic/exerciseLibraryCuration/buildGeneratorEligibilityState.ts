/**
 * Build per-exercise generator eligibility from phase-5 pruning decisions + merged catalog.
 */

import type { LlmClassificationValidated } from "./llmClassificationTypes";
import type { CatalogExerciseRow, WorkoutExerciseCatalogFile } from "./types";
import type { LibraryPruningDecisionArtifact } from "./valueFilterTypes";
import type {
  CanonicalSurvivorInfo,
  CountsByEligibilityState,
  EligibilityConflict,
  ExerciseEligibilityEntry,
  GeneratorEligibilityBuildResult,
  GeneratorEligibilityPreviewStats,
  GeneratorEligibilityPreviewArtifact,
  GeneratorEligibilityState,
  PoolBreakdownByKey,
  PruningGateFeatureFlags,
} from "./generatorEligibilityTypes";
import { DEFAULT_PRUNING_GATE_FLAGS } from "./generatorEligibilityTypes";
import { filterExerciseIdsByEligibility } from "./filterExercisesByEligibility";

const EMPTY_COUNTS = (): CountsByEligibilityState => ({
  eligible_core: 0,
  eligible_niche: 0,
  excluded_merged: 0,
  excluded_removed: 0,
  excluded_review: 0,
  excluded_unknown: 0,
});

export function pruningRecommendationToEligibility(
  recommendation: import("./valueFilterTypes").PruningRecommendation | "unknown"
): GeneratorEligibilityState {
  switch (recommendation) {
    case "keep_core":
      return "eligible_core";
    case "keep_niche":
      return "eligible_niche";
    case "merge_into_canonical":
      return "excluded_merged";
    case "remove_niche_or_low_value":
      return "excluded_removed";
    case "review":
      return "excluded_review";
    default:
      return "excluded_unknown";
  }
}

function entryFromPruningRecord(rec: import("./valueFilterTypes").LibraryPruningDecisionRecord): ExerciseEligibilityEntry {
  const isMerge = rec.pruning_recommendation === "merge_into_canonical";
  const isCanonical =
    Boolean(rec.cluster_id) && rec.pruning_recommendation !== "merge_into_canonical";
  return {
    exercise_id: rec.exercise_id,
    exercise_name: rec.exercise_name,
    eligibility_state: pruningRecommendationToEligibility(rec.pruning_recommendation),
    pruning_recommendation: rec.pruning_recommendation,
    merge_target_exercise_id: isMerge ? rec.canonical_exercise_id : null,
    is_canonical_in_cluster: isCanonical,
    cluster_id: rec.cluster_id,
  };
}

export function buildGeneratorEligibilityState(params: {
  pruning: LibraryPruningDecisionArtifact;
  catalog: WorkoutExerciseCatalogFile;
  pruning_artifact_path: string;
  feature_flags?: PruningGateFeatureFlags;
}): GeneratorEligibilityBuildResult {
  const feature_flags = params.feature_flags ?? DEFAULT_PRUNING_GATE_FLAGS;
  const pruningIds = new Set(params.pruning.records.map((r) => r.exercise_id));
  const byId = new Map<string, ExerciseEligibilityEntry>();
  const conflicts: EligibilityConflict[] = [];

  for (const rec of params.pruning.records) {
    byId.set(rec.exercise_id, entryFromPruningRecord(rec));
  }

  const unknown_exercise_ids: string[] = [];
  for (const ex of params.catalog.exercises) {
    if (!pruningIds.has(ex.id)) {
      unknown_exercise_ids.push(ex.id);
      byId.set(ex.id, {
        exercise_id: ex.id,
        exercise_name: ex.name,
        eligibility_state: "excluded_unknown",
        pruning_recommendation: "unknown",
        merge_target_exercise_id: null,
        is_canonical_in_cluster: false,
        cluster_id: null,
      });
    }
  }

  /** Merge targets that are themselves removed — merge members point at an excluded canonical. */
  const excludedTargets = new Set<string>();
  for (const rec of params.pruning.records) {
    if (rec.pruning_recommendation === "merge_into_canonical" && rec.canonical_exercise_id) {
      const canon = byId.get(rec.canonical_exercise_id);
      if (canon?.eligibility_state === "excluded_removed") {
        excludedTargets.add(rec.canonical_exercise_id);
      }
    }
  }
  for (const tid of excludedTargets) {
    conflicts.push({
      kind: "merge_target_excluded",
      exercise_id: tid,
      merge_target_exercise_id: tid,
      message:
        "Canonical is excluded_removed; merge_into_canonical rows pointing here should be treated as excluded_removed in product review.",
    });
  }

  const counts = EMPTY_COUNTS();
  for (const e of byId.values()) {
    counts[e.eligibility_state] += 1;
  }

  const clusterToMembers = new Map<string, import("./valueFilterTypes").LibraryPruningDecisionRecord[]>();
  for (const rec of params.pruning.records) {
    if (!rec.cluster_id) continue;
    const arr = clusterToMembers.get(rec.cluster_id) ?? [];
    arr.push(rec);
    clusterToMembers.set(rec.cluster_id, arr);
  }

  const canonical_survivors: CanonicalSurvivorInfo[] = [];
  for (const [cluster_id, members] of clusterToMembers) {
    const canonical = members.find((m) => m.pruning_recommendation !== "merge_into_canonical");
    const mergeMembers = members.filter((m) => m.pruning_recommendation === "merge_into_canonical");
    if (!canonical) continue;
    canonical_survivors.push({
      cluster_id,
      canonical_exercise_id: canonical.exercise_id,
      canonical_eligibility: pruningRecommendationToEligibility(canonical.pruning_recommendation),
      merge_member_count: mergeMembers.length,
    });
  }

  const entries = [...byId.values()].sort((a, b) => a.exercise_id.localeCompare(b.exercise_id));
  const by_id: Record<string, ExerciseEligibilityEntry> = {};
  for (const e of entries) {
    by_id[e.exercise_id] = e;
  }

  const mapping_rules = [
    "keep_core → eligible_core",
    "keep_niche → eligible_niche",
    "merge_into_canonical → excluded_merged (merge_target_exercise_id = canonical_exercise_id from pruning record)",
    "remove_niche_or_low_value → excluded_removed",
    "review → excluded_review",
    "catalog id missing from pruning artifact → excluded_unknown",
    "Canonical survivors: exercises in a cluster that are not merge_into_canonical; eligibility follows their own pruning recommendation (keep_core / keep_niche / review / remove).",
  ];

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    pruning_artifact_path: params.pruning_artifact_path,
    catalog_path: params.pruning.catalog_path,
    feature_flags,
    mapping_rules,
    entries,
    by_id,
    counts_by_state: counts,
    canonical_survivors,
    conflicts,
    unknown_exercise_ids: unknown_exercise_ids.sort(),
  };
}

function movementPatternKeys(row: CatalogExerciseRow, merged: LlmClassificationValidated | null): string[] {
  if (merged?.movement_patterns?.length) return [...merged.movement_patterns].sort();
  const ont = row.ontology?.movement_patterns;
  if (ont?.length) return [...ont.map(String)].sort();
  if (row.movement_pattern) return [row.movement_pattern];
  return ["_unlabeled_"];
}

function equipmentClassKey(row: CatalogExerciseRow, merged: LlmClassificationValidated | null): string {
  return merged?.equipment_class ?? "_unknown_";
}

function primaryRoleKey(merged: LlmClassificationValidated | null): string {
  return merged?.primary_role ?? "_unknown_";
}

function incrementMap(m: Map<string, number>, key: string, delta: number) {
  m.set(key, (m.get(key) ?? 0) + delta);
}

function mapToSortedBreakdown(m: Map<string, number>, limit: number): PoolBreakdownByKey[] {
  return [...m.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildGeneratorEligibilityPreview(params: {
  build: GeneratorEligibilityBuildResult;
  catalog: WorkoutExerciseCatalogFile;
  mergedLlmById: Map<string, LlmClassificationValidated>;
  flagsForGatedDefault?: PruningGateFeatureFlags;
  flagsForGatedPermissive?: PruningGateFeatureFlags;
  llm_validated_path?: string | null;
}): GeneratorEligibilityPreviewArtifact {
  const rowById = new Map(params.catalog.exercises.map((e) => [e.id, e]));
  const { build } = params;

  const gatedDefault: PruningGateFeatureFlags = params.flagsForGatedDefault ?? {
    enable_pruning_gating: true,
    allow_niche_exercises: true,
    allow_review_exercises: false,
  };
  const gatedPermissive: PruningGateFeatureFlags = params.flagsForGatedPermissive ?? {
    enable_pruning_gating: true,
    allow_niche_exercises: true,
    allow_review_exercises: true,
  };

  const allIds = params.catalog.exercises.map((e) => e.id);
  const map = new Map<string, ExerciseEligibilityEntry>();
  for (const e of build.entries) {
    map.set(e.exercise_id, e);
  }

  const poolBaseline = filterExerciseIdsByEligibility(allIds, map, {
    enable_pruning_gating: false,
    allow_niche_exercises: true,
    allow_review_exercises: true,
  }).length;

  const poolGatedDefault = filterExerciseIdsByEligibility(allIds, map, gatedDefault).length;
  const poolGatedPermissive = filterExerciseIdsByEligibility(allIds, map, gatedPermissive).length;

  const includedForBreakdown = new Set(
    filterExerciseIdsByEligibility(allIds, map, gatedDefault)
  );

  const byMp = new Map<string, number>();
  const byEq = new Map<string, number>();
  const byRole = new Map<string, number>();

  for (const id of includedForBreakdown) {
    const row = rowById.get(id);
    if (!row) continue;
    const merged = params.mergedLlmById.get(id) ?? null;
    for (const k of movementPatternKeys(row, merged)) {
      incrementMap(byMp, k, 1);
    }
    incrementMap(byEq, equipmentClassKey(row, merged), 1);
    incrementMap(byRole, primaryRoleKey(merged), 1);
  }

  const excludedMerged = build.entries.filter((e) => e.eligibility_state === "excluded_merged");
  const excludedRemoved = build.entries.filter((e) => e.eligibility_state === "excluded_removed");
  const excludedReview = build.entries.filter((e) => e.eligibility_state === "excluded_review");

  const reasonCounts = new Map<string, number>();
  for (const rec of build.entries) {
    if (rec.eligibility_state === "excluded_unknown") {
      incrementMap(reasonCounts, "unknown", 1);
      continue;
    }
    if (
      rec.eligibility_state === "excluded_merged" ||
      rec.eligibility_state === "excluded_removed" ||
      rec.eligibility_state === "excluded_review"
    ) {
      incrementMap(reasonCounts, rec.pruning_recommendation, 1);
    }
  }

  const canonicals_retained_eligible_count = build.canonical_survivors.filter(
    (c) => c.canonical_eligibility === "eligible_core" || c.canonical_eligibility === "eligible_niche"
  ).length;

  const preview_stats: GeneratorEligibilityPreviewStats = {
    catalog_total: params.catalog.exercises.length,
    counts_by_state: build.counts_by_state,
    pool_size_baseline: poolBaseline,
    pool_size_gated_default: poolGatedDefault,
    pool_size_gated_permissive: poolGatedPermissive,
    pool_by_movement_pattern: mapToSortedBreakdown(byMp, 40),
    pool_by_equipment_class: mapToSortedBreakdown(byEq, 25),
    pool_by_primary_role: mapToSortedBreakdown(byRole, 25),
    canonical_survivors_count: build.canonical_survivors.length,
    canonicals_retained_eligible_count,
    excluded_by_pruning_reason: [...reasonCounts.entries()]
      .map(([pruning_recommendation, count]) => ({
        pruning_recommendation: pruning_recommendation as
          | import("./valueFilterTypes").PruningRecommendation
          | "unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count),
    example_excluded_merged: excludedMerged
      .slice()
      .sort((a, b) => a.exercise_id.localeCompare(b.exercise_id))
      .slice(0, 25)
      .map((e) => ({
        exercise_id: e.exercise_id,
        exercise_name: e.exercise_name,
        merge_target_exercise_id: e.merge_target_exercise_id,
      })),
    example_excluded_removed: excludedRemoved
      .slice()
      .sort((a, b) => a.exercise_id.localeCompare(b.exercise_id))
      .slice(0, 25)
      .map((e) => ({ exercise_id: e.exercise_id, exercise_name: e.exercise_name })),
    example_excluded_review: excludedReview
      .slice()
      .sort((a, b) => a.exercise_id.localeCompare(b.exercise_id))
      .slice(0, 25)
      .map((e) => ({ exercise_id: e.exercise_id, exercise_name: e.exercise_name })),
  };

  return {
    ...build,
    preview_stats,
    llm_validated_path: params.llm_validated_path ?? null,
  };
}
