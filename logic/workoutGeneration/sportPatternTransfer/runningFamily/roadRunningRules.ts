/**
 * Road-running: linear economy, calf/ankle/tendon, single-leg, trunk stiffness; avoids lateral/novelty as session-defining work.
 */

import type { Exercise } from "../../types";
import type { SportCoverageContext } from "../types";
import type { SportPatternSlotRule } from "../../sportPattern/framework/types";
import {
  getRunningPatternCategoriesForExercise,
  isRoadRunningConditioningExercise,
} from "./exerciseRunningCategories";
import type { RunningPatternCategory } from "./runningPatternTypes";

/** Exported for SessionIntentContract + tooling. */
export const ROAD_RUNNING_MAIN_GATE_CATEGORIES: readonly RunningPatternCategory[] = [
  "unilateral_running_stability",
  "uphill_locomotion_support",
  "ankle_foot_stability",
  "locomotion_core_stability",
  "downhill_eccentric_control",
];

const PRIMARY_ROAD_MAIN = ROAD_RUNNING_MAIN_GATE_CATEGORIES;

const ROAD_DEPRIORITIZED: readonly RunningPatternCategory[] = [
  "lateral_agility_flashy",
  "elastic_reactive_lower",
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
    for (const c of getRunningPatternCategoriesForExercise(ex)) out.add(c);
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

export const ROAD_SUPPORT_COVERAGE_CATEGORIES: readonly RunningPatternCategory[] = [
  "ankle_foot_stability",
  "calf_soleus_durability",
  "locomotion_core_stability",
  "unilateral_running_stability",
  "uphill_locomotion_support",
  "downhill_eccentric_control",
  "running_conditioning",
];

export type RoadMinimumCoverageRule = {
  id: string;
  applies: (ctx: SportCoverageContext) => boolean;
  description: string;
  scanBlockTypes: readonly string[];
  mustSatisfy: (exerciseIds: string[], exerciseById: Map<string, Exercise>) => boolean;
};

export const roadSportSelectionRules: {
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
      slotRuleId: "road_main_strength",
      blockTypes: ["main_strength", "main_hypertrophy"],
      gateMatchAnyOf: [...PRIMARY_ROAD_MAIN],
      preferMatchAnyOf: [
        ...PRIMARY_ROAD_MAIN,
        "calf_soleus_durability",
        "ankle_foot_stability",
      ],
      deprioritizeMatchAnyOf: [...ROAD_DEPRIORITIZED],
    },
    {
      slotRuleId: "road_accessory",
      blockTypes: ["accessory"],
      gateMatchAnyOf: [
        "ankle_foot_stability",
        "calf_soleus_durability",
        "locomotion_core_stability",
        "unilateral_running_stability",
        "uphill_locomotion_support",
        "downhill_eccentric_control",
      ],
      preferMatchAnyOf: [
        "calf_soleus_durability",
        "ankle_foot_stability",
        "unilateral_running_stability",
        "locomotion_core_stability",
      ],
      deprioritizeMatchAnyOf: [...ROAD_DEPRIORITIZED],
    },
    {
      slotRuleId: "road_conditioning",
      blockTypes: ["conditioning"],
      gateMatchAnyOf: ["running_conditioning"],
      preferMatchAnyOf: ["running_conditioning"],
      deprioritizeMatchAnyOf: ["hiking_step_stair_identity", "lateral_agility_flashy", "elastic_reactive_lower"],
    },
  ],
};

const roadMinimumCoverage: readonly RoadMinimumCoverageRule[] = [
  {
    id: "road_main_locomotion_support",
    description:
      "With a main strength block, include at least one road-running locomotion pattern (single-leg stability, sagittal strength, ankle/foot, trunk stiffness, or controlled eccentric work).",
    applies: (ctx) => ctx.hasMainStrengthBlock,
    scanBlockTypes: ["main_strength"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, PRIMARY_ROAD_MAIN),
  },
  {
    id: "road_support_second_pattern",
    description:
      "When the session has 2+ training blocks, include at least one supportive road pattern (ankle/calf, trunk, single-leg, sagittal squat/hinge stimulus, controlled eccentric, or running conditioning).",
    applies: (ctx) => ctx.trainingBlockCount >= 2,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory", "power", "conditioning"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, ROAD_SUPPORT_COVERAGE_CATEGORIES),
  },
  {
    id: "road_conditioning_relevance",
    description:
      "When conditioning is present, prefer linear running-relevant modalities (run/tempo/row/bike; not stair-machine-only).",
    applies: (ctx) => ctx.hasConditioningBlock,
    scanBlockTypes: ["conditioning"],
    mustSatisfy: (ids, byId) => ids.some((id) => isRoadRunningConditioningExercise(byId.get(id)!)),
  },
];

export const roadSportWorkoutConstraints = {
  minimumCoverage: roadMinimumCoverage,
};

export function evaluateRoadMinimumCoverage(
  ctx: SportCoverageContext,
  blocksExerciseIdsByType: Map<string, string[]>,
  exerciseById: Map<string, Exercise>
): { ok: boolean; violations: { ruleId: string; description: string }[] } {
  const violations: { ruleId: string; description: string }[] = [];
  for (const rule of roadMinimumCoverage) {
    if (!rule.applies(ctx)) continue;
    const ids = rule.scanBlockTypes.flatMap((t) => blocksExerciseIdsByType.get(t) ?? []);
    if (!rule.mustSatisfy(ids, exerciseById)) {
      violations.push({ ruleId: rule.id, description: rule.description });
    }
  }
  return { ok: violations.length === 0, violations };
}
