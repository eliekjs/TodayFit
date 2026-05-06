/**
 * Ensures pickBestSupersetPairs uses exercisePreferenceScores (wired from scoreExercise in dailyGenerator).
 *
 * Run: npx vitest run logic/workoutGeneration/supersetPairPreferenceBoost.test.ts
 */

import { describe, it, expect } from "vitest";
import { pickBestSupersetPairs } from "../workoutIntelligence/supersetPairing";
import type { Exercise } from "./types";

function chestTriExercise(id: string, cat: "chest" | "triceps"): Exercise {
  return {
    id,
    name: id,
    movement_pattern: "push",
    muscle_groups: cat === "chest" ? ["chest"] : ["triceps"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: cat,
    primary_movement_family: "upper_push",
  };
}

describe("pickBestSupersetPairs + preference scores", () => {
  it("prefers pairs whose exercises have higher preference scores when pairing mechanics are similar", () => {
    const hc = chestTriExercise("high_chest", "chest");
    const ht = chestTriExercise("high_tri", "triceps");
    const lc = chestTriExercise("low_chest", "chest");
    const lt = chestTriExercise("low_tri", "triceps");
    const pool = [hc, ht, lc, lt];
    const prefs = new Map<string, number>([
      ["high_chest", 40],
      ["high_tri", 40],
      ["low_chest", 0],
      ["low_tri", 0],
    ]);
    const pairs = pickBestSupersetPairs(pool, 2, new Set(), undefined, prefs);
    expect(pairs).toHaveLength(2);
    const first = new Set([pairs[0]![0].id, pairs[0]![1].id]);
    expect(first.has("high_chest") && first.has("high_tri")).toBe(true);
    const second = new Set([pairs[1]![0].id, pairs[1]![1].id]);
    expect(second.has("low_chest") && second.has("low_tri")).toBe(true);
  });
});
