/**
 * Run: npx tsx lib/exerciseMetadata/phase8UnilateralInference.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { mergePhase8UnilateralOntologyIntoExercise } from "./phase8UnilateralInference";
import { exerciseInferenceInputFromDefinition } from "./phase1MovementInference";
import type { Exercise } from "../../logic/workoutGeneration/types";

function find(id: string) {
  const def = EXERCISES.find((e) => e.id === id);
  assert(def, `missing exercise ${id}`);
  return def;
}

function main() {
  console.log("phase8UnilateralInference tests\n");

  assert.strictEqual(exerciseDefinitionToGeneratorExercise(find("split_squat")).unilateral, true);
  console.log("  OK: split_squat → unilateral");

  assert.strictEqual(exerciseDefinitionToGeneratorExercise(find("walking_lunge")).unilateral, true);
  console.log("  OK: walking_lunge → unilateral");

  assert.strictEqual(exerciseDefinitionToGeneratorExercise(find("db_row")).unilateral, true);
  console.log("  OK: single-arm db row → unilateral");

  assert.strictEqual(exerciseDefinitionToGeneratorExercise(find("stepup")).unilateral, true);
  console.log("  OK: step-up → unilateral");

  assert.strictEqual(exerciseDefinitionToGeneratorExercise(find("goblet_squat")).unilateral, undefined);
  console.log("  OK: goblet_squat → not inferred");

  assert.strictEqual(exerciseDefinitionToGeneratorExercise(find("bench_press_barbell")).unilateral, undefined);
  console.log("  OK: bench → not inferred");

  assert.strictEqual(exerciseDefinitionToGeneratorExercise(find("farmer_carry")).unilateral, undefined);
  console.log("  OK: farmer carry bilateral → not inferred");

  const input = exerciseInferenceInputFromDefinition(find("split_squat"));
  const curatedFalse: Exercise = {
    id: "x",
    name: "X",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["dumbbells"],
    difficulty: 2,
    time_cost: "medium",
    tags: {},
    unilateral: false,
  };
  mergePhase8UnilateralOntologyIntoExercise(curatedFalse, input);
  assert.strictEqual(curatedFalse.unilateral, false);
  console.log("  OK: merge respects explicit unilateral false");

  const curatedTrue: Exercise = {
    id: "y",
    name: "Y",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["dumbbells"],
    difficulty: 2,
    time_cost: "medium",
    tags: {},
    unilateral: true,
  };
  mergePhase8UnilateralOntologyIntoExercise(curatedTrue, exerciseInferenceInputFromDefinition(find("goblet_squat")));
  assert.strictEqual(curatedTrue.unilateral, true);
  console.log("  OK: merge preserves explicit unilateral true");

  console.log("\nAll phase8UnilateralInference tests passed.");
}

main();
