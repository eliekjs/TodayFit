/**
 * Backfill `exercises.workout_levels` from current inference rules.
 *
 * Safe defaults:
 * - Skips rows that already have a non-empty `workout_levels` unless `--force`.
 * - `--dry-run` prints actions only (default when no `--apply`).
 *
 * Usage:
 *   npx tsx scripts/backfillWorkoutLevels.ts [--dry-run] [--apply] [--force] [--csv path/to/out.csv]
 *
 * For updates under RLS, set SUPABASE_SERVICE_ROLE_KEY (recommended). Anon key may fail.
 *
 * Rollback: re-import a saved CSV of slugs to clear, then:
 *   UPDATE public.exercises SET workout_levels = NULL WHERE slug = ANY($1::text[]);
 * Or clear all backfilled rows (destructive): SET workout_levels = NULL WHERE workout_levels IS NOT NULL;
 *
 * Loads `.env` from the repo root when present (no dotenv package) so `SUPABASE_SERVICE_ROLE_KEY` is available for `--apply`.
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvFromRepoRoot, printServiceRoleKeyHelp } from "./dotenvLocal";
import { loadActiveExercisesWithRelationMaps } from "../lib/db/exerciseRepository";
import { mapDbExerciseToGeneratorExercise } from "../lib/db/generatorExerciseAdapter";
import { parseWorkoutLevelsFromDb, serializeWorkoutLevelsForDb } from "../lib/workoutLevel";

loadDotEnvFromRepoRoot();

function parseArgs(argv: string[]) {
  let dryRun = true;
  let force = false;
  let csvPath: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--apply") dryRun = false;
    if (argv[i] === "--force") force = true;
    if (argv[i] === "--dry-run") dryRun = true;
    if (argv[i] === "--csv" && argv[i + 1]) {
      csvPath = argv[++i];
    }
  }
  return { dryRun, force, csvPath };
}

async function main() {
  const { dryRun, force, csvPath } = parseArgs(process.argv);
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const key = serviceKey || anonKey;
  if (!url || !key) {
    console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }
  if (!dryRun && !serviceKey) {
    printServiceRoleKeyHelp("npm run backfill:workout-levels:apply");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const maps = await loadActiveExercisesWithRelationMaps(supabase);
  const csvLines: string[] = ["slug,name,action,before,after"];

  let wouldWrite = 0;
  let appliedCount = 0;
  let skippedExplicit = 0;
  let skippedNoChange = 0;
  const beforeCombo = new Map<string, number>();
  /** Tier combo distribution if this run finished (DB == inferred for touched rows, unchanged otherwise). */
  const projectedAfterCombo = new Map<string, number>();

  for (const row of maps.rows) {
    const tags = maps.tagsByExerciseId.get(row.id) ?? [];
    const contra = maps.contraByExerciseId.get(row.id) ?? [];
    const prog = maps.progressionsByExerciseId.get(row.id) ?? [];
    const reg = maps.regressionsByExerciseId.get(row.id) ?? [];
    const beforeParsed = parseWorkoutLevelsFromDb(row.workout_levels ?? undefined);
    const beforeDisplay = beforeParsed?.length ? beforeParsed.join("|") : "(empty)";
    const beforeKey = beforeParsed?.length ? beforeParsed.join(">") : "(empty)";
    const beforeCompare = beforeParsed?.length ? beforeParsed.join("|") : "";
    beforeCombo.set(beforeKey, (beforeCombo.get(beforeKey) ?? 0) + 1);

    const currentEffective = mapDbExerciseToGeneratorExercise(row, tags, contra, prog, reg);
    const currentKey = (currentEffective.workout_level_tags ?? []).join(">");

    if (beforeParsed?.length && !force) {
      skippedExplicit++;
      csvLines.push(`${escapeCsv(row.slug)},${escapeCsv(row.name)},skip_explicit,${beforeDisplay},`);
      projectedAfterCombo.set(currentKey, (projectedAfterCombo.get(currentKey) ?? 0) + 1);
      continue;
    }

    const rowForInfer = { ...row, workout_levels: null as unknown as string[] | null };
    const exercise = mapDbExerciseToGeneratorExercise(rowForInfer, tags, contra, prog, reg);
    const after = exercise.workout_level_tags ?? [];
    const afterSerialized = serializeWorkoutLevelsForDb(after);
    const afterStr = afterSerialized.join("|");

    if (beforeCompare === afterStr && beforeParsed?.length) {
      skippedNoChange++;
      csvLines.push(`${escapeCsv(row.slug)},${escapeCsv(row.name)},skip_no_change,${beforeDisplay},${afterStr}`);
      projectedAfterCombo.set(currentKey, (projectedAfterCombo.get(currentKey) ?? 0) + 1);
      continue;
    }

    wouldWrite++;
    const afterKey = after.join(">");
    projectedAfterCombo.set(afterKey, (projectedAfterCombo.get(afterKey) ?? 0) + 1);
    const action = dryRun ? "would_update" : "updated";
    csvLines.push(`${escapeCsv(row.slug)},${escapeCsv(row.name)},${action},${beforeDisplay},${afterStr}`);

    if (!dryRun) {
      const { error } = await supabase
        .from("exercises")
        .update({ workout_levels: afterSerialized })
        .eq("id", row.id);
      if (error) {
        console.error(`Update failed ${row.slug}: ${error.message}`);
      } else {
        appliedCount++;
        if (appliedCount % 500 === 0) {
          console.error(`Applied ${appliedCount} rows…`);
        }
      }
    }
  }

  if (csvPath) {
    fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
    console.log(`Wrote ${csvPath}`);
  }

  const summary = {
    total_rows: maps.rows.length,
    dry_run: dryRun,
    force,
    would_write_or_wrote: wouldWrite,
    applied_rows: dryRun ? 0 : appliedCount,
    skipped_existing_explicit: skippedExplicit,
    skipped_no_change: skippedNoChange,
    before_tier_combo_counts: Object.fromEntries(
      [...beforeCombo.entries()].sort((a, b) => b[1] - a[1])
    ),
    projected_after_backfill_tier_combos: Object.fromEntries(
      [...projectedAfterCombo.entries()].sort((a, b) => b[1] - a[1])
    ),
  };
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nBefore DB column / projected catalog after run (top tier combos):");
  const topBefore = [...beforeCombo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const topAfter = [...projectedAfterCombo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log("  before (raw DB):", topBefore.map(([k, n]) => `${k}=${n}`).join(", ") || "(none)");
  console.log("  projected:        ", topAfter.map(([k, n]) => `${k}=${n}`).join(", ") || "(none)");

  if (!dryRun && wouldWrite > 0 && appliedCount === 0) {
    console.error(
      "\nNo rows were updated. Typical causes: missing or invalid SUPABASE_SERVICE_ROLE_KEY, or RLS blocking updates. " +
        "Fix .env and re-run: npm run backfill:workout-levels:apply"
    );
    process.exit(1);
  }
  if (!dryRun && appliedCount > 0 && appliedCount < wouldWrite) {
    console.error(
      `\nWarning: only ${appliedCount}/${wouldWrite} updates succeeded; see Update failed lines above.`
    );
    process.exit(1);
  }
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
