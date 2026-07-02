/**
 * Vertical jump sub-focus generation: lower-body plyometrics over med-ball throws across sports.
 *
 * Run: npx vitest run logic/workoutGeneration/verticalJumpGeneration.test.ts
 */

import { describe, it, expect } from "vitest";
import type { ManualPreferences } from "../../lib/types";
import type { Exercise } from "./types";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";
import { generateWorkoutSession, scoreExercise } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import {
  exerciseMatchesSportSubFocusForCoverage,
  exerciseMatchesSportSubFocusSlug,
} from "./subFocusSlugMatch";
import { isMainWorkCandidateForIntentEntry } from "./intentSlotAllocator";
import type { IntentEntry } from "./sessionIntentContract";
import type { GymProfile } from "../../data/gymProfiles";

// Cast: includes test-only "medicine_ball" (not a canonical EquipmentKey) so med-ball fixtures stay equipment-eligible.
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
    "plyo_box",
    "medicine_ball",
    "trap_bar",
  ],
} as GymProfile;

function synthVerticalJumpPool(sportTag: string): Exercise[] {
  const baseTags = {
    goal_tags: ["power", "athleticism"],
    sport_tags: [sportTag],
    energy_fit: ["medium", "high"],
  };

  return [
    {
      id: `${sportTag}_med_ball_vertical_toss`,
      name: "Med Ball Vertical Toss",
      movement_pattern: "push",
      muscle_groups: ["core", "shoulders"],
      modality: "power",
      equipment_required: ["medicine_ball"],
      difficulty: 2,
      time_cost: "low",
      tags: {
        ...baseTags,
        stimulus: ["plyometric"],
        attribute_tags: ["explosive_power", "power"],
      },
      exercise_role: "accessory",
      impact_level: "low",
    },
    {
      id: `${sportTag}_seated_med_ball_toss`,
      name: "Seated Med Ball Toss",
      movement_pattern: "push",
      muscle_groups: ["core"],
      modality: "power",
      equipment_required: ["medicine_ball"],
      difficulty: 2,
      time_cost: "low",
      tags: {
        ...baseTags,
        stimulus: ["plyometric"],
        attribute_tags: ["explosive_power"],
      },
      exercise_role: "accessory",
      impact_level: "low",
    },
    {
      id: `${sportTag}_med_ball_slam`,
      name: "Med Ball Slam",
      movement_pattern: "hinge",
      muscle_groups: ["core", "legs"],
      modality: "power",
      equipment_required: ["medicine_ball"],
      difficulty: 2,
      time_cost: "low",
      tags: {
        ...baseTags,
        stimulus: ["plyometric"],
        attribute_tags: ["explosive_power", "power"],
      },
      exercise_role: "accessory",
      impact_level: "medium",
    },
    {
      id: `${sportTag}_box_jump`,
      name: "Box Jump",
      movement_pattern: "locomotion",
      muscle_groups: ["legs", "quads", "glutes"],
      modality: "power",
      equipment_required: ["plyo_box"],
      difficulty: 2,
      time_cost: "low",
      tags: {
        ...baseTags,
        stimulus: ["plyometric"],
        attribute_tags: ["explosive_power", "plyometric", "jumping"],
      },
      exercise_role: "accessory",
      impact_level: "high",
      primary_movement_family: "lower_body",
    },
    {
      id: `${sportTag}_pogo_jump`,
      name: "Pogo Jump",
      movement_pattern: "locomotion",
      muscle_groups: ["legs", "calves"],
      modality: "power",
      equipment_required: ["bodyweight"],
      difficulty: 2,
      time_cost: "low",
      tags: {
        ...baseTags,
        stimulus: ["plyometric"],
        attribute_tags: ["reactive_power", "jumping"],
      },
      exercise_role: "accessory",
      impact_level: "medium",
      primary_movement_family: "lower_body",
    },
    {
      id: `${sportTag}_depth_drop`,
      name: "Depth Drop",
      movement_pattern: "locomotion",
      muscle_groups: ["legs", "quads", "glutes"],
      modality: "power",
      equipment_required: ["plyo_box"],
      difficulty: 3,
      time_cost: "low",
      tags: {
        ...baseTags,
        stimulus: ["plyometric"],
        attribute_tags: ["reactive_power", "explosive_power", "jumping"],
      },
      exercise_role: "accessory",
      impact_level: "high",
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
      tags: {
        ...baseTags,
        goal_tags: ["strength", "power"],
        attribute_tags: ["squat_pattern", "compound"],
      },
      exercise_role: "main_compound",
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
      tags: {
        ...baseTags,
        goal_tags: ["strength"],
        attribute_tags: ["single_leg_strength", "squat_pattern"],
      },
      exercise_role: "accessory",
      unilateral: true,
      primary_movement_family: "lower_body",
    },
    {
      id: `${sportTag}_trap_bar_deadlift`,
      name: "Trap Bar Deadlift",
      movement_pattern: "hinge",
      muscle_groups: ["glutes", "hamstrings"],
      modality: "strength",
      equipment_required: ["trap_bar"],
      difficulty: 2,
      time_cost: "medium",
      tags: {
        ...baseTags,
        goal_tags: ["strength"],
        attribute_tags: ["hinge_pattern", "posterior_chain"],
      },
      exercise_role: "main_compound",
      primary_movement_family: "lower_body",
    },
  ] as Exercise[];
}

