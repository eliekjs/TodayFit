/**
 * Rock climbing slot rules, main gate, prefer/avoid sets, minimum coverage ids.
 */

import type { SportPatternSlotRule } from "../sportPattern/framework/types";
import type { RockClimbingPatternCategory } from "./rockClimbingTypes";

/** Main slot: must express climbing-relevant primary work (pull / brace / hinge-for-climbing). */
export const ROCK_CLIMBING_MAIN_GATE: readonly RockClimbingPatternCategory[] = [
  "vertical_pull_transfer",
  "horizontal_pull_transfer",
  "unilateral_pull_brace",
  "posterior_chain_climbing_support",
];

export const ROCK_CLIMBING_MAIN_PREFER: readonly RockClimbingPatternCategory[] = [
  "vertical_pull_transfer",
  "horizontal_pull_transfer",
  "unilateral_pull_brace",
  "scapular_stability_pull",
  "posterior_chain_climbing_support",
  "grip_hang_support",
];

export const ROCK_CLIMBING_DEPRIORITIZED: readonly RockClimbingPatternCategory[] = [
  "olympic_skill_lift",
  "overhead_press_strength_identity",
  "bench_horizontal_push_identity",
  "squat_dominant_sagittal_lower",
  "running_conditioning_identity",
  "metcon_flash_athletic",
  "leg_press_machine_identity",
];

export const ROCK_QUALITY_LADDER_ANCHORS: readonly RockClimbingPatternCategory[] = [
  ...ROCK_CLIMBING_MAIN_GATE,
  "scapular_stability_pull",
  "trunk_bracing_climbing",
  "grip_hang_support",
];

export const ROCK_QUALITY_LADDER_MIN_SCORE = 0.32;

export const ROCK_COVERAGE_PULL_FAMILY: readonly RockClimbingPatternCategory[] = [
  "vertical_pull_transfer",
  "horizontal_pull_transfer",
  "unilateral_pull_brace",
];

export const ROCK_COVERAGE_POSTAL_SUPPORT: readonly RockClimbingPatternCategory[] = ["posterior_chain_climbing_support"];

export function getRockClimbingSelectionRules(): {
  slots: readonly SportPatternSlotRule[];
} {
  const dep = ROCK_CLIMBING_DEPRIORITIZED;
  return {
    slots: [
      {
        slotRuleId: "rock_climbing_main_strength",
        blockTypes: ["main_strength", "main_hypertrophy"],
        gateMatchAnyOf: [...ROCK_CLIMBING_MAIN_GATE],
        preferMatchAnyOf: [...ROCK_CLIMBING_MAIN_PREFER],
        deprioritizeMatchAnyOf: [...dep],
      },
      {
        slotRuleId: "rock_climbing_accessory",
        blockTypes: ["accessory"],
        gateMatchAnyOf: [
          "vertical_pull_transfer",
          "horizontal_pull_transfer",
          "scapular_stability_pull",
          "trunk_bracing_climbing",
          "grip_hang_support",
          "unilateral_pull_brace",
          "posterior_chain_climbing_support",
        ],
        preferMatchAnyOf: [
          "scapular_stability_pull",
          "trunk_bracing_climbing",
          "horizontal_pull_transfer",
          "vertical_pull_transfer",
          "grip_hang_support",
        ],
        deprioritizeMatchAnyOf: [...dep],
      },
    ],
  };
}

export function getRockClimbingSlotRuleForBlockType(blockType: string): SportPatternSlotRule | undefined {
  const b = blockType.toLowerCase().replace(/\s/g, "_");
  return getRockClimbingSelectionRules().slots.find((s) => s.blockTypes.includes(b));
}
