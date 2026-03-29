/**
 * Types for the session generation engine (shared by Build My Workout and Sports Prep).
 * Input is built from the active mode’s filters; same generator runs for one session or per day in a week.
 */

import type { TrainingQualitySlug } from "../workoutIntelligence/trainingQualities";

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
    | "conditioning"
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
    | "single_leg"
    | "grip"
    | "scapular_control"
    | "trunk_anti_rotation"
    | "anti_flexion"
  )[];
  /** Other tag slugs (e.g. sub-focus / quality tags: single_leg_strength, core_stability). Used for sport/goal sub-focus matching. */
  attribute_tags?: string[];
};

/** Canonical relevance/demand levels (warmup, cooldown, stability, grip, impact). */
export type DemandLevelSlug = "none" | "low" | "medium" | "high";

/** Experience tier for exercise appropriateness and user workout-level preference. */
export type UserLevel = "beginner" | "intermediate" | "advanced";

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
  rep_range_min?: number;
  rep_range_max?: number;
  /** Alternate names / search aliases (e.g. "OHP", "overhead press"). */
  aliases?: string[];
  /** Exercise ids (slugs) that are good substitutes in the same slot. */
  swap_candidates?: string[];
  /** How suitable as a warm-up exercise (none | low | medium | high). */
  warmup_relevance?: DemandLevelSlug;
  /** How suitable as a cooldown/stretch exercise. */
  cooldown_relevance?: DemandLevelSlug;
  /** Balance / stability demand. */
  stability_demand?: DemandLevelSlug;
  /** Grip / forearm demand. */
  grip_demand?: DemandLevelSlug;
  /** Joint impact level (e.g. plyometric, running). */
  impact_level?: DemandLevelSlug;
  /** Primary muscles (ExRx-style; ordered most→least contribution). */
  primary_muscle_groups?: string[];
  /** Secondary muscles trained (canonical slugs). */
  secondary_muscle_groups?: string[];
};

// --- Exercise (generator schema) ---
export type Exercise = {
  id: string;
  name: string;
  /** User-facing description (optional). From DB or derived stub. */
  description?: string;
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
  rep_range_min?: number;
  rep_range_max?: number;
  aliases?: string[];
  swap_candidates?: string[];
  warmup_relevance?: "none" | "low" | "medium" | "high";
  cooldown_relevance?: "none" | "low" | "medium" | "high";
  stability_demand?: "none" | "low" | "medium" | "high";
  grip_demand?: "none" | "low" | "medium" | "high";
  impact_level?: "none" | "low" | "medium" | "high";
  /** Primary muscles (ExRx-style; ordered most→least contribution). When set, used for body-part focus priority scoring. */
  primary_muscle_groups?: string[];
  secondary_muscle_groups?: string[];
  /** Non-empty when set: which experience tiers this movement is appropriate for. */
  workout_level_tags?: UserLevel[];
  /** Complex / novelty variation — excluded unless user enables creative variations. */
  creative_variation?: boolean;
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

export type StylePrefs = {
  wants_supersets?: boolean;
  conditioning_minutes?: number;
  avoid_tags?: string[];
  user_level?: UserLevel;
  /** When false (default), exercises marked creative_variation are excluded from the pool. */
  include_creative_variations?: boolean;
  /** Preferred Zone 2 / cardio modalities (e.g. "bike", "treadmill", "rower"); generator prefers these when picking conditioning. */
  preferred_zone2_cardio?: string[];
  /** Exercise ids/slugs to prefer when scoring (e.g. from sport or goal ranking); app passes from getPreferredExerciseNamesForSportAndGoals. */
  preferred_exercise_ids?: string[];
};

export type RecentSessionSummary = {
  exercise_ids: string[];
  muscle_groups: string[];
  modality: string;
};

/** Goal slug → sub-focus slugs for tag-based scoring (Option A: sub-focus in algorithm). */
export type GoalSubFocusInput = Record<string, string[]>;
/** Goal slug → weights for each sub-focus (same order as goal_sub_focus[goalSlug]). When set, rank-based scoring is used. */
export type GoalSubFocusWeightsInput = Record<string, number[]>;
/** Sport slug → sub-focus slugs for tag-based scoring. */
export type SportSubFocusInput = Record<string, string[]>;

export type GenerateWorkoutInput = {
  duration_minutes: 20 | 30 | 45 | 60 | 75;
  primary_goal: PrimaryGoal;
  secondary_goals?: PrimaryGoal[];
  focus_body_parts?: FocusBodyPart[];
  energy_level: EnergyLevel;
  available_equipment: string[];
  injuries_or_constraints: string[];
  recent_history?: RecentSessionSummary[];
  /** Phase 11: Rich history (exposure, last performed, completion, readiness). Supplements recent_history. */
  training_history?: import("./historyTypes").TrainingHistoryContext;
  style_prefs?: StylePrefs;
  seed?: number;
  /** Goal sub-focus: goal slug → sub-focus slugs. Boosts exercises whose tags match sub-focus tag map. */
  goal_sub_focus?: GoalSubFocusInput;
  /** Optional rank-based weights per goal (same order as goal_sub_focus[goalSlug]). From sub-focus resolver. */
  goal_sub_focus_weights?: GoalSubFocusWeightsInput;
  /** Sport sub-focus: sport slug → sub-focus slugs. Boosts exercises whose tags match sub-focus tag map. */
  sport_sub_focus?: SportSubFocusInput;
  /** Sport slugs (ordered; first = primary). Used for sport-tag scoring and quality blending. */
  sport_slugs?: string[];
  /** Weights for [primary, secondary, tertiary] goal (e.g. [0.5, 0.3, 0.2]). When set, scales goal alignment in scoring. */
  goal_weights?: number[];
  /** When sports and goals both present: 0 = goals only, 1 = sport only. Default 0.5. */
  sport_weight?: number;
  /** Per-day training qualities from weekly planner; merged into session target vector for scoring. */
  session_target_qualities?: Partial<Record<TrainingQualitySlug, number>>;
  /** Weight for blending `session_target_qualities` in `mergeTargetVector`. Default 0.35. */
  session_target_qualities_weight?: number;
  /**
   * Exercise IDs already used as main work (main_strength / main_hypertrophy blocks) earlier in the same
   * programmed week. Selection excludes them when possible (pool fallback if no alternatives).
   */
  week_main_strength_lift_ids_used?: string[];
};

// --- Output contract (aligned with lib/types for GeneratedWorkout.blocks) ---
import type { WorkoutBlock as LibWorkoutBlock } from "../../lib/types";
import type { HikingSessionEnforcementSnapshot } from "./sportPatternTransfer/types";
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
  /** Phase 9: ontology scoring components (when present). */
  ontology_role_fit?: number;
  ontology_movement_family_fit?: number;
  ontology_main_lift_anchor?: number;
  ontology_fatigue_balance?: number;
  ontology_joint_stress_soft?: number;
  ontology_warmup_cooldown_relevance?: number;
  /** Phase 10: unilateral variety bonus, movement pattern redundancy penalty. */
  ontology_unilateral_variety_bonus?: number;
  ontology_movement_pattern_redundancy_penalty?: number;
  /** Phase 11: history-aware scoring. */
  history_recent_exposure_penalty?: number;
  history_anchor_repeat_bonus?: number;
  history_accessory_rotation_penalty?: number;
  history_movement_family_rotation_bonus?: number;
  history_joint_stress_sensitivity_penalty?: number;
  /** Quad/Posterior emphasis bonus when focus matches pattern or pairing_category. */
  body_part_emphasis_bonus?: number;
  /** Bonus when body-part focus matches exercise's primary muscles (ExRx primary movers). */
  primary_muscle_match_bonus?: number;
  /** Penalty when user has impact-sensitive injury and exercise has high impact_level. */
  impact_penalty?: number;
  /** Sub-focus tag match: weighted sum when goal/sport sub-focus tags match exercise tags. */
  sub_focus_tag_match?: number;
  /** Sport tag match: bonus when exercise sport_tags match user's sport_slugs. */
  sport_tag_match?: number;
  /** Alignment of exercise training qualities to merged session target vector (sports / weekly session). */
  sport_quality_alignment?: number;
  /** Multiplier applied to goal tag score when sports are present (sport vs goal emphasis). */
  goal_score_sport_dampening?: number;
  /** Bonus when exercise is in style_prefs.preferred_exercise_ids (sport/goal ranking). */
  preferred_exercise_bonus?: number;
  /** Bonus when exercise has fewer contraindications (tag priority: prefer broader applicability). */
  contraindication_priority_bonus?: number;
  /** Calisthenics: bonus for bodyweight / penalty for non-bodyweight (~90% bodyweight focus). */
  calisthenics_bodyweight_bonus?: number;
  calisthenics_non_bodyweight_penalty?: number;
  /** Calisthenics: bonus for advanced progressions (has regressions = not the easiest). */
  calisthenics_advanced_bonus?: number;
  /** Calisthenics + upper focus: bonus for push-up/handstand/pull-up pattern. */
  calisthenics_upper_preferred_pattern_bonus?: number;
};

