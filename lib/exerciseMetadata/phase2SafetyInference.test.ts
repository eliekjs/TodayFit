/**
 * Run: npx tsx lib/exerciseMetadata/phase2SafetyInference.test.ts
 */

import type { ExerciseDefinition } from "../types";
import type { Exercise } from "../../logic/workoutGeneration/types";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { filterInjury } from "../../logic/workoutIntelligence/selection/candidateFilters";
import type { WorkoutSelectionInput } from "../../logic/workoutIntelligence/scoring/scoreTypes";
import { exerciseInferenceInputFromDefinition } from "./phase1MovementInference";
import {
  canonicalizeJointStressSlugs,
  contraindicationsFromJointStress,
  inferPhase2SafetyFromInput,
} from "./phase2SafetyInference";

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

function toGeneratorExercise(def: ExerciseDefinition): Exercise {
  return exerciseDefinitionToGeneratorExercise(def);
}

function testCanonicalizeLegacy() {
  const out = canonicalizeJointStressSlugs(["joint_shoulder_overhead", "shoulder_extension", "wrist_stress"]);
  assert(out.includes("shoulder_overhead"), "shoulder_overhead");
  assert(out.includes("shoulder_extension_load"), "maps shoulder_extension");
  assert(out.includes("wrist_extension_load"), "maps wrist_stress");
  console.log("  OK: canonicalizeJointStressSlugs");
}

function testContraFromJoint() {
  const c = contraindicationsFromJointStress(["shoulder_overhead", "knee_flexion"]);
  assert(c.includes("shoulder") && c.includes("knee"), "maps regions");
  console.log("  OK: contraindicationsFromJointStress");
}

function testBoxJumpHighImpact() {
  const def = partialDef({
    id: "box_jump_test",
    name: "Box Jump",
    muscles: ["legs"],
    modalities: ["power"],
    tags: [],
  });
  const ex = toGeneratorExercise(def);
  assert(ex.impact_level === "high", `box jump high impact, got ${ex.impact_level}`);
  assert((ex.joint_stress_tags ?? []).includes("knee_flexion"), "knee_flexion");
  assert((ex.joint_stress_tags ?? []).includes("ankle_stress"), "ankle_stress");
  console.log("  OK: plyometric → high impact + knee/ankle stress");
}

function testMobilityNoJointStress() {
  const def = partialDef({
    id: "cat_cow",
    name: "Cat Cow",
    muscles: ["core"],
    modalities: ["mobility"],
    tags: [],
  });
  const ex = toGeneratorExercise(def);
  assert((ex.joint_stress_tags ?? []).length === 0, "mobility-only: no joint stress tags");
  assert(ex.impact_level === "none", "impact none");
  console.log("  OK: mobility-only → no joint stress, impact none");
}

function testPullupGripAndShoulder() {
  const def = partialDef({
    id: "pullup_test",
    name: "Pull-Up",
    muscles: ["pull"],
    modalities: ["strength"],
    tags: [],
  });
  const ex = toGeneratorExercise(def);
  const js = ex.joint_stress_tags ?? [];
  assert(js.includes("grip_hanging"), "grip_hanging");
  assert(js.includes("shoulder_extension_load"), "shoulder_extension_load");
  console.log("  OK: vertical pull → extension load + grip");
}

function testFilterInjuryKneeExcludesSquat() {
  const def = partialDef({
    id: "back_squat_infer",
    name: "Barbell Back Squat",
    muscles: ["legs"],
    modalities: ["strength"],
    tags: [],
  });
  const ex = toGeneratorExercise(def);
  const input: WorkoutSelectionInput = {
    primary_goal: "strength",
    available_equipment: ["barbell"],
    duration_minutes: 45,
    energy_level: "medium",
    injuries_or_limitations: ["knee"],
  };
  const r = filterInjury(ex, input);
  assert(!r.pass, "knee injury excludes inferred squat");
  console.log("  OK: filterInjury excludes knee-tagged squat");
}

function testFilterInjuryShoulderExcludesBench() {
  const def = partialDef({
    id: "bench_infer",
    name: "Barbell Bench Press",
    muscles: ["push"],
    modalities: ["strength"],
    tags: [],
  });
  const ex = toGeneratorExercise(def);
  const input: WorkoutSelectionInput = {
    primary_goal: "strength",
    available_equipment: ["barbell", "bench"],
    duration_minutes: 45,
    energy_level: "medium",
    injuries_or_limitations: ["shoulder"],
  };
  const r = filterInjury(ex, input);
  assert(!r.pass, "shoulder injury excludes horizontal push");
  console.log("  OK: filterInjury excludes shoulder-tagged bench");
}

function testInferDirect() {
  const input = exerciseInferenceInputFromDefinition(
    partialDef({ id: "deadlift_x", name: "Conventional Deadlift", muscles: ["legs"], modalities: ["strength"], tags: ["posterior_chain"] })
  );
  const p2 = inferPhase2SafetyFromInput(input, { movement_patterns: ["hinge"], primary_movement_family: "lower_body" });
  assert(p2.joint_stress_tags.includes("lumbar_shear"), "hinge → lumbar_shear");
  assert(p2.joint_stress_tags.includes("spinal_axial_load"), "hinge → axial load");
  console.log("  OK: inferPhase2Safety hinge pattern");
}

function run() {
  console.log("phase2SafetyInference tests\n");
  testCanonicalizeLegacy();
  testContraFromJoint();
  testInferDirect();
  testBoxJumpHighImpact();
  testMobilityNoJointStress();
  testPullupGripAndShoulder();
  testFilterInjuryKneeExcludesSquat();
  testFilterInjuryShoulderExcludesBench();
  console.log("\nAll phase2SafetyInference tests passed.");
}

run();
