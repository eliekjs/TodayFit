/**
 * Intermediate tier gates (complex lifts) + sport-biased warmup focus.
 * Run: npx tsx logic/workoutGeneration/intermediateTierAndWarmup.test.ts
 */

import assert from "assert";
import { isComplexSkillLiftForNonAdvanced } from "../../lib/workoutLevel";
import { mergeSportBiasIntoWarmupFocusBodyParts } from "./ontologyScoring";

function testMergeAlpineKneeBiasReplacesFullBody() {
  const merged = mergeSportBiasIntoWarmupFocusBodyParts(["full_body"], {
    alpineSkiingApplies: true,
    hasKneeResilienceSubFocus: true,
  });
  assert.deepStrictEqual(merged, ["lower", "core"]);
  console.log("  OK: full_body + alpine/knee → lower+core warmup focus");
}

function testMergeKneeResilienceAlone() {
  const merged = mergeSportBiasIntoWarmupFocusBodyParts([], {
    alpineSkiingApplies: false,
    hasKneeResilienceSubFocus: true,
  });
  assert.deepStrictEqual(merged, ["lower", "core"]);
  console.log("  OK: empty focus + knee resilience → lower+core");
}

function testMergeRespectsExplicitUpperOnly() {
  const merged = mergeSportBiasIntoWarmupFocusBodyParts(["upper_push"], {
    alpineSkiingApplies: true,
    hasKneeResilienceSubFocus: true,
  });
  assert.deepStrictEqual(merged, ["upper_push"]);
  console.log("  OK: explicit upper-only day not overridden by sport bias");
}

function testBarbellCleanComplexBlocked() {
  assert.strictEqual(
    isComplexSkillLiftForNonAdvanced({
      id: "x",
      name: "Barbell Squat Clean to Push Press",
      movementPattern: "push",
      modality: "strength",
    }),
    true
  );
  console.log("  OK: barbell squat clean to push press gated for non-advanced");
}

function testDbCleanComplexAllowed() {
  assert.strictEqual(
    isComplexSkillLiftForNonAdvanced({
      id: "x",
      name: "Dumbbell Squat Clean to Press",
      movementPattern: "push",
      modality: "strength",
    }),
    false
  );
  console.log("  OK: dumbbell clean-to-press allowed for non-advanced gate");
}

function testBarbellOverheadPauseSquatBlocked() {
  assert.strictEqual(
    isComplexSkillLiftForNonAdvanced({
      id: "x",
      name: "Barbell Overhead Pause Squat",
      movementPattern: "squat",
      modality: "strength",
    }),
    true
  );
  console.log("  OK: barbell overhead pause squat gated");
}

function testGobletOverheadSquatAllowed() {
  assert.strictEqual(
    isComplexSkillLiftForNonAdvanced({
      id: "x",
      name: "Goblet Overhead Squat",
      movementPattern: "squat",
      modality: "strength",
    }),
    false
  );
  console.log("  OK: goblet overhead squat passes gate");
}

function testPlainOverheadPressAllowed() {
  assert.strictEqual(
    isComplexSkillLiftForNonAdvanced({
      id: "oh_press",
      name: "Standing Overhead Press",
      movementPattern: "push",
      modality: "strength",
    }),
    false
  );
  console.log("  OK: standing overhead press not gated as complex skill");
}

function testReactiveSkaterConesBlocked() {
  assert.strictEqual(
    isComplexSkillLiftForNonAdvanced({
      id: "x",
      name: "Skater Jumps With Cones Reactive",
      movementPattern: "locomotion",
      modality: "conditioning",
    }),
    true
  );
  console.log("  OK: reactive skater + cones gated");
}

function main() {
  console.log("Intermediate tier + warmup sport bias tests...");
  testMergeAlpineKneeBiasReplacesFullBody();
  testMergeKneeResilienceAlone();
  testMergeRespectsExplicitUpperOnly();
  testBarbellCleanComplexBlocked();
  testDbCleanComplexAllowed();
  testBarbellOverheadPauseSquatBlocked();
  testGobletOverheadSquatAllowed();
  testPlainOverheadPressAllowed();
  testReactiveSkaterConesBlocked();
  console.log("All tests passed.");
}

main();
