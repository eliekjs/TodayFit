/**
 * Alpine skiing (downhill / resort) — slot rules, coverage, conditioning hints.
 */

import type { Exercise } from "../types";
import type { SportCoverageContext } from "./types";
import type { SportPatternSlotRule } from "../sportPattern/framework/types";
import {
  getAlpineSkiingPatternCategoriesForExercise,
  isAlpineSkiingConditioningExercise,
} from "./alpineSkiingExerciseCategories";
import type { AlpineSkiingPatternCategory } from "./alpineSkiingTypes";

/** Main/hypertrophy slot gate: at least one category required for gated pool (sport intent contract uses same ids). */
export const ALPINE_MAIN_GATE_MATCH_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  "eccentric_braking_control",
  "lateral_frontal_plane_stability",
  "quad_dominant_endurance",
  "sustained_tension_lower_body",
  "landing_deceleration_support",
];

const PRIMARY_ALPINE_MAIN = ALPINE_MAIN_GATE_MATCH_CATEGORIES;

/** Deprioritized alpine pattern categories (avoid in contract + slot rules). */
export const ALPINE_DEPRIORITIZED_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  "locomotion_hiking_trail_identity",
  "running_gait_identity",
  "low_transfer_sagittal_only",
  "unrelated_upper_body_dominant",
  "overly_complex_skill_lift",
];

const ALPINE_DEPRIORITIZED = ALPINE_DEPRIORITIZED_CATEGORIES;

/** Main-work preferred categories (matches `alpine_main_strength` slot preferMatchAnyOf). */
export const ALPINE_MAIN_PREFER_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  "eccentric_braking_control",
  "lateral_frontal_plane_stability",
  "landing_deceleration_support",
  "sustained_tension_lower_body",
  "quad_dominant_endurance",
  "hip_knee_control",
];

export const ALPINE_ECCENTRIC_CONTROL_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  "eccentric_braking_control",
  "sustained_tension_lower_body",
  "landing_deceleration_support",
];

export const ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  "eccentric_braking_control",
  "landing_deceleration_support",
];

export const ALPINE_LATERAL_STABILITY_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  "lateral_frontal_plane_stability",
  "trunk_bracing_dynamic",
];

export const ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  "quad_dominant_endurance",
  "sustained_tension_lower_body",
];

/**
 * Progressive fallback tier 3: any of these pattern tags counts as “sport-quality aligned”
 * (broader than strict gate + hip_knee in prefer list).
 */
export const ALPINE_QUALITY_LADDER_ANCHOR_CATEGORIES: readonly AlpineSkiingPatternCategory[] = [
  ...ALPINE_MAIN_GATE_MATCH_CATEGORIES,
  "hip_knee_control",
  "trunk_bracing_dynamic",
  "ski_conditioning",
];

/**
 * When an exercise has no anchor category but still shows alpine-shaped within-pool quality (empty session context).
 */
export const ALPINE_QUALITY_LADDER_MIN_SCORE = 0.35;

