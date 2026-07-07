/**
 * Block selection eligibility: conditioning, accessory, cooldown, and block-type fit.
 *
 * Run: npx vitest run logic/workoutGeneration/blockSelectionEligibility.test.ts
 */

import { describe, it, expect } from "vitest";
import type { Exercise } from "./types";
import type { ResolvedWorkoutConstraints } from "../workoutIntelligence/constraints/constraintTypes";
import {
  exerciseEligibleForWorkingBlock,
  isAccessoryEligible,
  isAssessmentExercise,
  isConditioningEligible,
  isExerciseEligibleForBlock,
  isGenuineConditioningExercise,
  isRecoveryCooldownEligible,
  isSprintMechanicsDrill,
} from "./blockSelectionEligibility";
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

describe("isConditioningEligible", () => {
  it("accepts metabolic conditioning and rejects strength isolation", () => {
    const rower = makeEx({
      id: "rower_intervals",
      name: "Rower Intervals",
      modality: "conditioning",
      exercise_role: "conditioning",
      tags: {
        goal_tags: ["conditioning"],
        sport_tags: [],
        energy_fit: ["high"],
        stimulus: ["anaerobic"],
      },
    });
    const calf = makeEx({
      id: "calf_raise",
      name: "Calf Raise",
      modality: "strength",
      muscle_groups: ["calves"],
      exercise_role: "isolation",
      tags: { goal_tags: ["strength", "hypertrophy"], sport_tags: ["sport_basketball"], energy_fit: ["medium"] },
    });
    expect(isConditioningEligible(rower)).toBe(true);
    expect(isGenuineConditioningExercise(rower)).toBe(true);
    expect(isConditioningEligible(calf)).toBe(false);
  });

  it("allows power-modality HIIT drills with metabolic signals", () => {
    const burpee = makeEx({
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
    });
    expect(isConditioningEligible(burpee)).toBe(true);
  });

  it("rejects Figure 8 COD drill even with conditioning modality (default context)", () => {
    const figure8 = makeEx({
      id: "figure_8",
      name: "Figure 8",
      modality: "conditioning",
      movement_pattern: "locomotion",
      muscle_groups: ["legs"],
      exercise_role: "conditioning",
      tags: {
        goal_tags: ["power"],
        sport_tags: ["sport_volleyball"],
        energy_fit: ["medium", "high"],
        attribute_tags: ["speed", "change_of_direction"],
      },
    });
    expect(isSprintMechanicsDrill(figure8)).toBe(true);
    expect(isConditioningEligible(figure8)).toBe(false);
    expect(exerciseEligibleForWorkingBlock(figure8, "conditioning", lowerBodyConstraints)).toBe(false);
  });

  it("accepts Figure 8 for RSA repeat_sprint conditioning context", () => {
    const figure8 = makeEx({
      id: "figure_8",
      name: "Figure 8",
      modality: "conditioning",
      movement_pattern: "locomotion",
      muscle_groups: ["legs"],
      exercise_role: "conditioning",
      tags: {
        goal_tags: ["power"],
        sport_tags: ["sport_soccer"],
        energy_fit: ["medium", "high"],
        attribute_tags: ["speed", "change_of_direction"],
      },
    });
    const rsaInput = asInput({
      sport_sub_focus: { soccer: ["repeat_sprint"] },
    });
    expect(isConditioningEligible(figure8, { input: rsaInput })).toBe(true);
  });

  it("accepts assault bike intervals for VJ session finisher", () => {
    const bike = makeEx({
      id: "assault_bike_intervals",
      name: "Assault Bike Intervals",
      modality: "conditioning",
      muscle_groups: ["legs"],
      primary_movement_family: "lower_body",
      exercise_role: "conditioning",
      equipment_required: ["assault_bike"],
      tags: {
        goal_tags: ["conditioning"],
        sport_tags: [],
        energy_fit: ["high"],
        stimulus: ["anaerobic"],
      },
    });
    expect(isConditioningEligible(bike)).toBe(true);
  });
});

describe("isRecoveryCooldownEligible", () => {
  it("rejects tibialis raise (prehab/isolation, not stretch)", () => {
    const tibialis = makeEx({
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
    });
    expect(isRecoveryCooldownEligible(tibialis)).toBe(false);
    expect(exerciseEligibleForWorkingBlock(tibialis, "cooldown", lowerBodyConstraints)).toBe(false);
  });

  it("accepts hamstring stretch with stretch_targets", () => {
    const stretch = makeEx({
      id: "seated_hamstring_stretch",
      name: "Seated Hamstring Stretch",
      modality: "mobility",
      exercise_role: "stretch",
      stretch_targets: ["hamstrings"],
      tags: {
        goal_tags: ["mobility"],
        sport_tags: [],
        energy_fit: ["low"],
      },
    });
    expect(isRecoveryCooldownEligible(stretch)).toBe(true);
  });
});

