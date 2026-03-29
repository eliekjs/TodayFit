/**
 * Trail-running bundle: selection slots, coverage rules, conditioning hints.
 * Generic gating/scoring math: `sportPattern/framework`. This file is trail-specific content only.
 */

import type { Exercise } from "../types";
import type { SportCoverageContext } from "./types";
import type { SportPatternSlotRule } from "../sportPattern/framework/types";
import {
  getTrailRunningPatternCategoriesForExercise,
  isTrailRunningConditioningExercise,
} from "./trailRunningExerciseCategories";
import type { TrailRunningPatternCategory } from "./trailRunningTypes";

const PRIMARY_TRAIL_MAIN: readonly TrailRunningPatternCategory[] = [
  "uphill_locomotion_support",
  "unilateral_running_stability",
  "downhill_eccentric_control",
  "elastic_reactive_lower",
];

const TRAIL_DEPRIORITIZED: readonly TrailRunningPatternCategory[] = [
  "pack_load_carry_primary",
  "heavy_carry_dominant",
  "hiking_step_stair_identity",
  "low_transfer_running_accessory",
  "unrelated_upper_body_dominant",
  "overly_complex_skill_lift",
];

function collectCategoriesForIds(ids: string[], exerciseById: Map<string, Exercise>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    const ex = exerciseById.get(id);
    if (!ex) continue;
    for (const c of getTrailRunningPatternCategoriesForExercise(ex)) out.add(c);
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

function conditioningExerciseTrailRelevant(ex: Exercise | undefined): boolean {
  if (!ex) return false;
  return isTrailRunningConditioningExercise(ex);
}

export const TRAIL_SUPPORT_COVERAGE_CATEGORIES: readonly TrailRunningPatternCategory[] = [
  "ankle_foot_stability",
  "calf_soleus_durability",
  "downhill_eccentric_control",
  "locomotion_core_stability",
  "running_conditioning",
  "elastic_reactive_lower",
];

export type TrailMinimumCoverageRule = {
  id: string;
  applies: (ctx: SportCoverageContext) => boolean;
  description: string;
  scanBlockTypes: readonly string[];
  mustSatisfy: (exerciseIds: string[], exerciseById: Map<string, Exercise>) => boolean;
};

export type TrailSportExerciseRequirements = {
  requiredPatternCategories: readonly TrailRunningPatternCategory[];
  preferredPatternCategories: readonly TrailRunningPatternCategory[];
  deprioritizedPatternCategories: readonly TrailRunningPatternCategory[];
};

export const trailSportExerciseRequirements: TrailSportExerciseRequirements = {
  requiredPatternCategories: [...PRIMARY_TRAIL_MAIN],
  preferredPatternCategories: [
    "ankle_foot_stability",
    "calf_soleus_durability",
    "locomotion_core_stability",
    "running_conditioning",
    "elastic_reactive_lower",
  ],
  deprioritizedPatternCategories: [...TRAIL_DEPRIORITIZED],
};

export const trailSportSelectionRules: {
  allowedConditioningEquipmentOrIdSubstrings: readonly string[];
  slots: readonly SportPatternSlotRule[];
} = {
  allowedConditioningEquipmentOrIdSubstrings: [
    "run",
    "sprint",
    "stride",
    "fartlek",
    "tempo",
    "treadmill",
    "interval",
    "row",
    "rower",
    "ski",
    "assault",
    "bike",
    "zone2_treadmill",
    "zone2",
    "conditioning",
  ],
  slots: [
    {
      slotRuleId: "trail_main_strength",
      blockTypes: ["main_strength", "main_hypertrophy"],
      gateMatchAnyOf: [...PRIMARY_TRAIL_MAIN],
      preferMatchAnyOf: [
        ...PRIMARY_TRAIL_MAIN,
        "ankle_foot_stability",
        "calf_soleus_durability",
        "downhill_eccentric_control",
      ],
      deprioritizeMatchAnyOf: [...TRAIL_DEPRIORITIZED],
    },
    {
      slotRuleId: "trail_accessory",
      blockTypes: ["accessory"],
      gateMatchAnyOf: [
        "downhill_eccentric_control",
        "ankle_foot_stability",
        "calf_soleus_durability",
        "locomotion_core_stability",
        "unilateral_running_stability",
        "uphill_locomotion_support",
        "elastic_reactive_lower",
      ],
      preferMatchAnyOf: [
        "ankle_foot_stability",
        "calf_soleus_durability",
        "downhill_eccentric_control",
        "elastic_reactive_lower",
        "locomotion_core_stability",
      ],
      deprioritizeMatchAnyOf: [...TRAIL_DEPRIORITIZED],
    },
    {
      slotRuleId: "trail_conditioning",
      blockTypes: ["conditioning"],
      gateMatchAnyOf: ["running_conditioning", "elastic_reactive_lower"],
      preferMatchAnyOf: ["running_conditioning"],
      deprioritizeMatchAnyOf: ["hiking_step_stair_identity"],
    },
  ],
};

const trailMinimumCoverage: readonly TrailMinimumCoverageRule[] = [
  {
    id: "trail_main_primary_locomotion",
    description:
      "With a main strength block, include at least one primary trail-running locomotion pattern (uphill support, unilateral running stability, downhill control, or elastic/reactive lower).",
    applies: (ctx) => ctx.hasMainStrengthBlock,
    scanBlockTypes: ["main_strength"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, PRIMARY_TRAIL_MAIN),
  },
  {
    id: "trail_support_second_pattern",
    description:
      "When the session has 2+ training blocks, include at least one supportive trail pattern (ankle/foot, calf/soleus, downhill control, core during locomotion, running conditioning, or elastic/reactive work).",
    applies: (ctx) => ctx.trainingBlockCount >= 2,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory", "power", "conditioning"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, TRAIL_SUPPORT_COVERAGE_CATEGORIES),
  },
  {
    id: "trail_conditioning_relevance",
    description: "When conditioning is present, it must be running-relevant (run/tempo/interval modalities or tagged running conditioning).",
    applies: (ctx) => ctx.hasConditioningBlock,
    scanBlockTypes: ["conditioning"],
    mustSatisfy: (ids, byId) => ids.some((id) => conditioningExerciseTrailRelevant(byId.get(id))),
  },
];

export const trailSportWorkoutConstraints = {
  minimumCoverage: trailMinimumCoverage,
};

export function evaluateTrailMinimumCoverage(
  ctx: SportCoverageContext,
  blocksExerciseIdsByType: Map<string, string[]>,
  exerciseById: Map<string, Exercise>
): { ok: boolean; violations: { ruleId: string; description: string }[] } {
  const violations: { ruleId: string; description: string }[] = [];
  for (const rule of trailMinimumCoverage) {
    if (!rule.applies(ctx)) continue;
    const ids = rule.scanBlockTypes.flatMap((t) => blocksExerciseIdsByType.get(t) ?? []);
    if (!rule.mustSatisfy(ids, exerciseById)) {
      violations.push({ ruleId: rule.id, description: rule.description });
    }
  }
  return { ok: violations.length === 0, violations };
}
