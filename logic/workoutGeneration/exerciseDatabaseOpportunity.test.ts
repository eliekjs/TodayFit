/**
 * Validates the exercise database (builtin + ingested FF) and ensures every exercise
 * has an opportunity to show up in workouts under some permissive generator input.
 * Run with: npx tsx logic/workoutGeneration/exerciseDatabaseOpportunity.test.ts
 */

import { EXERCISES } from "../../data/exercises";
import type { ExerciseDefinition, MuscleGroup, Modality, EquipmentKey } from "../../lib/types";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import {
  filterByHardConstraints,
  filterByConstraintsForPool,
} from "./dailyGenerator";
import { resolveWorkoutConstraints } from "../workoutIntelligence/constraints/resolveWorkoutConstraints";
import type { GenerateWorkoutInput } from "./types";
import type { Exercise } from "./types";

const VALID_MUSCLES: MuscleGroup[] = ["legs", "push", "pull", "core"];
// Generator and builtin data use "recovery" and "skill"; lib/types Modality is stricter.
const VALID_MODALITIES: Modality[] = [
  "strength",
  "hypertrophy",
  "conditioning",
  "mobility",
  "power",
  "recovery",
  "skill",
];
const VALID_EQUIPMENT: EquipmentKey[] = [
  "squat_rack",
  "barbell",
  "plates",
  "bench",
  "trap_bar",
  "leg_press",
  "cable_machine",
  "lat_pulldown",
  "chest_press",
  "hamstring_curl",
  "leg_extension",
  "machine",
  "dumbbells",
  "kettlebells",
  "adjustable_bench",
  "ez_bar",
  "treadmill",
  "assault_bike",
  "rower",
  "ski_erg",
  "stair_climber",
  "elliptical",
  "bands",
  "trx",
  "pullup_bar",
  "rings",
  "plyo_box",
  "sled",
  "bodyweight",
];
const validMuscleSet = new Set<string>(VALID_MUSCLES);
const validModalitySet = new Set<string>(VALID_MODALITIES);
const validEquipmentSet = new Set<string>(VALID_EQUIPMENT);

function validateExerciseDefinition(def: ExerciseDefinition, index: number): string[] {
  const errors: string[] = [];
  if (!def.id || typeof def.id !== "string") errors.push(`[${index}] missing or invalid id`);
  if (!def.name || typeof def.name !== "string") errors.push(`[${index}] ${def.id}: missing name`);
  if (!Array.isArray(def.muscles) || def.muscles.length === 0)
    errors.push(`[${index}] ${def.id}: muscles must be non-empty array`);
  else {
    for (const m of def.muscles) {
      if (!validMuscleSet.has(m)) errors.push(`[${index}] ${def.id}: invalid muscle "${m}"`);
    }
  }
  if (!Array.isArray(def.modalities) || def.modalities.length === 0)
    errors.push(`[${index}] ${def.id}: modalities must be non-empty array`);
  else {
    for (const mod of def.modalities) {
      if (!validModalitySet.has(mod as Modality))
        errors.push(`[${index}] ${def.id}: invalid modality "${mod}"`);
    }
  }
  if (!Array.isArray(def.equipment))
    errors.push(`[${index}] ${def.id}: equipment must be array`);
  else {
    for (const eq of def.equipment) {
      if (!validEquipmentSet.has(eq as EquipmentKey))
        errors.push(`[${index}] ${def.id}: invalid equipment "${eq}"`);
    }
  }
  if (!Array.isArray(def.tags)) errors.push(`[${index}] ${def.id}: tags must be array`);
  return errors;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runTests() {
  console.log("Exercise database validation and opportunity tests...\n");

  // 1. Schema and enum validation
  const allErrors: string[] = [];
  const seenIds = new Set<string>();
  EXERCISES.forEach((def, i) => {
    const errs = validateExerciseDefinition(def, i);
    allErrors.push(...errs);
    if (def.id && seenIds.has(def.id)) allErrors.push(`[${i}] duplicate id "${def.id}"`);
    if (def.id) seenIds.add(def.id);
  });
  assert(allErrors.length === 0, `Schema/validation errors:\n${allErrors.slice(0, 20).join("\n")}${allErrors.length > 20 ? `\n... and ${allErrors.length - 20} more` : ""}`);
  console.log(`  OK: every exercise has valid schema and enum values (${EXERCISES.length} exercises)`);

  // 2. Opportunity: every (non-blocked) exercise passes filters under permissive input
  const pool: Exercise[] = EXERCISES.map((def) => exerciseDefinitionToGeneratorExercise(def));
  const allEquipment = new Set<string>();
  for (const e of pool) {
    for (const eq of e.equipment_required ?? []) {
      allEquipment.add(eq.toLowerCase().replace(/\s/g, "_"));
    }
  }
  const availableEquipment = Array.from(allEquipment);

  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: [],
    energy_level: "medium",
    available_equipment: availableEquipment,
    injuries_or_constraints: [],
    // Permissive tier + creative so advanced-only and tagged-variation exercises stay eligible.
    style_prefs: {
      user_level: "advanced",
      include_creative_variations: true,
    },
  };

  const selectionInput = {
    primary_goal: input.primary_goal,
    secondary_goals: [],
    available_equipment: availableEquipment,
    duration_minutes: input.duration_minutes,
    energy_level: input.energy_level,
    injuries_or_limitations: [] as string[],
    body_region_focus: [] as string[],
  };

  const constraints = resolveWorkoutConstraints(selectionInput);
  const afterHard = filterByHardConstraints(pool, input);
  const afterConstraints = filterByConstraintsForPool(afterHard, constraints);

  const filteredIds = new Set(afterConstraints.map((e) => e.id));
  const missing: string[] = [];
  for (const e of pool) {
    if (BLOCKED_EXERCISE_IDS.has(e.id)) continue;
    if (!filteredIds.has(e.id)) missing.push(e.id);
  }
  assert(
    missing.length === 0,
    `Exercises that never pass filters (permissive input): ${missing.slice(0, 30).join(", ")}${missing.length > 30 ? ` ... and ${missing.length - 30} more` : ""}`
  );
  console.log(`  OK: every non-blocked exercise passes filters under permissive input (${pool.length - BLOCKED_EXERCISE_IDS.size} eligible)`);

  console.log("\nAll exercise database opportunity tests passed.");
}

runTests();
