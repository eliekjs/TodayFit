/**
 * Readable unit tests for conditioning, accessory, and cooldown block eligibility.
 *
 * Run: npx vitest run logic/workoutGeneration/blockCategoryBehavior.test.ts
 */

import { describe, it, expect } from "vitest";
import type { Exercise } from "./types";
import type { ResolvedWorkoutConstraints } from "../workoutIntelligence/constraints/constraintTypes";
import {
  exerciseEligibleForWorkingBlock,
  hasMetabolicConditioningSignal,
  isAccessoryEligible,
  isConditioningEligible,
  isRecoveryCooldownEligible,
  isSprintMechanicsDrill,
  isStrengthIsolationPrehabWork,
} from "./blockSelectionEligibility";
import { shouldIncludeConditioningBlock } from "./blockIntentProfile";
import { shouldOmitOptionalHypertrophyUpperOnlyConditioning } from "./upperHypertrophySessionGate";
import {
  resolveBlockStructureProfile,
  resolveCooldownPolicy,
} from "../../data/sportSubFocus/subFocusIntentRegistry";
import type { GenerateWorkoutInput } from "./types";

const lowerBodyConstraints: ResolvedWorkoutConstraints = {
  rules: [],
  excluded_exercise_ids: new Set(),
  excluded_joint_stress_tags: new Set(),
  excluded_contraindication_keys: new Set(),
  allowed_movement_families: ["lower_body"],
  allowed_lower_body_emphasis: undefined,
  required_conditioning_block: false,
  min_cooldown_mobility_exercises: 0,
  superset_pairing: null,
};

/** Partial test input; casts through unknown because tests only set the fields under test. */
function asInput(partial: Partial<GenerateWorkoutInput> & Record<string, unknown>): GenerateWorkoutInput {
  return partial as unknown as GenerateWorkoutInput;
}

function makeEx(partial: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["bodyweight"],
    difficulty: 2,
    time_cost: "low",
    tags: { goal_tags: [], sport_tags: [], energy_fit: ["medium"] },
    ...partial,
  };
}

/** Realistic catalog-style exercises used across positive/negative cases. */
const FIXTURES = {
  figure8: makeEx({
    id: "figure_8",
    name: "Figure 8",
    modality: "conditioning",
    movement_pattern: "locomotion",
    primary_movement_family: "lower_body",
    exercise_role: "conditioning",
    tags: {
      goal_tags: ["power"],
      sport_tags: ["sport_volleyball"],
      energy_fit: ["medium", "high"],
      attribute_tags: ["speed", "change_of_direction"],
    },
  }),
  figure8Zone2MisTag: makeEx({
    id: "figure_8",
    name: "Figure 8",
    modality: "conditioning",
    movement_pattern: "locomotion",
    exercise_role: "conditioning",
    tags: {
      goal_tags: ["power"],
      sport_tags: ["sport_volleyball"],
      energy_fit: ["medium", "high"],
      stimulus: ["aerobic_zone2"],
      attribute_tags: ["speed", "change_of_direction"],
    },
  }),
  burpee: makeEx({
    id: "burpee",
    name: "Burpee",
    modality: "power",
    exercise_role: "finisher",
    tags: {
      goal_tags: ["conditioning"],
      sport_tags: [],
      energy_fit: ["high"],
      stimulus: ["anaerobic"],
    },
  }),
  mountainClimber: makeEx({
    id: "mountain_climbers",
    name: "Mountain Climbers",
    modality: "conditioning",
    exercise_role: "conditioning",
    tags: {
      goal_tags: ["endurance"],
      sport_tags: [],
      energy_fit: ["high"],
      stimulus: ["anaerobic"],
    },
  }),
  assaultBike: makeEx({
    id: "assault_bike_intervals",
    name: "Assault Bike Intervals",
    modality: "conditioning",
    equipment_required: ["assault_bike"],
    exercise_role: "conditioning",
    tags: {
      goal_tags: ["conditioning"],
      sport_tags: [],
      energy_fit: ["high"],
      stimulus: ["anaerobic"],
    },
  }),
  calfRaise: makeEx({
    id: "calf_raise",
    name: "Calf Raise",
    modality: "strength",
    muscle_groups: ["calves"],
    exercise_role: "isolation",
    tags: { goal_tags: ["strength", "hypertrophy"], sport_tags: [], energy_fit: ["medium"] },
  }),
  tibialisRaise: makeEx({
    id: "tibialis_raise",
    name: "Tibialis Raise",
    modality: "mobility",
    muscle_groups: ["legs"],
    exercise_role: "mobility",
    tags: {
      goal_tags: ["mobility"],
      sport_tags: ["sport_volleyball"],
      energy_fit: ["low"],
      attribute_tags: ["prehab"],
    },
  }),
  childsPose: makeEx({
    id: "childs_pose",
    name: "Child's Pose",
    movement_pattern: "rotate",
    muscle_groups: ["core"],
    primary_movement_family: "core",
    modality: "mobility",
    exercise_role: "stretch",
    stretch_targets: ["low_back", "hips"],
    tags: { goal_tags: ["mobility", "recovery"], sport_tags: [], energy_fit: ["low"] },
  }),
  couchStretch: makeEx({
    id: "couch_stretch",
    name: "Couch Stretch",
    modality: "mobility",
    exercise_role: "stretch",
    stretch_targets: ["hip_flexors", "quads"],
    tags: { goal_tags: ["mobility"], sport_tags: [], energy_fit: ["low"] },
  }),
  bulgarianSplitSquat: makeEx({
    id: "bulgarian_split_squat",
    name: "Bulgarian Split Squat",
    modality: "strength",
    exercise_role: "accessory",
    primary_movement_family: "lower_body",
    tags: { goal_tags: ["strength"], sport_tags: [], energy_fit: ["medium"] },
  }),
  pigeonStretch: makeEx({
    id: "pigeon_stretch",
    name: "Pigeon Stretch",
    modality: "mobility",
    exercise_role: "stretch",
    stretch_targets: ["glutes", "hip_flexors"],
    tags: { goal_tags: ["mobility"], sport_tags: [], energy_fit: ["low"] },
  }),
  rowerIntervals: makeEx({
    id: "rower_intervals",
    name: "Rower Intervals",
    modality: "conditioning",
    movement_pattern: "locomotion",
    muscle_groups: ["legs", "core"],
    primary_movement_family: "full_body",
    exercise_role: "conditioning",
    equipment_required: ["rower"],
    tags: {
      goal_tags: ["conditioning"],
      sport_tags: [],
      energy_fit: ["high"],
      stimulus: ["anaerobic"],
    },
  }),
};