function collectCategoriesForIds(ids: string[], exerciseById: Map<string, Exercise>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    const ex = exerciseById.get(id);
    if (!ex) continue;
    for (const c of getAlpineSkiingPatternCategoriesForExercise(ex)) out.add(c);
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

function conditioningExerciseAlpineRelevant(ex: Exercise | undefined): boolean {
  if (!ex) return false;
  return isAlpineSkiingConditioningExercise(ex);
}

export const alpineSportSelectionRules: {
  allowedConditioningEquipmentOrIdSubstrings: readonly string[];
  slots: readonly SportPatternSlotRule[];
} = {
  allowedConditioningEquipmentOrIdSubstrings: [
    "interval",
    "hiit",
    "tabata",
    "emom",
    "amrap",
    "assault",
    "bike",
    "row",
    "ski_erg",
    "sled",
    "battle_rope",
    "conditioning",
    "metcon",
    "round",
    "repeat",
  ],
  slots: [
    {
      slotRuleId: "alpine_main_strength",
      blockTypes: ["main_strength", "main_hypertrophy"],
      gateMatchAnyOf: [...PRIMARY_ALPINE_MAIN],
      preferMatchAnyOf: [
        "eccentric_braking_control",
        "lateral_frontal_plane_stability",
        "landing_deceleration_support",
        "sustained_tension_lower_body",
        "quad_dominant_endurance",
        "hip_knee_control",
      ],
      deprioritizeMatchAnyOf: [...ALPINE_DEPRIORITIZED],
    },
    {
      slotRuleId: "alpine_accessory",
      blockTypes: ["accessory"],
      gateMatchAnyOf: [
        "eccentric_braking_control",
        "lateral_frontal_plane_stability",
        "quad_dominant_endurance",
        "sustained_tension_lower_body",
        "hip_knee_control",
        "trunk_bracing_dynamic",
        "landing_deceleration_support",
      ],
      preferMatchAnyOf: [
        "lateral_frontal_plane_stability",
        "trunk_bracing_dynamic",
        "eccentric_braking_control",
        "hip_knee_control",
        "quad_dominant_endurance",
      ],
      deprioritizeMatchAnyOf: [...ALPINE_DEPRIORITIZED],
    },
    {
      slotRuleId: "alpine_conditioning",
      blockTypes: ["conditioning"],
      gateMatchAnyOf: ["ski_conditioning"],
      preferMatchAnyOf: ["ski_conditioning", "quad_dominant_endurance", "lateral_frontal_plane_stability"],
      deprioritizeMatchAnyOf: [
        "running_gait_identity",
        "locomotion_hiking_trail_identity",
        "low_transfer_sagittal_only",
      ],
    },
  ],
};

export type AlpineMinimumCoverageRule = {
  id: string;
  applies: (ctx: SportCoverageContext) => boolean;
  description: string;
  scanBlockTypes: readonly string[];
  mustSatisfy: (exerciseIds: string[], exerciseById: Map<string, Exercise>) => boolean;
};

const alpineMinimumCoverage: readonly AlpineMinimumCoverageRule[] = [
  {
    id: "alpine_main_eccentric_or_deceleration",
    description:
      "At least one main movement must include eccentric braking or landing/deceleration support.",
    applies: (ctx) => ctx.hasMainStrengthBlock,
    scanBlockTypes: ["main_strength", "main_hypertrophy"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES),
  },
  {
    id: "alpine_eccentric_control_presence",
    description:
      "Include at least one eccentric braking, sustained tension, or landing/deceleration pattern (ski-relevant control).",
    applies: (ctx) => ctx.hasMainStrengthBlock,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, ALPINE_ECCENTRIC_CONTROL_CATEGORIES),
  },
  {
    id: "alpine_lateral_or_trunk_stability",
    description:
      "With 2+ training blocks, include lateral/frontal stability or dynamic trunk bracing (anti-rotation).",
    applies: (ctx) => ctx.trainingBlockCount >= 2,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory", "conditioning"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, ALPINE_LATERAL_STABILITY_CATEGORIES),
  },
  {
    id: "alpine_lower_body_tension_endurance",
    description:
      "Include at least one sustained-tension or quad-endurance movement to support downhill leg-burn demands.",
    applies: (ctx) => ctx.hasMainStrengthBlock || ctx.trainingBlockCount >= 2,
    scanBlockTypes: ["main_strength", "main_hypertrophy", "accessory"],
    mustSatisfy: (ids, byId) =>
      sessionHasAnyCategory(ids, byId, ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES),
  },
  {
    id: "alpine_conditioning_relevance",
    description:
      "When conditioning is present, prefer interval or repeat-effort modalities rather than steady hiking stair or pure running drills.",
    applies: (ctx) => ctx.hasConditioningBlock,
    scanBlockTypes: ["conditioning"],
    mustSatisfy: (ids, byId) => ids.some((id) => conditioningExerciseAlpineRelevant(byId.get(id))),
  },
];

export const alpineSportWorkoutConstraints = {
  minimumCoverage: alpineMinimumCoverage,
};

export function evaluateAlpineMinimumCoverage(
  ctx: SportCoverageContext,
  blocksExerciseIdsByType: Map<string, string[]>,
  exerciseById: Map<string, Exercise>
): { ok: boolean; violations: { ruleId: string; description: string }[] } {
  const violations: { ruleId: string; description: string }[] = [];
  for (const rule of alpineMinimumCoverage) {
    if (!rule.applies(ctx)) continue;
    const ids = rule.scanBlockTypes.flatMap((t) => blocksExerciseIdsByType.get(t) ?? []);
    if (!rule.mustSatisfy(ids, exerciseById)) {
      violations.push({ ruleId: rule.id, description: rule.description });
    }
  }
  return { ok: violations.length === 0, violations };
}
