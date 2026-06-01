import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import { buildBlockIntentProfile } from "../logic/workoutGeneration/blockIntentProfile";
import type { ManualPreferences } from "./types";

const BASE_PREFS: ManualPreferences = {
  primaryFocus: ["Build Strength"],
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  workoutTier: "intermediate",
};

describe("manualPreferencesToGenerateWorkoutInput workoutStyle", () => {
  it("passes workout_styles and wants_supersets for Functional / Athletic", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE_PREFS, workoutStyle: ["Functional / Athletic"] },
      undefined,
      1
    );
    expect(input.style_prefs?.workout_styles).toEqual(["Functional / Athletic"]);
    expect(input.style_prefs?.wants_supersets).toBe(true);
  });

  it("sets wants_supersets false for Compound Strength only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE_PREFS, workoutStyle: ["Compound Strength"] },
      undefined,
      1
    );
    expect(input.style_prefs?.wants_supersets).toBe(false);
  });

  it("increases block cardio share vs strength without style", () => {
    const withoutStyle = buildBlockIntentProfile(
      manualPreferencesToGenerateWorkoutInput(BASE_PREFS, undefined, 1)
    );
    const withAthletic = buildBlockIntentProfile(
      manualPreferencesToGenerateWorkoutInput(
        { ...BASE_PREFS, workoutStyle: ["Functional / Athletic"] },
        undefined,
        2
      )
    );
    expect(withAthletic.sessionCardioShare).toBeGreaterThan(withoutStyle.sessionCardioShare);
    expect(withAthletic.preferredBlockFormatsByRole.main[0]).toBe("circuit");
  });
});
