/**
 * Phase 3: Output data models for generated workouts.
 * Phase 5: Prescription types for completed workouts.
 */

import type { BlockType, BlockFormat, SessionTypeSlug, StimulusProfileSlug } from "./types";
import type { SessionFatigueBudget } from "./types";

/** A single exercise slot in a block (prescription TBD until Phase 5). */
export interface GeneratedExerciseSlot {
  exercise_id: string;
  /** Filled by Phase 5 prescription layer. */
  prescription?: GeneratedExercisePrescription;
}

/** Resolved prescription for one exercise (Phase 5). */
export interface GeneratedExercisePrescription {
  exercise_id: string;
  /** Display name (from exercise pool). */
  name?: string;
  sets: number;
  /** Single number or range "8-12". */
  reps: number | string;
  rest_seconds?: number;
  /** Tempo or intent cue (e.g. "Explosive concentric", "Controlled eccentric"). */
  intent?: string;
  /** Superset group label (e.g. "A", "B") when in superset/alternating block. */
  superset_group?: string;
  /** Optional note for this exercise. */
  notes?: string;
}

/** Alias for backward compatibility. */
export type ResolvedPrescription = GeneratedExercisePrescription;

/** A filled block with optional block-level notes (Phase 5). */
export interface GeneratedBlock {
  block_type: BlockType;
  format: BlockFormat;
  title: string;
  exercises: GeneratedExerciseSlot[];
  /** Optional reasoning/coaching note for the block (Phase 5). */
  block_notes?: string;
}

/** Workout with prescriptions applied (Phase 5). Same as GeneratedWorkout with exercises fully prescribed. */
export type WorkoutWithPrescriptions = GeneratedWorkout;

/** Skeleton for a fully generated workout session. */
export interface GeneratedWorkout {
  /** Unique id for this workout instance. */
  id: string;
  /** Session type and stimulus used to build it. */
  session_type: SessionTypeSlug;
  stimulus_profile: StimulusProfileSlug;
  /** Human-readable title. */
  title: string;
  /** Ordered blocks with exercises. */
  blocks: GeneratedBlock[];
  /** Target or actual duration (minutes). */
  duration_minutes: number;
  /** Session fatigue budget that was used (for weekly planning compatibility). */
  fatigue_budget: SessionFatigueBudget;
  /** Optional: duration tier and energy level used for shaping. */
  meta?: {
    duration_tier?: number;
    energy_level?: "low" | "medium" | "high";
  };
}
