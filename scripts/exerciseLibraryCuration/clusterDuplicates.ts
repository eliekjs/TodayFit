/**
 * Phase 4 — deterministic duplicate clustering and canonical selection.
 * Does not modify catalog rows, generator behavior, or assign generator_state.
 *
 * Run:
 *   npx tsx scripts/exerciseLibraryCuration/clusterDuplicates.ts
 *
 * Env:
 *   CLUSTER_CATALOG_PATH — default: data/workout-exercise-catalog.json
 *   CLUSTER_LLM_VALIDATED_PATH — default: artifacts/exercise-curation-llm-validated.json
 *   CLUSTER_PREFILL_PATH — recorded in artifact only; default: artifacts/exercise-curation-prefill.json
 *   CLUSTER_MAX_IDS — optional; limit to first N exercise ids (sorted) for faster runs
 *   CLUSTER_DUPLICATE_CONFIG_JSON — optional JSON partial merge over DEFAULT_DUPLICATE_CLUSTER_CONFIG
 *   CLUSTER_PAIRWISE_DEBUG_IDS — comma-separated ids; logs pairwise scores vs those ids to stderr
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import type { LlmClassificationValidated, LlmValidatedArtifact } from "../../logic/exerciseLibraryCuration/llmClassificationTypes";
import { buildDuplicateClustersArtifact } from "../../logic/exerciseLibraryCuration/duplicateClusterPipeline";
import {
  DEFAULT_DUPLICATE_CLUSTER_CONFIG,
  mergeDuplicateClusterConfig,
  type ExerciseDuplicateFeatures,
} from "../../logic/exerciseLibraryCuration/duplicateClusterTypes";
import { formatDuplicateClusterSummaryMarkdown } from "../../logic/exerciseLibraryCuration/duplicateSummaryMarkdown";
import {
  buildExerciseDuplicateFeatures,
  computePairwiseDuplicateScore,
  enumerateCandidatePairs,
} from "../../logic/exerciseLibraryCuration/duplicateSimilarity";
import type { WorkoutExerciseCatalogFile } from "../../logic/exerciseLibraryCuration/types";

const REPO = join(__dirname, "..", "..");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function main() {
  const catalogPath = process.env.CLUSTER_CATALOG_PATH?.trim()
    ? resolve(process.env.CLUSTER_CATALOG_PATH.trim())
    : join(REPO, "data", "workout-exercise-catalog.json");
  const llmPath = process.env.CLUSTER_LLM_VALIDATED_PATH?.trim()
    ? resolve(process.env.CLUSTER_LLM_VALIDATED_PATH.trim())
    : join(REPO, "artifacts", "exercise-curation-llm-validated.json");
  const prefillPath = process.env.CLUSTER_PREFILL_PATH?.trim()
    ? resolve(process.env.CLUSTER_PREFILL_PATH.trim())
    : join(REPO, "artifacts", "exercise-curation-prefill.json");

  const maxIdsRaw = process.env.CLUSTER_MAX_IDS?.trim();
  const maxIds = maxIdsRaw ? Number.parseInt(maxIdsRaw, 10) : undefined;
  if (maxIdsRaw && (Number.isNaN(maxIds!) || maxIds! < 1)) {
    console.error("CLUSTER_MAX_IDS must be a positive integer");
    process.exit(1);
  }

  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    process.exit(1);
  }
  if (!existsSync(llmPath)) {
    console.error(`LLM validated artifact not found: ${llmPath}`);
    process.exit(1);
  }

  let config = DEFAULT_DUPLICATE_CLUSTER_CONFIG;
  const cfgJson = process.env.CLUSTER_DUPLICATE_CONFIG_JSON?.trim();
  if (cfgJson) {
    try {
      const partial = JSON.parse(cfgJson) as Partial<typeof DEFAULT_DUPLICATE_CLUSTER_CONFIG>;
      config = mergeDuplicateClusterConfig(DEFAULT_DUPLICATE_CLUSTER_CONFIG, partial);
    } catch (e) {
      console.error("CLUSTER_DUPLICATE_CONFIG_JSON parse error:", e);
      process.exit(1);
    }
  }

  const catalog = loadJson<WorkoutExerciseCatalogFile>(catalogPath);
  if (!catalog.exercises?.length) {
    console.error("Invalid catalog");
    process.exit(1);
  }

  const llmArt = loadJson<LlmValidatedArtifact>(llmPath);
  const mergedById = new Map<string, LlmClassificationValidated>();
  for (const r of llmArt.records ?? []) {
    mergedById.set(r.exercise_id, r.merged_with_locked_prefill);
  }

  const rowById = new Map(catalog.exercises.map((e) => [e.id, e]));
  let ids = [...rowById.keys()].sort();
  if (maxIds) {
    ids = ids.slice(0, maxIds);
  }

  const features = new Map<string, ExerciseDuplicateFeatures>();
  for (const id of ids) {
    const row = rowById.get(id);
    if (!row) continue;
    const merged = mergedById.get(id) ?? null;
    features.set(id, buildExerciseDuplicateFeatures(id, row, merged));
  }

  const debugIds =
    process.env.CLUSTER_PAIRWISE_DEBUG_IDS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (debugIds.length) {
    const cand = enumerateCandidatePairs(features);
    console.error("── Pairwise debug (sample edges involving CLUSTER_PAIRWISE_DEBUG_IDS) ──");
    for (const did of debugIds) {
      let n = 0;
      for (const pk of cand) {
        if (!pk.includes(did)) continue;
        const [a, b] = pk.split("|") as [string, string];
        const fa = features.get(a);
        const fb = features.get(b);
        if (!fa || !fb) continue;
        const pr = computePairwiseDuplicateScore(fa, fb, config);
        console.error(`${a} | ${b} score=${pr.score.toFixed(3)} blocked=${pr.blocked} ${pr.block_reason ?? ""}`);
        if (++n >= 40) break;
      }
    }
  }

  const artifact = buildDuplicateClustersArtifact({
    catalog_path: catalogPath,
    prefill_path: existsSync(prefillPath) ? prefillPath : prefillPath,
    llm_validated_path: llmPath,
    features,
    mergedById,
    config,
  });

  const artifactsDir = join(REPO, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  const jsonOut = join(artifactsDir, "exercise-duplicate-clusters.json");
  writeFileSync(jsonOut, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  const mdOut = join(artifactsDir, "exercise-duplicate-clusters.md");
  writeFileSync(mdOut, formatDuplicateClusterSummaryMarkdown(artifact), "utf8");

  console.log("Duplicate clustering (phase 4)");
  console.log(`  clusters: ${artifact.stats.total_clusters}`);
  console.log(`  by band high/medium/low: ${artifact.stats.by_band.high} / ${artifact.stats.by_band.medium} / ${artifact.stats.by_band.low}`);
  console.log(`  exercises not clustered: ${artifact.stats.exercises_not_clustered}`);
  console.log(`  wrote ${jsonOut}`);
  console.log(`  wrote ${mdOut}`);
}

main();
