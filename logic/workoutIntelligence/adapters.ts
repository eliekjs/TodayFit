/**
 * Adapters: convert generator Exercise (or DB shape) to ExerciseWithQualities.
 * When the exercise has no DB rows in exercise_training_quality, derives
 * training_quality_weights from tags (tagToQualityMap) and merges with overrides below.
 */

import type { ExerciseWithQualities, QualityWeightMap } from "./types";
import type { TrainingQualitySlug } from "./trainingQualities";
import { qualitiesFromTags } from "./tagToQualityMap";

/** Generator Exercise shape (logic/workoutGeneration/types). */
export type GeneratorExercise = {
  id: string;
  name: string;
  movement_pattern: string;
  muscle_groups: string[];
  modality: string;
  equipment_required: string[];
  difficulty?: number;
  time_cost?: "low" | "medium" | "high";
  estimated_minutes?: number;
  tags?: {
    goal_tags?: string[];
    sport_tags?: string[];
    energy_fit?: ("low" | "medium" | "high")[];
    joint_stress?: string[];
    contraindications?: string[];
    stimulus?: string[];
  };
  progressions?: string[];
  regressions?: string[];
};

/** Optional overrides: exercise_id -> partial quality weights (merge with derived). */
export const EXERCISE_QUALITY_OVERRIDES: Record<string, Partial<Record<TrainingQualitySlug, number>>> = {
  pullup: { pulling_strength: 1.0, grip_strength: 0.6, core_tension: 0.4, lat_hypertrophy: 0.7 },
  barbell_back_squat: { max_strength: 0.95, hypertrophy: 0.5, unilateral_strength: 0.2, quad_hypertrophy: 0.8 },
  split_squat: { unilateral_strength: 1.0, quad_hypertrophy: 0.8, hip_stability: 0.5, eccentric_strength: 0.4 },
  rdl_dumbbell: { eccentric_strength: 0.8, posterior_chain_endurance: 0.3, scapular_stability: 0.3 },
  barbell_deadlift: { max_strength: 0.9, power: 0.4, grip_strength: 0.5, core_tension: 0.5 },
  kb_swing: { power: 0.7, work_capacity: 0.7, hip_stability: 0.4 },
  bench_press_barbell: { pushing_strength: 0.95, hypertrophy: 0.6 },
  lat_pulldown: { pulling_strength: 0.9, lat_hypertrophy: 0.8 },
};

/**
 * Convert generator Exercise to ExerciseWithQualities.
 * Builds training_quality_weights from goal_tags + stimulus + movement_pattern, then applies overrides.
 */
export function toExerciseWithQualities(e: GeneratorExercise): ExerciseWithQualities {
  const tagSlugs: string[] = [
    ...(e.tags?.goal_tags ?? []),
    ...(e.tags?.stimulus ?? []),
    ...(e.tags?.sport_tags ?? []),
    e.movement_pattern,
    e.modality,
  ];
  let weights: QualityWeightMap = qualitiesFromTags(tagSlugs);
  const overrides = EXERCISE_QUALITY_OVERRIDES[e.id];
  if (overrides) {
    weights = { ...weights };
    for (const [k, v] of Object.entries(overrides)) {
      if (typeof v === "number") weights[k as TrainingQualitySlug] = v;
    }
  }
  return {
    id: e.id,
    name: e.name,
    movement_pattern: e.movement_pattern,
    muscle_groups: e.muscle_groups,
    equipment_required: e.equipment_required,
    training_quality_weights: weights,
    joint_stress: e.tags?.joint_stress,
    contraindications: e.tags?.contraindications,
    energy_fit: e.tags?.energy_fit,
    time_cost: e.time_cost,
    modality: e.modality,
    skill_level: e.difficulty,
  };
}
