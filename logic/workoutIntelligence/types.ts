/**
 * Types for the workout intelligence layer.
 * Compatible with logic/workoutGeneration/types and lib/types where relevant.
 */

import type { TrainingQualitySlug } from "./trainingQualities";

/** Weight map for training qualities (0–1). */
export type QualityWeightMap = Partial<Record<TrainingQualitySlug, number>>;

/** Normalized target vector for a session: which qualities to emphasize. */
export type SessionTargetVector = Map<TrainingQualitySlug, number>;

/** Exercise with capability vector (training qualities it supports). */
export interface ExerciseWithQualities {
  id: string;
  name: string;
  movement_pattern: string;
  muscle_groups: string[];
  equipment_required: string[];
  /** Training qualities this exercise supports; 0–1 weight per quality. */
  training_quality_weights: QualityWeightMap;
  /** Fatigue cost: low = quick to recover, high = compounds / heavy. */
  fatigue_cost?: "low" | "medium" | "high";
  /** Skill / technique demand (1–5). */
  skill_level?: number;
  /** Joint stress tags for fatigue and injury avoidance. */
  joint_stress?: string[];
  contraindications?: string[];
  /** Energy suitability. */
  energy_fit?: ("low" | "medium" | "high")[];
  time_cost?: "low" | "medium" | "high";
  modality?: string;
  /** When set (e.g. from DB primary_movement_family), used by constraints/eligibility for strict body-part filtering. */
  primary_movement_family?: string;
}

/** Input for merging goal + sport into a session target. */
export type TargetVectorInput = {
  /** Primary goal slug (e.g. hypertrophy, strength). */
  primary_goal: string;
  /** Optional secondary/tertiary goals; order = priority. */
  secondary_goals?: string[];
  /** Sport slugs (e.g. rock_bouldering); blended with goals. */
  sport_slugs?: string[];
  /** Goal blend: [primary%, secondary%, tertiary%] or default. */
  goal_weights?: number[];
  /** Sport vs goal: 0 = goal only, 1 = sport only. Default 0.5 when sports present. */
  sport_weight?: number;
};

// ---------------------------------------------------------------------------
// Phase 3: Session architecture — block & format enums
// ---------------------------------------------------------------------------

/** Canonical block types for session structure. */
export type BlockType =
  | "warmup"
  | "prep"
  | "skill"
  | "power"
  | "main_strength"
  | "main_hypertrophy"
  | "accessory"
  | "conditioning"
  | "core"
  | "carry"
  | "cooldown"
  | "mobility"
  | "recovery";

/** Block format: how exercises are arranged within the block. */
export type BlockFormat =
  | "straight_sets"
  | "superset"
  | "alternating_sets"
  | "circuit"
  | "emom"
  | "amrap"
  | "interval"
  | "flow";

/** Block spec inside a session template (legacy + Phase 3 compatible). */
export type BlockSpec = {
  block_type: BlockType;
  format: BlockFormat;
  min_items: number;
  max_items: number;
  /** Optional: emphasize these qualities in this block. */
  quality_focus?: TrainingQualitySlug[];
};

// ---------------------------------------------------------------------------
// Phase 3: Stimulus profile
// ---------------------------------------------------------------------------

/** Intended adaptation target of the session. */
export type StimulusProfileSlug =
  | "max_strength"
  | "hypertrophy_accumulation"
  | "power_speed"
  | "muscular_endurance"
  | "aerobic_base"
  | "anaerobic_conditioning"
  | "sport_support_strength"
  | "resilience_stability"
  | "mobility_recovery"
  | "mixed_performance";

/** Describes the intended training effect and style of a session. */
export interface StimulusProfile {
  slug: StimulusProfileSlug;
  name: string;
  /** Primary adaptation target. */
  adaptation_target: string;
  /** Expected fatigue level for the session. */
  expected_fatigue: "low" | "moderate" | "high";
  /** Expected exercise style (compound priority, accessory density, etc.). */
  exercise_style: string;
  /** Expected prescription style (heavy, moderate, density, etc.). */
  prescription_style_primary: string;
  /** Block types that are appropriate for this stimulus (ordered). */
  appropriate_block_sequence: BlockType[];
  /** Optional: preferred block formats per block type. */
  format_hints?: Partial<Record<BlockType, BlockFormat>>;
}

// ---------------------------------------------------------------------------
// Phase 3: Session type
// ---------------------------------------------------------------------------

/** General identity of the session (what is being trained). */
export type SessionTypeSlug =
  | "full_body_strength"
  | "upper_hypertrophy"
  | "lower_hypertrophy"
  | "pull_strength"
  | "push_strength"
  | "lower_power"
  | "mixed_sport_support"
  | "conditioning_only"
  | "resilience_recovery"
  | "core_and_mobility"
  | "aerobic_builder";

