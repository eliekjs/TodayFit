/**
 * Integration tests for generateWorkoutAsync (app entrypoint using dailyGenerator).
 * Run with: npx tsx lib/generator.integration.test.ts
 *
 * Asserts that generateWorkoutAsync returns valid GeneratedWorkout for a few preference sets.
 */

import { generateWorkoutAsync } from "./generator";
import type { ManualPreferences } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function run() {
  console.log("generateWorkoutAsync integration tests\n");

  // Default-like preferences: strength, full body, 45 min
  const basePrefs: ManualPreferences = {
    primaryFocus: ["Build Strength"],
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
  };

  const w1 = await generateWorkoutAsync(basePrefs, undefined, 12345);
  assert(typeof w1.id === "string" && w1.id.length > 0, "workout has id");
  assert(Array.isArray(w1.blocks), "workout has blocks");
  assert(w1.blocks.length >= 2, "workout has at least warmup and cooldown");
  assert(Array.isArray(w1.focus) && w1.focus.length > 0, "workout has focus");
  assert(typeof w1.durationMinutes === "number", "workout has durationMinutes");
  for (const block of w1.blocks) {
    assert(Array.isArray(block.items), `block ${block.block_type} has items`);
    for (const item of block.items) {
      assert(typeof item.exercise_id === "string", "item has exercise_id");
      assert(typeof item.exercise_name === "string", "item has exercise_name");
      assert(typeof item.sets === "number", "item has sets");
      assert(typeof item.rest_seconds === "number", "item has rest_seconds");
    }
  }
  console.log("  OK: strength, full body, 45 min → valid workout with blocks and items");

  // Upper body push focus
  const upperPrefs: ManualPreferences = {
    ...basePrefs,
    primaryFocus: ["Build Muscle (Hypertrophy)"],
    targetBody: "Upper",
    targetModifier: ["Push"],
    durationMinutes: 30,
  };
  const w2 = await generateWorkoutAsync(upperPrefs, undefined, 67890);
  assert(w2.blocks.length >= 2, "upper push workout has blocks");
  const hasMain = w2.blocks.some(
    (b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy"
  );
  assert(hasMain, "workout has main strength or hypertrophy block");
  console.log("  OK: upper push, 30 min → valid workout with main block");

  // Recovery / mobility
  const recoveryPrefs: ManualPreferences = {
    ...basePrefs,
    primaryFocus: ["Recovery"],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 20,
    energyLevel: "low",
  };
  const w3 = await generateWorkoutAsync(recoveryPrefs, undefined, 11111);
  assert(w3.blocks.length >= 1, "recovery workout has blocks");
  assert(w3.durationMinutes === 20, "duration clamped to 20");
  console.log("  OK: recovery, 20 min → valid workout with duration 20");

  console.log("\nAll generateWorkoutAsync integration tests passed.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
