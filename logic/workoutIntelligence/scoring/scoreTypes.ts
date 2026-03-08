/**
 * Phase 4: Types for the exercise selection and scoring engine.
 */

import type { TrainingQualitySlug } from "../trainingQualities";
import type {
  BlockType,
  BlockSpec,
  SessionTemplateV2,
  StimulusProfileSlug,
  SessionTypeSlug,
  EnergyLevel,
  SessionFatigueBudget,
} from "../types";
import type { ExerciseWithQualities } from "../types";
import type { GeneratedBlock, GeneratedExerciseSlot } from "../workoutTypes";
import type { FatigueState } from "../../../lib/generation/fatigueRules";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** Minimal context the scoring engine needs. Works for Build My Workout and Adaptive/Sports Prep. */
export interface WorkoutSelectionInput {
  /** Primary goal slug (e.g. strength, hypertrophy). */
  primary_goal: string;
  secondary_goals?: string[];
  tertiary_goals?: string[];
  /** Sport slugs (e.g. rock_bouldering). */
  sports?: string[];
  /** Direct target qualities override; if absent, derived from goals + sports + session. */
  target_training_qualities?: Partial<Record<TrainingQualitySlug, number>>;
  available_equipment: string[];
  excluded_equipment?: string[];
  duration_minutes: number;
  energy_level: EnergyLevel;
  /** Injury or limitation keys (e.g. shoulder, knee, lower_back). */
  injuries_or_limitations?: string[];
  preferred_session_type?: SessionTypeSlug;
  preferred_stimulus_profile?: StimulusProfileSlug;
  /** Body region focus (e.g. upper_push, lower, core). */
  body_region_focus?: string[];
  /** Movement patterns to avoid this session. */
  avoid_movement_patterns?: string[];
  /** Optional fatigue state from recent history. */
  recent_fatigue_state?: FatigueState;
  /** Exercise IDs used in recent sessions (for variety). */
  recent_exercise_ids?: string[];
  /** Recent session summaries for fatigue. */
  recent_history?: { exercise_ids: string[]; muscle_groups: string[]; modality: string }[];
}

/** Resolved session context: template + qualities per block. */
export interface ResolvedSessionContext {
  template: SessionTemplateV2;
  /** Desired qualities for the whole session (merged). */
  session_qualities: DesiredQualityProfile;
  /** Per-block desired qualities (index = block index). */
  block_qualities: DesiredQualityProfile[];
}

/** Weighted desired qualities for a block or session. */
export interface DesiredQualityProfile {
  /** Quality slug -> weight (0–1). */
  weights: Partial<Record<TrainingQualitySlug, number>>;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Per-factor score breakdown for one exercise. */
export interface ScoreBreakdown {
  exercise_id: string;
  total: number;
  target_quality_alignment: number;
  stimulus_fit?: number;
  movement_pattern_fit?: number;
  fatigue_fit?: number;
  energy_fit?: number;
  injury_fit?: number;
  novelty_fit?: number;
  equipment_fit?: number;
}

/** Scored candidate with optional breakdown. */
export interface ExerciseCandidateScore {
  exercise: ExerciseWithQualities;
  score: number;
  breakdown?: ScoreBreakdown;
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

/** Running state while filling a session (fatigue, balance, used exercises). */
export interface SessionSelectionState {
  /** Accumulated fatigue score so far (simple sum of exercise fatigue costs). */
  accumulated_fatigue: number;
  /** Session fatigue budget (numeric) from template. */
  session_fatigue_budget: number;
  /** Movement pattern -> count in session. */
  movement_pattern_counts: Map<string, number>;
  /** Exercise IDs already selected in this session. */
  used_exercise_ids: Set<string>;
  /** Block index -> fatigue consumed in that block. */
  block_fatigue_used: Map<number, number>;
  /** Grip-heavy exercise count (for grip stacking cap). */
  grip_exercise_count: number;
  /** Shoulder-load exercise count (for shoulder cap). */
  shoulder_exercise_count: number;
  /** High-fatigue compound count (hinge/squat) for stacking cap. */
  heavy_compound_count: number;
}

// ---------------------------------------------------------------------------
// Block result
// ---------------------------------------------------------------------------

/** Result of filling one block. */
export interface BlockSelectionResult {
  block_spec: BlockSpec;
  block_index: number;
  exercises: ExerciseWithQualities[];
  /** Generated block for output (with slots). */
  generated_block: GeneratedBlock;
  fatigue_contribution: number;
}

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

/** Compatibility and score for pairing two exercises. */
export interface PairingScore {
  compatibility: "good" | "neutral" | "bad";
  score: number;
  /** Optional reason for bad/neutral. */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Central config for selection/scoring (weights and thresholds). */
export interface SelectionConfig {
  /** Score factor weights. */
  weights: {
    target_quality_alignment: number;
    stimulus_fit: number;
    movement_pattern_fit: number;
    fatigue_fit: number;
    energy_fit: number;
    injury_fit: number;
    novelty_penalty: number;
    equipment_fit: number;
    balance_bonus: number;
  };
  /** Movement balance: max same pattern per session. */
  max_same_pattern_per_session: number;
  /** Redundancy: penalty for exercise very similar to already selected. */
  redundancy_penalty: number;
  /** Low energy: penalty for high-skill / high-neural exercises. */
  low_energy_high_skill_penalty: number;
  /** Grip: max grip-heavy exercises per session (unless sport-support climbing etc.). */
  max_grip_exercises_per_session: number;
  /** Shoulder: max shoulder-load exercises per session. */
  max_shoulder_exercises_per_session: number;
  /** Max high-fatigue compounds (hinge/squat) in one session. */
  max_heavy_compounds_per_session: number;
  /** Pairing: bonus for "good" pair, penalty for "bad" pair. */
  pairing_good_bonus: number;
  pairing_bad_penalty: number;
}
