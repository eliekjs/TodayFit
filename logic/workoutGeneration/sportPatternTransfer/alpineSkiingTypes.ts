/**
 * Alpine skiing (resort / downhill prep) — sport-pattern transfer types.
 * Not backcountry; not XC. Gate/enforcement shapes match shared hiking snapshot.
 */

import type { HikingGateResult, HikingSessionEnforcementSnapshot } from "./types";

export type AlpineSkiingPatternCategory =
  | "eccentric_braking_control"
  | "lateral_frontal_plane_stability"
  | "quad_dominant_endurance"
  | "sustained_tension_lower_body"
  | "hip_knee_control"
  | "trunk_bracing_dynamic"
  | "landing_deceleration_support"
  | "ski_conditioning"
  | "locomotion_hiking_trail_identity"
  | "running_gait_identity"
  | "low_transfer_sagittal_only"
  | "unrelated_upper_body_dominant"
  | "overly_complex_skill_lift";

export type AlpineSkiingSessionEnforcementSnapshot = HikingSessionEnforcementSnapshot;

export type AlpineSkiingTransferItemDebug = {
  exercise_id: string;
  block_type: string;
  categories_matched: AlpineSkiingPatternCategory[];
  slot_rule_id: string;
  tier: "required" | "preferred" | "fallback";
  note?: string;
  enforcement?: {
    main_work_pool_mode?: HikingGateResult["poolMode"];
    /** Progressive ladder tier used for this block’s pool (alpine). */
    sport_pattern_selection_tier?: HikingGateResult["selectionTier"];
    passed_alpine_gate_categories: boolean;
    excluded_from_alpine_main_work: boolean;
    /** True only when pool was generic full-pool degraded (tier 4). */
    item_used_full_pool_fallback_session: boolean;
  };
  within_pool_quality?: {
    signature_alpine_movement: boolean;
    signature_category_bonus: number;
    emphasis_rotation_bonus: number;
    simplicity_transfer_bonus: number;
    redundancy_penalty: number;
    near_duplicate_penalty: number;
    sagittal_only_penalty: number;
    locomotion_identity_penalty: number;
    within_pool_priority_total: number;
    emphasis_bucket: number;
  };
};
