/**
 * Multi-sport sub-focus: every selected sport sub-goal should appear on ≥1 training exercise
 * (session_intent_links / matched_intents). Sport intent coverage post-pass in dailyGenerator.
 *
 * Run: npx vitest run logic/workoutGeneration/sportSubFocusSessionCoverage.test.ts
 */

import { describe, it, expect } from "vitest";
import type { ManualPreferences } from "../../lib/types";
import type { Exercise } from "./types";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import {
  exerciseMatchesSportSubFocusSlug,
  exerciseMatchesSportSubFocusForCoverage,
} from "./subFocusSlugMatch";

const GYM = {
  id: "test",
  name: "Test Gym",
  equipment: [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable_machine",
    "squat_rack",
    "leg_press",
    "kettlebells",
  ],
};

const SYNTH_GOLF_ROT: Exercise = {
  id: "synth_golf_rotational_power",
  name: "Synthetic Golf Rotational Pattern",
  movement_pattern: "rotate",
  muscle_groups: ["core", "shoulders"],
  modality: "strength",
  equipment_required: ["cable_machine"],
  difficulty: 2,
  time_cost: "low",
  tags: {
    goal_tags: ["athleticism", "power"],
    sport_tags: ["golf"],
    energy_fit: ["low", "medium", "high"],
    attribute_tags: ["rotation", "explosive_power", "core_anti_rotation"],
  },
  primary_movement_family: "core",
  exercise_role: "accessory",
  stability_demand: "medium",
  impact_level: "low",
};

const SYNTH_RUGBY_SPEED: Exercise = {
  id: "synth_rugby_speed_power",
  name: "Synthetic Rugby Speed–Power",
  movement_pattern: "squat",
  muscle_groups: ["legs"],
  modality: "strength",
  equipment_required: ["bodyweight"],
  difficulty: 2,
  time_cost: "low",
  tags: {
    goal_tags: ["athleticism", "power"],
    sport_tags: ["rugby"],
    energy_fit: ["low", "medium", "high"],
    stimulus: ["plyometric"],
    attribute_tags: ["speed", "explosive_power"],
  },
  primary_movement_family: "lower_body",
  exercise_role: "accessory",
  stability_demand: "medium",
  impact_level: "medium",
};

const CLIMBING_PROPORTION_EXERCISES: Exercise[] = [
  "lockoff_pull",
  "finger_grip_curl",
  "scapular_pull",
  "hollow_body_lockoff",
  "forearm_pronation",
  "cable_high_row_climb",
].map((id, idx) => ({
  id: `synth_climb_${id}`,
  name: `Synthetic Climb ${idx + 1}`,
  movement_pattern: idx % 3 === 0 ? "pull" : idx % 3 === 1 ? "carry" : "rotate",
  muscle_groups: ["back", "arms", "core"],
  modality: idx % 2 === 0 ? "strength" : "hypertrophy",
  equipment_required: idx % 2 === 0 ? ["bodyweight"] : ["dumbbells"],
  difficulty: 2,
  time_cost: "low",
  tags: {
    goal_tags: ["hypertrophy", "strength"],
    sport_tags: ["rock_climbing"],
    energy_fit: ["low", "medium", "high"],
    stimulus: ["grip"],
    attribute_tags: ["grip_strength", "lockoff_strength", "scapular_control"],
  },
  exercise_role: idx < 2 ? "accessory" : "main_compound",
  primary_movement_family: "upper_pull",
  stability_demand: "medium",
  grip_demand: "high",
})) as Exercise[];

const RUGBY_PROPORTION_EXERCISES: Exercise[] = [
  "sprint_bound",
  "decel_split_squat",
  "lateral_shuttle",
  "reactive_step_drop",
  "single_leg_power",
].map((id, idx) => ({
  id: `synth_rugby_${id}`,
  name: `Synthetic Rugby ${idx + 1}`,
  movement_pattern: idx % 2 === 0 ? "locomotion" : "squat",
  muscle_groups: ["legs", "core"],
  modality: "strength",
  equipment_required: ["bodyweight"],
  difficulty: 2,
  time_cost: "low",
  tags: {
    goal_tags: ["athleticism", "power"],
    sport_tags: ["rugby"],
    energy_fit: ["low", "medium", "high"],
    stimulus: ["plyometric"],
    attribute_tags: ["speed", "explosive_power"],
  },
  exercise_role: idx < 2 ? "accessory" : "main_compound",
  primary_movement_family: "lower_body",
  stability_demand: "medium",
  impact_level: "medium",
})) as Exercise[];

