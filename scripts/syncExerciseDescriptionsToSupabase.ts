/**
 * Upsert curated exercise descriptions from data/exerciseDescriptions.curated.json
 * into public.exercises.description (by slug).
 *
 * Env:
 * - DESCRIPTION_SYNC_DRY_RUN=1 — no writes
 * - DESCRIPTION_SYNC_ONLY_SLUGS=slug1,slug2 — restrict slugs
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for writes.
 *
 * Usage:
 *   npx tsx scripts/syncExerciseDescriptionsToSupabase.ts
 *   DESCRIPTION_SYNC_DRY_RUN=1 npx tsx scripts/syncExerciseDescriptionsToSupabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  ensureCuratedDescriptionsLoaded,
  listCuratedExerciseDescriptionSlugs,
  getCuratedExerciseDescriptionEntry,
  validateCuratedDescriptionsFile,
} from "../lib/exerciseDescriptionsCurated";
import { loadDotEnvFromRepoRoot, printServiceRoleKeyHelp } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

function envFlag(name: string, defaultVal: boolean): boolean {
  const v = process.env[name]?.trim();
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return defaultVal;
}

async function main() {
  await ensureCuratedDescriptionsLoaded();
  const dryRun = envFlag("DESCRIPTION_SYNC_DRY_RUN", false);
  const onlyRaw = process.env.DESCRIPTION_SYNC_ONLY_SLUGS?.trim();
  const onlySet = onlyRaw
    ? new Set(onlyRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const validation = validateCuratedDescriptionsFile();
  if (!validation.ok) {
    console.error("Curated file validation failed:");
    for (const e of validation.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.error("Missing EXPO_PUBLIC_SUPABASE_URL or Supabase key.");
    printServiceRoleKeyHelp();
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let slugs = listCuratedExerciseDescriptionSlugs();
  if (onlySet) slugs = slugs.filter((s) => onlySet.has(s));

  console.log(`Syncing ${slugs.length} curated descriptions (dryRun=${dryRun})`);

  let updated = 0;
  let missing = 0;
  for (const slug of slugs) {
    const entry = getCuratedExerciseDescriptionEntry(slug);
    if (!entry) continue;
    if (dryRun) {
      console.log(`[dry-run] ${slug}: ${entry.description.slice(0, 60)}…`);
      updated++;
      continue;
    }
    const { data, error } = await supabase
      .from("exercises")
      .update({ description: entry.description })
      .eq("slug", slug)
      .select("slug");
    if (error) {
      console.error(`${slug}: ${error.message}`);
      continue;
    }
    if (!data?.length) {
      missing++;
      console.warn(`${slug}: no matching exercises row`);
      continue;
    }
    updated++;
  }

  console.log(`Done. updated=${updated} missing_slug=${missing}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
