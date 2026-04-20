/**
 * Phase 4 — redundancy clustering for library reduction (deterministic, no LLM).
 * Does not modify catalog rows, generator behavior, or assign generator_state.
 *
 * Run:
 *   npm run curation:cluster-duplicates
 *
 * Env:
 *   CLUSTER_CATALOG_PATH — default: data/workout-exercise-catalog.json
 *   CLUSTER_LLM_VALIDATED_PATH — default: artifacts/exercise-curation-llm-validated.json
 *   CLUSTER_PREFILL_PATH — recorded in artifact; default: artifacts/exercise-curation-prefill.json
 *   CLUSTER_MAX_IDS — optional; limit to first N exercise ids (sorted)
 *   CLUSTER_AGGRESSIVENESS — conservative | balanced | aggressive (default: aggressive)
 *   CLUSTER_DUPLICATE_CONFIG_JSON — optional partial merge over the selected preset
 *   CLUSTER_PAIRWISE_DEBUG_IDS — comma-separated ids; logs pairwise scores to stderr
 *   CLUSTER_NEAR_MISS_LIMIT — max near-miss pairs in JSON (default: 800)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import type { LlmClassificationValidated, LlmValidatedArtifact } from "../../logic/exerciseLibraryCuration/llmClassificationTypes";
import {
  buildDuplicateClustersArtifact,
  buildNearMissesArtifact,
} from "../../logic/exerciseLibraryCuration/duplicateClusterPipeline";
import type { DuplicateClusterConfig, LibraryReductionAggressiveness } from "../../logic/exerciseLibraryCuration/duplicateClusterTypes";
import {
  configForAggressiveness,
  mergeDuplicateClusterConfig,
  type ExerciseDuplicateFeatures,
} from "../../logic/exerciseLibraryCuration/duplicateClusterTypes";
import { formatDuplicateClusterSummaryMarkdown } from "../../logic/exerciseLibraryCuration/duplicateSummaryMarkdown";
import { formatLibraryReductionSummaryMarkdown } from "../../logic/exerciseLibraryCuration/libraryReductionMarkdown";
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

function parseAggressiveness(raw: string | undefined): LibraryReductionAggressiveness {
  const v = raw?.trim().toLowerCase();
  if (v === "conservative" || v === "balanced" || v === "aggressive") return v;
  return "aggressive";
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

  const nearMissLimit = Number.parseInt(process.env.CLUSTER_NEAR_MISS_LIMIT ?? "800", 10);

  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    process.exit(1);
  }
  if (!existsSync(llmPath)) {
    console.error(`LLM validated artifact not found: ${llmPath}`);
    process.exit(1);
  }

  const aggressiveness = parseAggressiveness(process.env.CLUSTER_AGGRESSIVENESS);
  let config: DuplicateClusterConfig = configForAggressiveness(aggressiveness);

  const cfgJson = process.env.CLUSTER_DUPLICATE_CONFIG_JSON?.trim();
  if (cfgJson) {
    try {
      const partial = JSON.parse(cfgJson) as Partial<DuplicateClusterConfig>;
      config = mergeDuplicateClusterConfig(config, partial);
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
    const cand = enumerateCandidatePairs(features, config);
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
        console.error(
          `${a} | ${b} score=${pr.score.toFixed(3)} hyp=${pr.hypothetical_unblocked_score.toFixed(3)} blocked=${pr.blocked} ${pr.block_reason ?? ""}`
        );
        if (++n >= 40) break;
      }
    }
  }

  const { artifact, pair_scores } = buildDuplicateClustersArtifact({
    catalog_path: catalogPath,
    prefill_path: existsSync(prefillPath) ? prefillPath : prefillPath,
    llm_validated_path: llmPath,
    features,
    mergedById,
    catalog_by_id: rowById,
    config,
  });

  const nearMisses = buildNearMissesArtifact({
    pairScores: pair_scores,
    config,
    sample_limit: Number.isFinite(nearMissLimit) ? nearMissLimit : 800,
  });

  const artifactsDir = join(REPO, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  const jsonOut = join(artifactsDir, "exercise-duplicate-clusters.json");
  writeFileSync(jsonOut, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  const mdOut = join(artifactsDir, "exercise-duplicate-clusters.md");
  writeFileSync(mdOut, formatDuplicateClusterSummaryMarkdown(artifact), "utf8");

  const nearJson = join(artifactsDir, "exercise-duplicate-near-misses.json");
  writeFileSync(nearJson, `${JSON.stringify(nearMisses, null, 2)}\n`, "utf8");

  const reductionMd = join(artifactsDir, "exercise-library-reduction-summary.md");
  writeFileSync(reductionMd, formatLibraryReductionSummaryMarkdown(artifact, nearMisses), "utf8");

  const st = artifact.stats;
  console.log("Redundancy clustering (library reduction)");
  console.log(`  aggressiveness: ${artifact.aggressiveness}`);
  console.log(`  pair candidates scored: ${pair_scores.size}`);
  console.log(`  clusters: exact ${st.clusters_exact_duplicate} | near ${st.clusters_near_duplicate} | practical ${st.clusters_practical_merge_candidate}`);
  console.log(`  rows removable (all merge tiers): ${st.cumulative_rows_removable_if_all_merge_tiers}`);
  console.log(`  exercises not in any cluster: ${st.exercises_not_clustered}`);
  console.log(`  wrote ${jsonOut}`);
  console.log(`  wrote ${mdOut}`);
  console.log(`  wrote ${nearJson}`);
  console.log(`  wrote ${reductionMd}`);
}

main();
