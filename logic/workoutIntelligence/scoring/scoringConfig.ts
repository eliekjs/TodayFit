/**
 * Phase 4: Central config for selection and scoring.
 * Tune weights and thresholds here; keep logic in other modules.
 */

import type { SelectionConfig } from "./scoreTypes";

export const DEFAULT_SELECTION_CONFIG: SelectionConfig = {
  weights: {
    target_quality_alignment: 3.0,
    stimulus_fit: 1.0,
    movement_pattern_fit: 0.8,
    fatigue_fit: 1.0,
    energy_fit: 1.0,
    injury_fit: -5.0, // strong penalty when conflicting
    novelty_penalty: -1.5,
    equipment_fit: 0.5,
    balance_bonus: 1.0,
  },
  max_same_pattern_per_session: 2,
  redundancy_penalty: -2.0,
  low_energy_high_skill_penalty: -1.5,
  max_grip_exercises_per_session: 4,
  max_shoulder_exercises_per_session: 5,
  max_heavy_compounds_per_session: 4,
  pairing_good_bonus: 1.0,
  pairing_bad_penalty: -3.0,
};

/** Fatigue cost to numeric (for accumulation). */
export const FATIGUE_COST_TO_NUMBER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 4,
};

export function getFatigueCostNumber(cost: "low" | "medium" | "high" | undefined): number {
  return cost ? FATIGUE_COST_TO_NUMBER[cost] ?? 2 : 2;
}
