import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import type { GymProfile } from "../../data/gymProfiles";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { Exercise } from "./types";

const TEST_GYM: GymProfile = {
  id: "test_gym",
  name: "Test Gym",
  equipment: [
    "squat_rack",
    "barbell",
    "bench",
    "dumbbells",
    "kettlebells",
    "cable_machine",
    "pullup_bar",
    "bodyweight",
    "plyo_box",
  ],
};

function basePrefs(overrides: Partial<ManualPreferences> = {}): ManualPreferences {
  return {
    primaryFocus: ["Athletic Performance", "Calisthenics"],
    targetBody: "Upper",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {
      "Athletic Performance": [
        "Upper body power",
        "Lower body power / Plyos",
        "Vertical jump",
      ],
      Calisthenics: ["Pull Ups"],
    },
    goalMatchPrimaryPct: 62,
    goalMatchSecondaryPct: 38,
    goalMatchTertiaryPct: 0,
    goalDistributionStyle: "dedicate_days",
    workoutStyle: [],
    workoutTier: "intermediate",
    weekSubFocusPrimaryLabels: ["Athletic Performance", "Calisthenics"],
    ...overrides,
  };
}

const SYNTH_UPPER_POWER: Exercise[] = [
  {
    id: "cable_pull_throughs",
    name: "Cable Pull Throughs",
    movement_pattern: "hinge",
    muscle_groups: ["glutes", "hamstrings"],
    modality: "power",
    equipment_required: ["cable_machine"],
    difficulty: 2,
    time_cost: "medium",
    tags: {
      goal_tags: ["power"],
      attribute_tags: ["lower_body_power_plyos", "power"],
      stimulus: ["plyometric"],
    },
    primary_movement_family: "lower_body",
    movement_patterns: ["hinge"],
  },
  {
    id: "med_ball_slam",
    name: "Med Ball Slam",
    movement_pattern: "push",
    muscle_groups: ["shoulders", "core"],
    modality: "power",
    equipment_required: ["bodyweight"],
    difficulty: 2,
    time_cost: "low",
    tags: {
      goal_tags: ["power"],
      attribute_tags: ["upper_body_power", "power"],
      stimulus: ["plyometric"],
    },
    primary_movement_family: "upper_push",
    movement_patterns: ["vertical_push"],
  },
  {
    id: "dumbbell_push_press",
    name: "Dumbbell Push Press",
    movement_pattern: "push",
    muscle_groups: ["shoulders", "triceps"],
    modality: "power",
    equipment_required: ["dumbbells"],
    difficulty: 2,
    time_cost: "medium",
    tags: {
      goal_tags: ["power"],
      attribute_tags: ["upper_body_power", "power"],
      stimulus: ["plyometric"],
    },
    primary_movement_family: "upper_push",
    movement_patterns: ["vertical_push"],
  },
];

describe("power upper body weekly day 1", () => {
  const pool = [...STUB_EXERCISES, ...SYNTH_UPPER_POWER];

  it("adapter keeps only upper_body_power when target is Upper", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      basePrefs({ primaryFocus: ["Athletic Performance", "Calisthenics"] }),
      TEST_GYM,
      "power-upper-adapter"
    );
    expect(input.primary_goal).toBe("athletic_performance");
    expect(input.focus_body_parts).toEqual(["upper_push", "upper_pull"]);
    expect(input.goal_sub_focus?.power).toEqual(["upper_body_power"]);
  });

  it("session title reflects primary power upper focus, not all weekly goals", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(), TEST_GYM, "power-upper-title");
    const session = generateWorkoutSession(input, pool);
    expect(session.title.toLowerCase()).toContain("upper body power");
    expect(session.title.toLowerCase()).toContain("upper body");
    expect(session.title).not.toMatch(/calisthenics/i);
    expect(session.title).not.toMatch(/lower body power/i);
  });

  it("power block avoids lower-body hinge pull-throughs on upper-only days", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(), TEST_GYM, "power-upper-pool");
    const session = generateWorkoutSession(input, pool);
    const powerBlocks = session.blocks.filter((b) => b.block_type === "power");
    expect(powerBlocks.length).toBeGreaterThan(0);
    const names = powerBlocks.flatMap((b) => b.items.map((i) => i.exercise_name.toLowerCase()));
    expect(names.some((n) => n.includes("pull through"))).toBe(false);
    expect(names.some((n) => n.includes("slam") || n.includes("push press"))).toBe(true);
  });

  it("calisthenics secondary block uses calisthenics title, not main hypertrophy", () => {
    const input = manualPreferencesToGenerateWorkoutInput(basePrefs(), TEST_GYM, "power-upper-cal-title");
    const session = generateWorkoutSession(input, pool);
    const secondaryBlock = session.blocks.find(
      (b) =>
        b.goal_intent?.goal_slug === "calisthenics" &&
        b.block_type === "main_hypertrophy"
    );
    if (secondaryBlock) {
      expect(secondaryBlock.title).toMatch(/calisthenics/i);
      expect(secondaryBlock.title).not.toMatch(/main hypertrophy/i);
    }
  });
});
