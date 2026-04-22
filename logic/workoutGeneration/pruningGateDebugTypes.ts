import type { CountsByEligibilityState, PruningGateFeatureFlags } from "../exerciseLibraryCuration/generatorEligibilityTypes";

export type PruningGateMovementRoleBreakdown = {
  by_movement_pattern: { key: string; count: number }[];
  by_exercise_role: { key: string; count: number }[];
};

export type PruningGateSessionDebug = {
  resolved_flags: PruningGateFeatureFlags;
  eligibility_map_loaded: boolean;
  /** Rows in bundled map (0 if not loaded). */
  eligibility_row_count: number;
  pool_size_before_pruning_gate: number;
  pool_size_after_pruning_gate: number;
  excluded_by_eligibility_state: CountsByEligibilityState;
  /** Pool ids with no eligibility row while gating is on (excluded). */
  excluded_missing_eligibility_row: number;
  included_eligible_core: number;
  included_eligible_niche: number;
  gated_breakdown: PruningGateMovementRoleBreakdown;
  /** When comparison mode is on. */
  exercise_ids_before_pruning_gate?: string[];
  exercise_ids_after_pruning_gate?: string[];
};