export type WorkoutSession = {
  title: string;
  estimated_duration_minutes: number;
  blocks: LibWorkoutBlock[];
  debug?: {
    scoring_breakdown?: ScoringDebug[];
    seed_used?: number;
    /** Sport pattern transfer (hiking_backpacking | trail_running): categories, slot rule, tier, coverage. */
    sport_pattern_transfer?: {
      sport_slug: "hiking_backpacking" | "trail_running" | string;
      coverage_ok: boolean;
      violations?: { ruleId: string; description: string }[];
      /** Slot gating outcomes (main, accessory, hypertrophy, secondary strength). */
      enforcement_snapshot?: HikingSessionEnforcementSnapshot;
      /** Aggregated category + overlap counts for tuning and cross-sport comparison (see sportPatternSessionAudit). */
      session_summary?: {
        sport_slug: "hiking_backpacking" | "trail_running";
        main_category_hits: Record<string, number>;
        accessory_category_hits: Record<string, number>;
        conditioning_exercise_ids: string[];
        signature_pattern_selections: number;
        non_signature_selections: number;
        overlap_families: {
          lunge_split_family: number;
          step_stair_family: number;
          carry_family: number;
          calf_ankle_family: number;
          conditioning_treadmill_run: number;
          conditioning_stair_incline: number;
          conditioning_bike_row_ski: number;
        };
      };
      items: Array<{
        exercise_id: string;
        block_type: string;
        categories_matched: string[];
        slot_rule_id: string;
        tier: "required" | "preferred" | "fallback";
        note?: string;
        enforcement?: {
          main_work_pool_mode?: "gated" | "full_pool_fallback";
          passed_hiking_gate_categories?: boolean;
          excluded_from_hiking_main_work?: boolean;
          passed_trail_gate_categories?: boolean;
          excluded_from_trail_main_work?: boolean;
          item_used_full_pool_fallback_session: boolean;
        };
      }>;
    };
  };
};

// --- Regenerate ---
export type RegenerateMode = "keep_structure_swap_exercises" | "new_structure";
