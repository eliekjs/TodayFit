/**
 * Report NULL/empty coverage for public.exercises (active rows) + junction table attachment rates.
 *
 * Run: npx tsx scripts/reportExerciseTableCoverage.ts  (from repo root; uses ./scripts/dotenvLocal)
 */

import { createClient } from "@supabase/supabase-js";
import { loadDotEnvFromRepoRoot } from "./dotenvLocal";

loadDotEnvFromRepoRoot();

const PAGE = 1000;

function isBlankText(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v !== "string") return true;
  return v.trim().length === 0;
}

function isBlankArray(v: unknown): boolean {
  if (v == null) return true;
  if (!Array.isArray(v)) return true;
  return v.length === 0;
}

async function fetchAllExerciseRows(
  supabase: ReturnType<typeof createClient>
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Record<string, unknown>[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function fetchExerciseIdsWithRelation(
  supabase: ReturnType<typeof createClient>,
  table: "exercise_tag_map" | "exercise_contraindications" | "exercise_progressions"
): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("exercise_id")
      .order("exercise_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as { exercise_id: string }[];
    for (const r of batch) ids.add(r.exercise_id);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const rows = await fetchAllExerciseRows(supabase);
  const n = rows.length;
  const idSet = new Set(rows.map((r) => r.id as string));

  const [tagExerciseIds, contraExerciseIds, progExerciseIds] = await Promise.all([
    fetchExerciseIdsWithRelation(supabase, "exercise_tag_map"),
    fetchExerciseIdsWithRelation(supabase, "exercise_contraindications"),
    fetchExerciseIdsWithRelation(supabase, "exercise_progressions"),
  ]);

  function countWhere(pred: (r: Record<string, unknown>) => boolean): number {
    return rows.filter(pred).length;
  }

  const textCols = [
    "description",
    "movement_pattern",
    "primary_movement_family",
    "exercise_role",
    "pairing_category",
    "level",
    "warmup_relevance",
    "cooldown_relevance",
    "stability_demand",
    "grip_demand",
    "impact_level",
  ] as const;

  const arrayCols = [
    "primary_muscles",
    "secondary_muscles",
    "equipment",
    "modalities",
    "secondary_movement_families",
    "movement_patterns",
    "joint_stress_tags",
    "contraindication_tags",
    "stretch_targets",
    "mobility_targets",
    "fatigue_regions",
    "aliases",
    "swap_candidates",
    "workout_levels",
  ] as const;

  const blankText: Record<string, { blank: number; filled: number; pct_filled: string }> = {};
  for (const col of textCols) {
    const blank = countWhere((r) => isBlankText(r[col]));
    const filled = n - blank;
    blankText[col] = {
      blank,
      filled,
      pct_filled: n ? ((100 * filled) / n).toFixed(1) : "0",
    };
  }

  const blankArr: Record<string, { blank: number; filled: number; pct_filled: string }> = {};
  for (const col of arrayCols) {
    const blank = countWhere((r) => isBlankArray(r[col]));
    const filled = n - blank;
    blankArr[col] = {
      blank,
      filled,
      pct_filled: n ? ((100 * filled) / n).toFixed(1) : "0",
    };
  }

  const repMinNull = countWhere((r) => r.rep_range_min == null);
  const repMaxNull = countWhere((r) => r.rep_range_max == null);
  const repPairComplete = countWhere((r) => r.rep_range_min != null && r.rep_range_max != null);

  const unilateralTrue = countWhere((r) => r.unilateral === true);
  const unilateralFalse = countWhere((r) => r.unilateral === false);
  const unilateralNull = countWhere((r) => r.unilateral == null);

  function attached(ids: Set<string>): { with_row: number; pct: string } {
    let c = 0;
    for (const id of idSet) {
      if (ids.has(id)) c += 1;
    }
    return { with_row: c, pct: n ? ((100 * c) / n).toFixed(1) : "0" };
  }

  const tags = attached(tagExerciseIds);
  const contras = attached(contraExerciseIds);
  const progs = attached(progExerciseIds);

  const report = {
    generated_at: new Date().toISOString(),
    active_exercises: n,
    text_columns_blank_vs_filled: blankText,
    array_columns_empty_vs_nonempty: blankArr,
    rep_ranges: {
      rep_range_min_null: repMinNull,
      rep_range_max_null: repMaxNull,
      both_set: repPairComplete,
      pct_both_set: n ? ((100 * repPairComplete) / n).toFixed(1) : "0",
    },
    unilateral: { true: unilateralTrue, false: unilateralFalse, null: unilateralNull },
    junction_any_row: {
      exercise_tag_map: tags,
      exercise_contraindications: contras,
      exercise_progressions: progs,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
