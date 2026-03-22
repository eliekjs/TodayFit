/**
 * Writes merged workout exercise catalog to data/workout-exercise-catalog.json:
 * - Static EXERCISES (deduped by id, last-wins order, minus BLOCKED_EXERCISE_IDS)
 * - Plus all active Supabase exercises when EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY are set
 * Merge matches generateWorkoutAsync: DB row wins on slug collision; static fills gaps.
 *
 * Run: npx tsx scripts/exportWorkoutExerciseCatalog.ts
 * With DB: EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... npx tsx scripts/exportWorkoutExerciseCatalog.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { EXERCISES, EXERCISES_BUILTIN } from "../data/exercises";
import { EXERCISES_FUNCTIONAL_FITNESS } from "../data/exercisesFunctionalFitness";
import { OTA_MOVEMENTS } from "../data/otaMovements";
import { listSupabaseCatalogExerciseRows, type SupabaseCatalogExerciseRow } from "../lib/db/exerciseRepository";
import { isDbConfigured } from "../lib/db/client";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import type { ExerciseDefinition } from "../lib/types";
import { getLegacyMovementPattern } from "../lib/ontology/legacyMapping";
import {
  exerciseInferenceInputFromDefinition,
  inferPhase1MovementFromInput,
} from "../lib/exerciseMetadata/phase1MovementInference";
import {
  contraindicationsFromJointStress,
  inferPhase2SafetyFromInput,
} from "../lib/exerciseMetadata/phase2SafetyInference";
import {
  isContraindicationTag,
  isJointStressTag,
  type ContraindicationTag,
  type JointStressTag,
} from "../lib/ontology/vocabularies";
import { inferPhase3SessionFromInput } from "../lib/exerciseMetadata/phase3SessionRoleInference";

type StaticCatalogSource = "builtin" | "functional_fitness" | "ota";
type MergeRole = "static_only" | "supabase_only" | "supabase_overrides_static";

type MergedCatalogExercise = {
  id: string;
  name: string;
  description: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  muscles: string[];
  modalities: string[];
  equipment: string[];
  tags: string[];
  contraindications: string[];
  progressions: string[];
  regressions: string[];
  movement_pattern: string | null;
  merge_role: MergeRole;
  static_catalog_source?: StaticCatalogSource;
  supabase_exercise_uuid?: string;
  ontology: (SupabaseCatalogExerciseRow["ontology"] & { impact_level?: string | null }) | null;
  extra: Record<string, unknown>;
};

function sourceById(): Map<string, StaticCatalogSource> {
  const m = new Map<string, StaticCatalogSource>();
  for (const e of EXERCISES_BUILTIN) m.set(e.id, "builtin");
  for (const e of EXERCISES_FUNCTIONAL_FITNESS) m.set(e.id, "functional_fitness");
  for (const e of OTA_MOVEMENTS) m.set(e.id, "ota");
  return m;
}

function dedupeLastWins(list: ExerciseDefinition[]): ExerciseDefinition[] {
  const byId = new Map<string, ExerciseDefinition>();
  for (const e of list) byId.set(e.id, e);
  return [...byId.values()];
}

function countKeys(items: string[], bucket: Map<string, number>) {
  for (const k of items) bucket.set(k, (bucket.get(k) ?? 0) + 1);
}

function topN(bucket: Map<string, number>, n: number): { key: string; count: number }[] {
  return [...bucket.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

function nonEmptyArray<T>(a: T[] | null | undefined): boolean {
  return Array.isArray(a) && a.length > 0;
}

function filledString(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

/** Fill Phase 2 ontology gaps for DB-backed rows (and any row missing safety fields). */
function enrichOntologyPhase2Gaps(ex: MergedCatalogExercise): void {
  if (!ex.ontology) return;
  const def: ExerciseDefinition = {
    id: ex.id,
    name: ex.name,
    muscles: ex.muscles as ExerciseDefinition["muscles"],
    modalities: ex.modalities as ExerciseDefinition["modalities"],
    equipment: ex.equipment as ExerciseDefinition["equipment"],
    tags: ex.tags,
    contraindications: ex.contraindications as ExerciseDefinition["contraindications"],
    progressions: ex.progressions,
    regressions: ex.regressions,
  };
  const input = exerciseInferenceInputFromDefinition(def);
  const phase1Fallback = inferPhase1MovementFromInput(input);
  const mp = nonEmptyArray(ex.ontology.movement_patterns)
    ? (ex.ontology.movement_patterns as string[])
    : phase1Fallback.movement_patterns;
  const fam = filledString(ex.ontology.primary_movement_family)
    ? (ex.ontology.primary_movement_family as string)
    : phase1Fallback.primary_movement_family;
  const p2 = inferPhase2SafetyFromInput(input, { movement_patterns: mp, primary_movement_family: fam });

  if (!nonEmptyArray(ex.ontology.joint_stress_tags) && p2.joint_stress_tags.length) {
    ex.ontology.joint_stress_tags = p2.joint_stress_tags;
  }

  if (!nonEmptyArray(ex.ontology.contraindication_tags)) {
    const explicit = (ex.contraindications ?? [])
      .map((c) => String(c).toLowerCase().replace(/\s/g, "_"))
      .filter((s): s is ContraindicationTag => isContraindicationTag(s));
    const jointCanon = (ex.ontology.joint_stress_tags ?? []).filter(isJointStressTag) as JointStressTag[];
    const merged = [...new Set([...explicit, ...contraindicationsFromJointStress(jointCanon)])];
    if (merged.length) ex.ontology.contraindication_tags = merged;
  }

  if (!filledString(ex.ontology.impact_level as string | null) && p2.impact_level != null) {
    ex.ontology.impact_level = p2.impact_level;
  }
}

