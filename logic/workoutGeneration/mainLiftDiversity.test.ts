/**
 * Systemic main-lift diversity: intent inference, cluster families, weekly exclusion, scoring caps.
 */

import assert from "node:assert/strict";
import { exerciseHasStrengthSubFocusSlug } from "../../data/goalSubFocus";
import { getSimilarExerciseClusterId } from "../../lib/workoutRules";
import { collectWeekMainLiftExerciseIds } from "./collectWeekMainLiftExerciseIds";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function testSquatDoesNotMatchHingeViaSharedGlutes() {
  const squatLike: Exercise = {
    id: "test_squat_pattern",
    name: "Test Squat",
    movement_pattern: "squat",
    muscle_groups: ["glutes", "legs"],
    modality: "strength",
    equipment_required: ["barbell"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"] },
  } as Exercise;

  assert.equal(exerciseHasStrengthSubFocusSlug(squatLike, "squat"), true);
  assert.equal(
    exerciseHasStrengthSubFocusSlug(squatLike, "deadlift_hinge"),
    false,
    "glutes alone must not imply hinge intent (prevent stacked squat+hinge bonuses on one lift)"
  );
}

function testHingeStillMatchesWithoutGlutesAloneFallback() {
  const hinge: Exercise = {
    id: "test_hinge",
    name: "Test Hinge",
    movement_pattern: "hinge",
    muscle_groups: ["hamstrings"],
    modality: "strength",
    equipment_required: ["barbell"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"], attribute_tags: ["deadlift_hinge"] },
  } as Exercise;

  assert.equal(exerciseHasStrengthSubFocusSlug(hinge, "deadlift_hinge"), true);
}

function testRackPullSharesDeadliftCluster() {
  assert.equal(getSimilarExerciseClusterId({ id: "rack_pull" }), "deadlift_family");
}

function testCollectWeekMainLiftIds() {
  const session = generateWorkoutSession(
    {
      duration_minutes: 45,
      primary_goal: "strength",
      focus_body_parts: ["full_body"],
      available_equipment: ["barbell", "dumbbells", "bench", "squat_rack"],
      injuries_or_constraints: [],
      energy_level: "medium",
      seed: 999001,
    },
    STUB_EXERCISES
  );
  const ids = collectWeekMainLiftExerciseIds(session);
  assert.ok(ids.length >= 1, "collects at least one main id from stub session");
  assert.ok(ids.every((id) => typeof id === "string" && id.length > 0));
}

function testWeeklyExclusionRotatesMainLiftWhenPoolAllows() {
  const base = {
    duration_minutes: 45 as const,
    primary_goal: "strength" as const,
    focus_body_parts: ["full_body" as const],
    available_equipment: ["barbell", "dumbbells", "bench", "squat_rack"],
    injuries_or_constraints: [] as string[],
    energy_level: "medium" as const,
    seed: 424242,
  };

  const first = generateWorkoutSession(
    { ...base, week_main_strength_lift_ids_used: [] },
    STUB_EXERCISES
  );
  const firstIds = collectWeekMainLiftExerciseIds(first);

  const second = generateWorkoutSession(
    { ...base, seed: 424243, week_main_strength_lift_ids_used: firstIds },
    STUB_EXERCISES
  );
  const secondIds = collectWeekMainLiftExerciseIds(second);

  const overlap = secondIds.filter((id) => firstIds.includes(id));
  assert.equal(
    overlap.length,
    0,
    "with stub pool, second day should not repeat first day's main compound IDs when alternatives exist"
  );
}

function run() {
  testSquatDoesNotMatchHingeViaSharedGlutes();
  testHingeStillMatchesWithoutGlutesAloneFallback();
  testRackPullSharesDeadliftCluster();
  testCollectWeekMainLiftIds();
  testWeeklyExclusionRotatesMainLiftWhenPoolAllows();
  console.log("mainLiftDiversity.test.ts: all passed");
}

run();
