import type { ExerciseDefinition } from "./types";
import { EXERCISES_BUILTIN } from "../data/exercises";

let cached: ExerciseDefinition[] | null = null;
let loadPromise: Promise<ExerciseDefinition[]> | null = null;

/**
 * Loads the full static exercise list (builtin + functional fitness + OTA) once per session.
 * Functional fitness and OTA live in separate modules so Metro can split them from the initial chunk;
 * they load when generation first runs (or when this is first awaited).
 */
export async function loadStaticExerciseDefinitions(): Promise<ExerciseDefinition[]> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [{ EXERCISES_FUNCTIONAL_FITNESS }, { OTA_MOVEMENTS }] = await Promise.all([
      import("../data/exercisesFunctionalFitness"),
      import("../data/otaMovements"),
    ]);
    cached = [...EXERCISES_BUILTIN, ...EXERCISES_FUNCTIONAL_FITNESS, ...OTA_MOVEMENTS];
    return cached;
  })();
  return loadPromise;
}
