/**
 * Conditioning steady-state vs interval policy.
 * Run: npx tsx lib/generation/conditioningSteadyStatePolicy.test.ts
 */

import assert from "node:assert/strict";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { generateWorkoutSession } from "../../logic/workoutGeneration/dailyGenerator";
import { formatPrescription } from "../types";
import {
  blobIsSprintOrAgilityConditioningDrill,
  isAllowedSteadyStateConditioning,
} from "./prescriptionRules";

function testDrillBlobDetection() {
  assert.equal(blobIsSprintOrAgilityConditioningDrill("dead_leg_run"), true);
  assert.equal(blobIsSprintOrAgilityConditioningDrill("zone2_treadmill"), false);
  assert.equal(blobIsSprintOrAgilityConditioningDrill("incline_treadmill_walk"), false);
  assert.equal(blobIsSprintOrAgilityConditioningDrill("high_knee_run"), true);
}

function testSteadyStateWhitelist() {
  const treadmill = exerciseDefinitionToGeneratorExercise(
    EXERCISES.find((e) => e.id === "zone2_treadmill")!
  );
  const deadLeg = exerciseDefinitionToGeneratorExercise(
    EXERCISES.find((e) => e.id === "dead_leg_run")!
  );
  assert.equal(isAllowedSteadyStateConditioning(treadmill), true);
  assert.equal(isAllowedSteadyStateConditioning(deadLeg), false);
}

function testDeadLegZone2PrimaryNeverSustained() {
  const base = EXERCISES.find((e) => e.id === "dead_leg_run")!;
  const ex = exerciseDefinitionToGeneratorExercise(base);
  const stripped = {
    ...ex,
    tags: {
      goal_tags: ["conditioning"],
      attribute_tags: ["zone2_aerobic_base"],
      stimulus: ["aerobic_zone2"],
    },
  };
  const pool = [
    stripped,
    ...EXERCISES.filter((e) => e.id === "zone2_treadmill").map(exerciseDefinitionToGeneratorExercise),
  ];

  let sawDeadLeg = false;
  for (let seed = 0; seed < 30; seed++) {
    const session = generateWorkoutSession(
      {
        duration_minutes: 45,
        primary_goal: "conditioning",
        energy_level: "medium",
        available_equipment: ["bodyweight", "treadmill"],
        injuries_or_constraints: [],
        goal_sub_focus: { conditioning: ["zone2_aerobic_base"] },
        seed,
      },
      pool
    );
    for (const b of session.blocks) {
      for (const item of b.items) {
        if (item.exercise_id !== "dead_leg_run") continue;
        sawDeadLeg = true;
        assert.ok(
          (item.time_seconds ?? 0) <= 60,
          `dead leg run should use short interval bouts, got ${item.time_seconds}s`
        );
        assert.ok(b.title !== "Zone 2 sustained effort", "dead leg run must not be Zone 2 sustained");
        const label = formatPrescription(item);
        assert.ok(!label.includes("15 min"), `prescription should not show long blocks: ${label}`);
      }
    }
  }
  assert.ok(sawDeadLeg, "expected dead_leg_run to appear in at least one generated session");
}

function testDeadLegRunNoZone2IntentTag() {
  const ex = exerciseDefinitionToGeneratorExercise(EXERCISES.find((e) => e.id === "dead_leg_run")!);
  const attrs = ex.tags.attribute_tags ?? [];
  assert.ok(!attrs.includes("zone2_aerobic_base"), "dead leg run should not carry zone2 intent tag");
}

function run() {
  testDrillBlobDetection();
  testSteadyStateWhitelist();
  testDeadLegZone2PrimaryNeverSustained();
  testDeadLegRunNoZone2IntentTag();
  console.log("conditioningSteadyStatePolicy.test.ts: all passed");
}

run();
