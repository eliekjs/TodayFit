/**
 * Movement balance guardrails: pattern cap and heavy compound cap.
 * Run: npx tsx logic/workoutIntelligence/scoring/movementBalanceGuardrails.test.ts
 */

import type { ExerciseWithQualities } from "../types";
import type { SessionSelectionState } from "./scoreTypes";
import { createSessionSelectionState } from "./fatigueTracking";
import { DEFAULT_SELECTION_CONFIG } from "./scoringConfig";
import { wouldViolateGuardrail } from "./movementBalanceGuardrails";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function baseExercise(overrides: Partial<ExerciseWithQualities>): ExerciseWithQualities {
  return {
    id: "ex",
    name: "Test",
    movement_pattern: "pull",
    muscle_groups: ["back"],
    equipment_required: [],
    training_quality_weights: {},
    fatigue_cost: "medium",
    modality: "strength",
    ...overrides,
  };
}

function testHingePatternCap() {
  const config = DEFAULT_SELECTION_CONFIG;
  const state = createSessionSelectionState("moderate", {
    max_same_pattern_per_session: config.max_same_pattern_per_session,
  });
  state.movement_pattern_counts.set("hinge", config.max_same_pattern_per_session);
  const hinge = baseExercise({ id: "rdl", movement_pattern: "hinge" });
  assert(wouldViolateGuardrail(hinge, state, config), "blocks hinge when pattern at cap");
  state.movement_pattern_counts.set("hinge", config.max_same_pattern_per_session - 1);
  assert(!wouldViolateGuardrail(hinge, state, config), "allows hinge below cap");
  console.log("  OK: hinge respects max_same_pattern_per_session");
}

function testHeavyCompoundCap() {
  const config = DEFAULT_SELECTION_CONFIG;
  const state = createSessionSelectionState("moderate", {
    max_same_pattern_per_session: config.max_same_pattern_per_session,
  });
  const heavyHinge = baseExercise({
    id: "deadlift",
    movement_pattern: "hinge",
    fatigue_cost: "high",
  });
  state.heavy_compound_count = config.max_heavy_compounds_per_session;
  assert(wouldViolateGuardrail(heavyHinge, state, config), "blocks when heavy compounds at cap");
  state.heavy_compound_count = config.max_heavy_compounds_per_session - 1;
  assert(!wouldViolateGuardrail(heavyHinge, state, config), "allows below cap");
  console.log("  OK: heavy hinge/squat cap at max_heavy_compounds_per_session");
}

function testMediumFatigueHingeDoesNotCountAsHeavyCompound() {
  const config = DEFAULT_SELECTION_CONFIG;
  const state = createSessionSelectionState("moderate", {
    max_same_pattern_per_session: config.max_same_pattern_per_session,
  });
  state.heavy_compound_count = config.max_heavy_compounds_per_session;
  const mediumHinge = baseExercise({
    id: "kb_deadlift",
    movement_pattern: "hinge",
    fatigue_cost: "medium",
  });
  assert(
    !wouldViolateGuardrail(mediumHinge, state, config),
    "medium-fatigue hinge is not counted as heavy compound for this cap"
  );
  console.log("  OK: heavy compound cap applies to high-fatigue squat/hinge only");
}

function run() {
  console.log("movementBalanceGuardrails tests\n");
  testHingePatternCap();
  testHeavyCompoundCap();
  testMediumFatigueHingeDoesNotCountAsHeavyCompound();
  console.log("\nAll movementBalanceGuardrails tests passed.");
}

run();