/** Fill Phase 3 ontology gaps (role, pairing, fatigue) after Phase 1–2 enrichment. */
function enrichOntologyPhase3Gaps(ex: MergedCatalogExercise): void {
  if (!ex.ontology) return;
  const def: ExerciseDefinition = {
    id: ex.id,
    name: ex.name,
    muscles: ex.muscles as ExerciseDefinition["muscles"],
    modalities: ex.modalities as ExerciseDefinition["modalities"],
    equipment: ex.equipment as ExerciseDefinition["equipment"],
    tags: ex.tags,
    contraindications: ex.contraindications as ExerciseDefinition["contraindications"],
    progressions: ex.progressions,
    regressions: ex.regressions,
  };
  const input = exerciseInferenceInputFromDefinition(def);
  const phase1Fallback = inferPhase1MovementFromInput(input);
  const mp = nonEmptyArray(ex.ontology.movement_patterns)
    ? (ex.ontology.movement_patterns as string[])
    : phase1Fallback.movement_patterns;
  const fam = filledString(ex.ontology.primary_movement_family)
    ? (ex.ontology.primary_movement_family as string)
    : phase1Fallback.primary_movement_family;
  const legacyMp = getLegacyMovementPattern({
    movement_patterns: mp,
    movement_pattern: ex.movement_pattern ?? undefined,
  });
  const modalityFirst = (ex.modalities?.[0] ?? "strength").toLowerCase().replace(/\s/g, "_");
  const jointCanon = (ex.ontology.joint_stress_tags ?? []).filter(isJointStressTag) as JointStressTag[];
  const p3 = inferPhase3SessionFromInput(input, {
    movement_patterns: mp,
    primary_movement_family: fam,
    movement_pattern: legacyMp,
    modality: modalityFirst,
    joint_stress_tags: jointCanon.length ? jointCanon.map(String) : undefined,
  });

  if (!filledString(ex.ontology.exercise_role) && p3.exercise_role) {
    ex.ontology.exercise_role = p3.exercise_role;
  }
  if (!filledString(ex.ontology.pairing_category) && p3.pairing_category) {
    ex.ontology.pairing_category = p3.pairing_category;
  }
  if (!nonEmptyArray(ex.ontology.fatigue_regions) && p3.fatigue_regions?.length) {
    ex.ontology.fatigue_regions = p3.fatigue_regions;
  }
}

