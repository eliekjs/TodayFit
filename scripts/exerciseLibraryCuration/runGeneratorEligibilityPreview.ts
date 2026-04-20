/**
 * Phase 6 — build generator eligibility from pruning + preview pool impact (staging only).
 *
 * Run:
 *   npm run curation:generator-eligibility-preview
 *
 * Env:
 *   GE_CATALOG_PATH — default: data/workout-exercise-catalog.json
 *   GE_PRUNING_PATH — default: artifacts/exercise-library-pruning-decisions.json
 *   GE_LLM_VALIDATED_PATH — default: artifacts/exercise-curation-llm-validated.json (optional for movement/role breakdowns)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import {
  buildGeneratorEligibilityPreview,
  buildGeneratorEligibilityState,
} from "../../logic/exerciseLibraryCuration/buildGeneratorEligibilityState";
import { formatGeneratorEligibilityPreviewMarkdown } from "../../logic/exerciseLibraryCuration/generatorEligibilitySummaryMarkdown";
import type { LlmValidatedArtifact } from "../../logic/exerciseLibraryCuration/llmClassificationTypes";
import type { LibraryPruningDecisionArtifact } from "../../logic/exerciseLibraryCuration/valueFilterTypes";
import type { WorkoutExerciseCatalogFile } from "../../logic/exerciseLibraryCuration/types";

const REPO = join(__dirname, "..", "..");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function main() {
  const catalogPath = process.env.GE_CATALOG_PATH?.trim()
    ? resolve(process.env.GE_CATALOG_PATH.trim())
    : join(REPO, "data", "workout-exercise-catalog.json");
  const pruningPath = process.env.GE_PRUNING_PATH?.trim()
    ? resolve(process.env.GE_PRUNING_PATH.trim())
    : join(REPO, "artifacts", "exercise-library-pruning-decisions.json");
  const llmPath = process.env.GE_LLM_VALIDATED_PATH?.trim()
    ? resolve(process.env.GE_LLM_VALIDATED_PATH.trim())
    : join(REPO, "artifacts", "exercise-curation-llm-validated.json");

  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    process.exit(1);
  }
  if (!existsSync(pruningPath)) {
    console.error(`Pruning artifact not found: ${pruningPath}`);
    process.exit(1);
  }

  const catalog = loadJson<WorkoutExerciseCatalogFile>(catalogPath);
  if (!catalog.exercises?.length) {
    console.error("Invalid catalog");
    process.exit(1);
  }

  const pruning = loadJson<LibraryPruningDecisionArtifact>(pruningPath);

  const build = buildGeneratorEligibilityState({
    pruning,
    catalog,
    pruning_artifact_path: pruningPath,
  });

  const mergedLlmById = new Map<string, import("../../logic/exerciseLibraryCuration/llmClassificationTypes").LlmClassificationValidated>();
  if (existsSync(llmPath)) {
    const llmArt = loadJson<LlmValidatedArtifact>(llmPath);
    for (const r of llmArt.records ?? []) {
      mergedLlmById.set(r.exercise_id, r.merged_with_locked_prefill);
    }
  }

  const artifact = buildGeneratorEligibilityPreview({
    build,
    catalog,
    mergedLlmById,
    llm_validated_path: existsSync(llmPath) ? llmPath : null,
  });

  const artifactsDir = join(REPO, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });

  const jsonOut = join(artifactsDir, "exercise-generator-eligibility-preview.json");
  writeFileSync(jsonOut, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  const mdOut = join(artifactsDir, "exercise-generator-eligibility-preview.md");
  writeFileSync(mdOut, formatGeneratorEligibilityPreviewMarkdown(artifact), "utf8");

  const p = artifact.preview_stats;
  console.log("Generator eligibility preview (phase 6)");
  console.log(`  catalog: ${p.catalog_total}`);
  console.log(`  pool baseline (gating off): ${p.pool_size_baseline}`);
  console.log(`  pool gated default (core+niche, no review): ${p.pool_size_gated_default}`);
  console.log(`  pool gated permissive (+review): ${p.pool_size_gated_permissive}`);
  console.log(
    `  reduction vs baseline (default gate): ${p.pool_size_baseline - p.pool_size_gated_default} (${((100 * (p.pool_size_baseline - p.pool_size_gated_default)) / p.catalog_total).toFixed(1)}%)`
  );
  console.log(`  unknown ids (not in pruning): ${artifact.unknown_exercise_ids.length}`);
  console.log(`  conflicts: ${artifact.conflicts.length}`);
  console.log(`  wrote ${jsonOut}`);
  console.log(`  wrote ${mdOut}`);
}

main();
