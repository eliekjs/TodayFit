/**
 * Soccer field-sport wiring: session transfer debug, coverage, intent contract.
 * Run: npx tsx logic/workoutGeneration/soccerFieldSportSession.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import { generateWorkoutSession } from "./dailyGenerator";
import {
  buildSoccerSessionIntentContract,
  sessionIntentContractForSportSlug,
  SOCCER_CONTRACT_SPORT_SLUG,
} from "./sessionIntentContract";
import type { Exercise, GenerateWorkoutInput } from "./types";

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function baseInput(seed: number, overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  const contract = sessionIntentContractForSportSlug("soccer");
  assert(contract, "soccer contract");
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "dumbbells",
      "kettlebells",
      "bench",
      "squat_rack",
      "bodyweight",
      "treadmill",
      "rowing_machine",
    ],
    injuries_or_constraints: [],
    seed,
    sport_weight: 0.55,
    sport_slugs: ["soccer"],
    session_intent_contract: contract,
    style_prefs: { user_level: "intermediate" },
    include_intent_survival_report: true,
    use_reduced_surface_for_soccer_main_scoring: true,
    ...overrides,
  };
}

function testContractSlugAndMustInclude() {
  const c = buildSoccerSessionIntentContract();
  assert.strictEqual(c.sportSlug, SOCCER_CONTRACT_SPORT_SLUG);
  assert.ok(c.mustIncludeCategories.length >= 4, "must-include categories for soccer main transfer");
  console.log("  OK: soccer intent contract slug + mustIncludeCategories");
}

function testSessionEmitsSoccerTransferDebug() {
  const p = pool();
  const session = generateWorkoutSession(baseInput(901), p);
  const xfer = session.debug?.sport_pattern_transfer;
  assert(xfer, "expected debug.sport_pattern_transfer");
  assert.strictEqual(xfer.sport_slug, "soccer");
  assert.strictEqual(xfer.session_summary?.sport_slug, "soccer");
  console.log("  OK: generateWorkoutSession emits soccer sport_pattern_transfer");
}

function testCoverageReadableAcrossScenarios() {
  const p = pool();
  const scenarios: Partial<GenerateWorkoutInput>[] = [
    { seed: 902, duration_minutes: 30, primary_goal: "strength", focus_body_parts: ["lower"] },
    { seed: 903, duration_minutes: 55, primary_goal: "strength", focus_body_parts: ["posterior"] },
    { seed: 904, duration_minutes: 50, primary_goal: "hypertrophy", focus_body_parts: ["lower"] },
    { seed: 905, duration_minutes: 40, primary_goal: "strength", focus_body_parts: ["core"], style_prefs: { user_level: "advanced" } },
  ];
  let okCount = 0;
  for (const o of scenarios) {
    const session = generateWorkoutSession(baseInput(o.seed as number, o), p);
    const xfer = session.debug?.sport_pattern_transfer;
    assert(xfer?.sport_slug === "soccer", `seed ${o.seed} missing soccer xfer`);
    if (xfer.coverage_ok) okCount++;
  }
  assert.ok(okCount >= 2, `expected most scenarios to satisfy coverage; got ${okCount}/4`);
  console.log(`  OK: soccer coverage_ok in ${okCount}/4 sample scenarios`);
}

function testUpperFocusDisablesSoccerPatternTransfer() {
  const p = pool();
  const session = generateWorkoutSession(
    baseInput(906, { focus_body_parts: ["upper_push"], primary_goal: "strength" }),
    p
  );
  const xfer = session.debug?.sport_pattern_transfer;
  assert.strictEqual(xfer, undefined, "upper-only focus should not attach soccer transfer debug");
  console.log("  OK: upper_push focus skips soccer pattern transfer debug");
}

function main(): void {
  console.log("soccerFieldSportSession.test.ts");
  testContractSlugAndMustInclude();
  testSessionEmitsSoccerTransferDebug();
  testCoverageReadableAcrossScenarios();
  testUpperFocusDisablesSoccerPatternTransfer();
  console.log("All soccer field-sport checks passed.");
}

main();
