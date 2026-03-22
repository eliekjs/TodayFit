/**
 * Run: npx tsx lib/exerciseMetadata/phase3SessionRoleInference.test.ts
 */

import type { ExerciseDefinition } from "../types";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { getEffectivePairingCategory, getSupersetPairingScore } from "../../logic/workoutIntelligence/supersetPairing";
import { inferPhase3SessionFromInput } from "./phase3SessionRoleInference";
import { exerciseInferenceInputFromDefinition, inferPhase1MovementFromInput } from "./phase1MovementInference";
import { inferPhase2SafetyFromInput } from "./phase2SafetyInference";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function partialDef(overrides: Partial<ExerciseDefinition> & Pick<ExerciseDefinition, "id" | "name">): ExerciseDefinition {
  return {
    muscles: [],
    modalities: ["strength"],
    equipment: [],
    tags: [],
    ...overrides,
  } as ExerciseDefinition;
}

function testBenchMainCompoundAndChestPairing() {
  const def = partialDef({
    id: "barbell_bench_infer",
    name: "Barbell Bench Press",
    muscles: ["push"],
    modalities: ["strength"],
    equipment: ["barbell", "bench"],
  });
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(ex.exercise_role === "main_compound", `role main_compound, got ${ex.exercise_role}`);
  assert(ex.pairing_category === "chest", `pairing chest, got ${ex.pairing_category}`);
  assert((ex.fatigue_regions ?? []).includes("pecs"), "fatigue pecs");
  assert((ex.fatigue_regions ?? []).includes("triceps"), "fatigue triceps");
  const cat = getEffectivePairingCategory(ex);
  assert(cat === "chest", "effective pairing chest");
  console.log("  OK: bench → main_compound, chest pairing, pecs/triceps fatigue");
}

function testFacePullAccessory() {
  const def = partialDef({
    id: "face_pull_infer",
    name: "Cable Face Pull",
    muscles: ["pull"],
    modalities: ["strength"],
    tags: ["scapular_control"],
  });
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(ex.exercise_role === "accessory", `face pull accessory, got ${ex.exercise_role}`);
  console.log("  OK: face pull → accessory");
}

function testTricepsPushdownIsolation() {
  const def = partialDef({
    id: "pushdown_infer",
    name: "Cable Triceps Pushdown",
    muscles: ["push"],
    modalities: ["strength"],
  });
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(ex.exercise_role === "isolation", `pushdown isolation, got ${ex.exercise_role}`);
  console.log("  OK: pushdown → isolation");
}

function testMobilityRole() {
  const def = partialDef({
    id: "cat_cow_role",
    name: "Cat Cow",
    muscles: ["core"],
    modalities: ["mobility"],
  });
  const ex = exerciseDefinitionToGeneratorExercise(def);
  assert(ex.exercise_role === "mobility", `mobility role, got ${ex.exercise_role}`);
  assert(ex.pairing_category === "mobility", "pairing mobility");
  console.log("  OK: mobility modality → mobility role + pairing");
}

function testSupersetComplementaryScore() {
  const defA = partialDef({
    id: "sq_a",
    name: "Goblet Squat",
    muscles: ["legs"],
    modalities: ["strength"],
    equipment: ["kettlebells"],
  });
  const defB = partialDef({
    id: "rdl_b",
    name: "Romanian Deadlift",
    muscles: ["legs"],
    modalities: ["strength"],
    equipment: ["barbell"],
    tags: ["posterior_chain"],
  });
  const a = exerciseDefinitionToGeneratorExercise(defA);
  const b = exerciseDefinitionToGeneratorExercise(defB);
  const score = getSupersetPairingScore(a, b);
  assert(score > 0, `quads/posterior pair should score > 0, got ${score}`);
  console.log("  OK: squat + RDL superset pairing score positive");
}

function testInferDirectPrep() {
  const input = exerciseInferenceInputFromDefinition(
    partialDef({ id: "bd", name: "Bird Dog", muscles: ["core"], modalities: ["strength"] })
  );
  const p1 = inferPhase1MovementFromInput(input);
  const p2 = inferPhase2SafetyFromInput(input, {
    movement_patterns: p1.movement_patterns,
    primary_movement_family: p1.primary_movement_family,
  });
  const p3 = inferPhase3SessionFromInput(input, {
    movement_patterns: p1.movement_patterns,
    primary_movement_family: p1.primary_movement_family,
    movement_pattern: "rotate",
    modality: "strength",
    joint_stress_tags: p2.joint_stress_tags,
  });
  assert(p3.exercise_role === "prep", `bird dog prep, got ${p3.exercise_role}`);
  console.log("  OK: inferPhase3Session bird dog → prep");
}

function run() {
  console.log("phase3SessionRoleInference tests\n");
  testBenchMainCompoundAndChestPairing();
  testFacePullAccessory();
  testTricepsPushdownIsolation();
  testMobilityRole();
  testSupersetComplementaryScore();
  testInferDirectPrep();
  console.log("\nAll phase3SessionRoleInference tests passed.");
}

run();
