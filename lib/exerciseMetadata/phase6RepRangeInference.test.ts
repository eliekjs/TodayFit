/**
 * Run: npx tsx lib/exerciseMetadata/phase6RepRangeInference.test.ts
 */

import assert from "assert";
import type { ExerciseDefinition } from "../types";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { mergePhase6RepRangeOntologyIntoExercise } from "./phase6RepRangeInference";
import { exerciseInferenceInputFromDefinition } from "./phase1MovementInference";
import type { Exercise } from "../../logic/workoutGeneration/types";

function find(id: string) {
  const def = EXERCISES.find((e) => e.id === id);
  assert(def, `missing exercise ${id}`);
  return def;
}

function main() {
  console.log("phase6RepRangeInference tests\n");

  const legExt = exerciseDefinitionToGeneratorExercise(find("leg_extension"));
  assert(legExt.rep_range_min === 10 && legExt.rep_range_max === 20, "leg_extension → 10–20");
  console.log("  OK: leg_extension → 10–20");

  const calf = exerciseDefinitionToGeneratorExercise(find("bodyweight_calf_raise"));
  assert(calf.rep_range_min === 15 && calf.rep_range_max === 25, "calf raise → 15–25");
  console.log("  OK: bodyweight_calf_raise → 15–25");

  const squat = exerciseDefinitionToGeneratorExercise(find("goblet_squat"));
  assert(squat.rep_range_min == null && squat.rep_range_max == null, "main compound → no inferred rep_range");
  console.log("  OK: goblet_squat → no rep_range");

  const bike = exerciseDefinitionToGeneratorExercise(find("zone2_bike"));
  assert(bike.rep_range_min == null && bike.rep_range_max == null, "conditioning modality → skip");
  console.log("  OK: zone2_bike → skip");

  const hangDef: ExerciseDefinition = {
    id: "hang_clean_smoke",
    name: "Hang Clean",
    muscles: ["legs"],
    modalities: ["strength", "power"],
    equipment: ["barbell"],
    tags: [],
    regressions: [],
    progressions: [],
  };
  const hang = exerciseDefinitionToGeneratorExercise(hangDef);
  assert(hang.rep_range_min === 1 && hang.rep_range_max === 5, "hang clean → 1–5");
  console.log("  OK: synthetic hang clean → 1–5");

  const input = exerciseInferenceInputFromDefinition(find("leg_extension"));
  const withRange: Exercise = {
    id: "curated",
    name: "Curated",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["leg_extension"],
    difficulty: 2,
    time_cost: "medium",
    tags: {},
    rep_range_min: 12,
    rep_range_max: 15,
  };
  mergePhase6RepRangeOntologyIntoExercise(withRange, input);
  assert(withRange.rep_range_min === 12 && withRange.rep_range_max === 15, "merge preserves partial curation");
  console.log("  OK: merge skips when rep_range already set");

  const curlDef: ExerciseDefinition = {
    id: "barbell_curl_smoke",
    name: "Barbell Curl",
    muscles: ["pull"],
    modalities: ["hypertrophy"],
    equipment: ["barbell"],
    tags: [],
    regressions: [],
    progressions: [],
  };
  const bc = exerciseDefinitionToGeneratorExercise(curlDef);
  assert(bc.rep_range_min === 10 && bc.rep_range_max === 20, "biceps curl → 10–20");
  console.log("  OK: synthetic barbell curl → 10–20");

  console.log("\nAll phase6RepRangeInference tests passed.");
}

main();
