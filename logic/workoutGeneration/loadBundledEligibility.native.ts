import type { ExerciseEligibilityEntry } from "../exerciseLibraryCuration/generatorEligibilityTypes";

/** Production apps read eligibility from Supabase rows, not a bundled JSON catalog. */
export function getBundledEligibilityById(): Map<string, ExerciseEligibilityEntry> {
  return new Map();
}
