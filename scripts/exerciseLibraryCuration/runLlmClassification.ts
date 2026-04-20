/**
 * Phase 3: LLM classification on top of deterministic prefill (staging only; no production writes).
 *
 * Run:
 *   npx tsx scripts/exerciseLibraryCuration/runLlmClassification.ts
 *
 * Env:
 *   PREFILL_CATALOG_PATH — merged catalog JSON (default: data/workout-exercise-catalog.json)
 *   PREFILL_JSON_PATH — phase-2 artifact (default: artifacts/exercise-curation-prefill.json)
 *   OPENAI_API_KEY or LLM_API_KEY — required unless LLM_MOCK=1 (optional: set in repo root `.env`; loaded like other maintenance scripts)
 *   LLM_BATCH_SIZE — flush / batch_index window for staging (default: 8); does not split API batches
 *   LLM_EXERCISES_PER_REQUEST — exercises per API call (default: 10)
 *   LLM_MAX_RETRIES — retries after a failed try for 429 / 5xx (default: 5; total attempts = 1 + LLM_MAX_RETRIES)
 *   LLM_MAX — max exercises to process (optional; for testing, e.g. 20)
 *   LLM_MOCK=1 — use deterministic mock responses (no API)
 *   LLM_CLEAR_STAGING=1 — ignore existing staging file and start fresh
 *   LLM_AMBIGUITY_THRESHOLD — default 0.5 (applies to merged profile llm_confidence; below = ambiguous)
 *   LLM_SMOKE_DEBUG=1 — always write exercise-curation-llm-smoke-debug.json (also auto when LLM_MAX ≤ 40)
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { buildLlmExerciseClassificationPayload, buildLlmPayloadsForCatalog } from "../../logic/exerciseLibraryCuration/buildExerciseCurationPayload";
import { LLM_CLASSIFICATION_SYSTEM_PROMPT, buildLlmClassificationUserPromptBatch } from "../../logic/exerciseLibraryCuration/llmClassificationPrompt";
import { buildLlmValidatedRecordPhase3, compareLlmToDeterministicForField } from "../../logic/exerciseLibraryCuration/mergeDeterministicAndLlmOutputs";
import { mockLlmBatchResponseJson } from "../../logic/exerciseLibraryCuration/llmMockOutput";
import {
  callOpenAiCompatibleChatJsonWithRetry,
  getLlmMaxRetriesFromEnv,
  getLlmProviderConfigFromEnv,
} from "../../logic/exerciseLibraryCuration/llmProvider";
import { computeLlmRunSummary } from "../../logic/exerciseLibraryCuration/llmRunSummary";
import { formatLlmClassificationSummaryMarkdown } from "../../logic/exerciseLibraryCuration/llmSummaryMarkdown";
import { parseBatchedLlmClassificationRaw } from "../../logic/exerciseLibraryCuration/validateClassificationOutput";
import { runPrefillForExercise, DEFAULT_OPTIONS as PREFILL_DEFAULTS } from "../../logic/exerciseLibraryCuration/prefillRules";
import type {
  LlmClassificationRunMetrics,
  LlmStagingArtifact,
  LlmStagingItem,
  LlmValidatedRecord,
  LlmValidationResult,
} from "../../logic/exerciseLibraryCuration/llmClassificationTypes";
import type { ExercisePrefillBlock, ExercisePrefillRecord, PrefillRunArtifact, WorkoutExerciseCatalogFile } from "../../logic/exerciseLibraryCuration/types";
import type { CatalogExerciseRow } from "../../logic/exerciseLibraryCuration/types";
import { loadDotEnvFromRepoRoot } from "../dotenvLocal";

const DEFAULT_CATALOG = join("data", "workout-exercise-catalog.json");
const DEFAULT_PREFILL = join("artifacts", "exercise-curation-prefill.json");
const STAGING_JSON = "exercise-curation-llm-staging.json";
const VALIDATED_JSON = "exercise-curation-llm-validated.json";
const SUMMARY_MD = "exercise-curation-llm-summary.md";
const SMOKE_DEBUG_JSON = "exercise-curation-llm-smoke-debug.json";

function shouldEmitSmokeDebug(maxN: number | undefined): boolean {
  const e = process.env.LLM_SMOKE_DEBUG?.trim();
  if (e === "1" || e === "true") return true;
  return maxN !== undefined && maxN <= 40;
}

function summarizePrefillTiers(prefill: ExercisePrefillBlock): Record<string, { value: unknown; trust_tier?: string }> {
  const keys = ["primary_role", "movement_patterns", "equipment_class", "complexity", "sport_transfer_tags"] as const;
  const o: Record<string, { value: unknown; trust_tier?: string }> = {};
  for (const k of keys) {
    const f = prefill[k] as { value: unknown; trust_tier?: string } | undefined;
    if (f && typeof f === "object" && "value" in f) {
      o[k] = { value: f.value, trust_tier: f.trust_tier };
    }
  }
  return o;
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadPrefillMap(
  repoRoot: string,
  exercises: CatalogExerciseRow[],
  prefillPath: string
): Map<string, ExercisePrefillRecord> {
  const path = resolve(prefillPath.startsWith("/") ? prefillPath : join(repoRoot, prefillPath));
  if (!existsSync(path)) {
    console.warn(`Prefill artifact not found at ${path}; computing prefill in-process (slower).`);
    const opts = { ...PREFILL_DEFAULTS };
    const m = new Map<string, ExercisePrefillRecord>();
    for (const row of exercises) {
      m.set(row.id, runPrefillForExercise(row, opts));
    }
    return m;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as PrefillRunArtifact;
  const map = new Map<string, ExercisePrefillRecord>();
  for (const r of raw.records) {
    map.set(r.exercise_id, {
      exercise_id: r.exercise_id,
      /** Trust tiers + equipment refinement are persisted in the artifact; do not recompute (would mis-read reason_codes). */
      prefill: r.prefill,
    });
  }
  return map;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function writeStagingFile(
  path: string,
  params: Omit<LlmStagingArtifact, "items" | "processed_ids"> & {
    itemById: Map<string, LlmStagingItem>;
  }
) {
  const { itemById, ...rest } = params;
  const items = [...itemById.values()].sort((a, b) => a.exercise_id.localeCompare(b.exercise_id));
  const out: LlmStagingArtifact = {
    ...rest,
    processed_ids: items.map((i) => i.exercise_id),
    items,
  };
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`, "utf8");
}

function providerFailureValidation(message: string): LlmValidationResult {
  return {
    ok: false,
    errors: [{ code: "parse_json_failed", message: `Provider/parse failure: ${message}` }],
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const repoRoot = join(__dirname, "..", "..");
  const catalogPath = process.env.PREFILL_CATALOG_PATH?.trim()
    ? resolve(process.env.PREFILL_CATALOG_PATH!.trim())
    : join(repoRoot, DEFAULT_CATALOG);
  const prefillPath = process.env.PREFILL_JSON_PATH?.trim()
    ? resolve(process.env.PREFILL_JSON_PATH!.trim())
    : join(repoRoot, DEFAULT_PREFILL);

  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    process.exit(1);
  }

  const flushEvery = Math.max(1, envInt("LLM_BATCH_SIZE", 8));
  const exercisesPerRequest = Math.max(1, envInt("LLM_EXERCISES_PER_REQUEST", 10));
  const maxRetries = getLlmMaxRetriesFromEnv();
  const maxN = process.env.LLM_MAX?.trim() ? envInt("LLM_MAX", 999999) : undefined;
  const mock = process.env.LLM_MOCK === "1" || process.env.LLM_MOCK === "true";
  const clearStaging = process.env.LLM_CLEAR_STAGING === "1";
  const ambiguityThreshold = envFloat("LLM_AMBIGUITY_THRESHOLD", 0.5);

  const providerConfig = getLlmProviderConfigFromEnv();
  if (!mock && !providerConfig) {
    console.error("Set OPENAI_API_KEY or LLM_API_KEY, or run with LLM_MOCK=1 for offline testing.");
    process.exit(1);
  }

  const catalogRaw = readFileSync(catalogPath, "utf8");
  const catalog = JSON.parse(catalogRaw) as WorkoutExerciseCatalogFile;
  let exercises = catalog.exercises;
  if (maxN !== undefined) exercises = exercises.slice(0, maxN);

  const prefillById = loadPrefillMap(repoRoot, exercises, prefillPath);
  const prefillMapForSummary = new Map<string, ExercisePrefillRecord["prefill"]>();
  for (const [id, rec] of prefillById) prefillMapForSummary.set(id, rec.prefill);

  const artifactsDir = join(repoRoot, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  const stagingPath = join(artifactsDir, STAGING_JSON);

  const itemById = new Map<string, LlmStagingItem>();
  if (!clearStaging && existsSync(stagingPath)) {
    try {
      const prev = JSON.parse(readFileSync(stagingPath, "utf8")) as LlmStagingArtifact;
      for (const it of prev.items) itemById.set(it.exercise_id, it);
    } catch {
      /* empty */
    }
  }

  /** Only successfully validated rows count as done; failures are re-queued on resume. */
  const succeededIds = new Set<string>();
  for (const it of itemById.values()) {
    if (it.validation.ok) succeededIds.add(it.exercise_id);
  }
  const pending = exercises.filter((e) => !succeededIds.has(e.id));

  const prefillForPending = new Map<string, ExercisePrefillRecord>();
  for (const e of pending) {
    prefillForPending.set(e.id, prefillById.get(e.id) ?? { exercise_id: e.id, prefill: {} });
  }

  const payloads = buildLlmPayloadsForCatalog(pending, prefillForPending);
  const provider: LlmStagingArtifact["provider"] = mock ? "mock" : "openai_compatible";

  const runMetrics: LlmClassificationRunMetrics = {
    exercises_attempted: payloads.length,
    api_requests_made: 0,
    average_exercises_per_request: 0,
    provider_error_rate_limit: 0,
    provider_error_other: 0,
    partial_batch_success_count: 0,
  };

  const stagingMeta = () => ({
    schema_version: 2 as const,
    generated_at: new Date().toISOString(),
    catalog_path: catalogPath,
    prefill_path: prefillPath,
    provider,
    batch_size: flushEvery,
    exercises_per_request: exercisesPerRequest,
    max_retries: maxRetries,
  });

  let apiRequestSeq = 0;
  let globalExerciseIndex = 0;

  for (const apiBatch of chunk(payloads, exercisesPerRequest)) {
    const requestIds = apiBatch.map((p) => p.exercise_id);
    const requestBatchId = `req-${apiRequestSeq++}`;
    let raw: string | null = null;
    let providerError: string | null = null;

    if (mock) {
      raw = mockLlmBatchResponseJson(apiBatch);
      runMetrics.api_requests_made += 1;
    } else if (providerConfig) {
      const user = buildLlmClassificationUserPromptBatch(apiBatch);
      const res = await callOpenAiCompatibleChatJsonWithRetry(
        providerConfig,
        LLM_CLASSIFICATION_SYSTEM_PROMPT,
        user,
        maxRetries
      );
      runMetrics.api_requests_made += 1;
      if (res.ok) raw = res.text;
      else {
        providerError = res.error;
        if (res.httpStatus === 429) runMetrics.provider_error_rate_limit += 1;
        else runMetrics.provider_error_other += 1;
      }
    }

    let validationById: Map<string, LlmValidationResult>;
    if (raw) {
      validationById = parseBatchedLlmClassificationRaw(raw, requestIds);
    } else {
      const msg = providerError ?? "no response";
      const fail = providerFailureValidation(msg);
      validationById = new Map(requestIds.map((id) => [id, fail]));
    }

    const outcomes = requestIds.map((id) => validationById.get(id)!);
    const okN = outcomes.filter((v) => v.ok).length;
    if (okN > 0 && okN < requestIds.length) {
      runMetrics.partial_batch_success_count += 1;
    }

    for (const payload of apiBatch) {
      const validation = validationById.get(payload.exercise_id)!;
      const batch_index = Math.floor(globalExerciseIndex / flushEvery);
      globalExerciseIndex += 1;

      itemById.set(payload.exercise_id, {
        exercise_id: payload.exercise_id,
        batch_index,
        request_batch_id: requestBatchId,
        request_exercise_ids: requestIds,
        payload_summary: { name: payload.name },
        raw_response_text: raw,
        provider_error: providerError,
        validation,
      });
    }

    writeStagingFile(stagingPath, { ...stagingMeta(), itemById });
  }

  if (payloads.length === 0) {
    writeStagingFile(stagingPath, { ...stagingMeta(), itemById });
  }

  runMetrics.average_exercises_per_request =
    runMetrics.api_requests_made > 0 ? runMetrics.exercises_attempted / runMetrics.api_requests_made : 0;

  const finalStaging = JSON.parse(readFileSync(stagingPath, "utf8")) as LlmStagingArtifact;

  const validatedRecords: LlmValidatedRecord[] = [];
  for (const row of exercises) {
    const it = itemById.get(row.id);
    if (!it?.validation.ok) continue;
    const prefill = prefillById.get(row.id)?.prefill ?? {};
    const prefillRec = prefillById.get(row.id) ?? { exercise_id: row.id, prefill: {} };
    const payload = buildLlmExerciseClassificationPayload(row, prefillRec);
    validatedRecords.push(buildLlmValidatedRecordPhase3(row.id, prefill, it.validation.value, payload));
  }

  const validatedArtifact = {
    schema_version: 1 as const,
    generated_at: new Date().toISOString(),
    catalog_path: catalogPath,
    records: validatedRecords.sort((a, b) => a.exercise_id.localeCompare(b.exercise_id)),
  };
  const validatedPath = join(artifactsDir, VALIDATED_JSON);
  const validatedTmp = `${validatedPath}.tmp`;
  writeFileSync(validatedTmp, `${JSON.stringify(validatedArtifact, null, 2)}\n`, "utf8");
  renameSync(validatedTmp, validatedPath);

  const summary = computeLlmRunSummary({
    total_processed: finalStaging.items.length,
    staging_items: finalStaging.items,
    validated_records: validatedRecords,
    prefill_by_id: prefillMapForSummary,
    ambiguous_confidence_threshold: ambiguityThreshold,
    run_metrics: payloads.length > 0 ? runMetrics : undefined,
  });

  writeFileSync(join(artifactsDir, SUMMARY_MD), formatLlmClassificationSummaryMarkdown(summary, catalogPath), "utf8");

  if (shouldEmitSmokeDebug(maxN)) {
    const samples = exercises.slice(0, 5).map((row) => {
      const rec = validatedRecords.find((r) => r.exercise_id === row.id);
      const pre = prefillById.get(row.id)?.prefill ?? {};
      return {
        exercise_id: row.id,
        name: row.name,
        deterministic_priors: summarizePrefillTiers(pre),
        raw_llm: rec?.llm ?? null,
        merged: rec?.merged_with_locked_prefill ?? null,
        phase3_audit: rec?.phase3_audit ?? null,
        vs_prefill_raw_llm: rec
          ? {
              primary_role: compareLlmToDeterministicForField("primary_role", pre, rec.llm),
              movement_patterns: compareLlmToDeterministicForField("movement_patterns", pre, rec.llm),
              equipment_class: compareLlmToDeterministicForField("equipment_class", pre, rec.llm),
              complexity: compareLlmToDeterministicForField("complexity", pre, rec.llm),
              sport_transfer_tags: compareLlmToDeterministicForField("sport_transfer_tags", pre, rec.llm),
            }
          : null,
      };
    });
    const smokePath = join(artifactsDir, SMOKE_DEBUG_JSON);
    writeFileSync(smokePath, `${JSON.stringify({ generated_at: new Date().toISOString(), samples }, null, 2)}\n`, "utf8");
    console.log("\n--- Smoke debug sample (first of 5) ---\n");
    console.log(JSON.stringify(samples[0], null, 2));
    console.log(`\nWrote ${smokePath}`);
  }

  console.log("LLM classification (phase 3 staging)");
  console.log(`Catalog: ${catalogPath}`);
  console.log(`Prefill: ${prefillPath}`);
  console.log(`Staging rows: ${finalStaging.items.length}`);
  console.log(
    `Validated: ${summary.validated_count}, rejected: ${summary.rejected_count}, ambiguous: ${summary.ambiguous_count}`
  );
  if (summary.run_metrics) {
    const m = summary.run_metrics;
    console.log(
      `This run: attempted=${m.exercises_attempted}, api_requests=${m.api_requests_made}, avg_per_request=${m.average_exercises_per_request.toFixed(2)}`
    );
    console.log(
      `Provider errors: rate_limit=${m.provider_error_rate_limit}, other=${m.provider_error_other}; partial_batch_success=${m.partial_batch_success_count}`
    );
    console.log(
      `Failures: parse/batch_json=${summary.parse_json_failed_count}, malformed_record=${summary.malformed_record_count}`
    );
  }
  console.log(`Wrote ${stagingPath}`);
  console.log(`Wrote ${join(artifactsDir, VALIDATED_JSON)}`);
  console.log(`Wrote ${join(artifactsDir, SUMMARY_MD)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
