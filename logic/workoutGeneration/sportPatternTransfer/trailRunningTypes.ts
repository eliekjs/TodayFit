/**
 * Trail-running pattern transfer types (sport #2).
 * Gate/enforcement shapes match hiking via shared `SportPatternGateResult` / enforcement snapshot shape.
 */

import type { HikingGateResult, HikingSessionEnforcementSnapshot } from "./types";

export type TrailRunningPatternCategory =
  | "uphill_locomotion_support"
  | "downhill_eccentric_control"
  | "ankle_foot_stability"
  | "calf_soleus_durability"
  | "unilateral_running_stability"
  | "locomotion_core_stability"
  | "running_conditioning"
  | "elastic_reactive_lower"
  | "low_transfer_running_accessory"
  | "unrelated_upper_body_dominant"
  /** Deprioritize as primary main identity for trail (hiking-leaning transfer). */
  | "hiking_step_stair_identity"
  | "pack_load_carry_primary"
  | "heavy_carry_dominant"
  | "overly_complex_skill_lift";

/** Same slot keys as hiking enforcement snapshot. */
export type TrailRunningSessionEnforcementSnapshot = HikingSessionEnforcementSnapshot;

export type TrailRunningTransferItemDebug = {
  exercise_id: string;
  block_type: string;
  categories_matched: TrailRunningPatternCategory[];
  slot_rule_id: string;
  tier: "required" | "preferred" | "fallback";
  note?: string;
  enforcement?: {
    main_work_pool_mode?: HikingGateResult["poolMode"];
    passed_trail_gate_categories: boolean;
    excluded_from_trail_main_work: boolean;
    item_used_full_pool_fallback_session: boolean;
  };
  within_pool_quality?: {
    signature_trail_movement: boolean;
    signature_category_bonus: number;
    emphasis_rotation_bonus: number;
    simplicity_transfer_bonus: number;
    redundancy_penalty: number;
    near_duplicate_penalty: number;
    carry_step_penalty: number;
    bilateral_squat_only_penalty: number;
    within_pool_priority_total: number;
    emphasis_bucket: number;
  };
};
