/**
 * Recovery & Mobility regional sub-focus: knees, elbows, wrists pool coverage.
 */

import assert from "node:assert/strict";
import { EXERCISES } from "../exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { exerciseMatchesGoalSubFocusSlugUnified } from "../../logic/workoutGeneration/subFocusSlugMatch";
import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  MOBILITY_KNEES_IDS,
  MOBILITY_ELBOWS_IDS,
  MOBILITY_WRISTS_IDS,
} from "../goalIntentEnrichment";

const MIN_POOL = 12;

function catalogExercise(id: string): Exercise | undefined {
  const def = EXERCISES.find((e) => e.id === id);
  return def ? exerciseDefinitionToGeneratorExercise(def) : undefined;
}

function mobilityRecoveryPool(): Exercise[] {
  return EXERCISES.map(exerciseDefinitionToGeneratorExercise).filter(
    (e) => e.modality === "mobility" || e.modality === "recovery"
  );
}

function countMatches(goalSlug: "recovery_mobility", subSlug: string, pool: Exercise[]): number {
  return pool.filter((e) => exerciseMatchesGoalSubFocusSlugUnified(e, goalSlug, subSlug)).length;
}

function testEnrichedIdsMatchSubFocus() {
  for (const id of MOBILITY_KNEES_IDS) {
    const ex = catalogExercise(id);
    assert.ok(ex, `missing catalog exercise ${id}`);
    assert.ok(
      exerciseMatchesGoalSubFocusSlugUnified(ex, "recovery_mobility", "knees"),
      `${id} should match recovery_mobility:knees`
    );
  }
  for (const id of MOBILITY_ELBOWS_IDS) {
    const ex = catalogExercise(id);
    assert.ok(ex, `missing catalog exercise ${id}`);
    assert.ok(
      exerciseMatchesGoalSubFocusSlugUnified(ex, "recovery_mobility", "elbows"),
      `${id} should match recovery_mobility:elbows`
    );
  }
  for (const id of MOBILITY_WRISTS_IDS) {
    const ex = catalogExercise(id);
    assert.ok(ex, `missing catalog exercise ${id}`);
    assert.ok(
      exerciseMatchesGoalSubFocusSlugUnified(ex, "recovery_mobility", "wrists"),
      `${id} should match recovery_mobility:wrists`
    );
  }
}

function testPoolSizesMeetMinimum() {
  const pool = mobilityRecoveryPool();
  const knees = countMatches("recovery_mobility", "knees", pool);
  const elbows = countMatches("recovery_mobility", "elbows", pool);
  const wrists = countMatches("recovery_mobility", "wrists", pool);

  assert.ok(knees >= MIN_POOL, `knees pool too small: ${knees} (need >= ${MIN_POOL})`);
  assert.ok(elbows >= MIN_POOL, `elbows pool too small: ${elbows} (need >= ${MIN_POOL})`);
  assert.ok(wrists >= MIN_POOL, `wrists pool too small: ${wrists} (need >= ${MIN_POOL})`);
}

function run() {
  testEnrichedIdsMatchSubFocus();
  testPoolSizesMeetMinimum();
  console.log("recoveryMobilityRegionalSubFocus.test.ts: all passed");
}

run();
