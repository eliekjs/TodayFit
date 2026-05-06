/**
 * Intent weights used by pickBestSupersetPairs (no full scoreExercise — avoids weekly-history coupling).
 *
 * Run: npx vitest run logic/workoutGeneration/supersetIntentPreferenceScores.test.ts
 */

import { describe, it, expect } from "vitest";
import { buildSupersetIntentPreferenceScores } from "./dailyGenerator";
import type { Exercise } from "./types";
import type { GenerateWorkoutInput } from "./types";

function stubExercise(id: string, sportTags: string[]): Exercise {
  return {
    id,
    name: id,
    movement_pattern: "squat",
    muscle_groups: ["quads"],
    modality: "strength",
    equipment_required: ["barbell"],
    difficulty: 2,
    time_cost: "medium",
    tags: { sport_tags: sportTags, goal_tags: ["strength"] },
  };
}

describe("buildSupersetIntentPreferenceScores", () => {
  it("prefers exercises whose sport_tags match ranked sport_slugs", () => {
    const aligned = stubExercise("a", ["running"]);
    const generic = stubExercise("b", ["cycling"]);
    const input = {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      available_equipment: ["barbell"],
      injuries_or_constraints: [],
      sport_slugs: ["running"],
    } as GenerateWorkoutInput;

    const scores = buildSupersetIntentPreferenceScores([aligned, generic], input);
    expect(scores.get("a")).toBeGreaterThan(scores.get("b") ?? 0);
  });
});
