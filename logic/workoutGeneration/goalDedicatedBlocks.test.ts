import { describe, it, expect } from "vitest";
import { shouldUseGoalDedicatedMainBlocks } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    primary_goal: "strength",
    duration_minutes: 45,
    energy_level: "medium",
    seed: 1,
    goal_sub_focus: {
      strength: ["squat", "deadlift_hinge"],
    },
    goal_sub_focus_weights: {
      strength: [0.6, 0.4],
    },
    ...overrides,
  } as GenerateWorkoutInput;
}

describe("goal-dedicated main blocks gate", () => {
  it("returns true for strength with two sub-focuses and no sport transfer", () => {
    expect(shouldUseGoalDedicatedMainBlocks(baseInput())).toBe(true);
  });

  it("returns false with only one sub-focus", () => {
    expect(
      shouldUseGoalDedicatedMainBlocks(
        baseInput({
          goal_sub_focus: { strength: ["squat"] },
          goal_sub_focus_weights: { strength: [1] },
        })
      )
    ).toBe(false);
  });

  it("returns false for calisthenics primary", () => {
    expect(
      shouldUseGoalDedicatedMainBlocks(
        baseInput({
          primary_goal: "calisthenics",
          goal_sub_focus: {
            strength: ["squat", "deadlift_hinge"],
          },
          goal_sub_focus_weights: {
            strength: [0.5, 0.5],
          },
        })
      )
    ).toBe(false);
  });
});
