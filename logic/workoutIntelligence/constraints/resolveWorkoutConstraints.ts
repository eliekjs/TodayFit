/**
 * Converts normalized workout input into explicit workout constraints.
 * Precedence: 1) injuries 2) equipment 3) body-part 4) primary goal 5) secondary goal 6) preferences.
 */

import type { WorkoutSelectionInput } from "../scoring/scoreTypes";
import type { BlockType } from "../types";
import {
  getInjuryAvoidTags,
  getInjuryAvoidExerciseIds,
  normalizeInjuryKey,
} from "../../../lib/workoutRules";
import type {
  ResolvedWorkoutConstraints,
  WorkoutConstraint,
  MovementFamily,
  HardExcludeRule,
  SoftCautionRule,
  HardIncludeRule,
  RequiredFinishersRule,
  SupersetPairingRule,
  MovementDistributionRule,
} from "./constraintTypes";

/** Map body_region_focus strings to MovementFamily. */
const BODY_FOCUS_TO_FAMILY: Record<string, MovementFamily> = {
  upper_push: "upper_push",
  upper_pull: "upper_pull",
  push: "upper_push",
  pull: "upper_pull",
  lower: "lower_body",
  lower_body: "lower_body",
  core: "core",
  mobility: "mobility",
  conditioning: "conditioning",
};

/** Block types that count as "working" for hard_include (body-part strictness). */
const WORKING_BLOCK_TYPES: BlockType[] = [
  "main_strength",
  "main_hypertrophy",
  "power",
  "accessory",
  "conditioning",
];

/**
 * Resolve all workout constraints from input.
 * Order of rules in the output follows precedence; filters and validators should apply in that order.
 */
export function resolveWorkoutConstraints(
  input: WorkoutSelectionInput
): ResolvedWorkoutConstraints {
  const rules: WorkoutConstraint[] = [];
  const excludedIds = new Set<string>();
  const excludedJointStress = new Set<string>();
  let allowedMovementFamilies: MovementFamily[] | null = null;
  let minCooldownMobility = 0;
  let supersetPairing: SupersetPairingRule | null = null;

  // 1) Injuries / restrictions → hard_exclude (+ optional soft_caution)
  const injuries = input.injuries_or_limitations ?? [];
  if (injuries.length > 0) {
    const avoidTags = getInjuryAvoidTags(injuries);
    const avoidIds = getInjuryAvoidExerciseIds(injuries);
    avoidTags.forEach((t) => excludedJointStress.add(t));
    avoidIds.forEach((id) => excludedIds.add(id));
    const hardExclude: HardExcludeRule = {
      kind: "hard_exclude",
      exercise_ids: [...avoidIds],
      joint_stress_tags: [...avoidTags],
      contraindication_keys: injuries.map((i) => normalizeInjuryKey(i)),
    };
    rules.push(hardExclude);
  }

  // 2) Equipment — handled at filter time (filterEquipment); no constraint object, just document that exclusion is applied there from available_equipment / excluded_equipment)

  // 3) Body-part strictness → hard_include + movement_distribution
  const bodyFocus = input.body_region_focus ?? [];
  if (bodyFocus.length > 0) {
    const families = new Set<MovementFamily>();
    for (const f of bodyFocus) {
      const key = f.toLowerCase().replace(/\s/g, "_");
      const fam = BODY_FOCUS_TO_FAMILY[key];
      if (fam) families.add(fam);
    }
    if (families.size > 0) {
      allowedMovementFamilies = [...families];
      const hardInclude: HardIncludeRule = {
        kind: "hard_include",
        movement_families: allowedMovementFamilies,
        block_types: WORKING_BLOCK_TYPES,
      };
      rules.push(hardInclude);
      const distRule: MovementDistributionRule = {
        kind: "movement_distribution_rules",
        families: allowedMovementFamilies,
        rotation_hint: allowedMovementFamilies,
      };
      rules.push(distRule);
      // Upper push superset pairing: prefer chest+triceps, chest+shoulders, shoulders+triceps; avoid double chest isolation
      if (families.has("upper_push")) {
        supersetPairing = {
          kind: "superset_pairing_rules",
          preferred_pairs: [
            ["upper_push", "upper_push"], // chest + triceps or chest + shoulders count as same family but different emphasis
          ],
          forbidden_same_pattern: true,
          forbid_double_grip: true,
        };
      }
      if (families.has("upper_pull")) {
        supersetPairing = supersetPairing ?? {
          kind: "superset_pairing_rules",
          forbidden_same_pattern: true,
          forbid_double_grip: true,
        };
      }
    }
  }

  // 4) Primary goal — already drives template/block sequence; optional preferred rule could be added here
  // 5) Secondary goal — mobility → required_finishers + required block
  const secondary = input.secondary_goals ?? [];
  const mobilitySecondary = secondary.some(
    (g) => g.toLowerCase().replace(/\s/g, "_").includes("mobility") || g.toLowerCase().includes("mobility")
  );
  if (mobilitySecondary) {
    minCooldownMobility = 2;
    rules.push({
      kind: "required_block_type",
      block_types: ["cooldown", "mobility", "recovery"],
      min_count: 1,
    } as const);
    rules.push({
      kind: "required_finishers",
      min_mobility_or_stretch_exercises: minCooldownMobility,
      block_type: "cooldown",
    } as RequiredFinishersRule);
  }

  // 6) Preferences — e.g. superset format is already in block format; no extra rule needed here

  return {
    rules,
    excluded_exercise_ids: excludedIds,
    excluded_joint_stress_tags: excludedJointStress,
    allowed_movement_families: allowedMovementFamilies,
    min_cooldown_mobility_exercises: minCooldownMobility,
    superset_pairing: supersetPairing,
  };
}
