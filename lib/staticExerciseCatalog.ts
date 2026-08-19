/**
 * Node / tests / scripts: load the static TypeScript catalogs from disk.
 * Metro native and web resolve the `.native.ts` / `.web.ts` stubs instead, so the
 * ~1.3MB `exercisesFunctionalFitness` + `otaMovements` modules are not transformed
 * into the iOS/web JavaScript bundle (production reads exercises from Supabase).
 */
import type { ExerciseDefinition } from "./types";
import { EXERCISES_BUILTIN } from "../data/exercises";

let cached: ExerciseDefinition[] | null = null;
let loadPromise: Promise<ExerciseDefinition[]> | null = null;

/**
 * Loads the full static exercise list (builtin + functional fitness + OTA) once per session.
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
