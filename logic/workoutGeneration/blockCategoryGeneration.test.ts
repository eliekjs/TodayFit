/**
 * Integration tests: when conditioning / accessory / cooldown blocks appear in generated workouts
 * and which exercises land in each category.
 *
 * Run: npx vitest run logic/workoutGeneration/blockCategoryGeneration.test.ts
 */

import { describe, it, expect } from "vitest";
import type { ManualPreferences } from "../../lib/types";
import type { Exercise } from "./types";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import {
  hasMetabolicConditioningSignal,
  isConditioningEligible,
  isRecoveryCooldownEligible,
  isSprintMechanicsDrill,
} from "./blockSelectionEligibility";
import { resolveBlockStructureProfile } from "../../data/sportSubFocus/subFocusIntentRegistry";
import type { GymProfile } from "../../data/gymProfiles";

const GYM = {
  id: "block_category_test",
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
    "plyo_box",
    "medicine_ball",
    "trap_bar",
    "assault_bike",
  ],
  // Cast: includes test-only "medicine_ball" (not a canonical EquipmentKey).
} as GymProfile;

/** Exercises injected to verify rejection/selection behavior in full generation. */
const TRAP_EXERCISES: Exercise[] = [
  {
    id: "figure_8",
    name: "Figure 8",
    movement_pattern: "locomotion",
    muscle_groups: ["legs"],
    modality: "conditioning",
    equipment_required: ["bodyweight"],
    difficulty: 2,
    time_cost: "low",
    primary_movement_family: "lower_body",
    exercise_role: "conditioning",
    tags: {
      goal_tags: ["power"],
      sport_tags: ["sport_volleyball"],
      energy_fit: ["medium", "high"],
      stimulus: ["aerobic_zone2"],
      attribute_tags: ["speed", "change_of_direction"],
    },
  },
  {
    id: "tibialis_raise",
    name: "Tibialis Raise",
    movement_pattern: "squat",
    muscle_groups: ["calves"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    primary_movement_family: "lower_body",
    exercise_role: "mobility",
    tags: {
      goal_tags: ["mobility"],
      sport_tags: ["sport_volleyball"],
      energy_fit: ["low"],
      attribute_tags: ["prehab"],
    },
  },
  {
    id: "childs_pose",
    name: "Child's Pose",
    movement_pattern: "rotate",
    muscle_groups: ["core"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    exercise_role: "stretch",
    stretch_targets: ["low_back", "hips"],
    tags: {
      goal_tags: ["mobility", "recovery"],
      sport_tags: [],
      energy_fit: ["low"],
    },
    cooldown_relevance: "high",
  },
  {
    id: "assault_bike_intervals",
    name: "Assault Bike Intervals",
    movement_pattern: "locomotion",
    muscle_groups: ["legs"],
    modality: "conditioning",
    equipment_required: ["assault_bike"],
    difficulty: 2,
    time_cost: "medium",
    primary_movement_family: "lower_body",
    exercise_role: "conditioning",
    tags: {
      goal_tags: ["conditioning"],
      sport_tags: [],
      energy_fit: ["high"],
      stimulus: ["anaerobic"],
    },
  },
];

function synthSportLowerPool(sportTag: string): Exercise[] {
  const baseTags = {
    goal_tags: ["power", "athleticism"],
    sport_tags: [sportTag],
    energy_fit: ["medium", "high"],
  };
  return [
    {
      id: `${sportTag}_box_jump`,
      name: "Box Jump",
      movement_pattern: "locomotion",
      muscle_groups: ["legs", "quads", "glutes"],
      modality: "power",
      equipment_required: ["plyo_box"],
      difficulty: 2,
      time_cost: "low",
      tags: { ...baseTags, stimulus: ["plyometric"], attribute_tags: ["explosive_power", "jumping"] },
      exercise_role: "accessory",
      impact_level: "high",
      primary_movement_family: "lower_body",
    },
    {
      id: `${sportTag}_bulgarian_split_squat`,
      name: "Bulgarian Split Squat",
      movement_pattern: "squat",
      muscle_groups: ["quads", "glutes"],
      modality: "strength",
      equipment_required: ["dumbbells"],
      difficulty: 2,
      time_cost: "medium",
      tags: { ...baseTags, goal_tags: ["strength"], attribute_tags: ["single_leg_strength"] },
      exercise_role: "accessory",
      unilateral: true,
      primary_movement_family: "lower_body",
    },
    {
      id: `${sportTag}_barbell_back_squat`,
      name: "Barbell Back Squat",
      movement_pattern: "squat",
      muscle_groups: ["quads", "glutes"],
      modality: "strength",
      equipment_required: ["barbell", "squat_rack"],
      difficulty: 2,
      time_cost: "medium",
      tags: { ...baseTags, goal_tags: ["strength", "power"], attribute_tags: ["squat_pattern"] },
      exercise_role: "main_compound",
      primary_movement_family: "lower_body",
    },
  ] as Exercise[];
}

type ScenarioSpec = {
  label: string;
  prefs: ManualPreferences;
  sportCtx?: SportGoalContext;
  seed: number;
  expectConditioning: boolean | "maybe";
  expectAccessory: boolean | "maybe";
  expectCooldown: boolean | "maybe";
  expectPower?: boolean;
};

function generateForScenario(spec: ScenarioSpec) {
  const input = manualPreferencesToGenerateWorkoutInput(
    spec.prefs,
    GYM,
    spec.seed,
    undefined,
    spec.sportCtx
  );
  const sportSlug = spec.sportCtx?.sport_slugs?.[0] ?? "generic";
  const pool = [...STUB_EXERCISES, ...TRAP_EXERCISES, ...synthSportLowerPool(sportSlug)];
  const session = generateWorkoutSession(input, pool);
  return { session, input, pool };
}

function blockTypes(session: ReturnType<typeof generateWorkoutSession>): string[] {
  return session.blocks.map((b) => b.block_type);
}

function exerciseIdsInBlock(
  session: ReturnType<typeof generateWorkoutSession>,
  blockType: string
): string[] {
  return session.blocks
    .filter((b) => b.block_type === blockType)
    .flatMap((b) => b.items.map((i) => i.exercise_id));
}

function exerciseById(pool: Exercise[], id: string): Exercise | undefined {
  return pool.find((e) => e.id === id);
}

function assertNoRejectedInBlock(
  ids: string[],
  pool: Exercise[],
  blockType: "conditioning" | "cooldown" | "accessory",
  rejectFn: (ex: Exercise) => boolean,
  label: string
) {
  for (const id of ids) {
    const ex = exerciseById(pool, id);
    if (!ex) continue;
    expect(rejectFn(ex), `${label}: ${id} should not appear in ${blockType}`).toBe(false);
  }
}

const SCENARIOS: ScenarioSpec[] = [
  {
    label: "Volleyball VJ lower 45min",
    prefs: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportCtx: {
      sport_slugs: ["volleyball"],
      sport_sub_focus: { volleyball: ["vertical_jump"] },
      sport_weight: 0.55,
    },
    seed: 66440,
    expectConditioning: true,
    expectAccessory: false,
    expectCooldown: true,
  },
  {
    label: "Basketball VJ lower 45min",
    prefs: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportCtx: {
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_weight: 0.55,
    },
    seed: 88042,
    expectConditioning: true,
    expectAccessory: false,
    expectCooldown: true,
  },
  {
    label: "Soccer repeat sprint lower 45min",
    prefs: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportCtx: {
      sport_slugs: ["soccer"],
      sport_sub_focus: { soccer: ["repeat_sprint", "deceleration"] },
      sport_weight: 0.55,
    },
    seed: 99123,
    expectConditioning: true,
    expectAccessory: false,
    expectCooldown: true,
    expectPower: true,
  },
  {
    label: "Pure strength lower 30min no sport",
    prefs: {
      primaryFocus: ["Build Strength"],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 30,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    seed: 42001,
    expectConditioning: "maybe",
    expectAccessory: true,
    expectCooldown: true,
  },
  {
    label: "Upper hypertrophy chest+arms 45min no sport",
    prefs: {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Chest", "Arms"] },
      targetBody: "Upper",
      targetModifier: ["Push"],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    seed: 55001,
    expectConditioning: false,
    expectAccessory: true,
    expectCooldown: true,
  },
  {
    label: "Lower hypertrophy glutes+legs 45min no sport (sim 8)",
    prefs: {
      primaryFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes", "Legs"] },
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    seed: 92008,
    expectConditioning: false,
    // Accessory is optional here: intent-slot allocation may give each ranked sub-goal
    // (Glutes, Legs) its own labeled main block, absorbing would-be accessory volume.
    expectAccessory: "maybe",
    expectCooldown: true,
  },
  {
    label: "Strength lower + conditioning secondary 45min",
    prefs: {
      primaryFocus: ["Build Strength", "Sport Conditioning"],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    seed: 77001,
    expectConditioning: true,
    expectAccessory: true,
    expectCooldown: true,
  },
  {
    label: "Lacrosse COD full body 45min",
    prefs: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Full",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportCtx: {
      sport_slugs: ["lacrosse"],
      sport_sub_focus: { lacrosse: ["change_of_direction"] },
      sport_weight: 0.55,
    },
    seed: 77201,
    expectConditioning: true,
    expectAccessory: false,
    expectCooldown: true,
  },
  {
    label: "Endurance primary 40min no sport",
    prefs: {
      primaryFocus: ["Improve Endurance"],
      subFocusByGoal: {},
      targetBody: "Full",
      targetModifier: [],
      durationMinutes: 40,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    seed: 66001,
    expectConditioning: true,
    expectAccessory: false,
    expectCooldown: true,
  },
  {
    label: "Recovery mobility 30min no sport",
    prefs: {
      primaryFocus: ["Recovery"],
      subFocusByGoal: {},
      targetBody: null,
      targetModifier: [],
      durationMinutes: 30,
      energyLevel: "low",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    seed: 11111,
    expectConditioning: false,
    expectAccessory: false,
    expectCooldown: true,
  },
  {
    label: "Track sprint acceleration lower 45min",
    prefs: {
      primaryFocus: [],
      subFocusByGoal: {},
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    sportCtx: {
      sport_slugs: ["track_sprinting"],
      sport_sub_focus: { track_sprinting: ["acceleration_power"] },
      sport_weight: 0.55,
    },
    seed: 88101,
    expectConditioning: true,
    expectAccessory: false,
    expectCooldown: true,
    expectPower: true,
  },
  {
    label: "Athletic performance speed/sprint lower 45min manual",
    prefs: {
      primaryFocus: ["Athletic Performance"],
      subFocusByGoal: { "Athletic Performance": ["Speed / Sprint"] },
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      workoutTier: "intermediate",
    },
    seed: 92006,
    expectConditioning: true,
    expectAccessory: false,
    expectCooldown: true,
    expectPower: true,
  },
];

describe("Block category generation scenarios", () => {
  for (const spec of SCENARIOS) {
    describe(spec.label, () => {
      it("reports block types present in session output", () => {
        const { session } = generateForScenario(spec);
        const types = blockTypes(session);
        const hasConditioning = types.includes("conditioning");
        const hasAccessory = types.includes("accessory");
        const hasCooldown = types.includes("cooldown");
        const hasPower = types.includes("power");

        if (spec.expectConditioning === true) {
          expect(hasConditioning, "expected conditioning block").toBe(true);
        } else if (spec.expectConditioning === false) {
          expect(hasConditioning, "did not expect conditioning block").toBe(false);
        }
        // "maybe" — no hard assert; documented in table

        if (spec.expectAccessory === true) {
          expect(hasAccessory, "expected at least one accessory block").toBe(true);
        } else if (spec.expectAccessory === false) {
          expect(hasAccessory, "did not expect accessory block").toBe(false);
        }

        if (spec.expectCooldown === true) {
          expect(hasCooldown, "expected cooldown block").toBe(true);
        } else if (spec.expectCooldown === false) {
          expect(hasCooldown, "did not expect cooldown block").toBe(false);
        }
        // "maybe" — no hard assert; documented in table

        if (spec.expectPower === true) {
          expect(hasPower, "expected power block").toBe(true);
        }
      });

      it("keeps COD/agility drills out of conditioning unless field-drill archetype", () => {
        const { session, pool, input } = generateForScenario(spec);
        const conditioningIds = exerciseIdsInBlock(session, "conditioning");
        const fieldDrillsOk = resolveBlockStructureProfile(input).fieldDrillConditioningEligible;
        assertNoRejectedInBlock(
          conditioningIds,
          pool,
          "conditioning",
          (ex) =>
            !fieldDrillsOk &&
            isSprintMechanicsDrill(ex) &&
            !hasMetabolicConditioningSignal(ex),
          spec.label
        );
        if (!fieldDrillsOk) {
          for (const id of conditioningIds) {
            expect(/figure_8|figure8/i.test(id), `${spec.label}: Figure 8 in conditioning`).toBe(false);
          }
        }
      });

      it("keeps prehab/isolation out of cooldown blocks", () => {
        const { session, pool } = generateForScenario(spec);
        const cooldownIds = exerciseIdsInBlock(session, "cooldown");
        assertNoRejectedInBlock(
          cooldownIds,
          pool,
          "cooldown",
          (ex) => !isRecoveryCooldownEligible(ex),
          spec.label
        );
        for (const id of cooldownIds) {
          expect(/tibialis/i.test(id), `${spec.label}: tibialis in cooldown`).toBe(false);
        }
      });

      it("uses metabolic exercises in conditioning when block exists", () => {
        const { session, pool, input } = generateForScenario(spec);
        const conditioningIds = exerciseIdsInBlock(session, "conditioning");
        if (conditioningIds.length === 0) return;

        const hasValidPick = conditioningIds.some((id) => {
          const ex = exerciseById(pool, id);
          return ex != null && isConditioningEligible(ex, { input });
        });
        expect(hasValidPick, `${spec.label}: conditioning block should pick eligible work`).toBe(
          true
        );
      });

      it("uses stretch/recovery in cooldown when block exists", () => {
        const { session, pool } = generateForScenario(spec);
        const cooldownIds = exerciseIdsInBlock(session, "cooldown");
        if (cooldownIds.length === 0) return;

        expect(cooldownIds.length).toBeGreaterThanOrEqual(2);
        const hasStretchPick = cooldownIds.some((id) => {
          const ex = exerciseById(pool, id);
          return ex != null && isRecoveryCooldownEligible(ex);
        });
        expect(hasStretchPick, `${spec.label}: cooldown should pick stretch/recovery work`).toBe(true);
      });
    });
  }
});

describe("Volleyball VJ — explicit exercise category checks", () => {
  it("selects metabolic conditioning, not Figure 8, on seed 66440", () => {
    const spec = SCENARIOS[0]!;
    const { session, pool, input } = generateForScenario(spec);
    const conditioningIds = exerciseIdsInBlock(session, "conditioning");

    expect(conditioningIds.length).toBeGreaterThan(0);
    expect(conditioningIds.some((id) => /figure_8/i.test(id))).toBe(false);

    const picked = conditioningIds.map((id) => exerciseById(pool, id)).filter(Boolean);
    expect(picked.some((ex) => ex && isConditioningEligible(ex, { input }))).toBe(true);
  });

  it("includes stretch-based cooldown without accessory blocks", () => {
    const spec = SCENARIOS[0]!;
    const { session } = generateForScenario(spec);

    expect(session.blocks.some((b) => b.block_type === "accessory")).toBe(false);
    const cooldownBlock = session.blocks.find((b) => b.block_type === "cooldown");
    expect(cooldownBlock).toBeDefined();
    expect((cooldownBlock?.items.length ?? 0)).toBeGreaterThanOrEqual(2);
    expect(
      cooldownBlock!.items.every((i) => !/tibialis/i.test(i.exercise_id))
    ).toBe(true);
  });
});