function staticToMerged(e: ExerciseDefinition, src: StaticCatalogSource): MergedCatalogExercise {
  const muscles = e.muscles ?? [];
  const phase1Input = exerciseInferenceInputFromDefinition(e);
  const phase1 = inferPhase1MovementFromInput(phase1Input);
  const legacyMp = getLegacyMovementPattern({ movement_patterns: phase1.movement_patterns });
  const phase2 = inferPhase2SafetyFromInput(phase1Input, {
    movement_patterns: phase1.movement_patterns,
    primary_movement_family: phase1.primary_movement_family,
  });
  const modalityFirst = (e.modalities?.[0] ?? "strength").toLowerCase().replace(/\s/g, "_");
  const p3 = inferPhase3SessionFromInput(phase1Input, {
    movement_patterns: phase1.movement_patterns,
    primary_movement_family: phase1.primary_movement_family,
    movement_pattern: legacyMp,
    modality: modalityFirst,
    joint_stress_tags: phase2.joint_stress_tags,
  });
  const explicitContra = (e.contraindications ?? [])
    .map((c) => String(c).toLowerCase().replace(/\s/g, "_"))
    .filter((s): s is ContraindicationTag => isContraindicationTag(s));
  const contraMerged = [
    ...new Set([...explicitContra, ...contraindicationsFromJointStress(phase2.joint_stress_tags)]),
  ];
  return {
    id: e.id,
    name: e.name,
    description: null,
    primary_muscles: muscles,
    secondary_muscles: [],
    muscles,
    modalities: e.modalities ?? [],
    equipment: e.equipment ?? [],
    tags: e.tags ?? [],
    contraindications: (e.contraindications ?? []).map((c) => String(c)),
    progressions: e.progressions ?? [],
    regressions: e.regressions ?? [],
    movement_pattern: legacyMp,
    merge_role: "static_only",
    static_catalog_source: src,
    ontology: {
      primary_movement_family: phase1.primary_movement_family,
      secondary_movement_families: phase1.secondary_movement_families.length ? phase1.secondary_movement_families : null,
      movement_patterns: phase1.movement_patterns,
      joint_stress_tags: phase2.joint_stress_tags.length ? phase2.joint_stress_tags : null,
      contraindication_tags: contraMerged.length ? contraMerged : null,
      exercise_role: p3.exercise_role ?? null,
      pairing_category: p3.pairing_category ?? null,
      fatigue_regions: p3.fatigue_regions?.length ? p3.fatigue_regions : null,
      mobility_targets: null,
      stretch_targets: null,
      unilateral: null,
      rep_range_min: null,
      rep_range_max: null,
      impact_level: phase2.impact_level ?? null,
    },
    extra: {},
  };
}

function dbToMerged(
  d: SupabaseCatalogExerciseRow,
  merge_role: MergeRole,
  staticSourceKept?: StaticCatalogSource
): MergedCatalogExercise {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    primary_muscles: d.primary_muscles,
    secondary_muscles: d.secondary_muscles,
    muscles: d.muscles,
    modalities: d.modalities,
    equipment: d.equipment,
    tags: d.tags,
    contraindications: d.contraindications,
    progressions: d.progressions,
    regressions: d.regressions,
    movement_pattern: d.movement_pattern,
    merge_role,
    ...(staticSourceKept ? { static_catalog_source: staticSourceKept } : {}),
    supabase_exercise_uuid: d.supabase_row_id,
    ontology: d.ontology,
    extra: {},
  };
}

