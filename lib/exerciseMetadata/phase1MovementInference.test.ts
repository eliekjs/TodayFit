/**
 * Phase 1 movement inference smoke tests (research-aligned rules).
 * Run: npx tsx lib/exerciseMetadata/phase1MovementInference.test.ts
 */

import type { ExerciseDefinition } from "../types";
import {
  exerciseInferenceInputFromDefinition,
  inferPhase1MovementFromInput,
  mergePhase1MovementOntologyIntoExercise,
} from "./phase1MovementInference";
import type { Exercise } from "../../logic/workoutGeneration/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function def(partial: Partial<ExerciseDefinition> & Pick<ExerciseDefinition, "id" | "name">): ExerciseDefinition {
  return {
    id: partial.id,
    name: partial.name,
    muscles: partial.muscles ?? ["push"],
    modalities: partial.modalities ?? ["strength"],
    equipment: partial.equipment ?? ["bodyweight"],
    tags: partial.tags ?? [],
    contraindications: partial.contraindications,
    progressions: partial.progressions,
    regressions: partial.regressions,
  };
}

function main() {
  const backSquat = inferPhase1MovementFromInput(exerciseInferenceInputFromDefinition(def({ id: "back_squat", name: "Back Squat", muscles: ["legs"], tags: ["squat"] })));
  assert(backSquat.primary_movement_family === "lower_body", "squat family");
  assert(backSquat.movement_patterns.includes("squat"), "squat pattern");

  const rdl = inferPhase1MovementFromInput(
    exerciseInferenceInputFromDefinition(def({ id: "rdl", name: "Romanian Deadlift", muscles: ["legs"], tags: ["posterior_chain"] }))
  );
  assert(rdl.movement_patterns.includes("hinge"), "RDL hinge");

  const bench = inferPhase1MovementFromInput(exerciseInferenceInputFromDefinition(def({ id: "bench", name: "Barbell Bench Press", muscles: ["push"] })));
  assert(bench.primary_movement_family === "upper_push", "bench push family");
  assert(bench.movement_patterns.includes("horizontal_push"), "horizontal push");

  const ohp = inferPhase1MovementFromInput(
    exerciseInferenceInputFromDefinition(def({ id: "ohp", name: "Overhead Press", muscles: ["push"], tags: ["shoulders"] }))
  );
  assert(ohp.movement_patterns.includes("vertical_push"), "vertical push");

  const pullup = inferPhase1MovementFromInput(
    exerciseInferenceInputFromDefinition(def({ id: "pullup", name: "Pull-Up", muscles: ["pull"], tags: ["lats"] }))
  );
  assert(pullup.movement_patterns.includes("vertical_pull"), "vertical pull");

  const row = inferPhase1MovementFromInput(exerciseInferenceInputFromDefinition(def({ id: "row", name: "Barbell Row", muscles: ["pull"] })));
  assert(row.movement_patterns.includes("horizontal_pull"), "horizontal pull");

  const wallBall = inferPhase1MovementFromInput(
    exerciseInferenceInputFromDefinition(
      def({ id: "wall_ball", name: "Wall Ball", muscles: ["legs"], modalities: ["strength", "power"], tags: [] })
    )
  );
  assert(wallBall.secondary_movement_families.includes("upper_push"), "wall ball hybrid secondary");
  assert(wallBall.movement_patterns.includes("squat") && wallBall.movement_patterns.includes("vertical_push"), "wall ball patterns");

  const mobility = inferPhase1MovementFromInput(
    exerciseInferenceInputFromDefinition(def({ id: "tspine", name: "Cat Cow", muscles: ["core"], modalities: ["mobility"] }))
  );
  assert(mobility.primary_movement_family === "mobility", "mobility family");

  const ex: Exercise = {
    id: "x",
    name: "X",
    movement_pattern: "push",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["bodyweight"],
    difficulty: 2,
    time_cost: "medium",
    tags: {},
  };
  mergePhase1MovementOntologyIntoExercise(
    ex,
    exerciseInferenceInputFromDefinition(def({ id: "x", name: "Tempo Run", muscles: ["legs"], modalities: ["conditioning"] }))
  );
  assert(ex.primary_movement_family === "conditioning", "merge sets family");
  assert(ex.movement_patterns?.includes("locomotion"), "tempo run locomotion");

  console.log("OK: phase1MovementInference tests passed.");
}

main();
