/**
 * Hiking within-pool quality: scoring, redundancy, debug, conditioning preference.
 * Run: npx tsx logic/workoutGeneration/hikingOutputQuality.test.ts
 */

import assert from "assert";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { getHikingPatternCategoriesForExercise } from "./sportPatternTransfer/hikingExerciseCategories";
import {
  computeHikingWithinPoolQualityScore,
  computeHikingEmphasisBucket,
  isSignatureHikingMovement,
} from "./sportPatternTransfer/hikingQualityScoring";

function mkEx(
  partial: Omit<Exercise, "id" | "name" | "movement_pattern" | "muscle_groups" | "modality" | "equipment_required" | "difficulty" | "time_cost" | "tags"> &
    Pick<Exercise, "id" | "name"> &
    Partial<Exercise>
): Exercise {
  return {
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["dumbbells"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
    ...partial,
  };
}

const stepUp = mkEx({
  id: "stepup",
  name: "Step-up",
  exercise_role: "main_compound",
});

const walkingLunge = mkEx({
  id: "walking_lunge",
  name: "Walking Lunge",
  exercise_role: "main_compound",
});

const ffLunge = mkEx({
  id: "ff_curtsy_lunge",
  name: "Curtsy Lunge",
  exercise_role: "main_compound",
  creative_variation: true,
});

const zone2Stair = mkEx({
  id: "zone2_stair_climber",
  name: "Zone 2 Stair",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["stair_climber"],
  tags: { goal_tags: ["endurance"], stimulus: ["aerobic_zone2"], energy_fit: ["medium"] },
});

const zone2Bike = mkEx({
  id: "zone2_bike",
  name: "Zone 2 Bike",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["assault_bike"],
  tags: { goal_tags: ["endurance"], stimulus: ["aerobic_zone2"], energy_fit: ["medium"] },
});

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: ["bench", "dumbbells", "stair_climber", "assault_bike", "bodyweight"],
    injuries_or_constraints: [],
    seed: 42,
    ...overrides,
  };
}

function main() {
  assert(isSignatureHikingMovement(stepUp), "step-up should be signature hiking");
  assert(getHikingPatternCategoriesForExercise(ffLunge).size > 0, "ff lunge maps to hiking categories");

  const empty = new Map<string, number>();
  const q1 = computeHikingWithinPoolQualityScore(walkingLunge, {
    sessionHikingCategoryCounts: empty,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  const afterTwoUni = new Map<string, number>([
    ["unilateral_knee_dominant", 2],
    ["_session_lunge_shape", 2],
  ]);
  const q2 = computeHikingWithinPoolQualityScore(walkingLunge, {
    sessionHikingCategoryCounts: afterTwoUni,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  assert(q2.total < q1.total, "redundant lunge-shaped work should score lower within pool");

  const qStepFresh = computeHikingWithinPoolQualityScore(stepUp, {
    sessionHikingCategoryCounts: afterTwoUni,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  assert(
    qStepFresh.total > q2.total,
    "step-up should beat another lunge when session already has lunge-shaped volume"
  );

  const qFf = computeHikingWithinPoolQualityScore(ffLunge, {
    sessionHikingCategoryCounts: empty,
    emphasisBucket: 4,
    blockType: "main_strength",
  });
  const qPlain = computeHikingWithinPoolQualityScore(walkingLunge, {
    sessionHikingCategoryCounts: empty,
    emphasisBucket: 4,
    blockType: "main_strength",
  });
  assert(
    qPlain.simplicity_transfer_bonus >= qFf.simplicity_transfer_bonus,
    "non-ff / non-creative should get simplicity bonus over ff creative variation"
  );

  const pool = [stepUp, walkingLunge, ffLunge, zone2Stair, zone2Bike];
  const hikingInput = baseInput({
    sport_slugs: ["hiking_backpacking"],
    sport_weight: 0.55,
    seed: 100,
  });
  const session = generateWorkoutSession(hikingInput, pool);
  const dbg = session.debug?.sport_pattern_transfer;
  assert(dbg?.items?.length, "hiking debug items expected");
  const withQ = dbg!.items.filter((i) => i.within_pool_quality);
  assert(withQ.length > 0, "within_pool_quality should be present on hiking debug rows");
  const wq = withQ[0].within_pool_quality!;
  assert(typeof wq.within_pool_priority_total === "number", "priority total");
  assert(typeof wq.emphasis_bucket === "number", "emphasis bucket");
  assert(wq.emphasis_bucket === computeHikingEmphasisBucket(100), "emphasis bucket matches seed");

  const stairScore = computeHikingWithinPoolQualityScore(zone2Stair, {
    sessionHikingCategoryCounts: new Map(),
    emphasisBucket: 0,
    blockType: "conditioning",
  }).total;
  const bikeScore = computeHikingWithinPoolQualityScore(zone2Bike, {
    sessionHikingCategoryCounts: new Map(),
    emphasisBucket: 0,
    blockType: "conditioning",
  }).total;
  assert(stairScore > bikeScore, "stair/incline-tagged conditioning should outrank plain bike within pool");

  console.log("hikingOutputQuality.test.ts: all assertions passed");
}

main();
