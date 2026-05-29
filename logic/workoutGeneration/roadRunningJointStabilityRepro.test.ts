/**
 * Road running + joint-stability / durability sub-goals: must generate without throwing.
 * Regression for unified specialty blocks + road pattern transfer coverage evaluation.
 */
import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
} from "../../lib/dailyGeneratorAdapter";
import { generateWorkoutSession } from "./dailyGenerator";
import { evaluateRoadMinimumCoverage } from "./sportPatternTransfer/runningFamily/roadRunningRules";
import type { SportCoverageContext } from "./sportPatternTransfer/types";

const GYM = {
  id: "test_gym",
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
    "pullup_bar",
    "treadmill",
    "rowing_machine",
  ],
};

const pool = EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(
  exerciseDefinitionToGeneratorExercise
);

describe("road running joint stability sub-goals", () => {
  it("generates session for knee_stability + ankle_stability + durability without runtime error", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        primaryFocus: ["Sport preparation"],
        targetBody: "Full",
        targetModifier: [],
        durationMinutes: 45,
        energyLevel: "medium",
        injuries: [],
        upcoming: [],
        subFocusByGoal: {},
        subFocusPctByGoal: {},
        workoutStyle: [],
        workoutTier: "intermediate",
        includeCreativeVariations: false,
      },
      GYM,
      "road-joint-stability-repro",
      undefined,
      {
        sport_slugs: ["road_running"],
        sport_sub_focus: {
          road_running: ["knee_stability", "ankle_stability", "durability"],
        },
        sport_weight: 1,
      }
    );

    const session = generateWorkoutSession(input, pool);
    expect(session.blocks.length).toBeGreaterThan(0);
  });

  it("evaluateRoadMinimumCoverage ignores exercise ids missing from lookup map", () => {
    const ctx: SportCoverageContext = {
      hasMainStrengthBlock: false,
      hasConditioningBlock: true,
      trainingBlockCount: 2,
    };
    const byType = new Map<string, string[]>([["conditioning", ["missing_exercise_id"]]]);
    expect(() =>
      evaluateRoadMinimumCoverage(ctx, byType, new Map())
    ).not.toThrow();
  });
});
