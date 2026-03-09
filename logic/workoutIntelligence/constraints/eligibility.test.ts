/**
 * Phase 5: Ontology-first eligibility and constraint filtering tests.
 * Run with: npx tsx logic/workoutIntelligence/constraints/eligibility.test.ts
 */

import { resolveWorkoutConstraints } from "./resolveWorkoutConstraints";
import {
  deriveMovementFamily,
  getEffectiveMovementFamilies,
  isExerciseAllowedByInjuries,
  matchesBodyPartFocus,
  isExerciseEligibleByConstraints,
} from "./eligibilityHelpers";
import type { ExerciseWithQualities } from "../types";
import type { ResolvedWorkoutConstraints } from "./constraintTypes";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/** Annotated upper_push exercise (e.g. bench press). */
const UPPER_PUSH_EXERCISE: ExerciseWithQualities = {
  id: "bench_press_barbell",
  name: "Barbell Bench Press",
  movement_pattern: "push",
  muscle_groups: ["chest", "triceps"],
  equipment_required: ["barbell", "bench"],
  training_quality_weights: {},
  primary_movement_family: "upper_push",
  secondary_movement_families: [],
  joint_stress_tags: ["shoulder_extension_load", "wrist_extension_load"],
  contraindication_tags: ["shoulder", "wrist"],
};

/** Annotated upper_pull exercise. */
const UPPER_PULL_EXERCISE: ExerciseWithQualities = {
  id: "lat_pulldown",
  name: "Lat Pulldown",
  movement_pattern: "pull",
  muscle_groups: ["lats", "biceps"],
  equipment_required: ["cable_machine"],
  training_quality_weights: {},
  primary_movement_family: "upper_pull",
  joint_stress_tags: ["shoulder_extension_load"],
  contraindication_tags: ["shoulder"],
};

/** Hybrid: thruster (lower_body primary, upper_push secondary). */
const THRUSTER: ExerciseWithQualities = {
  id: "thruster",
  name: "Thruster",
  movement_pattern: "push",
  muscle_groups: ["legs", "shoulders"],
  equipment_required: ["barbell"],
  training_quality_weights: {},
  primary_movement_family: "lower_body",
  secondary_movement_families: ["upper_push"],
  joint_stress_tags: ["knee_flexion", "shoulder_overhead"],
  contraindication_tags: ["knee", "shoulder"],
};

/** Non-annotated exercise (legacy: pattern + muscles only). */
const LEGACY_PUSH: ExerciseWithQualities = {
  id: "some_push",
  name: "Some Push",
  movement_pattern: "push",
  muscle_groups: ["push", "chest"],
  equipment_required: ["bodyweight"],
  training_quality_weights: {},
};

/** Annotated knee-stress exercise. */
const DEEP_KNEE_EXERCISE: ExerciseWithQualities = {
  id: "barbell_back_squat",
  name: "Barbell Back Squat",
  movement_pattern: "squat",
  muscle_groups: ["legs", "core"],
  equipment_required: ["barbell"],
  training_quality_weights: {},
  primary_movement_family: "lower_body",
  joint_stress_tags: ["knee_flexion", "deep_knee_flexion", "spinal_axial_load"],
  contraindication_tags: ["knee", "lower_back"],
};

function testUpperPushFocusReturnsOnlyUpperPush() {
  const constraints: ResolvedWorkoutConstraints = resolveWorkoutConstraints({
    primary_goal: "hypertrophy",
    body_region_focus: ["upper_push"],
    available_equipment: ["barbell", "bench"],
    duration_minutes: 45,
    energy_level: "medium",
  });
  assert(constraints.allowed_movement_families != null, "allowed_movement_families set");
  assert(constraints.allowed_movement_families!.includes("upper_push"), "upper_push in allowed");

  assert(matchesBodyPartFocus(UPPER_PUSH_EXERCISE, constraints), "annotated upper_push matches upper_push focus");
  assert(!matchesBodyPartFocus(UPPER_PULL_EXERCISE, constraints), "upper_pull does not match upper_push focus");
  assert(matchesBodyPartFocus(THRUSTER, constraints), "thruster matches upper_push focus (secondary)");
  assert(matchesBodyPartFocus(LEGACY_PUSH, constraints), "legacy push derives to upper_push and matches");
}

function testShoulderIrritationExcludesRiskyShoulderExercises() {
  const constraints = resolveWorkoutConstraints({
    primary_goal: "strength",
    injuries_or_limitations: ["shoulder", "rotator cuff"],
    available_equipment: ["barbell"],
    duration_minutes: 45,
    energy_level: "medium",
  });
  assert(constraints.excluded_joint_stress_tags.size > 0, "excluded joint stress tags set");
  assert(constraints.excluded_contraindication_keys.has("shoulder"), "shoulder in excluded contra keys");

  assert(!isExerciseAllowedByInjuries(UPPER_PUSH_EXERCISE, constraints), "bench excluded (shoulder contra + joint stress)");
  assert(!isExerciseAllowedByInjuries(UPPER_PULL_EXERCISE, constraints), "pulldown excluded (shoulder)");
  assert(!isExerciseAllowedByInjuries(THRUSTER, constraints), "thruster excluded (shoulder)");
  const safeLower: ExerciseWithQualities = {
    ...DEEP_KNEE_EXERCISE,
    joint_stress_tags: ["knee_flexion"],
    contraindication_tags: ["knee"],
  };
  assert(isExerciseAllowedByInjuries(safeLower, constraints), "squat without shoulder stress allowed");
}

