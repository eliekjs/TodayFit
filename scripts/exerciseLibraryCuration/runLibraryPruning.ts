/**
 * Phase 5 — exercise value filtering + canonical selection + keep/drop recommendations (staging only).
 *
 * Run:
 *   npm run curation:library-prune
 *
 * Env:
 *   PRUNE_CATALOG_PATH — default: data/workout-exercise-catalog.json
 *   PRUNE_PREFILL_PATH — default: artifacts/exercise-curation-prefill.json
 *   PRUNE_LLM_VALIDATED_PATH — default: artifacts/exercise-curation-llm-validated.json
 *   PRUNE_DUPLICATE_CLUSTERS_PATH — default: artifacts/exercise-duplicate-clusters.json
 *   PRUNE_MAX_IDS — optional; limit to first N exercise ids (sorted) for dry runs
 *   PRUNE_CONFIG_JSON — optional JSON partial merged over DEFAULT_LIBRARY_PRUNING_CONFIG
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import { buildLibraryPruningDecision } from "../../logic/exerciseLibraryCuration/buildLibraryPruningDecision";
import type { LlmValidatedArtifact } from "../../logic/exerciseLibraryCuration/llmClassificationTypes";
import type { DuplicateClustersArtifact } from "../../logic/exerciseLibraryCuration/duplicateClusterTypes";
import {
  formatLibraryPruningDecisionMarkdown,
  formatLibraryPruningSummaryOnlyMarkdown,
} from "../../logic/exerciseLibraryCuration/pruningSummaryMarkdown";
import type { PrefillRunArtifact } from "../../logic/exerciseLibraryCuration/types";
import type { WorkoutExerciseCatalogFile } from "../../logic/exerciseLibraryCuration/types";
import type { LibraryPruningConfig } from "../../logic/exerciseLibraryCuration/valueFilterTypes";
import { DEFAULT_LIBRARY_PRUNING_CONFIG, mergeLibraryPruningConfig } from "../../logic/exerciseLibraryCuration/valueFilterTypes";

const REPO = join(__dirname, "..", "..");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function main() {
  const catalogPath = process.env.PRUNE_CATALOG_PATH?.trim()
    ? resolve(process.env.PRUNE_CATALOG_PATH.trim())
    : join(REPO, "data", "workout-exercise-catalog.json");
  const prefillPath = process.env.PRUNE_PREFILL_PATH?.trim()
    ? resolve(process.env.PRUNE_PREFILL_PATH.trim())
    : join(REPO, "artifacts", "exercise-curation-prefill.json");
  const llmPath = process.env.PRUNE_LLM_VALIDATED_PATH?.trim()
    ? resolve(process.env.PRUNE_LLM_VALIDATED_PATH.trim())
    : join(REPO, "artifacts", "exercise-curation-llm-validated.json");
  const dupPath = process.env.PRUNE_DUPLICATE_CLUSTERS_PATH?.trim()
    ? resolve(process.env.PRUNE_DUPLICATE_CLUSTERS_PATH.trim())
    : join(REPO, "artifacts", "exercise-duplicate-clusters.json");

  const maxIdsRaw = process.env.PRUNE_MAX_IDS?.trim();
  const maxIds = maxIdsRaw ? Number.parseInt(maxIdsRaw, 10) : undefined;
  if (maxIdsRaw && (Number.isNaN(maxIds!) || maxIds! < 1)) {
    console.error("PRUNE_MAX_IDS must be a positive integer");
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
  if (!existsSync(dupPath)) {
    console.error(`Duplicate clusters artifact not found: ${dupPath}`);
    process.exit(1);
  }

  let config: LibraryPruningConfig = DEFAULT_LIBRARY_PRUNING_CONFIG;
  const cfgJson = process.env.PRUNE_CONFIG_JSON?.trim();
  if (cfgJson) {
    try {
      const partial = JSON.parse(cfgJson) as Partial<LibraryPruningConfig>;
      config = mergeLibraryPruningConfig(config, partial);
    } catch (e) {
      console.error("PRUNE_CONFIG_JSON parse error:", e);
      process.exit(1);
    }
  }

  const catalog = loadJson<WorkoutExerciseCatalogFile>(catalogPath);
  if (!catalog.exercises?.length) {
    console.error("Invalid catalog");
    process.exit(1);
  }

  let exercises = catalog.exercises;
  if (maxIds) {
    const sorted = [...exercises].sort((a, b) => a.id.localeCompare(b.id));
    exercises = sorted.slice(0, maxIds);
  }

  const llmArt = loadJson<LlmValidatedArtifact>(llmPath);
  const dupArt = loadJson<DuplicateClustersArtifact>(dupPath);

  const prefillArt: PrefillRunArtifact | null = existsSync(prefillPath) ? loadJson<PrefillRunArtifact>(prefillPath) : null;

  const artifact = buildLibraryPruningDecision({
    catalog: { exercises },
    prefillArtifact: prefillArt,
    llmArtifact: llmArt,
    duplicateArtifact: dupArt,
    duplicate_clusters_path: dupPath,
    config,
  });

  artifact.catalog_path = catalogPath;
  artifact.prefill_path = prefillArt ? prefillPath : "";
  artifact.llm_validated_path = llmPath;
  artifact.duplicate_clusters_path = dupPath;

  const artifactsDir = join(REPO, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });

  const jsonOut = join(artifactsDir, "exercise-library-pruning-decisions.json");
  writeFileSync(jsonOut, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  const mdOut = join(artifactsDir, "exercise-library-pruning-decisions.md");
  writeFileSync(mdOut, formatLibraryPruningDecisionMarkdown(artifact), "utf8");

  const sumOut = join(artifactsDir, "exercise-library-pruning-summary.md");
  writeFileSync(sumOut, formatLibraryPruningSummaryOnlyMarkdown(artifact), "utf8");

  const s = artifact.summary;
  console.log("Library pruning (phase 5)");
  console.log(`  exercises: ${s.total_exercises}`);
  console.log(
    `  projected retained: ${s.projected_rows_retained} | merged: ${s.projected_rows_merged_into_canonical} | removed: ${s.projected_rows_removed}`
  );
  console.log(`  wrote ${jsonOut}`);
  console.log(`  wrote ${mdOut}`);
  console.log(`  wrote ${sumOut}`);
}

main();
