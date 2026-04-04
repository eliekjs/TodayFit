/**
 * Apply optional JSON patches from data/exerciseMetadataOverrides.json after full exercise inference.
 */

import type { ExerciseDefinition } from "../types";
import type { Exercise, UserLevel } from "../../logic/workoutGeneration/types";
import { normalizeSlug } from "../ontology";
import {
  exerciseToWorkoutLevelExtendedSource,
  inferWorkoutLevelsFromExtendedSource,
  inferCreativeVariationFromSource,
} from "../workoutLevel";
import type { ExerciseMetadataPatch } from "./metadataOverrideTypes";

function clampDifficulty(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

/**
 * Mutates `exercise` when `patch` is non-empty. Recomputes workout_level_tags and creative_variation
 * when patch fields affect tiering / creative detection.
 */
export function applyExerciseMetadataOverrides(
  exercise: Exercise,
  def: ExerciseDefinition,
  patch: ExerciseMetadataPatch | undefined
): void {
  if (!patch) return;
  const keys = Object.keys(patch) as (keyof ExerciseMetadataPatch)[];
  if (keys.length === 0) return;

  let affectsTiers = false;

  if (patch.difficulty != null) {
    exercise.difficulty = clampDifficulty(patch.difficulty);
    affectsTiers = true;
  }
  if (patch.stability_demand != null) {
    exercise.stability_demand = patch.stability_demand;
    affectsTiers = true;
  }
  if (patch.grip_demand != null) {
    exercise.grip_demand = patch.grip_demand;
    affectsTiers = true;
  }
  if (patch.impact_level != null) {
    exercise.impact_level = patch.impact_level;
    affectsTiers = true;
  }
  if (patch.modality != null) {
    exercise.modality = patch.modality;
    affectsTiers = true;
  }
  if (patch.movement_pattern != null) {
    exercise.movement_pattern = patch.movement_pattern;
  }

  if (patch.workout_levels != null && patch.workout_levels.length > 0) {
    exercise.workout_levels_from_db = patch.workout_levels as UserLevel[];
    affectsTiers = true;
  }

  if (patch.attribute_tags_append?.length) {
    const cur = new Set((exercise.tags.attribute_tags ?? []).map((t) => normalizeSlug(String(t))));
    for (const t of patch.attribute_tags_append) cur.add(normalizeSlug(t));
    exercise.tags = {
      ...exercise.tags,
      attribute_tags: [...cur],
    };
    affectsTiers = true;
  }

  if (patch.creative_variation != null) {
    exercise.creative_variation = patch.creative_variation;
  }

  if (affectsTiers) {
    const src = exerciseToWorkoutLevelExtendedSource(exercise);
    const explicit = exercise.workout_levels_from_db ?? def.workout_levels;
    exercise.workout_level_tags = inferWorkoutLevelsFromExtendedSource({
      ...src,
      workout_levels: explicit,
    });
  }

  if (patch.attribute_tags_append?.length && patch.creative_variation == null) {
    const tagsCombined = [...(def.tags ?? []), ...(exercise.tags.attribute_tags ?? [])];
    if (inferCreativeVariationFromSource({ id: def.id, name: def.name, tags: tagsCombined })) {
      exercise.creative_variation = true;
    }
  }
}