function testKneeSensitivityExcludesDeepKneeFlexion() {
  const constraints = resolveWorkoutConstraints({
    primary_goal: "strength",
    injuries_or_limitations: ["knee", "knee_pain"],
    available_equipment: ["barbell"],
    duration_minutes: 45,
    energy_level: "medium",
  });
  assert(constraints.excluded_joint_stress_tags.has("knee_flexion"), "knee_flexion excluded");

  assert(!isExerciseAllowedByInjuries(DEEP_KNEE_EXERCISE, constraints), "back squat excluded (knee_flexion, deep_knee_flexion)");
  assert(isExerciseAllowedByInjuries(UPPER_PUSH_EXERCISE, constraints), "bench allowed (no knee stress)");
}

function testNonAnnotatedUsesLegacyFallback() {
  const constraints = resolveWorkoutConstraints({
    primary_goal: "hypertrophy",
    body_region_focus: ["upper_pull"],
    available_equipment: ["bodyweight"],
    duration_minutes: 30,
    energy_level: "medium",
  });
  assert(!matchesBodyPartFocus(LEGACY_PUSH, constraints), "legacy push does not match upper_pull focus (derived as upper_push)");
  const legacyPull: ExerciseWithQualities = {
    id: "legacy_pull",
    name: "Legacy Pull",
    movement_pattern: "pull",
    muscle_groups: ["pull", "back"],
    equipment_required: [],
    training_quality_weights: {},
  };
  assert(matchesBodyPartFocus(legacyPull, constraints), "legacy pull matches upper_pull focus (derived)");
}

function testHybridEligibility() {
  const lowerFocus = resolveWorkoutConstraints({
    primary_goal: "strength",
    body_region_focus: ["lower", "lower_body"],
    available_equipment: ["barbell"],
    duration_minutes: 45,
    energy_level: "high",
  });
  assert(matchesBodyPartFocus(THRUSTER, lowerFocus), "thruster allowed for lower focus (primary)");

  const upperPushFocus = resolveWorkoutConstraints({
    primary_goal: "strength",
    body_region_focus: ["upper_push"],
    available_equipment: ["barbell"],
    duration_minutes: 45,
    energy_level: "high",
  });
  assert(matchesBodyPartFocus(THRUSTER, upperPushFocus), "thruster allowed for upper_push focus (secondary)");

  const upperPullOnly = resolveWorkoutConstraints({
    primary_goal: "strength",
    body_region_focus: ["upper_pull"],
    available_equipment: ["barbell"],
    duration_minutes: 45,
    energy_level: "high",
  });
  assert(!matchesBodyPartFocus(THRUSTER, upperPullOnly), "thruster not allowed for upper_pull only");
}

function testGetEffectiveMovementFamilies() {
  const thrusterFamilies = getEffectiveMovementFamilies(THRUSTER);
  assert(thrusterFamilies.includes("lower_body"), "thruster has lower_body");
  assert(thrusterFamilies.includes("upper_push"), "thruster has upper_push");
  assert(deriveMovementFamily(THRUSTER) === "lower_body", "deriveMovementFamily returns primary for thruster");

  const benchFamilies = getEffectiveMovementFamilies(UPPER_PUSH_EXERCISE);
  assert(benchFamilies.length === 1 && benchFamilies[0] === "upper_push", "bench has only upper_push");
}

function testIsExerciseEligibleByConstraints() {
  const constraints = resolveWorkoutConstraints({
    primary_goal: "hypertrophy",
    body_region_focus: ["upper_push"],
    injuries_or_limitations: [],
    available_equipment: ["barbell", "bench"],
    duration_minutes: 45,
    energy_level: "medium",
  });
  assert(
    isExerciseEligibleByConstraints(UPPER_PUSH_EXERCISE, constraints, {
      availableEquipment: ["barbell", "bench"],
    }),
    "bench eligible: body-part + equipment"
  );
  assert(
    !isExerciseEligibleByConstraints(UPPER_PUSH_EXERCISE, constraints, {
      availableEquipment: ["dumbbells"],
    }),
    "bench not eligible when equipment missing"
  );
}

function main() {
  console.log("Phase 5 eligibility tests...");
  testUpperPushFocusReturnsOnlyUpperPush();
  console.log("  OK: upper_push focus");
  testShoulderIrritationExcludesRiskyShoulderExercises();
  console.log("  OK: shoulder exclusion");
  testKneeSensitivityExcludesDeepKneeFlexion();
  console.log("  OK: knee exclusion");
  testNonAnnotatedUsesLegacyFallback();
  console.log("  OK: non-annotated fallback");
  testHybridEligibility();
  console.log("  OK: hybrid eligibility");
  testGetEffectiveMovementFamilies();
  console.log("  OK: getEffectiveMovementFamilies");
  testIsExerciseEligibleByConstraints();
  console.log("  OK: isExerciseEligibleByConstraints");
  console.log("All Phase 5 eligibility tests passed.");
}

main();
