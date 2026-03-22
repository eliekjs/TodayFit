/**
 * Run: npx tsx lib/exerciseMetadata/phase4ConditioningIntentInference.test.ts
 */

import type { ExerciseDefinition } from "../types";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { exerciseHasSubFocusSlug } from "../../data/goalSubFocus/conditioningSubFocus";
import { inferPhase4ConditioningIntents, shouldRunPhase4ConditioningInference } from "./phase4ConditioningIntentInference";
import { exerciseInferenceInputFromDefinition, inferPhase1MovementFromInput } from "./phase1MovementInference";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function partialDef(overrides: Partial<ExerciseDefinition> & Pick<ExerciseDefinition, "id" | "name">): ExerciseDefinition {
  return {
    muscles: ["legs"],
    modalities: ["conditioning"],
    equipment: [],
    tags: [],
    ...overrides,
  } as ExerciseDefinition;
}

function testZone2Bike() {
  const def = partialDef({
    id: "ph4_zone2_bike",
    name: "Steady Bike",
    equipment: ["bike"],
    modalities: ["conditioning"],
  });
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(shouldRunPhase4ConditioningInference(ex, exerciseInferenceInputFromDefinition(def)), "should run");
  assert(exerciseHasSubFocusSlug(ex, "zone2_aerobic_base"), "matches zone2 intent");
  assert(ex.tags.stimulus?.includes("aerobic_zone2"), "stimulus bridge aerobic_zone2");
  console.log("  OK: conditioning bike → zone2 + aerobic_zone2 stimulus");
}

function testIntervalsBurpee() {
  const def = partialDef({
    id: "ph4_burpee",
    name: "Burpee",
    muscles: ["legs"],
    modalities: ["conditioning"],
    equipment: ["bodyweight"],
  });
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(exerciseHasSubFocusSlug(ex, "intervals_hiit"), "intervals_hiit");
  assert(ex.tags.stimulus?.includes("anaerobic"), "anaerobic stimulus");
  console.log("  OK: burpee → intervals_hiit + anaerobic");
}

function testOlympicStrength() {
  const def = {
    id: "ph4_hang_snatch",
    name: "Hang Power Snatch",
    muscles: ["legs"] as const,
    modalities: ["strength"] as const,
    equipment: ["barbell"] as const,
    tags: [] as string[],
  } as ExerciseDefinition;
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(shouldRunPhase4ConditioningInference(ex, exerciseInferenceInputFromDefinition(def)), "olympic gate on strength");
  assert(exerciseHasSubFocusSlug(ex, "olympic_triple_extension"), "olympic intent");
  assert(ex.tags.stimulus?.includes("plyometric"), "plyometric stimulus");
  console.log("  OK: hang snatch on strength → olympic_triple_extension");
}

function testInferRowerMultiIntent() {
  const input = exerciseInferenceInputFromDefinition(
    partialDef({ id: "row_x", name: "Row Erg Steady", equipment: ["rower"], modalities: ["conditioning"] })
  );
  const p1 = inferPhase1MovementFromInput(input);
  const out = inferPhase4ConditioningIntents(input, {
    movement_patterns: p1.movement_patterns,
    primary_movement_family: p1.primary_movement_family,
    modality: "conditioning",
    equipment: ["rower"],
  });
  assert(out.intent_slugs.includes("zone2_aerobic_base"), "rower zone2");
  assert(out.intent_slugs.includes("threshold_tempo"), "rower threshold");
  assert(out.intent_slugs.includes("intervals_hiit"), "rower hiit");
  console.log("  OK: rower → zone2 + threshold + intervals (versatile erg)");
}

function testStrengthBenchNoPhase4() {
  const def = {
    id: "ph4_bench",
    name: "Bench Press",
    muscles: ["push"] as const,
    modalities: ["strength"] as const,
    equipment: ["barbell", "bench"] as const,
    tags: [] as string[],
  } as ExerciseDefinition;
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(!shouldRunPhase4ConditioningInference(ex, exerciseInferenceInputFromDefinition(def)), "bench skips phase4");
  const attrs = ex.tags.attribute_tags ?? [];
  assert(!attrs.includes("zone2_aerobic_base"), "no zone2 on bench");
  console.log("  OK: strength bench does not get conditioning intents");
}

function run() {
  console.log("phase4ConditioningIntentInference tests\n");
  testZone2Bike();
  testIntervalsBurpee();
  testOlympicStrength();
  testInferRowerMultiIntent();
  testStrengthBenchNoPhase4();
  console.log("\nAll phase4ConditioningIntentInference tests passed.");
}

run();
