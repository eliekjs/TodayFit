/**
 * Hiking/backpacking pattern categories and session debug shapes.
 *
 * **Framework:** generic slot gating, scoring hooks, and gate results live in `sportPattern/framework/`.
 * See `sportPattern/framework/README.md` for adding a new sport.
 */

import type { Exercise, GenerateWorkoutInput } from "../types";
import type {
  SportPatternGateResult,
  SportPatternPoolMode,
  SportPatternSelectionTier,
  SportPatternSlotRule,
} from "../sportPattern/framework/types";

export type {
  SportPatternSlotRule,
  SportPatternGateResult,
  SportPatternPoolMode,
  SportPatternSelectionTier,
};

/** Slugs are stable API; hiking is the first consumer. */
export type HikingPatternCategory =
  | "locomotion_step_up"
  | "unilateral_knee_dominant"
  | "descent_eccentric_control"
  | "calf_ankle_durability"
  | "tibialis_shin_strength"
  | "hip_stability_gait"
  | "trunk_bracing_under_load"
  | "loaded_carry_pack_tolerance"
  | "incline_stair_conditioning"
  | "generic_heavy_pull_as_primary"
  | "low_transfer_novelty_accessory"
  | "unrelated_upper_body_dominant"
  | "overly_complex_skill_lift";

export type SportCoverageContext = {
  input: GenerateWorkoutInput;
  trainingBlockCount: number;
  hasMainStrengthBlock: boolean;
  hasConditioningBlock: boolean;
};

export type HikingMinimumCoverageRule = {
  id: string;
  applies: (ctx: SportCoverageContext) => boolean;
  description: string;
  /** Blocks to scan (items aggregated). */
  scanBlockTypes: readonly string[];
  mustSatisfy: (exerciseIds: string[], exerciseById: Map<string, Exercise>) => boolean;
};

export type HikingSportExerciseRequirements = {
  /** Session-level “must show up somewhere” patterns (inform docs / overlap with slots). */
  requiredPatternCategories: readonly HikingPatternCategory[];
  preferredPatternCategories: readonly HikingPatternCategory[];
  deprioritizedPatternCategories: readonly HikingPatternCategory[];
  optionalSupportPatternCategories: readonly HikingPatternCategory[];
};

export type HikingSportSelectionRules = {
  /** Substrings for equipment or exercise id (conditioning pick). */
  allowedConditioningEquipmentOrIdSubstrings: readonly string[];
  slots: readonly SportPatternSlotRule[];
};

export type HikingSportWorkoutConstraints = {
  minimumCoverage: readonly HikingMinimumCoverageRule[];
};

export type HikingSportPatternBundle = {
  sportSlug: "hiking_backpacking";
  sportExerciseRequirements: HikingSportExerciseRequirements;
  sportSelectionRules: HikingSportSelectionRules;
  sportWorkoutConstraints: HikingSportWorkoutConstraints;
};

export type HikingViolation = {
  ruleId: string;
  description: string;
};

/** @deprecated Use `SportPatternPoolMode` from `sportPattern/framework` */
export type HikingPoolMode = SportPatternPoolMode;

/** Gate result shape is framework-generic; hiking uses the same contract. */
export type HikingGateResult = SportPatternGateResult;

export type HikingSessionEnforcementSnapshot = {
  main_strength?: HikingGateResult & { planned_main_lift_count: number };
  accessory?: HikingGateResult;
  main_hypertrophy?: HikingGateResult;
  secondary_main_strength?: HikingGateResult;
};

export type HikingTransferItemDebug = {
  exercise_id: string;
  block_type: string;
  categories_matched: HikingPatternCategory[];
  slot_rule_id: string;
  tier: "required" | "preferred" | "fallback";
  note?: string;
  enforcement?: {
    main_work_pool_mode?: HikingPoolMode;
    passed_hiking_gate_categories: boolean;
    excluded_from_hiking_main_work: boolean;
    item_used_full_pool_fallback_session: boolean;
  };
  /** Within gated pool: why this exercise ranked vs alternatives (tuning aid). */
  within_pool_quality?: {
    signature_hiking_movement: boolean;
    signature_category_bonus: number;
    emphasis_rotation_bonus: number;
    simplicity_transfer_bonus: number;
    redundancy_penalty: number;
    near_duplicate_penalty: number;
    within_pool_priority_total: number;
    emphasis_bucket: number;
  };
};
