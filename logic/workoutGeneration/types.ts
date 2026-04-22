/**
 * Types for the session generation engine (shared by Build My Workout and Sports Prep).
 * Input is built from the active mode’s filters; same generator runs for one session or per day in a week.
 */

import type { TrainingQualitySlug } from "../workoutIntelligence/trainingQualities";
import type { SnowSportKind } from "./sportPatternTransfer/snowSportFamily/snowSportTypes";

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
  /**
   * When set, these tiers were read from DB `workout_levels` (or static def). Used for audit/score-debug
   * to distinguish explicit persistence from runtime inference.
   */
  workout_levels_from_db?: UserLevel[];
  /**
   * Dev / audit: explicit vs inferred trail when WORKOUT_LEVEL_DEBUG=1.
   * Not set in normal production builds unless env is enabled.
   */
  workout_levels_meta?: {
    origin: "explicit" | "inferred";
    reasons: string[];
    complexityScore?: number;
  };
  /** Complex / novelty variation — excluded unless user enables creative variations. */
  creative_variation?: boolean;
  /**
   * Durable curation pipeline (Supabase `public.exercises.curation_*`) when synced and overlay is enabled.
   * Used by pruning gate and audits; does not replace all ontology fields unless `applyCuratedExerciseColumnsFromDbRow` runs.
   */
  curation_generator_eligibility_state?: string | null;
  curation_pruning_recommendation?: string | null;
  curation_merge_target_exercise_id?: string | null;
  curation_cluster_id?: string | null;
  curation_canonical_exercise_id?: string | null;
  curation_is_canonical?: boolean | null;
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
  /**
   * Manual week: composite key `goalSlug:subSlug` → minimum exercises in this session that must match
   * that sub-focus (from `ManualPreferences.weeklySubFocusCoverage` + `weeklySubFocusCoveragePlan`).
   */
  weekly_sub_focus_session_minimums?: Record<string, number>;
  /**
   * When true, `WorkoutSession.debug.intent_survival_report` is populated (sport intent tracing).
   * No effect on exercise selection.
   */
  include_intent_survival_report?: boolean;
  /**
   * Optional upstream snapshot (e.g. planner session label / primitives) merged into intent survival report.
   */
  intent_survival_upstream?: {
    source?: string;
    session_intent_summary?: string;
    primitives?: Record<string, unknown>;
  };
  /**
   * Explicit sport-day intent from planner (categories, coverage, fallback policy).
   * When absent, generation uses legacy inferred path only. Selection enforcement will consume this in a later phase.
   */
  session_intent_contract?: import("./sessionIntentContract").SessionIntentContract;
  /**
   * When not `false`, alpine skiing main_strength / main_hypertrophy scoring shrinks generic additive terms
   * (goal/ontology/history/template-fit, etc.) so sport slot + within-pool quality dominate. Set `false` for legacy full scorer.
   */
  use_reduced_surface_for_alpine_main_scoring?: boolean;
  /**
   * Same demotion idea as alpine: shrink generic scorer surface for rock climbing main slots when not `false`.
   */
  use_reduced_surface_for_rock_climbing_main_scoring?: boolean;
  /**
   * Road-running main slots: shrink generic additive surface so running pattern gate + within-pool quality dominate.
   */
  use_reduced_surface_for_road_running_main_scoring?: boolean;
  /**
   * Soccer / field-sport main slots: shrink generic surface so COD/decel/unilateral transfer dominates.
   */
  use_reduced_surface_for_soccer_main_scoring?: boolean;

  /** When true, skip `sportProfileEngine` integration for this session. */
  sport_profile_engine_disabled?: boolean;
  /**
   * When true, session debug includes per-exercise sport profile score fields (post-hoc rescoring for visibility).
   */
  include_sport_profile_exercise_debug?: boolean;
  /**
   * Set only inside `generateWorkoutSession` while the sport profile engine is active; read by `scoreExercise`.
   * Cleared before the function returns.
   */
  sport_profile_for_scoring?: import("./sportProfileEngine").NormalizedSportProfile;
  /**
   * Set by `generateWorkoutSession` when sport profile engine runs; scales time-based cardio target minutes.
   */
  sport_profile_session_composition?: {
    conditioningPickerMinutesMultiplier?: number;
  };
  /**
   * Phase 6: pruning eligibility gate (library curation). Defaults in `generatorEligibilityTypes.DEFAULT_PRUNING_GATE_FLAGS`.
   */
  pruning_gate?: import("../exerciseLibraryCuration/generatorEligibilityTypes").PruningGateFeatureFlags;
  /** Override bundled map from `data/generator-eligibility-by-id.json` (tests / staging). */
  pruning_gate_eligibility_by_id?: Record<
    string,
    import("../exerciseLibraryCuration/generatorEligibilityTypes").ExerciseEligibilityEntry
  >;
  /** When true, `session.debug.pruning_gate` includes full id lists before/after gating (large). */
  include_pruning_gate_comparison?: boolean;
  /** When true, logs one `[pruning_gate]` line via `console.info`. */
  log_pruning_gate_to_console?: boolean;
  /** When true, skip attaching `pruning_gate` to `session.debug` (pool still respects flags). */
  omit_pruning_gate_session_debug?: boolean;
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
  /** Intent-survival trace: hiking/trail/alpine slot pattern score delta. */
  sport_pattern_slot_adjustment?: number;
  /** Intent-survival trace: within-pool quality total for active sport pattern. */
  sport_within_pool_quality?: number;
  /** When set, generic scorer terms were scaled for sport-main selection (see GenerateWorkoutInput.use_reduced_surface_for_alpine_main_scoring). */
  sport_main_scoring_mode?:
    | "alpine_reduced_surface"
    | "rock_reduced_surface"
    | "road_reduced_surface"
    | "soccer_reduced_surface";
  /** Multiplier applied to demoted (generic) terms; primary terms use 1. */
  sport_main_generic_term_scale?: number;
  /** User workout tier (beginner/intermediate/advanced): selection/ranking preference. */
  user_level_preference?: number;
  /** Creative variations ON: bonus for novelty / uncommon patterns. */
  creative_selection_bonus?: number;
  /** Components of `user_level_preference` when `include_scoring_breakdown` is true. */
  tier_preference_components?: Record<string, number>;
  /** Components of `creative_selection_bonus` when creative is on and breakdown requested. */
  creative_bonus_components?: Record<string, number>;
  /**
   * When `WORKOUT_LEVEL_SCORE_DEBUG=1` and `include_scoring_breakdown` is true: assignment trace
   * (explicit DB vs inferred) for this exercise.
   */
  workout_level_assignment_trace?: {
    origin: "explicit" | "inferred";
    reasons: string[];
    complexity_score?: number;
  };
  /**
   * When score-debug is on: first hard-constraint violation for this exercise (same order as filtering).
   * Omitted when the exercise would pass hard gates for the current input.
   */
  hard_constraint_reject_reason?: string;
  /** `sportProfileEngine` additive components (rock_climbing, alpine_skiing when enabled). */
  sport_profile_movement_match?: number;
  sport_profile_specificity?: number;
  sport_profile_energy_alignment?: number;
  sport_profile_penalty?: number;
  sport_profile_penalty_flags?: string[];
};

