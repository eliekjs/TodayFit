import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import type { ManualPreferences } from "./types";

const STRENGTH_PRIMARY_PREFS: ManualPreferences = {
  primaryFocus: ["Build Strength"],
  subFocusByGoal: {
    "Build Strength": ["Squat"],
  },
  targetBody: "Lower",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  goalMatchPrimaryPct: 100,
  goalMatchSecondaryPct: 0,
  goalMatchTertiaryPct: 0,
  workoutTier: "intermediate",
};

const minimalGym = { id: "g1", name: "Test Gym", equipment: ["bodyweight"] as string[] };

describe("manualPreferencesToGenerateWorkoutInput endurance secondary from sport prep", () => {
  it("appends endurance for engine sport + aerobic signal (cycling)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      STRENGTH_PRIMARY_PREFS,
      minimalGym,
      1,
      undefined,
      {
        sport_slugs: ["cycling"],
        sport_sub_focus: { cycling: ["aerobic_base"] },
        sport_weight: 0.3,
      }
    );
    expect(input.secondary_goals).toContain("endurance");
    expect(input.session_intent?.selected_goals).toContain("endurance");
  });

  it("does not append endurance for cycling leg_strength only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      STRENGTH_PRIMARY_PREFS,
      minimalGym,
      2,
      undefined,
      {
        sport_slugs: ["cycling"],
        sport_sub_focus: { cycling: ["leg_strength"] },
        sport_weight: 0.3,
      }
    );
    expect(input.secondary_goals?.includes("endurance") ?? false).toBe(false);
    expect(input.session_intent?.selected_goals?.includes("endurance") ?? false).toBe(false);
  });

  it("preserves trail uphill_endurance behavior", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      STRENGTH_PRIMARY_PREFS,
      minimalGym,
      3,
      undefined,
      {
        sport_slugs: ["trail_running"],
        sport_sub_focus: { trail_running: ["uphill_endurance"] },
        sport_weight: 0.4,
      }
    );
    expect(input.secondary_goals).toContain("endurance");
  });
});