describe("When conditioning blocks appear", () => {
  it("allows optional conditioning for athletic performance primary goal", () => {
    const input = { primary_goal: "athletic_performance" } as GenerateWorkoutInput;
    expect(shouldIncludeConditioningBlock(input)).toBe(true);
  });

  it("allows conditioning when user adds conditioning as secondary goal", () => {
    const input = {
      primary_goal: "strength",
      secondary_goals: ["conditioning"],
    } as GenerateWorkoutInput;
    expect(shouldIncludeConditioningBlock(input)).toBe(true);
  });

  it("never includes conditioning for hypertrophy primary (upper or lower)", () => {
    const upperOnly = asInput({
      primary_goal: "hypertrophy",
      focus_body_parts: ["upper_push"],
      secondary_goals: [],
    });
    const lowerOnly = asInput({
      primary_goal: "hypertrophy",
      focus_body_parts: ["lower"],
      secondary_goals: [],
    });
    expect(shouldIncludeConditioningBlock(upperOnly)).toBe(false);
    expect(shouldIncludeConditioningBlock(lowerOnly)).toBe(false);
    expect(shouldOmitOptionalHypertrophyUpperOnlyConditioning(upperOnly)).toBe(true);
    expect(shouldOmitOptionalHypertrophyUpperOnlyConditioning(lowerOnly)).toBe(true);
  });

  it("never includes conditioning for hypertrophy even with cardio secondary goal", () => {
    const input = {
      primary_goal: "hypertrophy",
      focus_body_parts: ["lower"],
      secondary_goals: ["conditioning"],
    } as GenerateWorkoutInput;
    expect(shouldIncludeConditioningBlock(input)).toBe(false);
    expect(resolveBlockStructureProfile(input).requiresConditioningBlock).toBe(false);
  });

  it("still allows conditioning for endurance primary goal", () => {
    const input = { primary_goal: "endurance" } as GenerateWorkoutInput;
    expect(shouldIncludeConditioningBlock(input)).toBe(true);
  });

  it("requires conditioning for RSA repeat_sprint sport sub-focus", () => {
    const input = asInput({
      primary_goal: "athletic_performance",
      sport_sub_focus: { soccer: ["repeat_sprint"] },
    });
    expect(resolveBlockStructureProfile(input).requiresConditioningBlock).toBe(true);
    expect(shouldIncludeConditioningBlock(input)).toBe(true);
  });

  it("suppresses accessory blocks for vertical jump only sessions", () => {
    const input = asInput({
      primary_goal: "athletic_performance",
      sport_sub_focus: { volleyball: ["vertical_jump"] },
    });
    expect(resolveBlockStructureProfile(input).suppressAccessoryBlocks).toBe(true);
  });

  it("requires accessory blocks for hypertrophy primary", () => {
    const input = { primary_goal: "hypertrophy" } as GenerateWorkoutInput;
    expect(resolveBlockStructureProfile(input).requiresAccessoryBlocks).toBe(true);
  });

  it("suppresses accessory blocks for endurance-only primary", () => {
    const input = asInput({ primary_goal: "endurance", secondary_goals: [] });
    const profile = resolveBlockStructureProfile(input);
    expect(profile.requiresConditioningBlock).toBe(true);
    expect(profile.suppressAccessoryBlocks).toBe(true);
  });
});

