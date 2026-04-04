/**
 * Tier inference + beginner gate. Run: npx tsx lib/workoutLevel.inference.test.ts
 */

import {
  inferWorkoutLevelsFromExtendedSource,
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

  assert(isHardBlockedForBeginnerTier({ workout_level_tags: ["intermediate", "advanced"], difficulty: 3 }));
  assert(!isHardBlockedForBeginnerTier({ workout_level_tags: ["beginner", "intermediate"], difficulty: 3 }));
  assert(isHardBlockedForBeginnerTier({ workout_level_tags: ["beginner", "intermediate"], difficulty: 5 }));

  console.log("workoutLevel.inference.test.ts passed.");
}

run();