describe("sport sub-focus session coverage", () => {
  it("sport sub-focus tag map + sport tag for coverage vs tag-only match", () => {
    expect(exerciseMatchesSportSubFocusSlug(SYNTH_RUGBY_SPEED, "rugby", "speed_power")).toBe(true);
    expect(exerciseMatchesSportSubFocusSlug(SYNTH_GOLF_ROT, "golf", "rotational_power")).toBe(true);
    // Tag overlap alone can match another sport’s map; coverage requires sport_tags.
    expect(exerciseMatchesSportSubFocusSlug(SYNTH_GOLF_ROT, "rugby", "speed_power")).toBe(true);
    expect(exerciseMatchesSportSubFocusForCoverage(SYNTH_GOLF_ROT, "rugby", "speed_power")).toBe(false);
    expect(exerciseMatchesSportSubFocusForCoverage(SYNTH_RUGBY_SPEED, "rugby", "speed_power")).toBe(true);
  });

  it("adds coverage so both golf and rugby sport_sub_focus appear in matched_intents on training work", () => {
    const prefs: ManualPreferences = {
      primaryFocus: ["Athletic Performance"],
      targetBody: "Full body",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      subFocusByGoal: {},
      workoutStyle: [],
      workoutTier: "intermediate",
    };

    const sportCtx: SportGoalContext = {
      sport_slugs: ["golf", "rugby"],
      sport_sub_focus: {
        golf: ["rotational_power"],
        rugby: ["speed_power"],
      },
      sport_weight: 0.5,
    };

    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 77_001, undefined, sportCtx);
    const pool = [...STUB_EXERCISES, SYNTH_GOLF_ROT, SYNTH_RUGBY_SPEED];

    const session = generateWorkoutSession(input, pool);
    const trainingItems = session.blocks
      .filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown")
      .flatMap((b) => b.items);

    const hasRugbySubInMatched = trainingItems.some((item) =>
      (item.session_intent_links?.matched_intents ?? []).some(
        (m) =>
          m.kind === "sport_sub_focus" && m.slug === "speed_power" && m.parent_slug === "rugby"
      )
    );
    const hasGolfSubInMatched = trainingItems.some((item) =>
      (item.session_intent_links?.matched_intents ?? []).some(
        (m) =>
          m.kind === "sport_sub_focus" &&
          m.slug === "rotational_power" &&
          m.parent_slug === "golf"
      )
    );

    expect(hasRugbySubInMatched).toBe(true);
    expect(hasGolfSubInMatched).toBe(true);

    const coverageBlock = session.blocks.find((b) => b.title === "Sport intent coverage");
    expect(coverageBlock).toBeTruthy();
    expect(coverageBlock!.items.some((i) => i.exercise_id === SYNTH_RUGBY_SPEED.id)).toBe(true);
  });

  it.each([
    { sportWeight: 0.2 },
    { sportWeight: 0.35 },
    { sportWeight: 0.5 },
    { sportWeight: 0.65 },
    { sportWeight: 0.8 },
  ])("repairs selected exercises so climbing share is represented for sportWeight=$sportWeight", ({ sportWeight }) => {
    const prefs: ManualPreferences = {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      targetBody: "Full body",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      subFocusByGoal: {},
      workoutStyle: [],
      workoutTier: "intermediate",
    };

    const sportCtx: SportGoalContext = {
      sport_slugs: ["rock_climbing"],
      sport_weight: sportWeight,
      goal_weights: [1],
    };

    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 88_001, undefined, sportCtx);
    const session = generateWorkoutSession(input, [...STUB_EXERCISES, ...CLIMBING_PROPORTION_EXERCISES]);
    const trainingItems = session.blocks
      .filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown")
      .flatMap((b) => b.items);

    const climbingTagged = trainingItems.filter((item) =>
      (item.session_intent_links?.sport_slugs ?? []).includes("rock_climbing")
    );

    const target = Math.round(trainingItems.length * sportWeight);
    expect(climbingTagged.length).toBeGreaterThanOrEqual(Math.max(1, target));
  });

  it("handles multi-sport proportional coverage (rock_climbing + rugby) at 70% sport share", () => {
    const prefs: ManualPreferences = {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      targetBody: "Full body",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      subFocusByGoal: {},
      workoutStyle: [],
      workoutTier: "intermediate",
    };
    const sportCtx: SportGoalContext = {
      sport_slugs: ["rock_climbing", "rugby"],
      sport_weight: 0.7,
      goal_weights: [1],
    };
    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 88_002, undefined, sportCtx);
    const session = generateWorkoutSession(input, [
      ...STUB_EXERCISES,
      ...CLIMBING_PROPORTION_EXERCISES,
      ...RUGBY_PROPORTION_EXERCISES,
    ]);
    const trainingItems = session.blocks
      .filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown")
      .flatMap((b) => b.items);
    const climbing = trainingItems.filter((item) =>
      (item.session_intent_links?.sport_slugs ?? []).includes("rock_climbing")
    ).length;
    const rugby = trainingItems.filter((item) =>
      (item.session_intent_links?.sport_slugs ?? []).includes("rugby")
    ).length;
    const perSportTarget = Math.floor((trainingItems.length * 0.7) / 2);
    expect(climbing).toBeGreaterThanOrEqual(Math.max(1, perSportTarget));
    expect(rugby).toBeGreaterThanOrEqual(Math.max(1, perSportTarget));
  });
});
