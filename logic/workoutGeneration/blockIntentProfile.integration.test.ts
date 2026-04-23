import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { GenerateWorkoutInput } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function baseInput(overrides: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "recovery",
    energy_level: "high",
    available_equipment: ["bodyweight", "dumbbells", "bench", "treadmill", "rower"],
    injuries_or_constraints: [],
    style_prefs: { conditioning_minutes: 15 },
    seed: 8123,
    ...overrides,
  };
}

function testRecoveryNoCardioSecondarySkipsConditioning() {
  const session = generateWorkoutSession(
    baseInput({
      secondary_goals: ["mobility"],
    }),
    STUB_EXERCISES
  );
  const hasConditioning = session.blocks.some((b) => b.block_type === "conditioning");
  assert(hasConditioning === false, "recovery + mobility should not include conditioning block");
  console.log("  OK: recovery + mobility session skips conditioning block");
}

function testRecoveryWithEnduranceSecondaryAllowsConditioning() {
  const session = generateWorkoutSession(
    baseInput({
      secondary_goals: ["endurance"],
      goal_sub_focus: { endurance: ["zone2_long_steady"] },
      seed: 8124,
    }),
    STUB_EXERCISES
  );
  const conditioning = session.blocks.find((b) => b.block_type === "conditioning");
  assert(conditioning != null, "recovery + endurance should allow conditioning block");
  console.log("  OK: recovery + endurance keeps conditioning eligible");
}

function testCardioDominantStrengthSessionUsesCardioStyleMainWork() {
  const session = generateWorkoutSession(
    baseInput({
      primary_goal: "strength",
      secondary_goals: ["endurance"],
      weekly_cardio_emphasis: 0.75,
      session_cardio_target_share: 0.7,
      goal_sub_focus: { endurance: ["threshold_tempo"] },
      seed: 8125,
    }),
    STUB_EXERCISES
  );
  const mainBlocks = session.blocks.filter((b) =>
    b.block_type === "main_strength" || b.block_type === "main_hypertrophy" || b.block_type === "accessory"
  );
  assert(mainBlocks.length > 0, "cardio-dominant strength day still has main blocks");
  assert(
    mainBlocks.some((b) => b.format === "superset" || b.format === "circuit"),
    "cardio-dominant strength day prefers density-oriented main block formats"
  );
  assert(
    mainBlocks.flatMap((b) => b.items).some((i) => i.time_seconds != null && i.time_seconds > 0),
    "cardio-dominant strength day uses time-based prescriptions in main work"
  );
  console.log("  OK: cardio-dominant strength day shifts main format/prescription toward cardio style");
}

function testCardioExerciseShareEnforcedInMainSelection() {
  const session = generateWorkoutSession(
    baseInput({
      primary_goal: "hypertrophy",
      secondary_goals: ["conditioning"],
      weekly_cardio_emphasis: 0.85,
      session_cardio_target_share: 0.75,
      seed: 8126,
    }),
    STUB_EXERCISES
  );
  const byId = new Map(STUB_EXERCISES.map((e) => [e.id, e]));
  const trainingItems = session.blocks
    .filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown")
    .flatMap((b) => b.items);
  const cardioAligned = trainingItems.filter((item) => {
    const exercise = byId.get(item.exercise_id);
    if (!exercise) return false;
    if (exercise.modality === "conditioning") return true;
    const tags = exercise.tags.goal_tags ?? [];
    return tags.includes("conditioning") || tags.includes("endurance") || (item.time_seconds ?? 0) > 0;
  });
  assert(trainingItems.length > 0, "training items exist for cardio share test");
  assert(
    cardioAligned.length / trainingItems.length >= 0.3,
    "cardio-dominant session keeps a meaningful cardio-aligned exercise share"
  );
  console.log("  OK: cardio-aligned exercise proportion enforced in selected training items");
}

function main() {
  console.log("Block intent profile integration tests...");
  testRecoveryNoCardioSecondarySkipsConditioning();
  testRecoveryWithEnduranceSecondaryAllowsConditioning();
  testCardioDominantStrengthSessionUsesCardioStyleMainWork();
  testCardioExerciseShareEnforcedInMainSelection();
  console.log("All block intent profile integration tests passed.");
}

main();