export type WorkoutSession = {
  title: string;
  estimated_duration_minutes: number;
  blocks: LibWorkoutBlock[];
  debug?: {
    scoring_breakdown?: ScoringDebug[];
    seed_used?: number;
    /** Sport pattern transfer (hiking_backpacking | trail_running | alpine_skiing): categories, slot rule, tier, coverage. */
    sport_pattern_transfer?: {
      sport_slug: "hiking_backpacking" | "trail_running" | "alpine_skiing" | string;
      coverage_ok: boolean;
      violations?: { ruleId: string; description: string }[];
      /** Slot gating outcomes (main, accessory, hypertrophy, secondary strength). */
      enforcement_snapshot?: HikingSessionEnforcementSnapshot;
      /** Aggregated category + overlap counts for tuning and cross-sport comparison (see sportPatternSessionAudit). */
      session_summary?: {
        sport_slug: "hiking_backpacking" | "road_running" | "trail_running" | "soccer" | SnowSportKind | "rock_climbing";
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
          main_work_pool_mode?: "gated" | "sport_preferred_pool" | "sport_quality_pool" | "full_pool_fallback";
          sport_pattern_selection_tier?: import("./sportPattern/framework/types").SportPatternSelectionTier;
          passed_hiking_gate_categories?: boolean;
          excluded_from_hiking_main_work?: boolean;
          passed_trail_gate_categories?: boolean;
          excluded_from_trail_main_work?: boolean;
          passed_alpine_gate_categories?: boolean;
          excluded_from_alpine_main_work?: boolean;
          item_used_full_pool_fallback_session: boolean;
        };
      }>;
    };
    /** Sport / session intent survival trace (when `include_intent_survival_report`). */
    intent_survival_report?: import("./intentSurvivalDebug").IntentSurvivalSessionSummary;
    /** Main / accessory / hypertrophy phase used generic vs sport-owned selector (e.g. alpine sport path). */
    main_selector?: import("./mainSelectors/types").MainSelectorSessionTrace;
    /** Sport definition profile applied to filtering + scoring (incremental engine). */
    sport_profile_applied?: {
      sport: string;
      top_patterns: string[];
      excluded_patterns: string[];
      enforced_bias: string;
      relax_level?: number;
      pool_before?: number;
      pool_after?: number;
      /** Canonical row slug in `sportDefinitions.ts` (mirrors `mapping.canonical_sport_definition_slug`). */
      canonical_sport_definition_slug?: string;
      /** True only when mapper succeeded; false means do not treat session as canonically driven. */
      canonical_profile_loaded?: boolean;
      canonical_fields_used?: string[];
      normalized_profile_summary?: import("./sportProfileTypes").NormalizedSportProfileSummary | null;
      /** True if mapping failed or mapper applied implicit defaults (see `mapper_defaults_applied`). */
      fallback_used?: boolean;
      fallback_reason?: string | null;
      mapper_defaults_applied?: string[];
      /** Canonical definition → normalized profile mapping audit */
      mapping?: import("./sportProfileTypes").SportProfileMappingDebug;
      /** Structure-bias hooks in dailyGenerator (conditioning inclusion / pool sort). */
      composition_hooks?: import("./sportProfileTypes").SportProfileAppliedSnapshot["compositionHooks"];
    };
    /** Engine block existed but `mapSportDefinitionToNormalizedProfile` failed — pool was not sport-filtered. */
    sport_profile_canonical_mapping_failed?: {
      canonical_sport_definition_slug: string;
      errors: string[];
    };
    /** exercise_id → sport profile score snapshot (when `include_sport_profile_exercise_debug`). */
    sport_profile_exercise_scores?: Record<
      string,
      {
        movement_pattern_match_score?: number;
        sport_alignment_score?: number;
        penalty_flags?: string[];
      }
    >;
    /** Phase 6: pruning gate pool sizes, exclusions, optional id lists (comparison mode). */
    pruning_gate?: import("./pruningGateDebugTypes").PruningGateSessionDebug;
    /** Session-level observability snapshot for resolved generation mode and pool transitions. */
    generation_mode_fingerprint?: {
      pruning_gate: {
        resolved_flags: import("../exerciseLibraryCuration/generatorEligibilityTypes").PruningGateFeatureFlags;
        enabled: boolean;
      };
      sport_profile_engine:
        | {
            status: "applied";
            canonical_sport_definition_slug: string;
          }
        | {
            status: "map_failed";
            canonical_sport_definition_slug: string;
          }
        | {
            status: "skipped";
            reason: string;
          };
      pool_sizes: {
        input_exercise_pool: number;
        after_pruning_gate: number;
        after_hard_constraints: number;
        after_constraint_gate: number;
        guarantee_pool_after_injury_gate: number;
        after_sport_profile?: number;
        guarantee_pool_after_sport_profile?: number;
        sport_profile_pool_before?: number;
        sport_profile_pool_after?: number;
      };
    };
    /** Post-validation fallback summary when unresolved violations remain. */
    validation_fallback?: {
      unresolved_violation_count: number;
      unresolved_violation_types: string[];
      unresolved_has_critical_types: boolean;
      unresolved_critical_types: string[];
    };
  };
};

// --- Regenerate ---
export type RegenerateMode = "keep_structure_swap_exercises" | "new_structure";
