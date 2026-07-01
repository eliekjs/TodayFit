import { describe, expect, it } from "vitest";
import { buildBlockIntentProfile } from "./blockIntentProfile";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { Exercise, GenerateWorkoutInput } from "./types";

function baseInput(overrides: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "body_recomp",
    energy_level: "medium",
    available_equipment: ["bodyweight", "dumbbells", "bench", "treadmill"],
    injuries_or_constraints: [],
    seed: 9100,
    ...overrides,
  };
}

describe("body_recomp conditioning policy (blockIntentProfile)", () => {
  it("body_recomp primary only: allowConditioningBlock is false", () => {
    const profile = buildBlockIntentProfile(baseInput({}));
    expect(profile.allowConditioningBlock).toBe(false);
  });

  it("body_recomp primary only: conditioningRequired is false", () => {
    const profile = buildBlockIntentProfile(baseInput({}));
    expect(profile.conditioningRequired).toBe(false);
  });

  it("body_recomp primary only: not cardio dominant", () => {
    const profile = buildBlockIntentProfile(baseInput({}));
    expect(profile.cardioDominant).toBe(false);
  });

  it("body_recomp + conditioning secondary: allowConditioningBlock becomes true", () => {
    const profile = buildBlockIntentProfile(
      baseInput({ secondary_goals: ["conditioning"] })
    );
    expect(profile.allowConditioningBlock).toBe(true);
  });

  it("body_recomp + conditioning secondary: conditioningRequired becomes true", () => {
    const profile = buildBlockIntentProfile(
      baseInput({ secondary_goals: ["conditioning"] })
    );
    expect(profile.conditioningRequired).toBe(true);
  });

  it("body_recomp + endurance secondary: allowConditioningBlock becomes true", () => {
    const profile = buildBlockIntentProfile(
      baseInput({ secondary_goals: ["endurance"] })
    );
    expect(profile.allowConditioningBlock).toBe(true);
  });

  it("body_recomp + endurance secondary: conditioningRequired becomes true", () => {
    const profile = buildBlockIntentProfile(
      baseInput({ secondary_goals: ["endurance"] })
    );
    expect(profile.conditioningRequired).toBe(true);
  });
});

describe("body_recomp conditioning policy (generateWorkoutSession integration)", () => {
  it("body_recomp primary only → no conditioning block at medium energy", () => {
    const session = generateWorkoutSession(baseInput({}), STUB_EXERCISES);
    const hasConditioning = session.blocks.some((b) => b.block_type === "conditioning");
    expect(hasConditioning).toBe(false);
  });

  it("body_recomp primary only → no conditioning block at high energy", () => {
    const session = generateWorkoutSession(
      baseInput({ energy_level: "high", seed: 9101 }),
      STUB_EXERCISES
    );
    const hasConditioning = session.blocks.some((b) => b.block_type === "conditioning");
    expect(hasConditioning).toBe(false);
  });

  it("body_recomp + endurance secondary → conditioning block is present", () => {
    const session = generateWorkoutSession(
      baseInput({
        secondary_goals: ["endurance"],
        goal_sub_focus: { endurance: ["zone2_aerobic_base"] },
        seed: 9102,
      }),
      STUB_EXERCISES
    );
    const hasConditioning = session.blocks.some((b) => b.block_type === "conditioning");
    expect(hasConditioning).toBe(true);
  });

  it("body_recomp + conditioning secondary → conditioning block is present", () => {
    const session = generateWorkoutSession(
      baseInput({
        secondary_goals: ["conditioning"],
        seed: 9103,
      }),
      STUB_EXERCISES
    );
    const hasConditioning = session.blocks.some((b) => b.block_type === "conditioning");
    expect(hasConditioning).toBe(true);
  });

  it("body_recomp primary only → still has hypertrophy/strength main block", () => {
    const session = generateWorkoutSession(baseInput({}), STUB_EXERCISES);
    const hasMain = session.blocks.some(
      (b) => b.block_type === "main_hypertrophy" || b.block_type === "main_strength"
    );
    expect(hasMain).toBe(true);
  });
});

const lateralLowHurdleRun: Exercise = {
  id: "lateral_low_hurdle_run",
  name: "Lateral Low Hurdle Run",
  movement_pattern: "locomotion",
  muscle_groups: ["legs", "calves"],
  modality: "conditioning",
  equipment_required: ["bodyweight"],
  difficulty: 2,
  time_cost: "medium",
  tags: {
    goal_tags: ["endurance", "athleticism"],
    energy_fit: ["medium", "high"],
    stimulus: ["anaerobic", "plyometric"],
    attribute_tags: ["intervals_hiit", "agility", "reactive_speed"],
  },
  impact_level: "high",
};

