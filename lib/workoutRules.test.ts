/**
 * Activation / warmup equipment policy.
 * Run: npx tsx lib/workoutRules.test.ts
 */
import assert from "node:assert/strict";
import { isBlockedExercise, isWarmupEligibleEquipment } from "./workoutRules";

function run() {
  assert.equal(isWarmupEligibleEquipment(["bodyweight"]), true);
  assert.equal(isWarmupEligibleEquipment(["bands"]), true);
  assert.equal(isWarmupEligibleEquipment(["bodyweight", "bands"]), true);
  assert.equal(isWarmupEligibleEquipment(["resistance_band"]), true);
  assert.equal(isWarmupEligibleEquipment(["miniband"]), true);

  assert.equal(isWarmupEligibleEquipment(["dumbbells"]), false);
  assert.equal(isWarmupEligibleEquipment(["cable_machine"]), false);
  assert.equal(isWarmupEligibleEquipment(["barbell"]), false);
  assert.equal(isWarmupEligibleEquipment(["kettlebell"]), false);
  assert.equal(isWarmupEligibleEquipment(["pullup_bar"]), false);
  assert.equal(isWarmupEligibleEquipment(["bodyweight", "pullup_bar"]), false);
  assert.equal(isWarmupEligibleEquipment(["treadmill"]), false);
  assert.equal(isWarmupEligibleEquipment([]), false);

  assert.equal(isBlockedExercise({ id: "non_cm_med_ball_toss", name: "Non CM Med Ball Toss" }), true);
  assert.equal(isBlockedExercise({ id: "non-cm-box-jump", name: "Non-CM Box Jump" }), true);
  assert.equal(isBlockedExercise({ id: "piston_run", name: "Piston Run" }), false);
  assert.equal(isBlockedExercise({ id: "opaque_push", name: "Push" }), true);
  assert.equal(isBlockedExercise({ id: "opaque_bend", name: "Bend" }), true);
  assert.equal(isBlockedExercise({ id: "barbell_row", name: "Barbell Row" }), false);

  console.log("workoutRules.test.ts: all passed");
}

run();
