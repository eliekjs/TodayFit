import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import { PRIMARY_FOCUS_TO_GOAL_SLUG } from "./preferencesConstants";
import type { ManualPreferences } from "./types";

const BASE: ManualPreferences = {
  primaryFocus: ["Calisthenics"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  workoutTier: "intermediate",
};

describe("Calisthenics primary goal wiring", () => {
  it("PRIMARY_FOCUS_TO_GOAL_SLUG maps Calisthenics label to calisthenics slug (not strength)", () => {
    expect(PRIMARY_FOCUS_TO_GOAL_SLUG["Calisthenics"]).toBe("calisthenics");
  });

  it("manualPreferencesToGenerateWorkoutInput sets primary_goal and declared intent to calisthenics when Calisthenics-only", () => {
    const input = manualPreferencesToGenerateWorkoutInput(BASE, undefined, 1);
    expect(input.primary_goal).toBe("calisthenics");
    expect(input.session_intent?.selected_goals?.[0]).toBe("calisthenics");
    const goalRow = input.session_intent?.ranked_intent_entries?.find((e) => e.kind === "goal");
    expect(goalRow?.slug).toBe("calisthenics");
    expect(goalRow?.slug).not.toBe("strength");
  });
});
