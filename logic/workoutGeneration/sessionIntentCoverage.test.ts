/**
 * Session intent: goals ↔ exercises helpers.
 *
 * Run: npx vitest run logic/workoutGeneration/sessionIntentCoverage.test.ts
 */

import { describe, it, expect } from "vitest";
import type { Exercise } from "./types";
import type { GenerateWorkoutInput } from "./types";
import {
  collectActiveGoalSubFocusKeys,
  collectUniqueSessionGoals,
  computeSessionIntentLinks,
  exerciseMatchesDeclaredGoal,
  exerciseSatisfiesSessionIntent,
  goalSubFocusKeysForPrimary,
} from "./sessionIntentCoverage";

describe("sessionIntentCoverage", () => {
  it("collectUniqueSessionGoals dedupes primary and secondaries", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "strength",
      secondary_goals: ["hypertrophy", "strength"],
      energy_level: "medium",
      available_equipment: ["barbell"],
      injuries_or_constraints: [],
    };
    expect(collectUniqueSessionGoals(input)).toEqual(["strength", "hypertrophy"]);
  });

  it("collectActiveGoalSubFocusKeys unions keys for all session goals", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      energy_level: "medium",
      available_equipment: ["barbell"],
      injuries_or_constraints: [],
    };
    const keys = collectActiveGoalSubFocusKeys(input);
    expect(keys.has("muscle")).toBe(true);
    expect(keys.has("strength")).toBe(true);
    expect(keys.has("hypertrophy")).toBe(true);
  });

  it("goalSubFocusKeysForPrimary maps power to conditioning sub-focus bucket", () => {
    expect(goalSubFocusKeysForPrimary("power")).toContain("conditioning");
  });

  it("exerciseMatchesDeclaredGoal reads goal_tags and modality fallbacks", () => {
    const ex: Exercise = {
      id: "x",
      name: "Test",
      movement_pattern: "squat",
      muscle_groups: [],
      modality: "strength",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: { goal_tags: ["strength"] },
    };
    expect(exerciseMatchesDeclaredGoal(ex, "strength")).toBe(true);
    expect(exerciseMatchesDeclaredGoal(ex, "hypertrophy")).toBe(false);
  });

  it("computeSessionIntentLinks picks up sub-focus overlap", () => {
    const ex: Exercise = {
      id: "leg_press",
      name: "Leg Press",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      modality: "hypertrophy",
      equipment_required: ["leg_press"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["hypertrophy", "strength"], attribute_tags: ["squat"] },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      energy_level: "medium",
      available_equipment: ["leg_press"],
      injuries_or_constraints: [],
      goal_sub_focus: { muscle: ["legs"] },
    };
    const links = computeSessionIntentLinks(ex, input);
    expect(links.goals).toContain("hypertrophy");
    expect(links.sub_focus.some((s) => s.goal_slug === "muscle" && s.sub_slug === "legs")).toBe(true);
  });

  it("exerciseSatisfiesSessionIntent accepts sport-tagged exercises when sport_slugs set", () => {
    const ex: Exercise = {
      id: "climb",
      name: "Hangboard",
      movement_pattern: "pull",
      muscle_groups: [],
      modality: "strength",
      equipment_required: [],
      difficulty: 3,
      time_cost: "low",
      tags: { goal_tags: ["strength"], sport_tags: ["rock_climbing"] },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      sport_slugs: ["rock_climbing"],
    };
    expect(exerciseSatisfiesSessionIntent(ex, input)).toBe(true);
  });
});
