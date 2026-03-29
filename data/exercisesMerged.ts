import type { ExerciseDefinition } from "../lib/types";
import { EXERCISES_BUILTIN } from "./exercises";
import { EXERCISES_FUNCTIONAL_FITNESS } from "./exercisesFunctionalFitness";
import { OTA_MOVEMENTS } from "./otaMovements";

/**
 * Full static catalog (builtin + functional fitness + OTA). Used by scripts, tests, and tooling
 * that need the merged array synchronously. App runtime should use `loadStaticExerciseDefinitions`
 * in `lib/staticExerciseCatalog.ts` so the large modules can load in a separate bundle chunk.
 */
export const EXERCISES: ExerciseDefinition[] = [
  ...EXERCISES_BUILTIN,
  ...EXERCISES_FUNCTIONAL_FITNESS,
  ...OTA_MOVEMENTS,
];
