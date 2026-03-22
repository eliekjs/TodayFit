/**
 * Run: npx tsx lib/exerciseMetadata/phase7WarmupCooldownRelevanceInference.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercises";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { mergePhase7WarmupCooldownRelevanceIntoExercise } from "./phase7WarmupCooldownRelevanceInference";
import { exerciseInferenceInputFromDefinition } from "./phase1MovementInference";
import type { Exercise } from "../../logic/workoutGeneration/types";

function find(id: string) {
  const def = EXERCISES.find((e) => e.id === id);
  assert(def, `missing exercise ${id}`);
  return def;
}

function main() {
  console.log("phase7WarmupCooldownRelevanceInference tests\n");

  const wgs = exerciseDefinitionToGeneratorExercise(find("worlds_greatest_stretch"));
  assert(wgs.warmup_relevance === "high" && wgs.cooldown_relevance === "high", "world's greatest → high/high");
  console.log("  OK: worlds greatest → warmup high, cooldown high");

  const cat = exerciseDefinitionToGeneratorExercise(find("cat_camel"));
  assert(cat.warmup_relevance === "high" && cat.cooldown_relevance === "low", "cat cow → high/low");
  console.log("  OK: cat_camel → warmup high, cooldown low");

  const breath = exerciseDefinitionToGeneratorExercise(find("breathing_diaphragmatic"));
  assert(breath.warmup_relevance === "low" && breath.cooldown_relevance === "high", "breathing → low/high");
  console.log("  OK: diaphragmatic breathing → warmup low, cooldown high");

  const pigeon = exerciseDefinitionToGeneratorExercise(find("pigeon_stretch"));
  assert(pigeon.warmup_relevance === "low" && pigeon.cooldown_relevance === "high", "pigeon → cooldown-first");
  console.log("  OK: pigeon_stretch → cooldown-first (static bias)");

  const bench = exerciseDefinitionToGeneratorExercise(find("bench_press_barbell"));
  assert(bench.warmup_relevance == null && bench.cooldown_relevance == null, "bench → skip phase7");
  console.log("  OK: bench press skipped");

  const input = exerciseInferenceInputFromDefinition(find("cat_camel"));
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
    mobility_targets: ["thoracic_spine"],
    warmup_relevance: "medium",
  };
  mergePhase7WarmupCooldownRelevanceIntoExercise(curated, input);
  assert.strictEqual(curated.warmup_relevance, "medium");
  assert.strictEqual(curated.cooldown_relevance, "low");
  console.log("  OK: merge preserves curated warmup_relevance; fills cooldown only");

  console.log("\nAll phase7WarmupCooldownRelevanceInference tests passed.");
}

main();
