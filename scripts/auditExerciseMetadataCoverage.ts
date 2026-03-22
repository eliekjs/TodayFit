/**
 * Audit metadata coverage for data/workout-exercise-catalog.json (merged static + DB when exported).
 *
 * Run: npx tsx scripts/auditExerciseMetadataCoverage.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { ExerciseDefinition } from "../lib/types";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { CONDITIONING_INTENT_SLUGS } from "../data/goalSubFocus/conditioningSubFocus";

type CatalogOntology = {
  primary_movement_family?: string | null;
  secondary_movement_families?: string[] | null;
  movement_patterns?: string[] | null;
  joint_stress_tags?: string[] | null;
  contraindication_tags?: string[] | null;
  impact_level?: string | null;
  exercise_role?: string | null;
  pairing_category?: string | null;
  fatigue_regions?: string[] | null;
  mobility_targets?: string[] | null;
  stretch_targets?: string[] | null;
  unilateral?: boolean | null;
  rep_range_min?: number | null;
  rep_range_max?: number | null;
};

type CatalogExercise = {
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
  ontology: CatalogOntology | null;
  extra: Record<string, unknown>;
};

function nonEmpty<T>(a: T[] | null | undefined): boolean {
  return Array.isArray(a) && a.length > 0;
}

function filled(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function rowToDefinition(row: CatalogExercise): ExerciseDefinition {
  return {
    id: row.id,
    name: row.name,
    muscles: row.muscles as ExerciseDefinition["muscles"],
    modalities: row.modalities as ExerciseDefinition["modalities"],
    equipment: row.equipment as ExerciseDefinition["equipment"],
    tags: row.tags ?? [],
    contraindications: row.contraindications as ExerciseDefinition["contraindications"],
    progressions: row.progressions ?? [],
    regressions: row.regressions ?? [],
  };
}

function main() {
  const path = join(__dirname, "..", "data", "workout-exercise-catalog.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as { exercises: CatalogExercise[] };
  const exercises = raw.exercises;
  const n = exercises.length;

  const c = {
    total: n,
    catalog_equipment: 0,
    catalog_modalities: 0,
    catalog_muscles: 0,
    catalog_tags: 0,
    catalog_contraindications: 0,
    catalog_progressions: 0,
    catalog_regressions: 0,
    catalog_description: 0,
    catalog_movement_pattern: 0,
    catalog_primary_muscles_distinct: 0,
    catalog_secondary_muscles: 0,
    ontology_blob_present: 0,
    ontology_primary_movement_family: 0,
    ontology_secondary_movement_families: 0,
    ontology_movement_patterns: 0,
    ontology_joint_stress_tags: 0,
    ontology_contraindication_tags: 0,
    ontology_impact_level: 0,
    ontology_exercise_role: 0,
    ontology_pairing_category: 0,
    ontology_fatigue_regions: 0,
    ontology_mobility_targets: 0,
    ontology_stretch_targets: 0,
    ontology_unilateral_boolean: 0,
    ontology_rep_range_pair: 0,
    generator_goal_tags: 0,
    generator_explicit_energy_fit: 0,
    generator_joint_stress_tags: 0,
    generator_stimulus_tags: 0,
    generator_attribute_tags: 0,
    generator_sport_tags: 0,
    /** Explicit conditioning intent slugs (e.g. zone2_aerobic_base) in generator attribute_tags after adapter. */
    generator_attribute_has_conditioning_intent_slug: 0,
    /** Phase 1: ontology on generator Exercise after adapter (static inference + DB merge). */
    generator_primary_movement_family: 0,
    generator_movement_patterns: 0,
    generator_secondary_movement_families: 0,
    generator_impact_level: 0,
    generator_exercise_role: 0,
    generator_pairing_category: 0,
    generator_fatigue_regions: 0,
    /** Phase 5: mobility / stretch targets on generator Exercise after adapter. */
    generator_mobility_targets: 0,
    generator_stretch_targets: 0,
    /** Phase 6: rep_range_min + rep_range_max on generator Exercise after adapter. */
    generator_rep_range_pair: 0,
    /** Phase 7: demand levels for warmup/cooldown ontology scoring. */
    generator_warmup_relevance: 0,
    generator_cooldown_relevance: 0,
    /** Phase 8: explicit unilateral true on generator Exercise. */
    generator_unilateral_true: 0,
    extra_non_empty: 0,
  };

  const conditioningIntentSet = new Set<string>(CONDITIONING_INTENT_SLUGS as readonly string[]);

  for (const row of exercises) {
    if (nonEmpty(row.equipment)) c.catalog_equipment += 1;
    if (nonEmpty(row.modalities)) c.catalog_modalities += 1;
    if (nonEmpty(row.muscles)) c.catalog_muscles += 1;
    if (nonEmpty(row.tags)) c.catalog_tags += 1;
    if (nonEmpty(row.contraindications)) c.catalog_contraindications += 1;
    if (nonEmpty(row.progressions)) c.catalog_progressions += 1;
    if (nonEmpty(row.regressions)) c.catalog_regressions += 1;
    if (filled(row.description)) c.catalog_description += 1;
    if (filled(row.movement_pattern)) c.catalog_movement_pattern += 1;
    if (nonEmpty(row.primary_muscles)) c.catalog_primary_muscles_distinct += 1;
    if (nonEmpty(row.secondary_muscles)) c.catalog_secondary_muscles += 1;

    const ont = row.ontology;
    if (ont != null) {
      c.ontology_blob_present += 1;
      if (filled(ont.primary_movement_family)) c.ontology_primary_movement_family += 1;
      if (nonEmpty(ont.secondary_movement_families)) c.ontology_secondary_movement_families += 1;
      if (nonEmpty(ont.movement_patterns)) c.ontology_movement_patterns += 1;
      if (nonEmpty(ont.joint_stress_tags)) c.ontology_joint_stress_tags += 1;
      if (nonEmpty(ont.contraindication_tags)) c.ontology_contraindication_tags += 1;
      if (filled(ont.impact_level)) c.ontology_impact_level += 1;
      if (filled(ont.exercise_role)) c.ontology_exercise_role += 1;
      if (filled(ont.pairing_category)) c.ontology_pairing_category += 1;
      if (nonEmpty(ont.fatigue_regions)) c.ontology_fatigue_regions += 1;
      if (nonEmpty(ont.mobility_targets)) c.ontology_mobility_targets += 1;
      if (nonEmpty(ont.stretch_targets)) c.ontology_stretch_targets += 1;
      if (ont.unilateral === true || ont.unilateral === false) c.ontology_unilateral_boolean += 1;
      if (ont.rep_range_min != null && ont.rep_range_max != null) c.ontology_rep_range_pair += 1;
    }

    if (Object.keys(row.extra ?? {}).length > 0) c.extra_non_empty += 1;

    const gen = exerciseDefinitionToGeneratorExercise(rowToDefinition(row));
    if (nonEmpty(gen.tags.goal_tags)) c.generator_goal_tags += 1;
    if (nonEmpty(gen.tags.energy_fit)) c.generator_explicit_energy_fit += 1;
    if (nonEmpty(gen.tags.joint_stress)) c.generator_joint_stress_tags += 1;
    if (nonEmpty(gen.tags.stimulus)) c.generator_stimulus_tags += 1;
    if (nonEmpty(gen.tags.attribute_tags)) c.generator_attribute_tags += 1;
    if (nonEmpty(gen.tags.sport_tags)) c.generator_sport_tags += 1;
    const attrs = gen.tags.attribute_tags ?? [];
    if (attrs.some((a) => conditioningIntentSet.has(a.toLowerCase().replace(/\s/g, "_")))) {
      c.generator_attribute_has_conditioning_intent_slug += 1;
    }
    if (filled(gen.primary_movement_family)) c.generator_primary_movement_family += 1;
    if (nonEmpty(gen.movement_patterns)) c.generator_movement_patterns += 1;
    if (nonEmpty(gen.secondary_movement_families)) c.generator_secondary_movement_families += 1;
    if (filled(gen.impact_level)) c.generator_impact_level += 1;
    if (filled(gen.exercise_role)) c.generator_exercise_role += 1;
    if (filled(gen.pairing_category)) c.generator_pairing_category += 1;
    if (nonEmpty(gen.fatigue_regions)) c.generator_fatigue_regions += 1;
    if (nonEmpty(gen.mobility_targets)) c.generator_mobility_targets += 1;
    if (nonEmpty(gen.stretch_targets)) c.generator_stretch_targets += 1;
    if (gen.rep_range_min != null && gen.rep_range_max != null) c.generator_rep_range_pair += 1;
    if (filled(gen.warmup_relevance)) c.generator_warmup_relevance += 1;
    if (filled(gen.cooldown_relevance)) c.generator_cooldown_relevance += 1;
  }

  const pct = (x: number) => (n ? ((100 * x) / n).toFixed(1) : "0.0") + "%";

  const report = {
    source: path,
    total_exercises: n,
    note:
      "Generator columns reflect exerciseDefinitionToGeneratorExercise(catalog→ExerciseDefinition). Catalog counts use Phase 1–8 inference on the adapter path after re-running exportWorkoutExerciseCatalog.ts (Phase 8 sets unilateral true when id/name/tags match single-limb cues).",
    counts: c,
    coverage_percent: Object.fromEntries(
      Object.entries(c)
        .filter(([k]) => k !== "total")
        .map(([k, v]) => [k, { count: v, pct: pct(v as number) }])
    ),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