describe("What exercises qualify for conditioning", () => {
  const rsaInput = asInput({
    primary_goal: "athletic_performance",
    sport_sub_focus: { soccer: ["repeat_sprint"] },
  });

  it("includes burpee for explosive sub-focus conditioning", () => {
    expect(isConditioningEligible(FIXTURES.burpee)).toBe(true);
    expect(hasMetabolicConditioningSignal(FIXTURES.burpee)).toBe(true);
  });

  it("includes mountain climber with anaerobic stimulus", () => {
    expect(isConditioningEligible(FIXTURES.mountainClimber)).toBe(true);
  });

  it("includes assault bike intervals with metabolic equipment", () => {
    expect(isConditioningEligible(FIXTURES.assaultBike)).toBe(true);
  });

  it("includes rower intervals tagged anaerobic", () => {
    expect(isConditioningEligible(FIXTURES.rowerIntervals)).toBe(true);
    expect(hasMetabolicConditioningSignal(FIXTURES.rowerIntervals)).toBe(true);
  });

  it("includes Figure 8 agility drill for RSA archetype conditioning context", () => {
    expect(isConditioningEligible(FIXTURES.figure8, { input: rsaInput })).toBe(true);
    expect(
      exerciseEligibleForWorkingBlock(FIXTURES.figure8, "conditioning", lowerBodyConstraints, rsaInput)
    ).toBe(true);
  });
});

describe("What exercises are rejected from conditioning", () => {
  it("excludes Figure 8 from conditioning without RSA/COD archetype context", () => {
    expect(isSprintMechanicsDrill(FIXTURES.figure8Zone2MisTag)).toBe(true);
    expect(isConditioningEligible(FIXTURES.figure8Zone2MisTag)).toBe(false);
    expect(
      exerciseEligibleForWorkingBlock(FIXTURES.figure8Zone2MisTag, "conditioning", lowerBodyConstraints)
    ).toBe(false);
  });

  it("excludes Figure 8 COD drill with conditioning modality but no metabolic signal (default)", () => {
    expect(isSprintMechanicsDrill(FIXTURES.figure8)).toBe(true);
    expect(isConditioningEligible(FIXTURES.figure8)).toBe(false);
  });

  it("excludes calf raise isolation from conditioning block", () => {
    expect(isConditioningEligible(FIXTURES.calfRaise)).toBe(false);
    expect(
      exerciseEligibleForWorkingBlock(FIXTURES.calfRaise, "conditioning", lowerBodyConstraints)
    ).toBe(false);
  });

  it("excludes stretch-role exercises from conditioning", () => {
    expect(isConditioningEligible(FIXTURES.childsPose)).toBe(false);
  });
});

describe("When accessory blocks appear", () => {
  it("qualifies supplemental strength for accessory slots (policy proxy)", () => {
    expect(isAccessoryEligible(FIXTURES.bulgarianSplitSquat)).toBe(true);
  });

  it("rejects pure cooldown stretches from accessory eligibility", () => {
    expect(isAccessoryEligible(FIXTURES.pigeonStretch)).toBe(false);
  });

  it("rejects metabolic finishers from accessory eligibility", () => {
    expect(isAccessoryEligible(FIXTURES.burpee)).toBe(false);
  });
});

