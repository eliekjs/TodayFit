/**
 * Upsert curated exercise metadata from local artifacts into `public.exercises` (by `slug` = artifact exercise_id).
 *
 * ## Merge precedence
 * See `logic/exerciseLibraryCuration/mergeCurationArtifacts.ts` (eligibility preview → pruning → LLM → prefill).
 *
 * ## Env
 * - CURATION_SYNC_DRY_RUN=1 — no DB writes
 * - CURATION_SYNC_MAX_IDS=50 — limit rows (after sort)
 * - CURATION_SYNC_ONLY_IDS=id1,id2 — restrict to slugs
 * - CURATION_SYNC_FAIL_ON_MISSING=1 — exit non-zero if artifact id has no `exercises.slug` (default: 1)
 * - CURATION_SYNC_ALLOW_MISSING=1 — skip missing slugs instead of failing
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for writes (RLS-safe).
 *
 * Usage:
 *   npx tsx scripts/exerciseLibraryCuration/syncCurationToSupabase.ts
 *   CURATION_SYNC_DRY_RUN=1 CURATION_SYNC_MAX_IDS=20 npx tsx scripts/exerciseLibraryCuration/syncCurationToSupabase.ts
 */

import { readFileSync } from "fs";
import { join, resolve } from "path";
import { createClient } from "@supabase/supabase-js";

import type { LibraryPruningDecisionArtifact } from "../../logic/exerciseLibraryCuration/valueFilterTypes";
import type { LlmValidatedArtifact } from "../../logic/exerciseLibraryCuration/llmClassificationTypes";
import type { GeneratorEligibilityPreviewArtifact } from "../../logic/exerciseLibraryCuration/generatorEligibilityTypes";
import {
  mergeCurationArtifacts,
  type CurationPrefillArtifact,
} from "../../logic/exerciseLibraryCuration/mergeCurationArtifacts";
import { loadDotEnvFromRepoRoot, printServiceRoleKeyHelp } from "../dotenvLocal";

loadDotEnvFromRepoRoot();

const REPO = join(__dirname, "..", "..");

function envFlag(name: string, defaultVal: boolean): boolean {
  const v = process.env[name]?.trim();
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return defaultVal;
}

function envInt(name: string): number | undefined {
  const v = process.env[name]?.trim();
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function fetchAllSlugs(supabase: ReturnType<typeof createClient>): Promise<Set<string>> {
  const slugs = new Set<string>();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("exercises")
      .select("slug")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { slug: string }[];
    for (const r of rows) slugs.add(r.slug);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return slugs;
}

async function main() {
  const dryRun = envFlag("CURATION_SYNC_DRY_RUN", false);
  const maxIds = envInt("CURATION_SYNC_MAX_IDS");
  const onlyRaw = process.env.CURATION_SYNC_ONLY_IDS?.trim();
  const onlySet = onlyRaw ? new Set(onlyRaw.split(",").map((s) => s.trim()).filter(Boolean)) : null;
  const failOnMissing = envFlag("CURATION_SYNC_FAIL_ON_MISSING", true);
  const allowMissing = envFlag("CURATION_SYNC_ALLOW_MISSING", false);
  const effectiveFailOnMissing = failOnMissing && !allowMissing;

  const prefillPath = process.env.CURATION_PREFILL_PATH?.trim()
    ? resolve(process.env.CURATION_PREFILL_PATH.trim())
    : join(REPO, "artifacts", "exercise-curation-prefill.json");
  const llmPath = process.env.CURATION_LLM_PATH?.trim()
    ? resolve(process.env.CURATION_LLM_PATH.trim())
    : join(REPO, "artifacts", "exercise-curation-llm-validated.json");
  const pruningPath = process.env.CURATION_PRUNING_PATH?.trim()
    ? resolve(process.env.CURATION_PRUNING_PATH.trim())
    : join(REPO, "artifacts", "exercise-library-pruning-decisions.json");
  const previewPath = process.env.CURATION_ELIGIBILITY_PREVIEW_PATH?.trim()
    ? resolve(process.env.CURATION_ELIGIBILITY_PREVIEW_PATH.trim())
    : join(REPO, "artifacts", "exercise-generator-eligibility-preview.json");

  const eligibilityPreview = loadJson<GeneratorEligibilityPreviewArtifact>(previewPath);
  const pruning = loadJson<LibraryPruningDecisionArtifact>(pruningPath);
  const llmValidated = loadJson<LlmValidatedArtifact>(llmPath);
  const prefill = loadJson<CurationPrefillArtifact>(prefillPath);

  const generatedAtIso = new Date().toISOString();
  const { by_exercise_id, merge_summary } = mergeCurationArtifacts({
    eligibilityPreview,
    pruning,
    llmValidated,
    prefill,
    generatedAtIso,
  });

  let ids = [...by_exercise_id.keys()].sort();
  if (onlySet) {
    ids = ids.filter((id) => onlySet.has(id));
  }
  if (maxIds != null && maxIds > 0) {
    ids = ids.slice(0, maxIds);
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const readKey = serviceKey || anonKey;
  if (!url || !readKey) {
    console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }
  if (!dryRun && !serviceKey) {
    console.error("Writes require SUPABASE_SERVICE_ROLE_KEY.");
    printServiceRoleKeyHelp("npx tsx scripts/exerciseLibraryCuration/syncCurationToSupabase.ts");
    process.exit(1);
  }

  const supabase = createClient(url, readKey);
  const dbSlugs = await fetchAllSlugs(supabase);

  const missing: string[] = [];
  for (const id of ids) {
    if (!dbSlugs.has(id)) missing.push(id);
  }
  if (missing.length && effectiveFailOnMissing) {
    console.error(
      `CURATION_SYNC_FAIL_ON_MISSING: ${missing.length} artifact exercise_ids not found as exercises.slug (showing up to 20):`,
      missing.slice(0, 20)
    );
    process.exit(1);
  }
  const missingSet = new Set(missing);
  const toWrite = ids.filter((id) => !missingSet.has(id));

  console.log("=== Curation sync to Supabase ===");
  console.log("Dry run:", dryRun);
  console.log("Merge summary:", merge_summary);
  console.log("Rows to write:", toWrite.length, "skipped missing:", missing.length);

  const writeClient = dryRun ? null : createClient(url, serviceKey);
  let updated = 0;
  const BATCH = 25;
  for (let i = 0; i < toWrite.length; i += BATCH) {
    const chunk = toWrite.slice(i, i + BATCH);
    const tasks = chunk.map(async (slug) => {
      const payload = by_exercise_id.get(slug);
      if (!payload) return;
      if (dryRun) {
        updated += 1;
        return;
      }
      const { error } = await writeClient!.from("exercises").update(payload).eq("slug", slug);
      if (error) {
        throw new Error(`${slug}: ${error.message}`);
      }
      updated += 1;
    });
    await Promise.all(tasks);
  }

  console.log(dryRun ? "Would update rows (dry-run): " + updated : "Updated rows: " + updated);
  if (missing.length) {
    console.warn("Skipped (not in DB):", missing.length, "ids");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
