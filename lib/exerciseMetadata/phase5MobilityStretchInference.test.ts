/**
 * Run: npx tsx lib/exerciseMetadata/phase5MobilityStretchInference.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercises";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import {
  inferPhase5MobilityStretchFromInput,
  mergePhase5MobilityStretchOntologyIntoExercise,
  shouldRunPhase5MobilityStretchInference,
} from "./phase5MobilityStretchInference";
import { exerciseInferenceInputFromDefinition } from "./phase1MovementInference";
import type { Exercise } from "../../logic/workoutGeneration/types";

function find(id: string) {
  const def = EXERCISES.find((e) => e.id === id);
  assert(def, `missing exercise ${id}`);
  return def;
}

function main() {
  console.log("phase5MobilityStretchInference tests\n");

  const cat = exerciseDefinitionToGeneratorExercise(find("cat_camel"));
  assert(cat.mobility_targets?.includes("thoracic_spine"), "cat_camel → thoracic_spine mobility");
  assert(!cat.stretch_targets?.length, "cat_camel → no stretch by default");
  console.log("  OK: cat_camel → thoracic mobility");

  const wgs = exerciseDefinitionToGeneratorExercise(find("worlds_greatest_stretch"));
  assert(wgs.mobility_targets?.length && wgs.stretch_targets?.length, "worlds greatest → both menus");
  assert(wgs.stretch_targets?.includes("hamstrings") && wgs.stretch_targets?.includes("hip_flexors"));
  console.log("  OK: worlds greatest → mobility + stretch");

  const frog = exerciseDefinitionToGeneratorExercise(find("frog_stretch"));
  assert(frog.stretch_targets?.includes("hip_flexors"), "frog_stretch → hip_flexors stretch");
  console.log("  OK: frog_stretch → stretch targets");

  const bench = exerciseDefinitionToGeneratorExercise(find("bench_press_barbell"));
  assert(!bench.mobility_targets?.length && !bench.stretch_targets?.length, "bench → no phase5 targets");
  console.log("  OK: bench press skipped (strength)");

  const breath = exerciseDefinitionToGeneratorExercise(find("breathing_diaphragmatic"));
  assert(!breath.mobility_targets?.length && !breath.stretch_targets?.length, "breathing → empty targets");
  console.log("  OK: diaphragmatic breathing → no regional targets");

  const face = exerciseDefinitionToGeneratorExercise(find("face_pull"));
  assert(face.mobility_targets?.includes("shoulders"), "face_pull → shoulders mobility");
  console.log("  OK: face_pull → shoulders mobility");

  // merge does not overwrite curated arrays
  const input = exerciseInferenceInputFromDefinition(find("inchworm"));
  const curated: Exercise = {
    id: "x",
    name: "X",
    movement_pattern: "rotate",
    muscle_groups: ["core"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "medium",
    tags: {},
    mobility_targets: ["wrists"],
    stretch_targets: ["hamstrings"],
  };
  assert(shouldRunPhase5MobilityStretchInference(curated, input));
  mergePhase5MobilityStretchOntologyIntoExercise(curated, input);
  assert.deepStrictEqual(curated.mobility_targets, ["wrists"]);
  assert.deepStrictEqual(curated.stretch_targets, ["hamstrings"]);
  console.log("  OK: merge preserves non-empty ontology arrays");

  // Direct infer: pigeon slug
  const pigeonDef = find("pigeon_stretch");
  const pigeonEx = exerciseDefinitionToGeneratorExercise(pigeonDef);
  const inferred = inferPhase5MobilityStretchFromInput(exerciseInferenceInputFromDefinition(pigeonDef), pigeonEx);
  assert(inferred.stretch_targets.includes("glutes"));
  console.log("  OK: pigeon infer → glutes stretch");

  console.log("\nAll phase5MobilityStretchInference tests passed.");
}

main();
