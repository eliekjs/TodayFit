/**
 * Seed the Supabase exercise catalog from `data/exercisesMerged` (full static EXERCISES list).
 * Run after setting EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for write).
 *
 * Usage:
 *   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... npx ts-node scripts/seedExercisesToDb.ts
 *
 * To refresh tags / contraindications / progressions only (no exercise upsert), use:
 *   npm run sync:exercise-junctions:apply
 *
 * See docs/SINGLE_EXERCISE_SOURCE.md.
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "../lib/db/client";
import { EXERCISES } from "../data/exercisesMerged";
import type { ExerciseDefinition } from "../lib/types";

const BATCH = 80;

function slugToDb(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const supabase =
    url && serviceKey
      ? createClient(url, serviceKey)
      : getSupabase();

  if (!supabase) {
    console.error("Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for write).");
    process.exit(1);
  }

  console.log(`Seeding ${EXERCISES.length} exercises from data/exercises.ts...`);

  // 1) Upsert exercises — dedupe by slug so no batch has duplicate slugs (Postgres ON CONFLICT cannot affect row twice)
  const rowsRaw = EXERCISES.map((def: ExerciseDefinition) => ({
    slug: def.id,
    name: def.name,
    primary_muscles: def.muscles ?? [],
    secondary_muscles: [] as string[],
    equipment: def.equipment ?? [],
    modalities: def.modalities ?? [],
    is_active: true,
  }));
  const rowsBySlug = new Map<string, (typeof rowsRaw)[0]>();
  for (const r of rowsRaw) {
    rowsBySlug.set(r.slug, r); // last occurrence wins
  }
  const rows = [...rowsBySlug.values()];

  if (rowsRaw.length !== rows.length) {
    console.log(`  Deduped by slug: ${rowsRaw.length} → ${rows.length} exercises (${rowsRaw.length - rows.length} duplicates dropped).`);
  }

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("exercises")
      .upsert(chunk, { onConflict: "slug", ignoreDuplicates: false });
    if (error) {
      console.error("exercises upsert error:", error);
      process.exit(1);
    }
  }
  console.log("  exercises: upserted");

  // 2) Slug -> exercise uuid
  const { data: allExercises, error: listErr } = await supabase
    .from("exercises")
    .select("id, slug");
  if (listErr || !allExercises?.length) {
    console.error("list exercises error:", listErr);
    process.exit(1);
  }
  const exerciseIdBySlug = new Map<string, string>(allExercises.map((r: { id: string; slug: string }) => [r.slug, r.id]));

  // 3) Ensure all tag slugs exist; build tag slug -> id
  const tagSlugs = new Set<string>();
  for (const def of EXERCISES) {
    for (const t of def.tags ?? []) {
      tagSlugs.add(slugToDb(t));
    }
  }
  const { data: existingTags } = await supabase.from("exercise_tags").select("id, slug");
  const tagIdBySlug = new Map<string, string>((existingTags ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id]));
  for (const slug of tagSlugs) {
    if (tagIdBySlug.has(slug)) continue;
    const { data: inserted } = await supabase
      .from("exercise_tags")
      .insert({ slug, name: slug.replace(/_/g, " "), tag_group: "general", sort_order: 0 })
      .select("id")
      .single();
    if (inserted) tagIdBySlug.set(slug, inserted.id);
  }
  console.log("  exercise_tags: ensured", tagIdBySlug.size, "tags");

  // 4) exercise_tag_map: replace tags per exercise from static def
  let tagMapCount = 0;
  for (const def of EXERCISES) {
    const exerciseId = exerciseIdBySlug.get(def.id);
    if (!exerciseId) continue;
    const slugs = (def.tags ?? []).map(slugToDb).filter((s) => tagIdBySlug.has(s));
    if (slugs.length === 0) continue;
    await supabase.from("exercise_tag_map").delete().eq("exercise_id", exerciseId);
    const mapRows = slugs.map((slug) => ({
      exercise_id: exerciseId,
      tag_id: tagIdBySlug.get(slug)!,
    }));
    const { error: mapErr } = await supabase.from("exercise_tag_map").insert(mapRows);
    if (!mapErr) tagMapCount += mapRows.length;
  }
  console.log("  exercise_tag_map: linked", tagMapCount, "rows");

  // 5) exercise_contraindications
  let contraCount = 0;
  for (const def of EXERCISES) {
    const exerciseId = exerciseIdBySlug.get(def.id);
    if (!exerciseId || !def.contraindications?.length) continue;
    await supabase.from("exercise_contraindications").delete().eq("exercise_id", exerciseId);
    const rows = def.contraindications.map((c) => ({
      exercise_id: exerciseId,
      contraindication: slugToDb(typeof c === "string" ? c : (c as string)),
    }));
    const { error: cErr } = await supabase.from("exercise_contraindications").insert(rows);
    if (!cErr) contraCount += rows.length;
  }
  console.log("  exercise_contraindications: linked", contraCount, "rows");

  // 6) exercise_progressions (progressions + regressions)
  let progCount = 0;
  for (const def of EXERCISES) {
    const exerciseId = exerciseIdBySlug.get(def.id);
    if (!exerciseId) continue;
    const pairs: { related_exercise_id: string; relationship: "progression" | "regression" }[] = [];
    for (const slug of def.progressions ?? []) {
      const relatedId = exerciseIdBySlug.get(slug);
      if (relatedId) pairs.push({ related_exercise_id: relatedId, relationship: "progression" });
    }
    for (const slug of def.regressions ?? []) {
      const relatedId = exerciseIdBySlug.get(slug);
      if (relatedId) pairs.push({ related_exercise_id: relatedId, relationship: "regression" });
    }
    if (pairs.length === 0) continue;
    await supabase.from("exercise_progressions").delete().eq("exercise_id", exerciseId);
    const rows = pairs.map((p) => ({ exercise_id: exerciseId, ...p }));
    const { error: pErr } = await supabase.from("exercise_progressions").insert(rows);
    if (!pErr) progCount += rows.length;
  }
  console.log("  exercise_progressions: linked", progCount, "rows");

  console.log("Done. Catalog seeded from data/exercises.ts.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
