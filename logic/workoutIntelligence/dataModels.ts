/**
 * Phase 1: Data models for the training qualities system.
 * These types align with DB tables and static config used by the workout engine.
 */

import type { TrainingQualitySlug } from "./trainingQualities";

// Re-export for consumers that only need the data-model types.
export type { TrainingQuality } from "./trainingQualities";

// ---------------------------------------------------------------------------
// Sport → training demand
// ---------------------------------------------------------------------------

/** Single sport–quality weight. Weight 0–1 (1 = highest demand). */
export interface SportTrainingDemandRow {
  sport_slug: string;
  training_quality_slug: TrainingQualitySlug;
  weight: number;
}

/** In-memory: sport_slug → quality_slug → weight. */
export type SportTrainingDemandMap = Record<string, Partial<Record<TrainingQualitySlug, number>>>;

// ---------------------------------------------------------------------------
// Exercise → training quality
// ---------------------------------------------------------------------------

/** Single exercise–quality weight. Weight 0–1 (1 = primary quality for that exercise). */
export interface ExerciseQualityScoreRow {
  exercise_id: string;
  training_quality_slug: TrainingQualitySlug;
  weight: number;
}

/** In-memory: exercise id/slug → quality_slug → weight. Used for scoring. */
export type ExerciseQualityScoreMap = Record<
  string,
  Partial<Record<TrainingQualitySlug, number>>
>;

// ---------------------------------------------------------------------------
// Goal → training quality
// ---------------------------------------------------------------------------

/** Single goal–quality weight. Weight 0–1. */
export interface GoalTrainingDemandRow {
  goal_slug: string;
  training_quality_slug: TrainingQualitySlug;
  weight: number;
}

/** In-memory: goal_slug → quality_slug → weight. */
export type GoalTrainingDemandMap = Record<
  string,
  Partial<Record<TrainingQualitySlug, number>>
>;
