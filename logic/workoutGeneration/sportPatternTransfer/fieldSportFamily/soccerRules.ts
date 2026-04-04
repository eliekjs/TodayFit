/**
 * Soccer: RSA, COD, deceleration, unilateral + posterior durability; avoids Olympic/upper/generic leg day as session identity.
 */

import type { Exercise } from "../../types";
import type { SportCoverageContext } from "../types";
import {
  exerciseMatchesAnySoccerCategory,
  getSoccerPatternCategoriesForExercise,
  isSoccerConditioningExercise,
} from "./soccerExerciseCategories";
import type { SoccerPatternCategory } from "./soccerPatternTypes";
import type { SportPatternSlotRule } from "../../sportPattern/framework/types";

export const SOCCER_MAIN_GATE_CATEGORIES: readonly SoccerPatternCategory[] = [
  "soccer_unilateral_strength",
  "soccer_deceleration_eccentric",
  "soccer_cod_lateral",
  "soccer_posterior_durability",
  "soccer_trunk_locomotion_brace",
  "soccer_sprint_loc_support",
];

const SOCCER_DEPRIORITIZED: readonly SoccerPatternCategory[] = [
  "soccer_bilateral_lower_noise",
  "soccer_upper_irrelevant",
  "soccer_skill_olympic_noise",
  "soccer_steady_state_cardio_only",
  "soccer_crossfit_mixed_noise",
];

function collectCategoriesForIds(ids: string[], exerciseById: Map<string, Exercise>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    const ex = exerciseById.get(id);
    if (!ex) continue;
    for (const c of getSoccerPatternCategoriesForExercise(ex)) out.add(c);
  }
  return out;
}

function sessionHasAnyCategory(
  ids: string[],
  exerciseById: Map<string, Exercise>,
  cats: readonly string[]
): boolean {
  const set = collectCategoriesForIds(ids, exerciseById);
  return cats.some((c) => set.has(c));
}

export const SOCCER_SUPPORT_COVERAGE_CATEGORIES: readonly SoccerPatternCategory[] = [
  "soccer_unilateral_strength",
  "soccer_deceleration_eccentric",
  "soccer_cod_lateral",
  "soccer_posterior_durability",
  "soccer_trunk_locomotion_brace",
  "soccer_sprint_loc_support",
  "soccer_rsa_conditioning",
];

export type SoccerMinimumCoverageRule = {
  id: string;
  applies: (ctx: SportCoverageContext) => boolean;
  description: string;
  scanBlockTypes: readonly string[];
  mustSatisfy: (exerciseIds: string[], exerciseById: Map<string, Exercise>) => boolean;
};

const soccerMinimumCoverage: readonly SoccerMinimumCoverageRule[] = [
  {
    id: "soccer_main_transfer",
    description: "Main strength work should express soccer transfer (unilateral, COD/lateral, deceleration, posterior, trunk brace, or sprint-support pattern).",
    applies: (ctx) => ctx.hasMainStrengthBlock,
    scanBlockTypes: ["main_strength"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, SOCCER_MAIN_GATE_CATEGORIES),
  },
  {
    id: "soccer_support_second_pattern",
    description: "With 2+ training blocks, include at least one supportive soccer pattern in strength/accessory/conditioning.",
    applies: (ctx) => ctx.trainingBlockCount >= 2,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory", "power", "conditioning"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, SOCCER_SUPPORT_COVERAGE_CATEGORIES),
  },
  {
    id: "soccer_conditioning_rsa_relevant",
    description: "When conditioning is present, prefer interval / repeat-effort modalities over steady-state-only identity.",
    applies: (ctx) => ctx.hasConditioningBlock,
    scanBlockTypes: ["conditioning"],
    mustSatisfy: (ids, byId) => ids.some((id) => isSoccerConditioningExercise(byId.get(id)!)),
  },
];

export const soccerSportWorkoutConstraints = {
  minimumCoverage: soccerMinimumCoverage,
};

export function evaluateSoccerMinimumCoverage(
  ctx: SportCoverageContext,
  blocksExerciseIdsByType: Map<string, string[]>,
  exerciseById: Map<string, Exercise>
): { ok: boolean; violations: { ruleId: string; description: string }[] } {
  const violations: { ruleId: string; description: string }[] = [];
  for (const rule of soccerMinimumCoverage) {
    if (!rule.applies(ctx)) continue;
    const ids = rule.scanBlockTypes.flatMap((bt) => blocksExerciseIdsByType.get(bt) ?? []);
    if (!rule.mustSatisfy(ids, exerciseById)) {
      violations.push({ ruleId: rule.id, description: rule.description });
    }
  }
  return { ok: violations.length === 0, violations };
}

export const soccerSportSelectionRules: {
  allowedConditioningEquipmentOrIdSubstrings: readonly string[];
  slots: readonly SportPatternSlotRule[];
} = {
  allowedConditioningEquipmentOrIdSubstrings: [
    "run",
    "sprint",
    "shuttle",
    "interval",
    "hiit",
    "tabata",
    "fartlek",
    "bike",
    "row",
    "ski",
    "assault",
    "treadmill",
    "tempo",
    "stride",
  ],
  slots: [
    {
      slotRuleId: "soccer_main_strength",
      blockTypes: ["main_strength", "main_hypertrophy"],
      gateMatchAnyOf: [...SOCCER_MAIN_GATE_CATEGORIES],
      preferMatchAnyOf: [
        ...SOCCER_MAIN_GATE_CATEGORIES,
        "soccer_posterior_durability",
        "soccer_deceleration_eccentric",
      ],
      deprioritizeMatchAnyOf: [...SOCCER_DEPRIORITIZED],
    },
    {
      slotRuleId: "soccer_accessory",
      blockTypes: ["accessory"],
      gateMatchAnyOf: [
        "soccer_unilateral_strength",
        "soccer_cod_lateral",
        "soccer_posterior_durability",
        "soccer_trunk_locomotion_brace",
        "soccer_deceleration_eccentric",
        "soccer_sprint_loc_support",
      ],
      preferMatchAnyOf: [
        "soccer_posterior_durability",
        "soccer_cod_lateral",
        "soccer_unilateral_strength",
        "soccer_trunk_locomotion_brace",
      ],
      deprioritizeMatchAnyOf: [...SOCCER_DEPRIORITIZED],
    },
    {
      slotRuleId: "soccer_conditioning",
      blockTypes: ["conditioning"],
      gateMatchAnyOf: ["soccer_rsa_conditioning"],
      preferMatchAnyOf: ["soccer_rsa_conditioning"],
      deprioritizeMatchAnyOf: ["soccer_steady_state_cardio_only", "soccer_crossfit_mixed_noise"],
    },
  ],
};
