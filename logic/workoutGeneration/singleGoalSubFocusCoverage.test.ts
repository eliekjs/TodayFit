/**
 * Single-goal sub-focus coverage: every session should include at least one exercise
 * matching the user's ranked sub-focuses when they only selected one primary goal.
 *
 * Run with:
 *   npx tsx logic/workoutGeneration/singleGoalSubFocusCoverage.test.ts
 */

import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function hasLegsMatch(exerciseId: string): boolean {
  const ex = STUB_EXERCISES.find((e) => e.id === exerciseId);
  if (!ex) return false;
  const muscles = (ex.muscle_groups ?? []).map((m) => m.toLowerCase());
  return muscles.includes("legs") || muscles.includes("quads") || muscles.includes("glutes") || muscles.includes("hamstrings");
}

function testUpperDayWithLegsSubFocusAddsGoalBlock() {
  const base: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "hypertrophy",
    focus_body_parts: ["upper_push"],
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "cable_machine", "bodyweight", "squat_rack", "leg_press"],
    injuries_or_constraints: [],
    seed: 42_424,
    goal_sub_focus: { muscle: ["legs"] },
  };

  const session = generateWorkoutSession(base, STUB_EXERCISES);
  const trainingIds = session.blocks
    .filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown")
    .flatMap((b) => b.items.map((i) => i.exercise_id));
  const legsInTraining = trainingIds.some((id) => hasLegsMatch(id));
  assert(legsInTraining, "expected leg-matching work in training blocks (not only warmup/cooldown) when sub-focus is legs");

}

function testMultiGoalSkipsGuarantee() {
  const base: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "hypertrophy",
    secondary_goals: ["strength"],
    focus_body_parts: ["upper_push"],
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "cable_machine", "bodyweight", "squat_rack", "leg_press"],
    injuries_or_constraints: [],
    seed: 42_425,
    goal_sub_focus: { muscle: ["legs"] },
  };

  const session = generateWorkoutSession(base, STUB_EXERCISES);
  const hasGoalFocus = session.blocks.some((b) => b.title === "Goal focus");
  assert(!hasGoalFocus, "multi-goal sessions should not inject Goal focus block");
}

function main() {
  testUpperDayWithLegsSubFocusAddsGoalBlock();
  testMultiGoalSkipsGuarantee();
  console.log("singleGoalSubFocusCoverage tests passed.");
}

main();
