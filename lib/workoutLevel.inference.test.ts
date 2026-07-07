/**
 * Tier inference + beginner gate. Run: npx tsx lib/workoutLevel.inference.test.ts
 */

import {
  inferWorkoutLevelsFromExtendedSource,
  isAdvancedComplexLoadedVariation,
  isHardBlockedForBeginnerTier,
  parseWorkoutLevelsFromDb,
} from "./workoutLevel";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function run() {
  const easy = inferWorkoutLevelsFromExtendedSource({
    id: "leg_press",
    name: "Leg Press",
    tags: [],
    difficulty: 2,
    movement_pattern: "squat",
    modality: "strength",
    equipment_required: ["leg_press"],
  });
  assert(
    easy.includes("beginner") && !easy.includes("advanced"),
    `easy machine should be beginner/intermediate only, got ${JSON.stringify(easy)}`
  );

  const pistol = inferWorkoutLevelsFromExtendedSource({
    id: "pistol_squat",
    name: "Pistol Squat",
    tags: [],
    difficulty: 3,
  });
  assert(
    pistol.length === 1 && pistol[0] === "advanced",
    `pistol name → advanced only, got ${JSON.stringify(pistol)}`
  );

  const hard = inferWorkoutLevelsFromExtendedSource({
    id: "unilateral_complex_lunge",
    name: "Unilateral High-Demand Lunge",
    tags: [],
    unilateral: true,
    stability_demand: "high",
    grip_demand: "high",
    impact_level: "high",
    difficulty: 5,
    movement_pattern: "squat",
  });
  assert(
    hard.includes("intermediate") && hard.includes("advanced") && !hard.includes("beginner"),
    `high demand unilateral → intermediate+, got ${JSON.stringify(hard)}`
  );

  const explicit = parseWorkoutLevelsFromDb(["advanced", "nope", "beginner"]);
  assert(
    explicit?.length === 2 && explicit[0] === "beginner" && explicit[1] === "advanced",
    `parseWorkoutLevelsFromDb orders tiers, got ${JSON.stringify(explicit)}`
  );

  assert(isHardBlockedForBeginnerTier({ workout_level_tags: ["intermediate", "advanced"], difficulty: 3 }), "intermediate+ tags block beginner");
  assert(!isHardBlockedForBeginnerTier({ workout_level_tags: ["beginner", "intermediate"], difficulty: 3 }), "beginner tag allows");
  assert(isHardBlockedForBeginnerTier({ workout_level_tags: ["beginner", "intermediate"], difficulty: 5 }), "high difficulty blocks");

  const advancedComplexExamples = [
    "ff_single_arm_kettlebell_bottoms_up_overhead_low_switch_cossack_squat",
    "ff_kettlebell_horn_grip_alternating_forward_lunge",
    "ff_double_kettlebell_overhead_low_switch_cossack_squat",
  ];
  for (const id of advancedComplexExamples) {
    assert(
      isAdvancedComplexLoadedVariation({ id }),
      `expected advanced complex: ${id}`
    );
    const levels = inferWorkoutLevelsFromExtendedSource({ id, name: id, tags: [] });
    assert(
      levels.length === 1 && levels[0] === "advanced",
      `advanced complex should infer advanced-only, got ${JSON.stringify(levels)} for ${id}`
    );
  }

  const borderlineExcluded = [
    "ff_double_kettlebell_overhead_squat",
    "ff_kettlebell_horn_grip_forward_lunge",
    "ff_kettlebell_bottoms_up_front_rack_squat",
    "ff_bodyweight_low_switch_cossack_squat",
    "ff_kettlebell_horn_grip_squat",
  ];
  for (const id of borderlineExcluded) {
    assert(!isAdvancedComplexLoadedVariation({ id }), `should not qualify as advanced complex: ${id}`);
  }

  console.log("workoutLevel.inference.test.ts passed.");
}

run();
