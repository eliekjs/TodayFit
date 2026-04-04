/**
 * Optional per-exercise patches applied after ontology merges in exerciseDefinitionToGeneratorExercise.
 * Data file: data/exerciseMetadataOverrides.json (see scripts/exerciseMetadataQualityAgent.ts).
 */

import type { Modality, MovementPattern } from "../../logic/workoutGeneration/types";
import type { WorkoutTierPreference } from "../types";

export type DemandOverride = "none" | "low" | "medium" | "high";

export type ExerciseMetadataPatch = {
  difficulty?: number;
  stability_demand?: DemandOverride;
  grip_demand?: DemandOverride;
  impact_level?: DemandOverride;
  modality?: Modality;
  movement_pattern?: MovementPattern;
  /** Treated like DB workout_levels: narrows tier filtering when set. */
  workout_levels?: WorkoutTierPreference[];
  /** Merged into tags.attribute_tags (deduped). */
  attribute_tags_append?: string[];
  creative_variation?: boolean;
};

export type ExerciseMetadataOverridesFile = {
  /** Optional schema marker for tooling. */
  _version?: 1;
} & Record<string, ExerciseMetadataPatch>;
