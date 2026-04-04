/**
 * Adapter: DB exercise row + tags/contra/progressions -> generator Exercise.
 * When structured ontology columns are present they are the source of truth;
 * legacy tags and movement_pattern are populated via lib/ontology legacy mapping.
 */

import type { Exercise, ExerciseTags, Modality, MovementPattern, TimeCost } from "../../logic/workoutGeneration/types";
import {
  exerciseInferenceInputFromDbRow,
  mergePhase1MovementOntologyIntoExercise,
} from "../exerciseMetadata/phase1MovementInference";
import { mergePhase2SafetyOntologyIntoExercise } from "../exerciseMetadata/phase2SafetyInference";
import { mergePhase3SessionOntologyIntoExercise } from "../exerciseMetadata/phase3SessionRoleInference";
import { mergePhase4ConditioningIntentOntologyIntoExercise } from "../exerciseMetadata/phase4ConditioningIntentInference";
import { mergePhase5MobilityStretchOntologyIntoExercise } from "../exerciseMetadata/phase5MobilityStretchInference";
import { mergePhase6RepRangeOntologyIntoExercise } from "../exerciseMetadata/phase6RepRangeInference";
import { mergePhase7WarmupCooldownRelevanceIntoExercise } from "../exerciseMetadata/phase7WarmupCooldownRelevanceInference";
import { mergePhase8UnilateralOntologyIntoExercise } from "../exerciseMetadata/phase8UnilateralInference";
import {
  inferCreativeVariationFromSource,
  inferWorkoutLevelsFromExtendedSource,
  inferWorkoutLevelsWithExplanation,
  isWorkoutLevelsDebugEnabled,
  parseWorkoutLevelsFromDb,
} from "../workoutLevel";
import {
  getLegacyMovementPattern,
  mergeJointStressForTags,
  mergeContraindicationsForTags,
  normalizeEquipmentSlug,
  normalizeMatchableTagSlugs,
  normalizeSlug,
} from "../ontology";

import { SPORTS_WITH_SUB_FOCUSES } from "../../data/sportSubFocus/sportsWithSubFocuses";
import { getCanonicalSportSlug } from "../../data/sportSubFocus/canonicalSportSlug";

const CANONICAL_SPORT_SLUGS = new Set(SPORTS_WITH_SUB_FOCUSES.map((s) => normalizeSlug(s.slug)));

/** DB exercise row including optional structured ontology columns. */
export type ExerciseRowWithOntology = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  modalities: string[];
  movement_pattern: string | null;
  /** Ontology columns (nullable in DB). */
  primary_movement_family?: string | null;
  secondary_movement_families?: string[] | null;
  movement_patterns?: string[] | null;
  joint_stress_tags?: string[] | null;
  contraindication_tags?: string[] | null;
  exercise_role?: string | null;
  pairing_category?: string | null;
  fatigue_regions?: string[] | null;
  mobility_targets?: string[] | null;
  stretch_targets?: string[] | null;
  unilateral?: boolean | null;
  rep_range_min?: number | null;
  rep_range_max?: number | null;
  aliases?: string[] | null;
  swap_candidates?: string[] | null;
  warmup_relevance?: string | null;
  cooldown_relevance?: string | null;
  stability_demand?: string | null;
  grip_demand?: string | null;
  impact_level?: string | null;
  secondary_muscle_groups?: string[] | null;
  /** Durable tiers from `public.exercises.workout_levels` when present. */
  workout_levels?: string[] | null;
};

const VALID_MODALITIES: Modality[] = [
  "strength",
  "hypertrophy",
  "power",
  "conditioning",
  "mobility",
  "skill",
  "recovery",
];

function modalitiesToGoalTags(modalities: string[] | undefined): ExerciseTags["goal_tags"] {
  const m = (modalities ?? []).map((x) => x.toLowerCase().replace(/\s/g, "_"));
  const out = new Set<NonNullable<ExerciseTags["goal_tags"]>[number]>();
  for (const s of m) {
    if (s === "strength") out.add("strength");
    else if (s === "hypertrophy") out.add("hypertrophy");
    else if (s === "conditioning") out.add("conditioning");
    else if (s === "power") out.add("power");
    else if (s === "mobility") out.add("mobility");
    else if (s === "recovery") out.add("recovery");
    else if (s === "skill") out.add("calisthenics");
  }
  return out.size ? ([...out] as ExerciseTags["goal_tags"]) : undefined;
}

