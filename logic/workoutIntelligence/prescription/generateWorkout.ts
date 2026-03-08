/**
 * Phase 5: Full generation pipeline with prescriptions.
 * resolveSessionTemplate → assembleSession (Phase 4) → applyPrescriptions (Phase 5) → return completed workout.
 */

import type { ExerciseWithQualities } from "../types";
import { assembleSession } from "../selection/sessionAssembler";
import type { AssembleSessionInput } from "../selection/sessionAssembler";
import { applyPrescriptions } from "./prescriptionResolver";
import type { ExerciseInfo } from "./prescriptionResolver";
import type { GeneratedWorkout } from "../workoutTypes";

/**
 * Build exercise lookup (id -> name, fatigue_cost) from pool.
 */
function buildExerciseLookup(pool: ExerciseWithQualities[]): Map<string, ExerciseInfo> {
  const map = new Map<string, ExerciseInfo>();
  for (const ex of pool) {
    map.set(ex.id, {
      id: ex.id,
      name: ex.name,
      fatigue_cost: ex.fatigue_cost as "low" | "medium" | "high" | undefined,
    });
  }
  return map;
}

/**
 * Generate a complete workout with prescriptions.
 * 1. Assembles session (Phase 4: exercise selection, block filling).
 * 2. Applies prescriptions (Phase 5: sets, reps, rest, intent, superset labels, block notes).
 */
export function generateWorkoutWithPrescriptions(
  input: AssembleSessionInput
): GeneratedWorkout {
  const workout = assembleSession(input);
  const exerciseLookup = buildExerciseLookup(input.exercisePool);
  applyPrescriptions(workout, {
    duration_minutes: input.input.duration_minutes,
    energy_level: input.input.energy_level,
    exerciseLookup,
  });
  return workout;
}
