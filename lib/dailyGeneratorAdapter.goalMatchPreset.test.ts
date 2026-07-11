import { describe, it, expect } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import { resolveDayFocusPreset } from "./weekDaySessionFocus";
import type { ManualPreferences } from "./types";

const GYM = { id: "g1", name: "Test Gym", equipment: ["dumbbells", "barbell"] };

const BASE_PREFS: ManualPreferences = {
  primaryFocus: ["Build Strength", "Build Muscle (Hypertrophy)", "Mobility & Joint Health"],
  subFocusByGoal: {},
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  workoutStyle: [],
  goalMatchPrimaryPct: 60,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 10,
  workoutTier: "intermediate",
  includeCreativeVariations: false,
};

describe("dailyGeneratorAdapter goal-match preset contract", () => {
  it("uses manual goal-match % without sport context", () => {
    const input = manualPreferencesToGenerateWorkoutInput(BASE_PREFS, GYM);
    expect(input.goal_weights?.[0]).toBeCloseTo(0.6, 5);
    expect(input.goal_weights?.[1]).toBeCloseTo(0.3, 5);
    expect(input.session_intent?.goal_weights?.[0]).toBeCloseTo(0.6, 5);
    expect(input.energy_level).toBe("medium");
  });

  it("preserves manual goal-match when sport context only sets sport_weight", () => {
    const input = manualPreferencesToGenerateWorkoutInput(BASE_PREFS, GYM, undefined, undefined, {
      sport_slugs: ["surfing"],
      sport_weight: 0.55,
    });
    expect(input.goal_weights?.[0]).toBeCloseTo(0.6, 5);
    expect(input.session_intent?.goal_weights?.[0]).toBeCloseTo(0.6, 5);
  });

  it("overrides with exclusive weights when goal_emphasis preset is resolved", () => {
    const resolved = resolveDayFocusPreset("goal_emphasis_0", BASE_PREFS, null);
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE_PREFS, primaryFocus: resolved.primaryFocus },
      GYM,
      undefined,
      undefined,
      resolved.sportGoalContext
    );
    expect(resolved.primaryFocus).toEqual(["Build Strength"]);
    expect(input.goal_weights?.[0]).toBeCloseTo(1, 5);
    expect(input.goal_weights?.[1]).toBeCloseTo(0, 5);
    expect(input.goal_weights?.[2]).toBeCloseTo(0, 5);
  });

  it("uses global goal-match for balanced_goals preset", () => {
    const resolved = resolveDayFocusPreset("balanced_goals", BASE_PREFS, null);
    const input = manualPreferencesToGenerateWorkoutInput(
      BASE_PREFS,
      GYM,
      undefined,
      undefined,
      resolved.sportGoalContext
    );
    expect(input.goal_weights?.[0]).toBeCloseTo(0.6, 5);
    expect(input.goal_weights?.[1]).toBeCloseTo(0.3, 5);
  });
});
