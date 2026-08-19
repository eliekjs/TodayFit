import type { ExerciseDefinition } from "../lib/types";
import { EXERCISES_BUILTIN } from "./exercises";
import { EXERCISES_FUNCTIONAL_FITNESS } from "./exercisesFunctionalFitness";
import { OTA_MOVEMENTS } from "./otaMovements";

/**
 * Full static catalog (builtin + functional fitness + OTA). Used by scripts, tests, and tooling
 * that need the merged array synchronously. Native/web Metro must not import this file
 * (blocked in `metro.config.js`); production loads exercises from Supabase.
 */
export const EXERCISES: ExerciseDefinition[] = [
  ...EXERCISES_BUILTIN,
  ...EXERCISES_FUNCTIONAL_FITNESS,
  ...OTA_MOVEMENTS,
];
