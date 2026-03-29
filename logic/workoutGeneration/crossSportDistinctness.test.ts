/**
 * Cross-sport distinctness: hiking_backpacking vs trail_running (category overlap, conditioning, mapping).
 * Run: npx tsx logic/workoutGeneration/crossSportDistinctness.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { getTrailRunningPatternCategoriesForExercise } from "./sportPatternTransfer/trailRunningExerciseCategories";
import { getHikingPatternCategoriesForExercise } from "./sportPatternTransfer/hikingExerciseCategories";
import { computeHikingWithinPoolQualityScore } from "./sportPatternTransfer/hikingQualityScoring";
import { computeTrailRunningWithinPoolQualityScore } from "./sportPatternTransfer/trailRunningQualityScoring";

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function base(seed: number): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "dumbbells",
      "kettlebells",
      "bench",
      "squat_rack",
      "bodyweight",
      "treadmill",
      "stair_climber",
      "assault_bike",
      "rowing_machine",
      "cable_machine",
    ],
    injuries_or_constraints: [],
    seed,
    sport_weight: 0.55,
    sport_slugs: ["hiking_backpacking"],
  };
}

function main() {
  const exercisePool = pool();
  assert(exercisePool.length > 500, "expect merged catalog");

  const bodyweightCalf = exercisePool.find((e) => e.id === "bodyweight_calf_raise");
  assert(bodyweightCalf, "fixture bodyweight_calf_raise");
  const trCalf = getTrailRunningPatternCategoriesForExercise(bodyweightCalf);
  assert(
    !trCalf.has("uphill_locomotion_support"),
    "calf isolation should not inherit uphill from squat pattern"
  );
  assert(trCalf.has("calf_soleus_durability"), "calf raise still tags calf/ankle");

  const farmer = exercisePool.find((e) => e.id === "farmer_carry");
  assert(farmer, "farmer_carry");
  const hFarmer = getHikingPatternCategoriesForExercise(farmer);
  const tFarmer = getTrailRunningPatternCategoriesForExercise(farmer);
  assert(hFarmer.has("loaded_carry_pack_tolerance"), "hiking should emphasize carry tolerance");
  assert(tFarmer.has("pack_load_carry_primary") || tFarmer.has("heavy_carry_dominant"), "trail tags carry for deprioritization");

  const emptyHike = new Map<string, number>();
  const emptyTrail = new Map<string, number>();
  const qH = computeHikingWithinPoolQualityScore(farmer, {
    sessionHikingCategoryCounts: emptyHike,
    emphasisBucket: 1,
    blockType: "main_strength",
  });
  const qT = computeTrailRunningWithinPoolQualityScore(farmer, {
    sessionTrailCategoryCounts: emptyTrail,
    emphasisBucket: 1,
    blockType: "main_strength",
  });
  assert(qH.total > qT.total, "hiking within-pool should rank farmer carry higher than trail for main slot");

  const seeds = [3, 7, 11, 19, 23, 29, 42, 51, 58, 67, 73, 81, 88, 94, 100];
  let hikeCarry = 0;
  let trailCarry = 0;
  let hikeStep = 0;
  let trailStep = 0;
  let hikeCalfAnkle = 0;
  let trailCalfAnkle = 0;
  for (const seed of seeds) {
    const hikeSession = generateWorkoutSession(
      { ...base(seed), sport_slugs: ["hiking_backpacking"] },
      exercisePool
    );
    const trailSession = generateWorkoutSession({ ...base(seed), sport_slugs: ["trail_running"] }, exercisePool);

    const hSum = hikeSession.debug?.sport_pattern_transfer?.session_summary;
    const tSum = trailSession.debug?.sport_pattern_transfer?.session_summary;
    assert(hSum?.sport_slug === "hiking_backpacking", "hiking summary");
    assert(tSum?.sport_slug === "trail_running", "trail summary");

    hikeCarry += hSum!.overlap_families.carry_family;
    trailCarry += tSum!.overlap_families.carry_family;
    hikeStep += hSum!.overlap_families.step_stair_family;
    trailStep += tSum!.overlap_families.step_stair_family;
    hikeCalfAnkle += hSum!.overlap_families.calf_ankle_family;
    trailCalfAnkle += tSum!.overlap_families.calf_ankle_family;
  }

  assert(
    hikeCarry > trailCarry,
    `hiking should surface more carry identity than trail (hike=${hikeCarry} trail=${trailCarry})`
  );
  assert(
    trailCalfAnkle > hikeCalfAnkle,
    `trail should surface more calf/ankle family hits than hiking (trail=${trailCalfAnkle} hike=${hikeCalfAnkle})`
  );
  assert(
    hikeStep > trailStep,
    `hiking should surface more step/stair family than trail (hike=${hikeStep} trail=${trailStep})`
  );

  console.log("crossSportDistinctness.test.ts: all assertions passed");
}

main();
