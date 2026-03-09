/**
 * Types for the session generation engine (shared by Build My Workout and Sports Prep).
 * Input is built from the active mode’s filters; same generator runs for one session or per day in a week.
 */

// --- Movement & modality ---
export type MovementPattern =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "carry"
  | "rotate"
  | "locomotion";

export type Modality =
  | "strength"
  | "hypertrophy"
  | "power"
  | "conditioning"
  | "mobility"
  | "skill"
  | "recovery";

export type TimeCost = "low" | "medium" | "high";

// --- Exercise tags (structured) ---
export type ExerciseTags = {
  goal_tags?: (
    | "strength"
    | "hypertrophy"
    | "endurance"
    | "power"
    | "mobility"
    | "calisthenics"
    | "recovery"
    | "athleticism"
  )[];
  sport_tags?: string[]; // climbing, skiing, surfing, hyrox, running, etc.
  energy_fit?: ("low" | "medium" | "high")[];
  joint_stress?: string[]; // shoulder_overhead, shoulder_extension, knee_flexion, lumbar_shear, etc.
  contraindications?: string[]; // rotator_cuff_irritation, low_back_sensitive, knee_pain, etc.
  stimulus?: (
    | "eccentric"
    | "isometric"
    | "plyometric"
    | "aerobic_zone2"
    | "anaerobic"
    | "grip"
    | "scapular_control"
    | "trunk_anti_rotation"
    | "anti_flexion"
  )[];
};

// --- Ontology (optional; when present, source of truth for filtering/rules) ---
// Canonical slugs from lib/ontology. Legacy tags.joint_stress / tags.contraindications
// can be populated from joint_stress_tags / contraindication_tags by adapters.
export type ExerciseOntology = {
  primary_movement_family?: string;
  secondary_movement_families?: string[];
  movement_patterns?: string[];
  joint_stress_tags?: string[];
  contraindication_tags?: string[];
  exercise_role?: string;
  pairing_category?: string;
  fatigue_regions?: string[];
  mobility_targets?: string[];
  stretch_targets?: string[];
  unilateral?: boolean;
};

// --- Exercise (generator schema) ---
export type Exercise = {
  id: string;
  name: string;
  movement_pattern: MovementPattern;
  muscle_groups: string[];
  modality: Modality;
  equipment_required: string[];
  difficulty: number; // 1-5
  time_cost: TimeCost;
  estimated_minutes?: number;
  tags: ExerciseTags;
  progressions?: string[]; // exercise IDs
  regressions?: string[];
  /** Ontology fields (optional). When set, use for strict filtering; legacy tags still populated for compat. */
  primary_movement_family?: string;
  secondary_movement_families?: string[];
  movement_patterns?: string[];
  joint_stress_tags?: string[];
  contraindication_tags?: string[];
  exercise_role?: string;
  pairing_category?: string;
  fatigue_regions?: string[];
  mobility_targets?: string[];
  stretch_targets?: string[];
  unilateral?: boolean;
};

// --- Input contract ---
export type PrimaryGoal =
  | "strength"
  | "power"
  | "hypertrophy"
  | "body_recomp"
  | "endurance"
  | "conditioning"
  | "mobility"
  | "recovery"
  | "athletic_performance"
  | "calisthenics";

export type FocusBodyPart =
  | "upper_push"
  | "upper_pull"
  | "lower"
  | "core"
  | "full_body";

export type EnergyLevel = "low" | "medium" | "high";

export type UserLevel = "beginner" | "intermediate" | "advanced";

export type StylePrefs = {
  wants_supersets?: boolean;
  conditioning_minutes?: number;
  avoid_tags?: string[];
  user_level?: UserLevel;
};

export type RecentSessionSummary = {
  exercise_ids: string[];
  muscle_groups: string[];
  modality: string;
};

export type GenerateWorkoutInput = {
  duration_minutes: 20 | 30 | 45 | 60 | 75;
  primary_goal: PrimaryGoal;
  secondary_goals?: PrimaryGoal[];
  focus_body_parts?: FocusBodyPart[];
  energy_level: EnergyLevel;
  available_equipment: string[];
  injuries_or_constraints: string[];
  recent_history?: RecentSessionSummary[];
  style_prefs?: StylePrefs;
  seed?: number;
};

// --- Output contract (aligned with lib/types for GeneratedWorkout.blocks) ---
import type { WorkoutBlock as LibWorkoutBlock } from "../../lib/types";
export type { BlockType, BlockFormat, WorkoutItem, WorkoutBlock } from "../../lib/types";

export type ScoringDebug = {
  exercise_id: string;
  total: number;
  goal_alignment?: number;
  body_part?: number;
  energy_fit?: number;
  variety_penalty?: number;
  balance_bonus?: number;
  fatigue_penalty?: number;
  duration_practicality?: number;
};

export type WorkoutSession = {
  title: string;
  estimated_duration_minutes: number;
  blocks: LibWorkoutBlock[];
  debug?: {
    scoring_breakdown?: ScoringDebug[];
    seed_used?: number;
  };
};

// --- Regenerate ---
export type RegenerateMode = "keep_structure_swap_exercises" | "new_structure";