describe("What exercises qualify for accessory", () => {
  it("includes bulgarian split squat as strength accessory", () => {
    expect(isAccessoryEligible(FIXTURES.bulgarianSplitSquat)).toBe(true);
    expect(
      exerciseEligibleForWorkingBlock(FIXTURES.bulgarianSplitSquat, "accessory", lowerBodyConstraints)
    ).toBe(true);
  });

  it("includes calf raise isolation for accessory block", () => {
    expect(isAccessoryEligible(FIXTURES.calfRaise)).toBe(true);
  });

  it("excludes tibialis raise from accessory (mobility modality) and cooldown", () => {
    expect(isStrengthIsolationPrehabWork(FIXTURES.tibialisRaise)).toBe(true);
    expect(isAccessoryEligible(FIXTURES.tibialisRaise)).toBe(false);
    expect(isRecoveryCooldownEligible(FIXTURES.tibialisRaise)).toBe(false);
  });
});

describe("Cooldown required policy", () => {
  it("requires cooldown for sport-mode vertical jump sessions", () => {
    const policy = resolveCooldownPolicy({
      sport_slugs: ["volleyball"],
      sport_sub_focus: { volleyball: ["vertical_jump"] },
      duration_minutes: 45,
      focus_body_parts: ["lower"],
    });
    expect(policy.requiresCooldownBlock).toBe(true);
    expect(policy.minCooldownItems).toBeGreaterThanOrEqual(2);
  });

  it("requires cooldown for hypertrophy and strength primary goals", () => {
    expect(resolveCooldownPolicy({ primary_goal: "hypertrophy", duration_minutes: 45 }).requiresCooldownBlock).toBe(
      true
    );
    expect(resolveCooldownPolicy({ primary_goal: "strength", duration_minutes: 45 }).requiresCooldownBlock).toBe(
      true
    );
  });

  it("omits standalone cooldown for recovery-primary and sub-20-minute sessions", () => {
    expect(resolveCooldownPolicy({ primary_goal: "recovery", duration_minutes: 30 }).requiresCooldownBlock).toBe(
      false
    );
    expect(resolveCooldownPolicy({ primary_goal: "strength", duration_minutes: 15 }).requiresCooldownBlock).toBe(
      false
    );
  });

  it("sets min 2 stretches for 30-44 min and 3 for 45+ min", () => {
    expect(resolveCooldownPolicy({ primary_goal: "power", duration_minutes: 35 }).minCooldownItems).toBe(2);
    expect(resolveCooldownPolicy({ primary_goal: "power", duration_minutes: 50 }).minCooldownItems).toBe(3);
  });

  it("requires cooldown for RSA/COD sport sub-focus archetypes", () => {
    const profile = resolveBlockStructureProfile({
      sport_sub_focus: { soccer: ["speed", "change_of_direction"] },
    });
    expect(profile.requiresCooldownBlock).toBe(true);
    expect(profile.minCooldownItems).toBeGreaterThanOrEqual(2);
  });
});

describe("When cooldown blocks appear", () => {
  it("always qualifies stretch exercises with stretch_targets for cooldown pool", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.childsPose)).toBe(true);
    expect(isRecoveryCooldownEligible(FIXTURES.couchStretch)).toBe(true);
  });

  it("requires stretch/recovery signal — generic mobility without targets fails", () => {
    const genericMobility = makeEx({
      id: "generic_hip_mobility",
      name: "Generic Hip Mobility",
      modality: "mobility",
      exercise_role: "mobility",
      tags: { goal_tags: ["mobility"], sport_tags: [], energy_fit: ["low"] },
    });
    expect(isRecoveryCooldownEligible(genericMobility)).toBe(false);
  });
});

describe("What exercises qualify for cooldown", () => {
  it("includes child's pose for cooldown eligibility (stretch signal)", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.childsPose)).toBe(true);
    expect(
      exerciseEligibleForWorkingBlock(FIXTURES.childsPose, "cooldown", {
        ...lowerBodyConstraints,
        allowed_movement_families: ["core", "mobility"],
      })
    ).toBe(true);
  });

  it("includes couch stretch with hip flexor stretch_targets", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.couchStretch)).toBe(true);
  });

  it("includes pigeon stretch with glute stretch_targets", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.pigeonStretch)).toBe(true);
  });
});

describe("What exercises are rejected from cooldown", () => {
  it("excludes tibialis raise from cooldown", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.tibialisRaise)).toBe(false);
    expect(
      exerciseEligibleForWorkingBlock(FIXTURES.tibialisRaise, "cooldown", lowerBodyConstraints)
    ).toBe(false);
  });

  it("excludes burpee metabolic finisher from cooldown", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.burpee)).toBe(false);
  });

  it("excludes calf raise isolation from cooldown", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.calfRaise)).toBe(false);
  });

  it("excludes Figure 8 agility drill from cooldown", () => {
    expect(isRecoveryCooldownEligible(FIXTURES.figure8)).toBe(false);
  });
});