function allExerciseIds(session: ReturnType<typeof generateWorkoutSession>): string[] {
  return session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
}

describe("vertical jump generation", () => {
  it("excludes med-ball throws from vertical_jump slug matching", () => {
    const medBall = synthVerticalJumpPool("basketball")[0]!;
    expect(exerciseMatchesSportSubFocusSlug(medBall, "basketball", "vertical_jump")).toBe(false);
    expect(exerciseMatchesSportSubFocusForCoverage(medBall, "basketball", "vertical_jump")).toBe(
      false
    );
  });

  it("scores lower-body plyometrics above med-ball throws for basketball vertical_jump", () => {
    const pool = synthVerticalJumpPool("basketball");
    const medBall = pool.find((e) => e.id.includes("med_ball_vertical_toss"))!;
    const boxJump = pool.find((e) => e.id.includes("box_jump"))!;
    const prefs: ManualPreferences = {
      primaryFocus: ["Athletic Performance"],
      targetBody: "Lower",
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
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_weight: 0.5,
    };
    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 88001, undefined, sportCtx);
    const recent = new Set<string>();
    const counts = new Map<string, number>();
    const medScore = scoreExercise(medBall, input, recent, counts, undefined, { blockType: "power" })
      .score;
    const plyoScore = scoreExercise(boxJump, input, recent, counts, undefined, {
      blockType: "power",
    }).score;
    expect(plyoScore).toBeGreaterThan(medScore);
  });

  it("generates basketball vertical_jump sessions with plyometrics not med-ball throws", () => {
    const prefs: ManualPreferences = {
      primaryFocus: ["Athletic Performance"],
      targetBody: "Lower",
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
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_weight: 0.5,
    };
    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 88002, undefined, sportCtx);
    const pool = [...STUB_EXERCISES, ...synthVerticalJumpPool("basketball")];
    const session = generateWorkoutSession(input, pool);
    const ids = allExerciseIds(session);

    expect(ids.some((id) => /med_ball|medicine_ball/.test(id))).toBe(false);
    expect(ids.some((id) => /box_jump|pogo_jump|depth_drop/.test(id))).toBe(true);
    expect(ids.some((id) => /back_squat|bulgarian|trap_bar/.test(id))).toBe(true);
  });

  it("generates cycling + athletic vertical_jump goal with same plyo/strength bias", () => {
    const prefs: ManualPreferences = {
      primaryFocus: ["Athletic Performance"],
      targetBody: "Lower",
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      subFocusByGoal: { "Athletic Performance": ["Vertical jump"] },
      workoutStyle: [],
      workoutTier: "intermediate",
    };
    const sportCtx: SportGoalContext = {
      sport_slugs: ["cycling"],
      sport_sub_focus: { cycling: ["leg_strength"] },
      sport_weight: 0.4,
    };
    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 88003, undefined, sportCtx);
    const pool = [...STUB_EXERCISES, ...synthVerticalJumpPool("cycling")];
    const session = generateWorkoutSession(input, pool);
    const ids = allExerciseIds(session);

    expect(ids.some((id) => /med_ball|medicine_ball/.test(id))).toBe(false);
    expect(ids.some((id) => /box_jump|pogo_jump|depth_drop/.test(id))).toBe(true);
  });

  it("keeps upper-back mobility out of lower-body power blocks after sport proportion repair", () => {
    const prefs: ManualPreferences = {
      primaryFocus: [],
      targetBody: "Lower",
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
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_weight: 0.6,
    };
    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 88042, undefined, sportCtx);
    const pool = [
      ...STUB_EXERCISES,
      ...synthVerticalJumpPool("basketball"),
      {
        id: "basketball_ytw",
        name: "Y-T-W Raise",
        movement_pattern: "pull",
        muscle_groups: ["upper_back", "shoulders"],
        modality: "mobility",
        equipment_required: ["dumbbells"],
        difficulty: 1,
        time_cost: "low",
        tags: {
          goal_tags: ["mobility"],
          sport_tags: ["sport_basketball"],
          energy_fit: ["low", "medium"],
          stimulus: ["scapular_control"],
        },
        exercise_role: "mobility",
      } as Exercise,
    ];
    const session = generateWorkoutSession(input, pool);
    const powerItems = session.blocks
      .filter((b) => b.block_type === "power")
      .flatMap((b) => b.items.map((i) => i.exercise_id));
    expect(powerItems.some((id) => /ytw/i.test(id))).toBe(false);
  });

  it("keeps isolation strength out of conditioning blocks after sport proportion repair", () => {
    const prefs: ManualPreferences = {
      primaryFocus: [],
      targetBody: "Lower",
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
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      sport_weight: 0.6,
    };
    const input = manualPreferencesToGenerateWorkoutInput(prefs, GYM, 88042, undefined, sportCtx);
    const pool = [
      ...STUB_EXERCISES,
      ...synthVerticalJumpPool("basketball"),
      {
        id: "basketball_calf_raise",
        name: "Calf Raise",
        movement_pattern: "squat",
        muscle_groups: ["calves"],
        modality: "strength",
        equipment_required: ["bodyweight"],
        difficulty: 1,
        time_cost: "low",
        primary_movement_family: "lower_body",
        tags: {
          goal_tags: ["strength", "hypertrophy"],
          sport_tags: ["sport_basketball"],
          energy_fit: ["medium"],
        },
        exercise_role: "isolation",
      } as Exercise,
      {
        id: "basketball_assault_bike",
        name: "Assault Bike Intervals",
        movement_pattern: "locomotion",
        muscle_groups: ["legs"],
        modality: "conditioning",
        equipment_required: ["bodyweight"],
        difficulty: 2,
        time_cost: "medium",
        primary_movement_family: "lower_body",
        tags: {
          goal_tags: ["conditioning"],
          sport_tags: ["sport_basketball"],
          energy_fit: ["high"],
          stimulus: ["anaerobic"],
        },
        exercise_role: "conditioning",
      } as Exercise,
    ];
    const session = generateWorkoutSession(input, pool);
    const conditioningItems = session.blocks
      .filter((b) => b.block_type === "conditioning")
      .flatMap((b) => b.items.map((i) => i.exercise_id));
    for (const id of conditioningItems) {
      expect(/calf_raise|calf raise/i.test(id)).toBe(false);
    }
  });

  it("blocks med-ball throws from vertical_jump main-work candidate slots", () => {
    const entry: IntentEntry = {
      kind: "sport_sub_focus",
      slug: "vertical_jump",
      parent_slug: "basketball",
      rank: 1,
      weight: 0.5,
      tag_slugs: ["explosive_power", "plyometric"],
    };
    const medBall = synthVerticalJumpPool("basketball")[0]!;
    const boxJump = synthVerticalJumpPool("basketball")[3]!;
    expect(isMainWorkCandidateForIntentEntry(medBall, entry, "power")).toBe(false);
    expect(isMainWorkCandidateForIntentEntry(boxJump, entry, "power")).toBe(true);
  });
});
