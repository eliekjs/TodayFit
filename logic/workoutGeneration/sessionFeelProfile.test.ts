import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import {
  isImpliedSportOnlySession,
  resolveSessionFeelProfile,
} from "./sessionFeelProfile";
import type { GenerateWorkoutInput } from "./types";

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: ["bodyweight", "dumbbells", "bench", "treadmill"],
    injuries_or_constraints: [],
    seed: 8801,
    ...overrides,
  };
}

const SPORT_ONLY_PREFS: ManualPreferences = {
  primaryFocus: ["Sport preparation"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 60,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  workoutTier: "intermediate",
};

describe("resolveSessionFeelProfile", () => {
  it("strength-only session resolves to strength emphasis", () => {
    const profile = resolveSessionFeelProfile(
      baseInput({
        primary_goal: "strength",
        goal_sub_focus: { strength: ["squat", "deadlift_hinge"] },
      })
    );
    expect(profile.emphasis).toBe("strength");
    expect((profile.feelScore ?? 1) <= 0.25).toBe(true);
  });

  it("athletic_performance primary resolves to sports_training or hybrid", () => {
    const profile = resolveSessionFeelProfile(
      baseInput({
        primary_goal: "athletic_performance",
        goal_sub_focus: { athletic_performance: ["vertical_jump"] },
      })
    );
    expect(["sports_training", "hybrid"]).toContain(profile.emphasis);
    expect((profile.feelScore ?? 0) >= 0.32).toBe(true);
  });

  it("sport-only session with COD sub resolves to sports_training", () => {
    const input = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_PREFS, undefined, 1, undefined, {
      sport_slugs: ["soccer"],
      sport_sub_focus: { soccer: ["change_of_direction"] },
    });
    expect(isImpliedSportOnlySession(input)).toBe(true);
    const profile = resolveSessionFeelProfile(input);
    expect(profile.emphasis).toBe("sports_training");
  });

  it("mixed ranked strength + sport intent resolves to hybrid", () => {
    const profile = resolveSessionFeelProfile(
      baseInput({
        primary_goal: "strength",
        sport_slugs: ["volleyball"],
        sport_weight: 0.55,
        goal_sub_focus: { strength: ["squat"] },
        sport_sub_focus: { volleyball: ["vertical_jump"] },
        session_intent: {
          selected_goals: ["strength"],
          selected_sports: ["volleyball"],
          goal_sub_focus_by_goal: { strength: ["squat"] },
          sport_sub_focus_by_sport: { volleyball: ["vertical_jump"] },
          sport_weight: 0.55,
          ranked_intent_entries: [
            {
              kind: "goal_sub_focus",
              slug: "squat",
              parent_slug: "strength",
              rank: 1,
              weight: 0.45,
              tag_slugs: ["squat"],
            },
            {
              kind: "sport_sub_focus",
              slug: "vertical_jump",
              parent_slug: "volleyball",
              rank: 2,
              weight: 0.55,
              tag_slugs: ["plyometric"],
            },
          ],
        },
      })
    );
    expect(profile.emphasis).toBe("hybrid");
  });
});
