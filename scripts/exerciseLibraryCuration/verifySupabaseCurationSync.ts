/**
 * Report on `public.exercises` curation columns after sync.
 *
 * Usage:
 *   npx tsx scripts/exerciseLibraryCuration/verifySupabaseCurationSync.ts
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY (read-only).
 */

import { createClient } from "@supabase/supabase-js";
import { loadDotEnvFromRepoRoot } from "../dotenvLocal";

loadDotEnvFromRepoRoot();

type Row = {
  slug: string;
  curation_generator_eligibility_state: string | null;
  curation_primary_role: string | null;
  curation_equipment_class: string | null;
  curation_pruning_recommendation: string | null;
  curation_merge_target_exercise_id: string | null;
  curation_canonical_exercise_id: string | null;
  curation_updated_at: string | null;
};

function countKey(rows: Row[], key: keyof Row): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of rows) {
    const v = r[key];
    const k = v == null || v === "" ? "_null_" : String(v);
    m[k] = (m[k] ?? 0) + 1;
  }
  return m;
}

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const cols =
    "slug, curation_generator_eligibility_state, curation_primary_role, curation_equipment_class, curation_pruning_recommendation, curation_merge_target_exercise_id, curation_canonical_exercise_id, curation_updated_at";

  const all: Row[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("exercises")
      .select(cols)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    all.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  const withCuration = all.filter((r) => r.curation_updated_at != null);
  const nullEligibility = all.filter((r) => r.curation_generator_eligibility_state == null).length;

  console.log("=== Supabase curation verification ===");
  console.log("Total exercises rows:", all.length);
  console.log("Rows with curation_updated_at set:", withCuration.length);
  console.log("Rows with null curation_generator_eligibility_state:", nullEligibility);

  const top = (label: string, m: Record<string, number>, limit = 15) => {
    const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
    console.log(label, entries.slice(0, limit));
  };

  top("curation_generator_eligibility_state:", countKey(withCuration.length ? withCuration : all, "curation_generator_eligibility_state"));
  top("curation_primary_role:", countKey(withCuration.length ? withCuration : all, "curation_primary_role"));
  top("curation_equipment_class:", countKey(withCuration.length ? withCuration : all, "curation_equipment_class"));

  const merged = withCuration.filter((r) => r.curation_pruning_recommendation === "merge_into_canonical");
  const removed = withCuration.filter((r) => r.curation_generator_eligibility_state === "excluded_removed");
  console.log("Sample merge_into_canonical (up to 8):", merged.slice(0, 8).map((r) => ({ slug: r.slug, target: r.curation_merge_target_exercise_id })));
  console.log("Sample excluded_removed (up to 8):", removed.slice(0, 8).map((r) => ({ slug: r.slug })));
  console.log("Sample canonical ids (up to 8):", withCuration.filter((r) => r.curation_canonical_exercise_id).slice(0, 8).map((r) => ({ slug: r.slug, canonical: r.curation_canonical_exercise_id })));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
