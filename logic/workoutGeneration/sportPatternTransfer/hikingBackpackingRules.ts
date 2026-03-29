/**
 * Hiking/backpacking bundle: `sportExerciseRequirements`, `sportSelectionRules`, `sportWorkoutConstraints`.
 *
 * **Generic mechanics** (gating, slot score deltas, coverage context): `sportPattern/framework/`.
 * **This file:** hiking category strings, slot rules, coverage predicates, conditioning relevance.
 * Next sport: duplicate this module’s shape; see `sportPattern/framework/README.md`.
 */
import type {
  HikingMinimumCoverageRule,
  HikingPatternCategory,
  HikingSportExerciseRequirements,
  HikingSportPatternBundle,
  HikingSportSelectionRules,
  HikingSportWorkoutConstraints,
  SportCoverageContext,
} from "./types";
import type { Exercise } from "../types";
import { getHikingPatternCategoriesForExercise } from "./hikingExerciseCategories";

const PRIMARY_MAIN: readonly HikingPatternCategory[] = [
  "locomotion_step_up",
  "unilateral_knee_dominant",
];

function collectCategoriesForIds(
  ids: string[],
  exerciseById: Map<string, Exercise>
): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    const ex = exerciseById.get(id);
    if (!ex) continue;
    for (const c of getHikingPatternCategoriesForExercise(ex)) out.add(c);
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

function conditioningExerciseHikingRelevant(
  ex: Exercise | undefined
): boolean {
  if (!ex) return false;
  const cats = getHikingPatternCategoriesForExercise(ex);
  return (
    cats.has("incline_stair_conditioning") ||
    cats.has("loaded_carry_pack_tolerance") ||
    cats.has("locomotion_step_up")
  );
}

export const sportExerciseRequirements: HikingSportExerciseRequirements = {
  requiredPatternCategories: [...PRIMARY_MAIN],
  preferredPatternCategories: [
    "descent_eccentric_control",
    "calf_ankle_durability",
    "tibialis_shin_strength",
    "hip_stability_gait",
    "trunk_bracing_under_load",
    "loaded_carry_pack_tolerance",
    "incline_stair_conditioning",
  ],
  deprioritizedPatternCategories: [
    "generic_heavy_pull_as_primary",
    "low_transfer_novelty_accessory",
    "unrelated_upper_body_dominant",
    "overly_complex_skill_lift",
  ],
  optionalSupportPatternCategories: [
    "hip_stability_gait",
    "trunk_bracing_under_load",
    "tibialis_shin_strength",
  ],
};

export const sportSelectionRules: HikingSportSelectionRules = {
  allowedConditioningEquipmentOrIdSubstrings: [
    "stair_climber",
    "stair",
    "treadmill",
    "incline",
    "hill",
    "walking",
    "farmer_carry",
    "suitcase",
    "carry",
    "sled",
    "stepup",
    "step_up",
    "zone2_stair",
    "zone2_treadmill",
  ],
  slots: [
    {
      slotRuleId: "hiking_main_strength",
      blockTypes: ["main_strength", "main_hypertrophy"],
      gateMatchAnyOf: [...PRIMARY_MAIN],
      preferMatchAnyOf: [...PRIMARY_MAIN, "descent_eccentric_control"],
      deprioritizeMatchAnyOf: [...sportExerciseRequirements.deprioritizedPatternCategories],
    },
    {
      slotRuleId: "hiking_accessory",
      blockTypes: ["accessory"],
      gateMatchAnyOf: [
        "descent_eccentric_control",
        "loaded_carry_pack_tolerance",
        "calf_ankle_durability",
        "tibialis_shin_strength",
        "hip_stability_gait",
        "trunk_bracing_under_load",
        "unilateral_knee_dominant",
        "locomotion_step_up",
      ],
      preferMatchAnyOf: [
        "descent_eccentric_control",
        "loaded_carry_pack_tolerance",
        "calf_ankle_durability",
        "hip_stability_gait",
        "trunk_bracing_under_load",
      ],
      deprioritizeMatchAnyOf: [
        "generic_heavy_pull_as_primary",
        "low_transfer_novelty_accessory",
        "unrelated_upper_body_dominant",
        "overly_complex_skill_lift",
      ],
    },
    {
      slotRuleId: "hiking_conditioning",
      blockTypes: ["conditioning"],
      gateMatchAnyOf: ["incline_stair_conditioning", "loaded_carry_pack_tolerance", "locomotion_step_up"],
      preferMatchAnyOf: ["incline_stair_conditioning", "loaded_carry_pack_tolerance"],
      deprioritizeMatchAnyOf: [],
    },
  ],
};

/** Categories that satisfy the “second supportive hiking pattern” coverage rule (also used for repair/tests). */
export const HIKING_SUPPORT_COVERAGE_CATEGORIES: readonly HikingPatternCategory[] = [
  "descent_eccentric_control",
  "calf_ankle_durability",
  "tibialis_shin_strength",
  "loaded_carry_pack_tolerance",
  "incline_stair_conditioning",
  "hip_stability_gait",
  "trunk_bracing_under_load",
];

const minimumCoverage: readonly HikingMinimumCoverageRule[] = [
  {
    id: "hiking_main_primary_locomotion",
    description:
      "With a main strength block, include at least one locomotion step-up or unilateral knee-dominant pattern.",
    applies: (ctx) => ctx.hasMainStrengthBlock,
    scanBlockTypes: ["main_strength"],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, PRIMARY_MAIN),
  },
  {
    id: "hiking_support_second_pattern",
    description:
      "When the session has 2+ training blocks, include at least one supportive hiking pattern (descent, calf/ankle, carry, incline conditioning, tibialis, hip stability, trunk bracing).",
    applies: (ctx) => ctx.trainingBlockCount >= 2,
    scanBlockTypes: [
      "main_strength",
      "main_hypertrophy",
      "accessory",
      "power",
      "conditioning",
    ],
    mustSatisfy: (ids, byId) => sessionHasAnyCategory(ids, byId, HIKING_SUPPORT_COVERAGE_CATEGORIES),
  },
  {
    id: "hiking_conditioning_relevance",
    description: "When conditioning is present, it must be hiking-relevant (incline/stair/carry/locomotion conditioning).",
    applies: (ctx) => ctx.hasConditioningBlock,
    scanBlockTypes: ["conditioning"],
    mustSatisfy: (ids, byId) =>
      ids.some((id) => conditioningExerciseHikingRelevant(byId.get(id))),
  },
];

export const sportWorkoutConstraints: HikingSportWorkoutConstraints = {
  minimumCoverage,
};

export const HIKING_BACKPACKING_PATTERN_BUNDLE: HikingSportPatternBundle = {
  sportSlug: "hiking_backpacking",
  sportExerciseRequirements,
  sportSelectionRules,
  sportWorkoutConstraints,
};

export function evaluateHikingMinimumCoverage(
  ctx: SportCoverageContext,
  blocksExerciseIdsByType: Map<string, string[]>,
  exerciseById: Map<string, Exercise>
): { ok: boolean; violations: { ruleId: string; description: string }[] } {
  const violations: { ruleId: string; description: string }[] = [];
  for (const rule of minimumCoverage) {
    if (!rule.applies(ctx)) continue;
    const ids = rule.scanBlockTypes.flatMap((t) => blocksExerciseIdsByType.get(t) ?? []);
    if (!rule.mustSatisfy(ids, exerciseById)) {
      violations.push({ ruleId: rule.id, description: rule.description });
    }
  }
  return { ok: violations.length === 0, violations };
}
