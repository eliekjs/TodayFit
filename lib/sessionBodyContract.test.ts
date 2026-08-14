import { describe, expect, it } from "vitest";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { matchesBodyPartFocus } from "../logic/workoutIntelligence/constraints/eligibilityHelpers";
import type { ExerciseWithQualities } from "../logic/workoutIntelligence/types";
import {
  clampBodyChoiceToMode,
  dailyOverrideFromBodyChoice,
  inferWeeklyBodyFocusMode,
  resolveSessionBodyContract,
  sessionBiasFromDailyBodyOverride,
} from "./sessionBodyContract";

describe("session body contract", () => {
  it("infers Muscle mode from a Chest pick when weeklyBodyFocusMode is unset", () => {
    expect(
      inferWeeklyBodyFocusMode({
        targetBody: "Upper",
        specificBodyFocus: ["chest"],
      })
    ).toBe("muscle");
  });

  it("maps Chest to a hard upper_push + chest contract", () => {
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "muscle",
      targetBody: "Upper",
      targetModifier: ["Push"],
      specificBodyFocus: ["chest"],
    });
    expect(contract.choiceId).toBe("chest");
    expect(contract.focusBodyParts).toEqual(["upper_push", "chest"]);
    expect(contract.muscleEmphasis).toBe("chest");
  });

  it("maps Pattern Push without muscle emphasis", () => {
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "pattern",
      targetBody: "Upper",
      targetModifier: ["Push"],
      specificBodyFocus: ["push"],
    });
    expect(contract.choiceId).toBe("push");
    expect(contract.focusBodyParts).toEqual(["upper_push"]);
    expect(contract.muscleEmphasis).toBeNull();
  });

  it("clamps leftover muscle picks to Region vocabulary", () => {
    expect(clampBodyChoiceToMode("chest", "region")).toBe("upper");
    expect(clampBodyChoiceToMode("glutes", "region")).toBe("lower");
    expect(clampBodyChoiceToMode("push", "muscle")).toBe("chest");
  });

  it("restores specificBodyFocus for core and chest regen chips", () => {
    expect(dailyOverrideFromBodyChoice("core")).toEqual({
      bodyRegionBias: "core",
      specificBodyFocus: ["core"],
    });
    expect(dailyOverrideFromBodyChoice("chest")).toEqual({
      bodyRegionBias: "chest",
      specificBodyFocus: ["chest"],
    });
    expect(sessionBiasFromDailyBodyOverride({ bodyRegionBias: "core" })).toEqual({
      targetBody: "Full",
      targetModifier: [],
      specificBodyFocus: ["core"],
    });
  });
});

describe("chest day hard eligibility", () => {
  const bench: ExerciseWithQualities = {
    id: "bench",
    name: "Bench",
    movement_pattern: "push",
    muscle_groups: ["chest", "triceps"],
    equipment_required: ["barbell"],
    training_quality_weights: {},
    primary_movement_family: "upper_push",
    pairing_category: "chest",
    movement_patterns: ["horizontal_push"],
  };
  const ohp: ExerciseWithQualities = {
    id: "ohp",
    name: "OHP",
    movement_pattern: "push",
    muscle_groups: ["shoulders"],
    equipment_required: ["barbell"],
    training_quality_weights: {},
    primary_movement_family: "upper_push",
    pairing_category: "shoulders",
    movement_patterns: ["vertical_push"],
  };

  it("allows bench and excludes OHP on a Muscle Chest contract", () => {
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "muscle",
      specificBodyFocus: ["chest"],
      targetBody: "Upper",
    });
    const constraints = resolveWorkoutConstraints({
      primary_goal: "hypertrophy",
      body_region_focus: contract.focusBodyParts,
      available_equipment: ["barbell"],
      duration_minutes: 45,
      energy_level: "medium",
    });
    expect(constraints.allowed_muscle_emphasis).toBe("chest");
    expect(matchesBodyPartFocus(bench, constraints)).toBe(true);
    expect(matchesBodyPartFocus(ohp, constraints)).toBe(false);
  });

  it("allows both bench and OHP on a Pattern Push contract", () => {
    const contract = resolveSessionBodyContract({
      weeklyBodyFocusMode: "pattern",
      specificBodyFocus: ["push"],
      targetBody: "Upper",
    });
    const constraints = resolveWorkoutConstraints({
      primary_goal: "hypertrophy",
      body_region_focus: contract.focusBodyParts,
      available_equipment: ["barbell"],
      duration_minutes: 45,
      energy_level: "medium",
    });
    expect(constraints.allowed_muscle_emphasis).toBeNull();
    expect(matchesBodyPartFocus(bench, constraints)).toBe(true);
    expect(matchesBodyPartFocus(ohp, constraints)).toBe(true);
  });
});