function toModality(s: string | null | undefined): Modality {
  if (!s) return "strength";
  const n = s.toLowerCase().replace(/\s/g, "_");
  return (VALID_MODALITIES.includes(n as Modality) ? n : "strength") as Modality;
}

/** Normalize tag slug for joint_stress: DB may store "joint_shoulder_overhead" -> "shoulder_overhead". */
function legacyJointStressFromTagSlugs(tagSlugs: string[]): string[] {
  const out: string[] = [];
  for (const t of tagSlugs) {
    const s = t.startsWith("joint_") ? t.slice(6) : t;
    if (["shoulder_overhead", "shoulder_extension", "knee_flexion", "lumbar_shear", "elbow_stress", "wrist_stress", "wrist_extension_load", "hip_stress", "ankle_stress", "grip_hanging", "shoulder_extension_load", "deep_knee_flexion", "spinal_axial_load", "lumbar_flexion_load", "shoulder_abduction_load"].includes(s)) {
      out.push(s);
    }
  }
  return out;
}

/** Build tags object: ontology fields override legacy when present. */
function buildTags(
  row: ExerciseRowWithOntology,
  tagSlugs: string[],
  contraindicationsFromTable: string[]
): ExerciseTags {
  const jointStress = mergeJointStressForTags({
    joint_stress_tags: row.joint_stress_tags ?? undefined,
    joint_stress: legacyJointStressFromTagSlugs(tagSlugs),
  });
  const contra = mergeContraindicationsForTags({
    contraindication_tags: row.contraindication_tags ?? undefined,
    contraindications: contraindicationsFromTable.length ? contraindicationsFromTable : undefined,
  });
  const goalTagsFromTags = tagSlugs.filter((t) =>
    ["strength", "hypertrophy", "endurance", "power", "mobility", "calisthenics", "recovery", "athleticism"].includes(t)
  );
  const goalTagsFromModalities = modalitiesToGoalTags(row.modalities);
  const goalTags = [...new Set([...(goalTagsFromTags ?? []), ...(goalTagsFromModalities ?? [])])] as ExerciseTags["goal_tags"];
  const energySlugs = tagSlugs.filter((t) => t === "energy_low" || t === "energy_medium" || t === "energy_high");
  const energyFit =
    energySlugs.length > 0
      ? (energySlugs.map((t) => t.replace("energy_", "") as "low" | "medium" | "high"))
      : undefined;
  const stimulus = tagSlugs.filter((t) =>
    ["eccentric", "isometric", "plyometric", "aerobic_zone2", "anaerobic", "grip", "scapular_control", "trunk_anti_rotation", "anti_flexion"].includes(t)
  );
  // Canonical sport tags: must match SPORTS_WITH_SUB_FOCUSES slugs (no `sport_` prefix).
  const sportTags = [
    ...new Set(
      tagSlugs.flatMap((t) => {
        const raw = normalizeSlug(t);
        const withoutPrefix = raw.startsWith("sport_") ? raw.slice("sport_".length) : raw;
        const canonical = normalizeSlug(getCanonicalSportSlug(withoutPrefix));
        return CANONICAL_SPORT_SLUGS.has(canonical) ? [canonical] : [];
      })
    ),
  ];
  const used = new Set([
    ...(goalTags ?? []),
    ...energySlugs,
    ...(jointStress ?? []),
    ...stimulus,
    ...sportTags,
  ]);
  const rawAttribute = tagSlugs.filter((t) => !used.has(t));
  const derivedMovementPattern = getLegacyMovementPattern({
    movement_patterns: row.movement_patterns ?? undefined,
    movement_pattern: row.movement_pattern ?? undefined,
  }) as MovementPattern;
  const derivedMuscleTags = [...(row.primary_muscles ?? []), ...(row.secondary_muscles ?? [])].map((m) =>
    m.toLowerCase().replace(/\s/g, "_")
  );
  const derivedMovementTags = derivedMovementPattern
    ? normalizeMatchableTagSlugs(derivedMovementPattern.toLowerCase().replace(/\s/g, "_"))
    : [];

  const attributeTags = [
    ...new Set([
      ...rawAttribute.flatMap((t) => normalizeMatchableTagSlugs(t)),
      ...derivedMuscleTags,
      ...derivedMovementTags,
      ...energySlugs.map(normalizeSlug),
    ]),
  ];
  return {
    ...(goalTags.length ? { goal_tags: goalTags as ExerciseTags["goal_tags"] } : {}),
    ...(sportTags.length ? { sport_tags: sportTags } : {}),
    ...(energyFit?.length ? { energy_fit: energyFit } : {}),
    ...(jointStress?.length ? { joint_stress: jointStress } : {}),
    ...(contra?.length ? { contraindications: contra } : {}),
    ...(stimulus.length ? { stimulus: stimulus as ExerciseTags["stimulus"] } : {}),
    ...(attributeTags.length ? { attribute_tags: attributeTags } : {}),
  };
}

