/**
 * Activation / warmup equipment policy.
 * Run: npx tsx lib/workoutRules.test.ts
 */
import assert from "node:assert/strict";
import { isWarmupEligibleEquipment } from "./workoutRules";

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

  console.log("workoutRules.test.ts: all passed");
}

run();
