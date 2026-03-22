/**
 * Phase 3: fixed synthetic pool — every exercise gets inferred exercise_role + pairing + fatigue
 * after adapter merge (seed-stable structural check, not full catalog).
 *
 * Run: npx tsx logic/workoutGeneration/phase3-catalog-metadata.test.ts
 */

import type { ExerciseDefinition } from "../../lib/types";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const SYNTHETIC_DEFS: ExerciseDefinition[] = [
  {
    id: "ph3_squat",
    name: "High Bar Back Squat",
    muscles: ["legs"],
    modalities: ["strength"],
    equipment: ["barbell", "squat_rack"],
    tags: [],
  },
  {
    id: "ph3_bench",
    name: "Competition Bench Press",
    muscles: ["push"],
    modalities: ["strength"],
    equipment: ["barbell", "bench"],
    tags: [],
  },
  {
    id: "ph3_row",
    name: "Pendlay Row",
    muscles: ["pull"],
    modalities: ["strength"],
    equipment: ["barbell"],
    tags: [],
  },
  {
    id: "ph3_face",
    name: "Rope Face Pull",
    muscles: ["pull"],
    modalities: ["strength"],
    equipment: ["cable_machine"],
    tags: ["scapular_control"],
  },
  {
    id: "ph3_mob",
    name: "Thoracic Extension Mobility",
    muscles: ["core"],
    modalities: ["mobility"],
    equipment: ["bodyweight"],
    tags: [],
  },
  {
    id: "ph3_run",
    name: "Tempo Run",
    muscles: ["legs"],
    modalities: ["conditioning"],
    equipment: ["bodyweight"],
    tags: [],
  },
];

function run() {
  console.log("Phase 3 synthetic pool metadata inference\n");
  const pool = SYNTHETIC_DEFS.map(exerciseDefinitionToGeneratorExercise);
  for (const ex of pool) {
    assert(!!ex.exercise_role?.trim(), `${ex.id}: exercise_role`);
    assert(!!ex.pairing_category?.trim(), `${ex.id}: pairing_category`);
    assert((ex.fatigue_regions?.length ?? 0) > 0, `${ex.id}: fatigue_regions`);
  }
  const roles = new Set(pool.map((e) => e.exercise_role));
  assert(roles.has("main_compound"), "pool includes main_compound");
  assert(roles.has("accessory") || roles.has("isolation"), "pool includes accessory or isolation");
  assert(roles.has("mobility") || roles.has("stretch"), "pool includes mobility/stretch");
  assert(roles.has("conditioning"), "pool includes conditioning");
  console.log("  OK: all synthetic exercises have role + pairing + fatigue_regions");
  console.log("  OK: role diversity (main / accessory|iso / mobility / conditioning)\nAll Phase 3 pool checks passed.");
}

run();
