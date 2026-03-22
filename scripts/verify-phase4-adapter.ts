/**
 * Phase 4 adapter verification (run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/verify-phase4-adapter.ts).
 * Sanity-checks that:
 * - movement_pattern legacy fallback works from movement_patterns
 * - tags.joint_stress and tags.contraindications are populated from ontology when present
 * - structured ontology fields are on the mapped generator Exercise
 * - non-annotated exercises still work (legacy movement_pattern + Phase 1–3 inferred ontology when DB columns absent)
 */

import type { ExerciseRowWithOntology } from "../lib/db/generatorExerciseAdapter";
import { mapDbExerciseToGeneratorExercise } from "../lib/db/generatorExerciseAdapter";

// Annotated row (e.g. after Phase 4 migration)
const annotatedRow: ExerciseRowWithOntology = {
  id: "uuid-bench",
  slug: "bench_press_barbell",
  name: "Barbell Bench Press",
  primary_muscles: ["chest", "triceps"],
  secondary_muscles: ["shoulders"],
  equipment: ["barbell", "bench"],
  modalities: ["strength"],
  movement_pattern: "push",
  primary_movement_family: "upper_push",
  secondary_movement_families: [],
  movement_patterns: ["horizontal_push"],
  joint_stress_tags: ["shoulder_extension_load", "wrist_extension_load"],
  contraindication_tags: ["shoulder", "wrist"],
  exercise_role: "main_compound",
  pairing_category: "chest",
  fatigue_regions: ["pecs", "triceps", "shoulders"],
  mobility_targets: [],
  stretch_targets: [],
  unilateral: false,
};

// Non-annotated row (no ontology columns)
const nonAnnotatedRow: ExerciseRowWithOntology = {
  id: "uuid-other",
  slug: "some_other_exercise",
  name: "Some Other Exercise",
  primary_muscles: ["legs"],
  secondary_muscles: [],
  equipment: ["bodyweight"],
  modalities: ["strength"],
  movement_pattern: "squat",
  // no ontology fields
};

function run() {
  const annotated = mapDbExerciseToGeneratorExercise(
    annotatedRow,
    ["strength", "push"],
    [],
    [],
    []
  );

  const nonAnnotated = mapDbExerciseToGeneratorExercise(
    nonAnnotatedRow,
    ["squat", "joint_knee_flexion"],
    ["knee"],
    [],
    []
  );

  let ok = true;

  // 1) Annotated: legacy movement_pattern derived from movement_patterns
  if (annotated.movement_pattern !== "push") {
    console.error("FAIL: annotated exercise movement_pattern should be 'push' (from horizontal_push), got", annotated.movement_pattern);
    ok = false;
  } else {
    console.log("OK: movement_pattern legacy fallback = push from movement_patterns[0]=horizontal_push");
  }

  // 2) Annotated: tags.joint_stress and tags.contraindications from ontology
  const jointStress = annotated.tags?.joint_stress ?? [];
  const contra = annotated.tags?.contraindications ?? [];
  if (
    !jointStress.includes("shoulder_extension_load") ||
    !jointStress.includes("wrist_extension_load") ||
    jointStress.length !== 2
  ) {
    console.error("FAIL: tags.joint_stress should be from ontology, got", jointStress);
    ok = false;
  } else {
    console.log("OK: tags.joint_stress populated from joint_stress_tags");
  }
  if (!contra.includes("shoulder") || !contra.includes("wrist") || contra.length !== 2) {
    console.error("FAIL: tags.contraindications should be from ontology, got", contra);
    ok = false;
  } else {
    console.log("OK: tags.contraindications populated from contraindication_tags");
  }

  // 3) Annotated: structured ontology fields present
  if (annotated.primary_movement_family !== "upper_push") {
    console.error("FAIL: primary_movement_family should be upper_push, got", annotated.primary_movement_family);
    ok = false;
  }
  if (!annotated.movement_patterns?.includes("horizontal_push")) {
    console.error("FAIL: movement_patterns should include horizontal_push, got", annotated.movement_patterns);
    ok = false;
  }
  if (annotated.exercise_role !== "main_compound" || annotated.pairing_category !== "chest") {
    console.error("FAIL: exercise_role or pairing_category missing/wrong", annotated.exercise_role, annotated.pairing_category);
    ok = false;
  }
  if (annotated.unilateral !== undefined && annotated.unilateral !== false) {
    console.error("FAIL: unilateral should be false or absent, got", annotated.unilateral);
    ok = false;
  }
  console.log("OK: structured ontology fields present on annotated exercise");

  // 4) Non-annotated: legacy movement_pattern from row.movement_pattern
  if (nonAnnotated.movement_pattern !== "squat") {
    console.error("FAIL: non-annotated movement_pattern should be squat from row, got", nonAnnotated.movement_pattern);
    ok = false;
  } else {
    console.log("OK: non-annotated exercise movement_pattern from row.movement_pattern");
  }

  // 5) Non-annotated: tags from legacy (joint_knee_flexion -> knee_flexion, contra from table)
  const nonJoint = nonAnnotated.tags?.joint_stress ?? [];
  const nonContra = nonAnnotated.tags?.contraindications ?? [];
  if (!nonJoint.includes("knee_flexion")) {
    console.error("FAIL: non-annotated tags.joint_stress should include knee_flexion from legacy tag, got", nonJoint);
    ok = false;
  } else {
    console.log("OK: non-annotated tags.joint_stress from legacy tag slugs");
  }
  if (!nonContra.includes("knee")) {
    console.error("FAIL: non-annotated tags.contraindications should be from table, got", nonContra);
    ok = false;
  } else {
    console.log("OK: non-annotated tags.contraindications from contraindications table");
  }

  // 6) Non-annotated: Phase 1–3 inference fills ontology when DB columns are absent
  if (
    nonAnnotated.primary_movement_family !== "lower_body" ||
    !(nonAnnotated.movement_patterns ?? []).includes("squat") ||
    !(nonAnnotated.joint_stress_tags ?? []).includes("knee_flexion") ||
    nonAnnotated.exercise_role !== "main_compound" ||
    nonAnnotated.pairing_category !== "quads"
  ) {
    console.error("FAIL: non-annotated should get Phase 1–3 inferred ontology", {
      primary_movement_family: nonAnnotated.primary_movement_family,
      movement_patterns: nonAnnotated.movement_patterns,
      joint_stress_tags: nonAnnotated.joint_stress_tags,
      exercise_role: nonAnnotated.exercise_role,
      pairing_category: nonAnnotated.pairing_category,
    });
    ok = false;
  } else {
    console.log("OK: non-annotated exercise has Phase 1–3 inferred ontology");
  }

  if (ok) {
    console.log("\nAll Phase 4 adapter checks passed.");
  } else {
    process.exit(1);
  }
}

run();