describe("isAccessoryEligible", () => {
  it("accepts isolation strength and rejects cooldown stretches", () => {
    const curl = makeEx({
      id: "dumbbell_curl",
      name: "Dumbbell Curl",
      modality: "strength",
      exercise_role: "isolation",
      tags: { goal_tags: ["hypertrophy"], sport_tags: [], energy_fit: ["medium"] },
    });
    const pigeon = makeEx({
      id: "pigeon_stretch",
      name: "Pigeon Stretch",
      modality: "mobility",
      exercise_role: "stretch",
      stretch_targets: ["glutes", "hip_flexors"],
      tags: { goal_tags: ["mobility"], sport_tags: [], energy_fit: ["low"] },
    });
    expect(isAccessoryEligible(curl)).toBe(true);
    expect(isAccessoryEligible(pigeon)).toBe(false);
  });

  it("rejects conditioning modality from accessory blocks", () => {
    const rower = makeEx({
      id: "rower_intervals",
      name: "Rower Intervals",
      modality: "conditioning",
      exercise_role: "conditioning",
      tags: {
        goal_tags: ["conditioning"],
        sport_tags: [],
        energy_fit: ["high"],
        stimulus: ["anaerobic"],
      },
    });
    expect(isAccessoryEligible(rower)).toBe(false);
  });
});

describe("exerciseEligibleForWorkingBlock", () => {
  it("rejects upper-back mobility in lower-body power block", () => {
    const ytw = makeEx({
      id: "ytw",
      name: "Y-T-W Raise",
      modality: "mobility",
      movement_pattern: "pull",
      muscle_groups: ["upper_back", "shoulders"],
      tags: {
        goal_tags: ["mobility"],
        sport_tags: ["sport_basketball"],
        energy_fit: ["low", "medium"],
        stimulus: ["scapular_control"],
      },
      exercise_role: "mobility",
    });
    expect(exerciseEligibleForWorkingBlock(ytw, "power", lowerBodyConstraints)).toBe(false);
  });

  it("accepts lower-body plyo in power block on lower-body day", () => {
    const boxJump = makeEx({
      id: "box_jump",
      name: "Box Jump",
      modality: "power",
      movement_pattern: "locomotion",
      muscle_groups: ["legs", "quads", "glutes"],
      primary_movement_family: "lower_body",
      tags: {
        goal_tags: ["power"],
        sport_tags: ["sport_basketball"],
        energy_fit: ["medium", "high"],
        stimulus: ["plyometric"],
      },
    });
    expect(exerciseEligibleForWorkingBlock(boxJump, "power", lowerBodyConstraints)).toBe(true);
  });

  it("rejects calf raise in conditioning block even on lower-body day", () => {
    const calf = makeEx({
      id: "calf_raise",
      name: "Calf Raise",
      modality: "strength",
      muscle_groups: ["calves"],
      primary_movement_family: "lower_body",
      exercise_role: "isolation",
      tags: {
        goal_tags: ["strength", "hypertrophy"],
        sport_tags: ["sport_basketball"],
        energy_fit: ["medium"],
      },
    });
    expect(exerciseEligibleForWorkingBlock(calf, "conditioning", lowerBodyConstraints)).toBe(false);
  });

  it("rejects burpee in power block when session has change_of_direction sub-focus", () => {
    const burpee = makeEx({
      id: "burpee",
      name: "Burpee",
      modality: "conditioning",
      movement_pattern: "locomotion",
      muscle_groups: ["legs", "core", "push"],
      primary_movement_family: "full_body",
      tags: {
        goal_tags: ["endurance"],
        sport_tags: ["sport_lacrosse"],
        energy_fit: ["high"],
        stimulus: ["plyometric", "anaerobic"],
        attribute_tags: ["intervals_hiit"],
      },
    });
    const codInput = asInput({
      sport_sub_focus: { lacrosse: ["change_of_direction"] },
    });
    expect(
      isExerciseEligibleForBlock(burpee, {
        blockType: "power",
        constraints: lowerBodyConstraints,
        input: codInput,
      })
    ).toBe(false);
  });

  it("rejects vertical_jump assessment from power block", () => {
    const vjTest = makeEx({
      id: "vertical_jump",
      name: "Vertical Jump",
      modality: "power",
      movement_pattern: "locomotion",
      muscle_groups: ["legs"],
      primary_movement_family: "lower_body",
      tags: {
        goal_tags: ["power"],
        sport_tags: [],
        energy_fit: ["medium"],
        stimulus: ["plyometric"],
      },
    });
    expect(isAssessmentExercise(vjTest)).toBe(true);
    expect(
      isExerciseEligibleForBlock(vjTest, { blockType: "power", constraints: lowerBodyConstraints })
    ).toBe(false);
  });

  it("rejects leg press in power blocks for athletic vertical_jump sessions", () => {
    const legPress = makeEx({
      id: "leg_press",
      name: "Leg Press",
      modality: "power",
      movement_pattern: "squat",
      equipment_required: ["leg_press"],
      muscle_groups: ["quads"],
      tags: {
        goal_tags: ["power"],
        sport_tags: [],
        energy_fit: ["medium"],
      },
    });
    const vjInput = asInput({
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_slugs: ["basketball"],
    });
    expect(
      isExerciseEligibleForBlock(legPress, {
        blockType: "power",
        constraints: lowerBodyConstraints,
        input: vjInput,
      })
    ).toBe(false);
  });
});
