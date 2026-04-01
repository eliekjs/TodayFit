/**
 * Workout tier + creative-variation hard filters.
 * Run: npx tsx logic/workoutGeneration/workout-level-filter.test.ts
 */

import { filterByHardConstraints } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { inferCreativeVariationFromSource } from "../../lib/workoutLevel";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function minimalExercise(partial: Partial<Exercise> & Pick<Exercise, "id">): Exercise {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    movement_pattern: partial.movement_pattern ?? "squat",
    muscle_groups: partial.muscle_groups ?? ["legs"],
    modality: partial.modality ?? "strength",
    equipment_required: partial.equipment_required ?? ["bodyweight"],
    difficulty: partial.difficulty ?? 2,
    time_cost: partial.time_cost ?? "medium",
    tags: partial.tags ?? {},
    ...partial,
  };
}

const baseInput: Omit<GenerateWorkoutInput, "style_prefs"> = {
  duration_minutes: 45,
  primary_goal: "strength",
  energy_level: "medium",
  available_equipment: ["bodyweight"],
  injuries_or_constraints: [],
};

function runTests() {
  const advancedOnly = minimalExercise({
    id: "adv_only",
    workout_level_tags: ["advanced"],
  });
  const beginnerOk = minimalExercise({
    id: "beginner_ok",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const creative = minimalExercise({
    id: "creative_move",
    creative_variation: true,
  });
  const inferredCreative = minimalExercise({
    id: "ff_double_clubbell_side_shoulder_cast_to_side_flag_press",
    name: "Double Clubbell Side Shoulder Cast to Side Flag Press",
    creative_variation: inferCreativeVariationFromSource({
      id: "ff_double_clubbell_side_shoulder_cast_to_side_flag_press",
      name: "Double Clubbell Side Shoulder Cast to Side Flag Press",
      tags: ["Upper Body", "shoulder_abduction", "intermediate"],
    }),
  });
  const pool = [advancedOnly, beginnerOk, creative, inferredCreative];
  const complexButBroadTier = minimalExercise({
    id: "ff_single_arm_kettlebell_start_stop_clean_to_thruster",
    name: "Single Arm Kettlebell Start Stop Clean to Thruster",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
    movement_pattern: "squat",
    modality: "strength",
    tags: { attribute_tags: ["complex_variation"] },
  });
  const poolWithComplex = [...pool, complexButBroadTier];

  const beginnerFiltered = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "beginner", include_creative_variations: false },
  });
  assert(
    beginnerFiltered.some((e) => e.id === "beginner_ok") &&
      !beginnerFiltered.some((e) => e.id === "adv_only") &&
      !beginnerFiltered.some((e) => e.id === "creative_move") &&
      !beginnerFiltered.some(
        (e) => e.id === "ff_double_clubbell_side_shoulder_cast_to_side_flag_press"
      ) &&
      !beginnerFiltered.some((e) => e.id === "ff_single_arm_kettlebell_start_stop_clean_to_thruster"),
    "beginner: only beginner-tagged, no advanced-only, no creative"
  );

  const intermediateFiltered = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "intermediate", include_creative_variations: false },
  });
  assert(
    intermediateFiltered.some((e) => e.id === "beginner_ok") &&
      !intermediateFiltered.some((e) => e.id === "adv_only") &&
      !intermediateFiltered.some((e) => e.id === "creative_move") &&
      !intermediateFiltered.some(
        (e) => e.id === "ff_double_clubbell_side_shoulder_cast_to_side_flag_press"
      ) &&
      !intermediateFiltered.some((e) => e.id === "ff_single_arm_kettlebell_start_stop_clean_to_thruster"),
    "intermediate: no advanced-only tier, no creative when off"
  );

  const advancedAllTiers = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "advanced", include_creative_variations: false },
  });
  assert(
    advancedAllTiers.some((e) => e.id === "adv_only") &&
      advancedAllTiers.some((e) => e.id === "beginner_ok") &&
      !advancedAllTiers.some((e) => e.id === "creative_move") &&
      !advancedAllTiers.some(
        (e) => e.id === "ff_double_clubbell_side_shoulder_cast_to_side_flag_press"
      ) &&
      advancedAllTiers.some((e) => e.id === "ff_single_arm_kettlebell_start_stop_clean_to_thruster"),
    "advanced tier keeps advanced-only; creative still off"
  );

  const advancedCreative = filterByHardConstraints(poolWithComplex, {
    ...baseInput,
    style_prefs: { user_level: "advanced", include_creative_variations: true },
  });
  assert(
    advancedCreative.length === 5,
    "advanced + creative on keeps full pool"
  );

  console.log("workout-level-filter tests passed.");
}

runTests();