function summarizeMerged(exercises: MergedCatalogExercise[]) {
  const mergeCounts: Record<MergeRole, number> = {
    static_only: 0,
    supabase_only: 0,
    supabase_overrides_static: 0,
  };
  const staticSourceCounts: Record<StaticCatalogSource, number> = {
    builtin: 0,
    functional_fitness: 0,
    ota: 0,
  };
  const modalityCounts = new Map<string, number>();
  const equipmentCounts = new Map<string, number>();
  const muscleCounts = new Map<string, number>();

  for (const e of exercises) {
    mergeCounts[e.merge_role] += 1;
    if (e.static_catalog_source) staticSourceCounts[e.static_catalog_source] += 1;
    for (const m of e.modalities) countKeys([m], modalityCounts);
    for (const eq of e.equipment) countKeys([eq], equipmentCounts);
    for (const mu of e.muscles) countKeys([mu], muscleCounts);
  }

  return {
    merge_role: mergeCounts,
    static_catalog_source_where_present: staticSourceCounts,
    modalities: Object.fromEntries([...modalityCounts.entries()].sort((a, b) => b[1] - a[1])),
    top_equipment: topN(equipmentCounts, 25),
    top_muscles: topN(muscleCounts, 15),
  };
}

async function main() {
  const sources = sourceById();
  const rawLen = EXERCISES.length;
  const deduped = dedupeLastWins(EXERCISES);
  const seen = new Set<string>();
  let dupCount = 0;
  for (const e of EXERCISES) {
    if (seen.has(e.id)) dupCount += 1;
    seen.add(e.id);
  }

  const eligibleStatic = deduped.filter((e) => !BLOCKED_EXERCISE_IDS.has(e.id));
  const blocked = deduped.filter((e) => BLOCKED_EXERCISE_IDS.has(e.id));

  const merged = new Map<string, MergedCatalogExercise>();
  for (const e of eligibleStatic) {
    const src = sources.get(e.id) ?? "builtin";
    merged.set(e.id, staticToMerged(e, src));
  }

  let supabase_status: "skipped_not_configured" | "ok" | "error" = "skipped_not_configured";
  let supabase_error: string | null = null;
  let supabase_row_count = 0;

  if (isDbConfigured()) {
    try {
      const dbRows = await listSupabaseCatalogExerciseRows();
      if (dbRows === null) {
        supabase_status = "skipped_not_configured";
      } else {
        supabase_status = "ok";
        supabase_row_count = dbRows.length;
        for (const d of dbRows) {
          const prev = merged.get(d.id);
          if (prev) {
            merged.set(d.id, dbToMerged(d, "supabase_overrides_static", prev.static_catalog_source));
          } else {
            merged.set(d.id, dbToMerged(d, "supabase_only"));
          }
        }
      }
    } catch (err) {
      supabase_status = "error";
      supabase_error = err instanceof Error ? err.message : String(err);
    }
  }

  const exercises = [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
  for (const ex of exercises) {
    enrichOntologyPhase2Gaps(ex);
    enrichOntologyPhase3Gaps(ex);
  }
  const generatedAt = new Date().toISOString();
  const outPath = join(__dirname, "..", "data", "workout-exercise-catalog.json");

  const payload = {
    generated_at: generatedAt,
    schema_version: 2,
    description:
      "Merged catalog for workout generation: static EXERCISES + active Supabase rows when fetched. On slug collision, Supabase row wins (same as generateWorkoutAsync).",
    notes:
      "Add custom fields in each exercise's `extra`. Re-run script to refresh; set EXPO_PUBLIC_SUPABASE_* to include DB.",
    summary: {
      total_raw_rows_in_exercises_array: rawLen,
      duplicate_id_rows_in_array: dupCount,
      unique_static_ids_before_blocked: deduped.length,
      blocked_exercise_ids: [...BLOCKED_EXERCISE_IDS],
      blocked_in_static_count: blocked.length,
      supabase: {
        configured: isDbConfigured(),
        fetch_status: supabase_status,
        fetch_error: supabase_error,
        active_rows_fetched: supabase_row_count,
      },
      merged_exercise_count: exercises.length,
      modality_counts_are_nonexclusive:
        "Sums can exceed merged_exercise_count because each exercise may list multiple modalities.",
      ...summarizeMerged(exercises),
    },
    exercises,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`Wrote ${exercises.length} merged exercises to ${outPath}`);
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
