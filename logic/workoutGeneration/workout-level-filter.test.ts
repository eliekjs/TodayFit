/**
 * Workout tier + creative-variation hard filters.
 * Run: npx tsx logic/workoutGeneration/workout-level-filter.test.ts
 */

import { filterByHardConstraints } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";

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
  const pool = [advancedOnly, beginnerOk, creative];

  const beginnerFiltered = filterByHardConstraints(pool, {
    ...baseInput,
    style_prefs: { user_level: "beginner", include_creative_variations: false },
  });
  assert(
    beginnerFiltered.some((e) => e.id === "beginner_ok") &&
      !beginnerFiltered.some((e) => e.id === "adv_only") &&
      !beginnerFiltered.some((e) => e.id === "creative_move"),
    "beginner: only beginner-tagged, no advanced-only, no creative"
  );

  const intermediateFiltered = filterByHardConstraints(pool, {
    ...baseInput,
    style_prefs: { user_level: "intermediate", include_creative_variations: false },
  });
  assert(
    intermediateFiltered.some((e) => e.id === "beginner_ok") &&
      !intermediateFiltered.some((e) => e.id === "adv_only") &&
      !intermediateFiltered.some((e) => e.id === "creative_move"),
    "intermediate: no advanced-only tier, no creative when off"
  );

  const advancedAllTiers = filterByHardConstraints(pool, {
    ...baseInput,
    style_prefs: { user_level: "advanced", include_creative_variations: false },
  });
  assert(
    advancedAllTiers.some((e) => e.id === "adv_only") &&
      advancedAllTiers.some((e) => e.id === "beginner_ok") &&
      !advancedAllTiers.some((e) => e.id === "creative_move"),
    "advanced tier keeps advanced-only; creative still off"
  );

  const advancedCreative = filterByHardConstraints(pool, {
    ...baseInput,
    style_prefs: { user_level: "advanced", include_creative_variations: true },
  });
  assert(
    advancedCreative.length === 3,
    "advanced + creative on keeps full pool"
  );

  console.log("workout-level-filter tests passed.");
}

runTests();