/** Session type: identity of the session; stimulus profile defines the training effect. */
export interface SessionType {
  slug: SessionTypeSlug;
  name: string;
  /** Default stimulus profile when not overridden. */
  default_stimulus_profile: StimulusProfileSlug;
  /** Other stimulus profiles that are valid for this session type. */
  valid_stimulus_profiles?: StimulusProfileSlug[];
}

// ---------------------------------------------------------------------------
// Phase 3: Workout block template
// ---------------------------------------------------------------------------

/** Full block template with purpose, targets, and prescription guidance. */
export interface WorkoutBlockTemplate {
  block_type: BlockType;
  format: BlockFormat;
  title: string;
  /** Human-readable purpose / reasoning. */
  purpose?: string;
  /** Training qualities this block should target. */
  target_qualities?: TrainingQualitySlug[];
  /** Movement patterns to emphasize (e.g. hinge, push, pull). */
  target_movement_patterns?: string[];
  /** Expected number of exercises in this block. */
  exercise_count_min: number;
  exercise_count_max: number;
  /** Fatigue budget consumed by this block (contributes to session total). */
  fatigue_budget_share?: number;
  /** Recommended prescription style slug for this block. */
  prescription_style?: string;
}

// ---------------------------------------------------------------------------
// Phase 3: Prescription style
// ---------------------------------------------------------------------------

/** Prescription style slug (templates for reps/sets/rest/tempo). */
export type PrescriptionStyleSlug =
  | "heavy_strength"
  | "moderate_hypertrophy"
  | "explosive_power"
  | "density_accessory"
  | "aerobic_steady"
  | "anaerobic_intervals"
  | "controlled_resilience"
  | "mobility_flow";

/** Default prescription parameters for a style (no exercise-level logic here). */
export interface PrescriptionStyle {
  slug: PrescriptionStyleSlug;
  name: string;
  rep_range_min: number;
  rep_range_max: number;
  set_range_min: number;
  set_range_max: number;
  rest_seconds_min?: number;
  rest_seconds_max?: number;
  /** Tempo / intent guidance (e.g. "high force intent", "controlled eccentric"). */
  intent_guidance?: string;
  /** RPE target if applicable (e.g. 8, 9). */
  rpe_target?: number;
}

// ---------------------------------------------------------------------------
// Phase 3: Session template (extended)
// ---------------------------------------------------------------------------

/** Session-level fatigue budget: low / moderate / high or numeric. */
export type FatigueBudgetLevel = "low" | "moderate" | "high";

/** Numeric fatigue budget for session (e.g. 8, 12, 16). */
export type SessionFatigueBudget =
  | { kind: "level"; level: FatigueBudgetLevel }
  | { kind: "numeric"; value: number };

/** Duration tier for session shaping (minutes). */
export type DurationTier = 20 | 30 | 45 | 60 | 75;

/** User-selected energy level (matches workoutGeneration). */
export type EnergyLevel = "low" | "medium" | "high";

/** Session template with stimulus, type, blocks, and fatigue budget. */
export interface SessionTemplateV2 {
  id: string;
  name?: string;
  /** Session type identity. */
  session_type: SessionTypeSlug;
  /** Intended stimulus profile. */
  stimulus_profile: StimulusProfileSlug;
  /** Ordered block templates (or block spec refs). */
  block_specs: BlockSpec[];
  /** Target duration range [min, max] in minutes. */
  duration_minutes_min: number;
  duration_minutes_max: number;
  /** Session-level fatigue budget. */
  fatigue_budget: SessionFatigueBudget;
  /** Recommended prescription styles by block position (index = block index). */
  prescription_styles_by_block?: string[];
  /** Goal slugs this template is suitable for (optional). */
  suitable_goals?: string[];
}

/** Legacy session template: ordered list of blocks + metadata. */
export type SessionTemplate = {
  id: string;
  name?: string;
  block_specs: BlockSpec[];
  estimated_minutes: number;
  /** Goal slugs this template is suitable for. */
  suitable_goals?: string[];
};

/** Result of scoring a single exercise. */
export type ExerciseScoreBreakdown = {
  exercise_id: string;
  total: number;
  goal_alignment: number;
  balance_bonus?: number;
  fatigue_penalty?: number;
  variety_penalty?: number;
  session_fit?: number;
  energy_fit?: number;
  duration_fit?: number;
};

/** Pairing compatibility for supersets. */
export type SupersetCompatibility = "good" | "neutral" | "bad";
