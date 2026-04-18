/**
 * Phase 3: LLM classification on top of deterministic prefill (staging only; no production writes).
 *
 * Run:
 *   npx tsx scripts/exerciseLibraryCuration/runLlmClassification.ts
 *
 * Env:
 *   PREFILL_CATALOG_PATH — merged catalog JSON (default: data/workout-exercise-catalog.json)
 *   PREFILL_JSON_PATH — phase-2 artifact (default: artifacts/exercise-curation-prefill.json)
 *   OPENAI_API_KEY or LLM_API_KEY — required unless LLM_MOCK=1
 *   LLM_BATCH_SIZE — default 8
 *   LLM_MAX — max exercises to process (optional; for testing)
 *   LLM_MOCK=1 — use deterministic mock responses (no API)
 *   LLM_CLEAR_STAGING=1 — ignore existing staging file and start fresh
 *   LLM_AMBIGUITY_THRESHOLD — default 0.5 (llm_confidence below = ambiguous)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { buildLlmPayloadsForCatalog } from "../../logic/exerciseLibraryCuration/buildExerciseCurationPayload";
import { LLM_CLASSIFICATION_SYSTEM_PROMPT, buildLlmClassificationUserPrompt } from "../../logic/exerciseLibraryCuration/llmClassificationPrompt";
import { buildLlmValidatedRecord } from "../../logic/exerciseLibraryCuration/mergeDeterministicAndLlmOutputs";
import { mockLlmResponseJson } from "../../logic/exerciseLibraryCuration/llmMockOutput";
import { callOpenAiCompatibleChatJson, getLlmProviderConfigFromEnv } from "../../logic/exerciseLibraryCuration/llmProvider";
import { computeLlmRunSummary } from "../../logic/exerciseLibraryCuration/llmRunSummary";
import { formatLlmClassificationSummaryMarkdown } from "../../logic/exerciseLibraryCuration/llmSummaryMarkdown";
import { parseAndValidateLlmClassificationRaw } from "../../logic/exerciseLibraryCuration/validateClassificationOutput";
import { applyTrustTiersToPrefillBlock } from "../../logic/exerciseLibraryCuration/prefillTrust";
import { runPrefillForExercise, DEFAULT_OPTIONS as PREFILL_DEFAULTS } from "../../logic/exerciseLibraryCuration/prefillRules";
import type { LlmStagingArtifact, LlmStagingItem, LlmValidatedRecord } from "../../logic/exerciseLibraryCuration/llmClassificationTypes";
import type { ExercisePrefillRecord, PrefillRunArtifact, WorkoutExerciseCatalogFile } from "../../logic/exerciseLibraryCuration/types";
import type { CatalogExerciseRow } from "../../logic/exerciseLibraryCuration/types";

const DEFAULT_CATALOG = join("data", "workout-exercise-catalog.json");
const DEFAULT_PREFILL = join("artifacts", "exercise-curation-prefill.json");
const STAGING_JSON = "exercise-curation-llm-staging.json";
const VALIDATED_JSON = "exercise-curation-llm-validated.json";
const SUMMARY_MD = "exercise-curation-llm-summary.md";

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
      prefill: applyTrustTiersToPrefillBlock(r.prefill),
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

async function main() {
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

  const batchSize = Math.max(1, envInt("LLM_BATCH_SIZE", 8));
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

  const doneIds = new Set(itemById.keys());
  const pending = exercises.filter((e) => !doneIds.has(e.id));

  const prefillForPending = new Map<string, ExercisePrefillRecord>();
  for (const e of pending) {
    prefillForPending.set(e.id, prefillById.get(e.id) ?? { exercise_id: e.id, prefill: {} });
  }

  const payloads = buildLlmPayloadsForCatalog(pending, prefillForPending);
  const provider: LlmStagingArtifact["provider"] = mock ? "mock" : "openai_compatible";

  const stagingMeta = () => ({
    schema_version: 1 as const,
    generated_at: new Date().toISOString(),
    catalog_path: catalogPath,
    prefill_path: prefillPath,
    provider,
    batch_size: batchSize,
  });

  let bi = 0;
  for (const batch of chunk(payloads, batchSize)) {
    for (const payload of batch) {
      let raw: string | null = null;
      let providerError: string | null = null;

      if (mock) {
        raw = mockLlmResponseJson(payload);
      } else if (providerConfig) {
        const user = buildLlmClassificationUserPrompt(payload);
        const res = await callOpenAiCompatibleChatJson(providerConfig, LLM_CLASSIFICATION_SYSTEM_PROMPT, user);
        if (res.ok) raw = res.text;
        else providerError = res.error;
      }

      const validation = raw
        ? parseAndValidateLlmClassificationRaw(raw)
        : {
            ok: false as const,
            errors: [{ code: "parse_json_failed" as const, message: providerError ?? "no response" }],
          };

      itemById.set(payload.exercise_id, {
        exercise_id: payload.exercise_id,
        batch_index: bi,
        payload_summary: { name: payload.name },
        raw_response: raw,
        provider_error: providerError,
        validation,
      });
    }
    bi += 1;

    writeStagingFile(stagingPath, { ...stagingMeta(), itemById });
  }

  if (payloads.length === 0) {
    writeStagingFile(stagingPath, { ...stagingMeta(), itemById });
  }

  const finalStaging = JSON.parse(readFileSync(stagingPath, "utf8")) as LlmStagingArtifact;

  const validatedRecords: LlmValidatedRecord[] = [];
  for (const row of exercises) {
    const it = itemById.get(row.id);
    if (!it?.validation.ok) continue;
    const prefill = prefillById.get(row.id)?.prefill ?? {};
    validatedRecords.push(buildLlmValidatedRecord(row.id, prefill, it.validation.value));
  }

  const validatedArtifact = {
    schema_version: 1 as const,
    generated_at: new Date().toISOString(),
    catalog_path: catalogPath,
    records: validatedRecords.sort((a, b) => a.exercise_id.localeCompare(b.exercise_id)),
  };
  writeFileSync(join(artifactsDir, VALIDATED_JSON), `${JSON.stringify(validatedArtifact, null, 2)}\n`, "utf8");

  const summary = computeLlmRunSummary({
    total_processed: finalStaging.items.length,
    staging_items: finalStaging.items,
    validated_records: validatedRecords,
    prefill_by_id: prefillMapForSummary,
    ambiguous_confidence_threshold: ambiguityThreshold,
  });

  writeFileSync(join(artifactsDir, SUMMARY_MD), formatLlmClassificationSummaryMarkdown(summary, catalogPath), "utf8");

  console.log("LLM classification (phase 3 staging)");
  console.log(`Catalog: ${catalogPath}`);
  console.log(`Prefill: ${prefillPath}`);
  console.log(`Staging rows: ${finalStaging.items.length}`);
  console.log(`Validated: ${summary.validated_count}, rejected: ${summary.rejected_count}, ambiguous: ${summary.ambiguous_count}`);
  console.log(`Wrote ${stagingPath}`);
  console.log(`Wrote ${join(artifactsDir, VALIDATED_JSON)}`);
  console.log(`Wrote ${join(artifactsDir, SUMMARY_MD)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
