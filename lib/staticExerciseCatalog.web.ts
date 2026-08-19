import type { ExerciseDefinition } from "./types";

/**
 * Production web apps read exercises from Supabase. Do not transform the ~1.3MB
 * static TypeScript catalogs (`exercisesFunctionalFitness.ts`, `otaMovements.ts`) in Metro.
 * Node tests/scripts still resolve `staticExerciseCatalog.ts`.
 */
export async function loadStaticExerciseDefinitions(): Promise<ExerciseDefinition[]> {
  return [];
}