const zone2Treadmill: Exercise = {
  id: "zone2_treadmill",
  name: "Zone 2 Treadmill",
  movement_pattern: "locomotion",
  muscle_groups: ["legs"],
  modality: "conditioning",
  equipment_required: ["treadmill"],
  difficulty: 1,
  time_cost: "high",
  tags: {
    goal_tags: ["endurance"],
    energy_fit: ["low", "medium", "high"],
    stimulus: ["aerobic_zone2"],
    attribute_tags: ["zone2_aerobic_base"],
  },
};

const zone2Bike: Exercise = {
  ...zone2Treadmill,
  id: "zone2_bike",
  name: "Zone 2 Bike",
  equipment_required: ["bike"],
};

const cooldownMobility: Exercise = {
  id: "hip_90_90",
  name: "90/90 Hip Switch",
  movement_pattern: "rotate",
  muscle_groups: ["legs"],
  modality: "mobility",
  equipment_required: ["bodyweight"],
  difficulty: 1,
  time_cost: "low",
  tags: { goal_tags: ["mobility", "recovery"], energy_fit: ["low", "medium", "high"] },
  cooldown_relevance: "high",
  warmup_relevance: "high",
  stretch_targets: ["glutes"],
};

const catCow: Exercise = {
  ...cooldownMobility,
  id: "cat_cow",
  name: "Cat Cow",
  muscle_groups: ["core"],
  stretch_targets: ["low_back"],
};

function enduranceQualityInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "endurance",
    energy_level: "medium",
    available_equipment: ["bodyweight", "treadmill", "bike"],
    injuries_or_constraints: [],
    goal_sub_focus: { endurance: ["intervals"] },
    seed: 4242,
    ...overrides,
  };
}

describe("endurance conditioning quality", () => {
  // Policy since 1db4c9e: agility/COD pattern drills are ineligible for conditioning blocks
  // (isConditioningEligible rejects sprint-mechanics patterns); endurance interval volume
  // goes to true cardio modalities instead of being "included but capped".
  it("excludes agility drills from endurance conditioning and uses true cardio instead", () => {
    const session = generateWorkoutSession(enduranceQualityInput(), [
      lateralLowHurdleRun,
      zone2Treadmill,
      zone2Bike,
      cooldownMobility,
      catCow,
    ]);

    const conditioningItems = session.blocks
      .filter((block) => block.block_type === "conditioning")
      .flatMap((block) => block.items);
    expect(conditioningItems.length).toBeGreaterThan(0);
    expect(
      conditioningItems.some((item) => item.exercise_id === "lateral_low_hurdle_run")
    ).toBe(false);

    const cardio = conditioningItems.find(
      (item) => item.exercise_id === "zone2_treadmill" || item.exercise_id === "zone2_bike"
    );
    expect(cardio).toBeTruthy();
    expect(cardio?.sets ?? 0).toBeGreaterThan(0);
  });

  it("does not emit placeholder muscle categories as exercise items", () => {
    const pseudoGlutes: Exercise = {
      ...lateralLowHurdleRun,
      id: "glutes",
      name: "Glutes",
      modality: "hypertrophy",
      movement_pattern: "hinge",
      tags: { goal_tags: ["hypertrophy"], energy_fit: ["low", "medium", "high"] },
    };
    const gluteBridge: Exercise = {
      ...pseudoGlutes,
      id: "glute_bridge",
      name: "Glute Bridge",
    };

    const session = generateWorkoutSession(
      enduranceQualityInput({
        primary_goal: "hypertrophy",
        goal_sub_focus: { muscle: ["glutes"] },
        available_equipment: ["bodyweight"],
      }),
      [pseudoGlutes, gluteBridge, cooldownMobility, catCow]
    );

    const names = session.blocks.flatMap((block) => block.items.map((item) => item.exercise_name));
    expect(names).not.toContain("Glutes");
    expect(names).toContain("Glute Bridge");
  });

  it("adds fallback goal intent metadata to non-prep blocks", () => {
    const session = generateWorkoutSession(enduranceQualityInput(), [
      lateralLowHurdleRun,
      zone2Treadmill,
      zone2Bike,
      cooldownMobility,
      catCow,
    ]);

    const workingBlocks = session.blocks.filter(
      (block) => block.block_type !== "warmup" && block.block_type !== "cooldown"
    );
    expect(workingBlocks.length).toBeGreaterThan(0);
    expect(workingBlocks.every((block) => block.goal_intent != null)).toBe(true);
  });
});