/**
 * Map a DB exercise row (with optional ontology columns) plus tag/contra/progression data
 * to generator Exercise. Ontology fields are source of truth when present; legacy
 * movement_pattern and tags.joint_stress/contraindications are derived for backward compat.
 */
export function mapDbExerciseToGeneratorExercise(
  row: ExerciseRowWithOntology,
  tagSlugs: string[],
  contraindications: string[],
  progressions: string[],
  regressions: string[]
): Exercise {
  const movement_pattern = getLegacyMovementPattern({
    movement_patterns: row.movement_patterns ?? undefined,
    movement_pattern: row.movement_pattern ?? undefined,
  }) as MovementPattern;

  const tags = buildTags(row, tagSlugs, contraindications);
  const modality = toModality(row.modalities?.[0]);
  const primary = row.primary_muscles ?? [];
  const secondary = row.secondary_muscles ?? [];
  const muscle_groups = [...primary, ...secondary].filter((m, i, a) => a.indexOf(m) === i);
  const equipment_required = (row.equipment ?? []).map(normalizeEquipmentSlug);

  const exercise: Exercise = {
    id: row.slug,
    name: row.name,
    ...(row.description != null && row.description !== "" ? { description: row.description } : {}),
    movement_pattern,
    muscle_groups,
    modality,
    equipment_required,
    difficulty: 3,
    time_cost: "medium",
    tags,
    ...(progressions.length ? { progressions } : {}),
    ...(regressions.length ? { regressions } : {}),
  };

  if (row.primary_movement_family != null && row.primary_movement_family !== "") {
    exercise.primary_movement_family = row.primary_movement_family;
  }
  if (row.secondary_movement_families?.length) {
    exercise.secondary_movement_families = row.secondary_movement_families;
  }
  if (row.movement_patterns?.length) {
    exercise.movement_patterns = row.movement_patterns;
  }
  if (row.joint_stress_tags?.length) {
    exercise.joint_stress_tags = row.joint_stress_tags;
  }
  if (row.contraindication_tags?.length) {
    exercise.contraindication_tags = row.contraindication_tags;
  }
  if (row.exercise_role != null && row.exercise_role !== "") {
    exercise.exercise_role = row.exercise_role;
  }
  if (row.pairing_category != null && row.pairing_category !== "") {
    exercise.pairing_category = row.pairing_category;
  }
  if (row.fatigue_regions?.length) {
    exercise.fatigue_regions = row.fatigue_regions;
  }
  if (row.mobility_targets?.length) {
    exercise.mobility_targets = row.mobility_targets;
  }
  if (row.stretch_targets?.length) {
    exercise.stretch_targets = row.stretch_targets;
  }
  if (row.unilateral === true) {
    exercise.unilateral = true;
  }
  if (row.rep_range_min != null && row.rep_range_max != null) {
    exercise.rep_range_min = row.rep_range_min;
    exercise.rep_range_max = row.rep_range_max;
  }
  if (row.aliases?.length) {
    exercise.aliases = row.aliases;
  }
  if (row.swap_candidates?.length) {
    exercise.swap_candidates = row.swap_candidates;
  }
  if (primary.length) {
    exercise.primary_muscle_groups = primary;
  }
  const demandSlug = (s: string | null | undefined): "none" | "low" | "medium" | "high" | undefined =>
    s === "none" || s === "low" || s === "medium" || s === "high" ? s : undefined;
  if (demandSlug(row.warmup_relevance)) exercise.warmup_relevance = demandSlug(row.warmup_relevance);
  if (demandSlug(row.cooldown_relevance)) exercise.cooldown_relevance = demandSlug(row.cooldown_relevance);
  if (demandSlug(row.stability_demand)) exercise.stability_demand = demandSlug(row.stability_demand);
  if (demandSlug(row.grip_demand)) exercise.grip_demand = demandSlug(row.grip_demand);
  if (demandSlug(row.impact_level)) exercise.impact_level = demandSlug(row.impact_level);
  if (row.secondary_muscle_groups?.length) {
    exercise.secondary_muscle_groups = row.secondary_muscle_groups;
  } else if (secondary.length) {
    exercise.secondary_muscle_groups = secondary;
  }

  const inferenceInput = exerciseInferenceInputFromDbRow(
    {
      slug: row.slug,
      name: row.name,
      primary_muscles: row.primary_muscles ?? [],
      secondary_muscles: row.secondary_muscles ?? [],
      modalities: row.modalities ?? [],
      equipment: row.equipment ?? [],
    },
    tagSlugs
  );

  mergePhase1MovementOntologyIntoExercise(exercise, inferenceInput);

  mergePhase2SafetyOntologyIntoExercise(exercise, inferenceInput, {
    movement_patterns: exercise.movement_patterns ?? [],
    primary_movement_family: exercise.primary_movement_family,
  });

  mergePhase3SessionOntologyIntoExercise(exercise, inferenceInput, {
    movement_patterns: exercise.movement_patterns ?? [],
    primary_movement_family: exercise.primary_movement_family,
    movement_pattern: exercise.movement_pattern,
    modality: exercise.modality,
    joint_stress_tags: exercise.joint_stress_tags,
  });

  mergePhase4ConditioningIntentOntologyIntoExercise(exercise, inferenceInput);

  mergePhase5MobilityStretchOntologyIntoExercise(exercise, inferenceInput);

  mergePhase6RepRangeOntologyIntoExercise(exercise, inferenceInput);

  mergePhase7WarmupCooldownRelevanceIntoExercise(exercise, inferenceInput);

  mergePhase8UnilateralOntologyIntoExercise(exercise, inferenceInput);

  const explicitLevels = parseWorkoutLevelsFromDb(row.workout_levels ?? undefined);
  if (explicitLevels?.length) {
    exercise.workout_levels_from_db = explicitLevels;
  }
  const levelSource = {
    id: row.slug,
    name: row.name,
    tags: tagSlugs,
    workout_levels: explicitLevels,
    stability_demand: exercise.stability_demand,
    grip_demand: exercise.grip_demand,
    impact_level: exercise.impact_level,
    modality: exercise.modality,
    movement_pattern: exercise.movement_pattern,
    difficulty: exercise.difficulty,
    unilateral: exercise.unilateral,
    attribute_tags: exercise.tags.attribute_tags,
    equipment_required: exercise.equipment_required,
  };
  exercise.workout_level_tags = inferWorkoutLevelsFromExtendedSource(levelSource);
  if (isWorkoutLevelsDebugEnabled()) {
    const explained = inferWorkoutLevelsWithExplanation(levelSource);
    exercise.workout_levels_meta = {
      origin: explained.origin,
      reasons: explained.reasons,
      ...(explained.complexityScore != null ? { complexityScore: explained.complexityScore } : {}),
    };
  }
  if (inferCreativeVariationFromSource(levelSource)) {
    exercise.creative_variation = true;
  }

  return exercise;
}
