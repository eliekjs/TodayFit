/**
 * Audit workout level assignments: distributions, explicit vs inferred, suspicious rows, heuristic hits.
 *
 * Run: npx tsx scripts/auditWorkoutLevels.ts [--out path/to/report.json]
 * (`--csv` is accepted as an alias for `--out`.)
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY (read-only).
 */

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadActiveExercisesWithRelationMaps } from "../lib/db/exerciseRepository";
import { mapDbExerciseToGeneratorExercise } from "../lib/db/generatorExerciseAdapter";
import {
  inferWorkoutLevelsWithExplanation,
  parseWorkoutLevelsFromDb,
} from "../lib/workoutLevel";
import type { UserLevel } from "../logic/workoutGeneration/types";

function parseArgs(argv: string[]) {
  let outPath: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if ((argv[i] === "--out" || argv[i] === "--csv") && argv[i + 1]) outPath = argv[++i];
  }
  return { outPath };
}

function demandRank(s: string | null | undefined): number {
  if (s === "high") return 3;
  if (s === "medium") return 2;
  if (s === "low") return 1;
  return 0;
}

async function main() {
  const { outPath } = parseArgs(process.argv);
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const maps = await loadActiveExercisesWithRelationMaps(supabase);

  const comboCounts = new Map<string, number>();
  let explicitCount = 0;
  let inferredOnlyUsed = 0;
  const nameHeuristicCounts = new Map<string, number>();
  const modalityCounts = new Map<string, Map<string, number>>();
  const patternCounts = new Map<string, Map<string, number>>();
  const equipmentTop = new Map<string, Map<string, number>>();
  const impactByCombo = new Map<string, Map<string, number>>();

  const suspicious: {
    slug: string;
    kind: string;
    detail: string;
  }[] = [];
  let allThreeTierCount = 0;

  for (const row of maps.rows) {
    const tags = maps.tagsByExerciseId.get(row.id) ?? [];
    const contra = maps.contraByExerciseId.get(row.id) ?? [];
    const prog = maps.progressionsByExerciseId.get(row.id) ?? [];
    const reg = maps.regressionsByExerciseId.get(row.id) ?? [];
    const dbParsed = parseWorkoutLevelsFromDb(row.workout_levels ?? undefined);
    const hasExplicit = Boolean(dbParsed?.length);
    if (hasExplicit) explicitCount++;
    else inferredOnlyUsed++;

    const exerciseMapped = mapDbExerciseToGeneratorExercise(row, tags, contra, prog, reg);
    const levels = exerciseMapped.workout_level_tags ?? [];
    const keyCombo = levels.join(">");
    comboCounts.set(keyCombo, (comboCounts.get(keyCombo) ?? 0) + 1);

    const levelSource = {
      id: row.slug,
      name: row.name,
      tags,
      workout_levels: undefined as UserLevel[] | undefined,
      stability_demand: exerciseMapped.stability_demand,
      grip_demand: exerciseMapped.grip_demand,
      impact_level: exerciseMapped.impact_level,
      modality: exerciseMapped.modality,
      movement_pattern: exerciseMapped.movement_pattern,
      difficulty: exerciseMapped.difficulty,
      unilateral: exerciseMapped.unilateral,
      attribute_tags: exerciseMapped.tags.attribute_tags,
      equipment_required: exerciseMapped.equipment_required,
    };
    const fresh = inferWorkoutLevelsWithExplanation(levelSource);
    for (const r of fresh.reasons) {
      if (r.startsWith("name_pattern:")) {
        nameHeuristicCounts.set(r, (nameHeuristicCounts.get(r) ?? 0) + 1);
      }
    }

    const mod = exerciseMapped.modality ?? "unknown";
    if (!modalityCounts.has(mod)) modalityCounts.set(mod, new Map());
    const mc = modalityCounts.get(mod)!;
    mc.set(keyCombo, (mc.get(keyCombo) ?? 0) + 1);

    const pat = exerciseMapped.movement_pattern ?? "unknown";
    if (!patternCounts.has(pat)) patternCounts.set(pat, new Map());
    const pc = patternCounts.get(pat)!;
    pc.set(keyCombo, (pc.get(keyCombo) ?? 0) + 1);

    for (const eq of exerciseMapped.equipment_required ?? []) {
      if (!equipmentTop.has(eq)) equipmentTop.set(eq, new Map());
      const ec = equipmentTop.get(eq)!;
      ec.set(keyCombo, (ec.get(keyCombo) ?? 0) + 1);
    }

    const onlyAdvanced = levels.length === 1 && levels[0] === "advanced";
    const diff = exerciseMapped.difficulty ?? 3;
    if (onlyAdvanced && diff <= 2) {
      suspicious.push({
        slug: row.slug,
        kind: "advanced_only_low_difficulty",
        detail: `difficulty=${diff}`,
      });
    }

    const hasBeginner = levels.includes("beginner");
    const stab = demandRank(exerciseMapped.stability_demand);
    const grip = demandRank(exerciseMapped.grip_demand);
    if (hasBeginner && stab >= 2 && grip >= 2) {
      suspicious.push({
        slug: row.slug,
        kind: "beginner_tag_high_demand",
        detail: `stability=${exerciseMapped.stability_demand} grip=${exerciseMapped.grip_demand}`,
      });
    }

    const imp = exerciseMapped.impact_level ?? "unknown";
    if (!impactByCombo.has(imp)) impactByCombo.set(imp, new Map());
    const ic = impactByCombo.get(imp)!;
    ic.set(keyCombo, (ic.get(keyCombo) ?? 0) + 1);

    if (hasBeginner && (imp === "high" || imp === "medium")) {
      suspicious.push({
        slug: row.slug,
        kind: "beginner_tag_elevated_impact",
        detail: `impact_level=${imp}`,
      });
    }

    if (levels.length === 3 && fresh.complexityScore != null && fresh.complexityScore < 4.9) {
      suspicious.push({
        slug: row.slug,
        kind: "all_three_tiers_low_complexity_score",
        detail: `complexity_score=${fresh.complexityScore.toFixed(2)} (expected >= 4.9 for typical all-three band)`,
      });
    }

    if (levels.length === 3) allThreeTierCount++;

    if (hasExplicit && dbParsed) {
      const inferredStr = fresh.levels.join("|");
      const dbStr = dbParsed.join("|");
      if (inferredStr !== dbStr) {
        suspicious.push({
          slug: row.slug,
          kind: "explicit_differs_from_fresh_inference",
          detail: `db=${dbStr} fresh_infer=${inferredStr}`,
        });
      }
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    total_exercises: maps.rows.length,
    explicit_db_count: explicitCount,
    empty_db_count_in_db: inferredOnlyUsed,
    /** Rows with NULL/empty workout_levels; tiers come from inference at adapter time. */
    pct_rows_without_db_tiers: maps.rows.length
      ? ((inferredOnlyUsed / maps.rows.length) * 100).toFixed(1)
      : "0",
    pct_rows_with_db_tiers: maps.rows.length ? ((explicitCount / maps.rows.length) * 100).toFixed(1) : "0",
    /** @deprecated same as pct_rows_with_db_tiers — kept for older dashboards */
    pct_explicit_db: maps.rows.length ? ((explicitCount / maps.rows.length) * 100).toFixed(1) : "0",
    all_three_tier_assignments: allThreeTierCount,
    tier_combo_counts: Object.fromEntries([...comboCounts.entries()].sort((a, b) => b[1] - a[1])),
    name_heuristic_top: Object.fromEntries(
      [...nameHeuristicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    ),
    suspicious_count: suspicious.length,
    suspicious_sample: suspicious.slice(0, 80),
    modality_tier_combos: Object.fromEntries(
      [...modalityCounts.entries()].map(([m, inner]) => [
        m,
        Object.fromEntries([...inner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)),
      ])
    ),
    pattern_tier_combos: Object.fromEntries(
      [...patternCounts.entries()].map(([p, inner]) => [
        p,
        Object.fromEntries([...inner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)),
      ])
    ),
    equipment_tier_combos_top: Object.fromEntries(
      [...equipmentTop.entries()]
        .sort((a, b) => {
          const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);
          return sum(b[1]) - sum(a[1]);
        })
        .slice(0, 15)
        .map(([eq, inner]) => [
          eq,
          Object.fromEntries([...inner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)),
        ])
    ),
    impact_level_tier_combos: Object.fromEntries(
      [...impactByCombo.entries()].map(([imp, inner]) => [
        imp,
        Object.fromEntries([...inner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)),
      ])
    ),
  };

  console.log(JSON.stringify(report, null, 2));
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.error(`Wrote ${outPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
