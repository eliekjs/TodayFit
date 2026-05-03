/**
 * Regression coverage for:
 * - Surfing pop-up power sessions avoiding row/pull selections.
 * - Sprint/burst conditioning prescription (20-30s work, 5-10 sets).
 * - Exercise catalog cleanup for opaque "non cm" naming.
 *
 * Run: npx tsx logic/workoutGeneration/surfing-pop-up-and-burst-conditioning.test.ts
 */

import assert from "node:assert/strict";
import { OTA_MOVEMENTS } from "../../data/otaMovements";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";

function mkConditioning(id: string, name: string): Exercise {
  return {
    id,
    name,
    movement_pattern: "locomotion",
    movement_patterns: ["locomotion"],
    muscle_groups: ["legs", "core"],
    modality: "conditioning",
    equipment_required: ["bodyweight"],
    difficulty: 2,
    time_cost: "medium",
    tags: {
      goal_tags: ["conditioning"],
      stimulus: ["anaerobic", "speed"],
      energy_fit: ["medium", "high"],
    },
  };
}

function mkStrength(id: string, name: string, pattern: "push" | "pull"): Exercise {
  return {
    id,
    name,
    movement_pattern: pattern,
    movement_patterns: [pattern === "push" ? "horizontal_push" : "horizontal_pull"],
    primary_movement_family: pattern === "push" ? "upper_push" : "upper_pull",
    muscle_groups: pattern === "push" ? ["push", "core"] : ["pull", "core"],
    modality: "strength",
    equipment_required: ["cable_machine", "bodyweight"],
    difficulty: 2,
    time_cost: "medium",
    tags: {
      goal_tags: ["strength", "power"],
      attribute_tags: [pattern === "push" ? "horizontal_push" : "horizontal_pull"],
      energy_fit: ["medium"],
    },
  };
}

function makeBaseInput(seed: number): GenerateWorkoutInput {
  return {
    duration_minutes: 60,
    primary_goal: "strength",
    secondary_goals: ["conditioning"],
    energy_level: "medium",
    available_equipment: ["bodyweight", "cable_machine"],
    injuries_or_constraints: [],
    seed,
  };
}

function getConditioningItem(session: ReturnType<typeof generateWorkoutSession>) {
  const block = session.blocks.find((b) => b.block_type === "conditioning");
  assert.ok(block, "session should include a conditioning block");
  assert.ok(block.items.length > 0, "conditioning block should include at least one item");
  return block.items[0]!;
}

function testBurstConditioningPrescription() {
  const baseStrength = mkStrength("pushup_power", "Push-up Power", "push");
  const piston = mkConditioning("piston_run", "Piston Run");
  const pistonSession = generateWorkoutSession(makeBaseInput(901), [baseStrength, piston]);
  const pistonItem = getConditioningItem(pistonSession);
  assert.ok((pistonItem.sets ?? 0) >= 5 && (pistonItem.sets ?? 0) <= 10, "piston run should be 5-10 sets");
  assert.ok([20, 30].includes(pistonItem.time_seconds ?? -1), "piston run work interval should be 20 or 30 seconds");
  assert.ok([40, 60].includes(pistonItem.rest_seconds ?? -1), "piston run rest should be 40 or 60 seconds");
  assert.ok(
    (pistonItem.reasoning_tags ?? []).includes("conditioning_protocol_sprint_burst"),
    "piston run should include sprint-burst conditioning protocol tag"
  );

  const highKnee = mkConditioning("high_knee_run", "High Knee Run");
  const highKneeSession = generateWorkoutSession(makeBaseInput(902), [baseStrength, highKnee]);
  const highKneeItem = getConditioningItem(highKneeSession);
  assert.ok((highKneeItem.sets ?? 0) >= 5 && (highKneeItem.sets ?? 0) <= 10, "high-knee run should be 5-10 sets");
  assert.ok([20, 30].includes(highKneeItem.time_seconds ?? -1), "high-knee run work interval should be 20 or 30 seconds");
  assert.ok([40, 60].includes(highKneeItem.rest_seconds ?? -1), "high-knee run rest should be 40 or 60 seconds");
  assert.ok(
    (highKneeItem.reasoning_tags ?? []).includes("conditioning_protocol_sprint_burst"),
    "high-knee run should include sprint-burst conditioning protocol tag"
  );
}

function testSurfingPopUpPowerAvoidsRows() {
  const pushA = mkStrength("explosive_push_up", "Explosive Push Up", "push");
  const pushB = mkStrength("half_kneeling_press", "Half Kneeling Press", "push");
  const rowA = mkStrength("ff_single_arm_cable_shotgun_row", "Single Arm Cable Shotgun Row", "pull");
  const rowB = mkStrength("single_arm_row", "Single Arm Row", "pull");
  const conditioning = mkConditioning("piston_run", "Piston Run");
  const input: GenerateWorkoutInput = {
    ...makeBaseInput(903),
    sport_slugs: ["surfing"],
    sport_sub_focus: { surfing: ["pop_up_power"] },
    goal_sub_focus: { strength: ["bench_press"] },
    goal_sub_focus_weights: { strength: [1] },
    style_prefs: { wants_supersets: true },
  };
  const session = generateWorkoutSession(input, [pushA, pushB, rowA, rowB, conditioning]);
  const allExerciseIds = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id.toLowerCase()));
  assert.ok(allExerciseIds.length > 0, "session should include selectable exercises");
  assert.ok(
    allExerciseIds.every((id) => !id.includes("row")),
    `surfing pop-up power session should avoid row/pull rows, got: ${allExerciseIds.join(", ")}`
  );
}

function testSurfingPopUpWithPaddleEnduranceAllowsRows() {
  const pushA = mkStrength("explosive_push_up", "Explosive Push Up", "push");
  const rowA = mkStrength("ff_single_arm_cable_shotgun_row", "Single Arm Cable Shotgun Row", "pull");
  const rowB = mkStrength("single_arm_row", "Single Arm Row", "pull");
  const conditioning = mkConditioning("piston_run", "Piston Run");
  const input: GenerateWorkoutInput = {
    ...makeBaseInput(904),
    sport_slugs: ["surfing"],
    sport_sub_focus: { surfing: ["pop_up_power", "paddle_endurance"] },
    goal_sub_focus: { strength: ["pull"] },
    goal_sub_focus_weights: { strength: [1] },
    style_prefs: { wants_supersets: true },
  };
  let rowSeen = false;
  for (let s = 0; s < 20; s++) {
    const session = generateWorkoutSession({ ...input, seed: 904 + s }, [pushA, rowA, rowB, conditioning]);
    const ids = session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id.toLowerCase()));
    if (ids.some((id) => id.includes("row"))) {
      rowSeen = true;
      break;
    }
  }
  assert.ok(rowSeen, "surfing pop-up + paddle_endurance should allow pull/row selections");
}

function testCatalogHasNoNonCmNaming() {
  const offenders = OTA_MOVEMENTS.filter((m) => /\bnon[\s_-]*cm\b/i.test(m.name) || /\bnon[\s_-]*cm\b/i.test(m.id));
  assert.equal(offenders.length, 0, "exercise catalog should not contain opaque non-cm entries");
}

function run() {
  testBurstConditioningPrescription();
  testSurfingPopUpPowerAvoidsRows();
  testSurfingPopUpWithPaddleEnduranceAllowsRows();
  testCatalogHasNoNonCmNaming();
  console.log("surfing-pop-up-and-burst-conditioning.test.ts: all passed");
}

run();
