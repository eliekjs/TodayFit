/**
 * Sync junction tables from `data/exercisesMerged` (tags, contraindications, progressions).
 * Matches `scripts/seedExercisesToDb.ts` steps 3–6 without re-upserting `exercises` rows.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY for `--apply` (RLS blocks anon writes).
 *
 * Usage:
 *   npx tsx scripts/syncExerciseJunctionsFromMerged.ts           # dry-run (summary only)
 *   npx tsx scripts/syncExerciseJunctionsFromMerged.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import { EXERCISES } from "../data/exercisesMerged";
import type { ExerciseDefinition } from "../lib/types";
import { loadDotEnvFromRepoRoot, printServiceRoleKeyHelp } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

function slugToDb(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function parseArgs(argv: string[]): { apply: boolean } {
  return { apply: argv.includes("--apply") };
}

async function main() {
  const { apply } = parseArgs(process.argv);
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const key = serviceKey || anonKey;
  if (!url || !key) {
    console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }
  if (apply && !serviceKey) {
    printServiceRoleKeyHelp("npm run sync:exercise-junctions:apply");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const PAGE = 1000;
  const allExercises: { id: string; slug: string }[] = [];
  let from = 0;
  for (;;) {
    const { data: batch, error: listErr } = await supabase
      .from("exercises")
      .select("id, slug")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (listErr) {
      console.error("list exercises error:", listErr);
      process.exit(1);
    }
    const rows = (batch ?? []) as { id: string; slug: string }[];
    allExercises.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  if (!allExercises.length) {
    console.error("No exercises returned.");
    process.exit(1);
  }
  const exerciseIdBySlug = new Map<string, string>(allExercises.map((r) => [r.slug, r.id]));

  const defsInDb = EXERCISES.filter((d) => exerciseIdBySlug.has(d.id));
  const defsMissing = EXERCISES.length - defsInDb.length;

  const tagSlugs = new Set<string>();
  for (const def of EXERCISES) {
    for (const t of def.tags ?? []) {
      tagSlugs.add(slugToDb(t));
    }
  }

  const { data: existingTags } = await supabase.from("exercise_tags").select("id, slug");
  const tagIdBySlug = new Map<string, string>(
    (existingTags ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id])
  );
  if (!apply) {
    for (const slug of tagSlugs) {
      if (!tagIdBySlug.has(slug)) tagIdBySlug.set(slug, "virtual");
    }
  }

  if (apply) {
    for (const slug of tagSlugs) {
      if (tagIdBySlug.has(slug)) continue;
      const { data: inserted, error: insErr } = await supabase
        .from("exercise_tags")
        .insert({ slug, name: slug.replace(/_/g, " "), tag_group: "general", sort_order: 0 })
        .select("id")
        .single();
      if (insErr) {
        console.error("exercise_tags insert failed:", slug, insErr.message);
        continue;
      }
      if (inserted) tagIdBySlug.set(slug, (inserted as { id: string }).id);
    }
  }

  let tagMapRows = 0;
  let contraRows = 0;
  let progRows = 0;
  let exercisesWithTags = 0;
  let exercisesWithContra = 0;
  let exercisesWithProg = 0;

  const runDef = async (def: ExerciseDefinition) => {
    const exerciseId = exerciseIdBySlug.get(def.id);
    if (!exerciseId) return;

    const rawSlugs = (def.tags ?? []).map(slugToDb).filter((s) => tagIdBySlug.has(s));
    const slugs = [...new Set(rawSlugs)];
    if (slugs.length) exercisesWithTags++;

    const contra =
      def.contraindications?.map((c) => slugToDb(typeof c === "string" ? c : String(c))) ?? [];
    if (contra.length) exercisesWithContra++;

    const pairs: { related_exercise_id: string; relationship: "progression" | "regression" }[] = [];
    for (const slug of def.progressions ?? []) {
      const relatedId = exerciseIdBySlug.get(slug);
      if (relatedId) pairs.push({ related_exercise_id: relatedId, relationship: "progression" });
    }
    for (const slug of def.regressions ?? []) {
      const relatedId = exerciseIdBySlug.get(slug);
      if (relatedId) pairs.push({ related_exercise_id: relatedId, relationship: "regression" });
    }
    const progDedupe = new Map<string, (typeof pairs)[0]>();
    for (const p of pairs) {
      progDedupe.set(`${p.related_exercise_id}:${p.relationship}`, p);
    }
    const progList = [...progDedupe.values()];
    if (progList.length) exercisesWithProg++;

    if (!apply) {
      tagMapRows += slugs.length;
      contraRows += contra.length;
      progRows += progList.length;
      return;
    }

    // Match seedExercisesToDb: skip when static has nothing to write (leave existing DB rows untouched).
    if (slugs.length) {
      await supabase.from("exercise_tag_map").delete().eq("exercise_id", exerciseId);
      const mapRows = slugs.map((slug) => ({
        exercise_id: exerciseId,
        tag_id: tagIdBySlug.get(slug)!,
      }));
      const { error: mapErr } = await supabase.from("exercise_tag_map").insert(mapRows);
      if (!mapErr) tagMapRows += mapRows.length;
      else console.error("exercise_tag_map", def.id, mapErr.message);
    }

    if (contra.length) {
      await supabase.from("exercise_contraindications").delete().eq("exercise_id", exerciseId);
      const rows = contra.map((c) => ({ exercise_id: exerciseId, contraindication: c }));
      const { error: cErr } = await supabase.from("exercise_contraindications").insert(rows);
      if (!cErr) contraRows += rows.length;
      else console.error("exercise_contraindications", def.id, cErr.message);
    }

    if (progList.length) {
      await supabase.from("exercise_progressions").delete().eq("exercise_id", exerciseId);
      const rows = progList.map((p) => ({ exercise_id: exerciseId, ...p }));
      const { error: pErr } = await supabase.from("exercise_progressions").insert(rows);
      if (!pErr) progRows += rows.length;
      else console.error("exercise_progressions", def.id, pErr.message);
    }
  };

  let idx = 0;
  for (const def of EXERCISES) {
    await runDef(def);
    idx++;
    if (apply && idx % 500 === 0) {
      console.error(`Progress: ${idx}/${EXERCISES.length} defs…`);
    }
  }

  const summary = {
    dry_run: !apply,
    merged_catalog_exercises: EXERCISES.length,
    merged_defs_found_in_db: defsInDb.length,
    merged_defs_slug_not_in_db: defsMissing,
    db_exercise_rows: allExercises.length,
    ...(apply
      ? {
          exercise_tag_map_rows_written: tagMapRows,
          exercise_contraindications_rows_written: contraRows,
          exercise_progressions_rows_written: progRows,
        }
      : {
          projected_exercise_tag_map_rows: tagMapRows,
          projected_exercise_contraindications_rows: contraRows,
          projected_exercise_progressions_rows: progRows,
          exercises_with_at_least_one_tag: exercisesWithTags,
          exercises_with_at_least_one_contraindication: exercisesWithContra,
          exercises_with_at_least_one_progression_or_regression: exercisesWithProg,
        }),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
