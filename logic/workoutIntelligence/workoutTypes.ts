/**
 * Phase 3: Output data models for generated workouts.
 * Skeleton only — no full scoring/generation logic here.
 * Used by the session generator in later phases.
 */

import type { BlockType, BlockFormat, SessionTypeSlug, StimulusProfileSlug } from "./types";
import type { SessionFatigueBudget } from "./types";

/** A single exercise slot in a block (prescription TBD in later phase). */
export interface GeneratedExerciseSlot {
  exercise_id: string;
  /** Optional: sets, reps, rest, tempo when prescription is applied. */
  prescription?: {
    sets?: number;
    reps_min?: number;
    reps_max?: number;
    rest_seconds?: number;
    tempo?: string;
  };
}

/** A filled block in a generated workout. */
export interface GeneratedBlock {
  block_type: BlockType;
  format: BlockFormat;
  title: string;
  exercises: GeneratedExerciseSlot[];
}

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
