/**
 * Shared duration → exercise-count targets for production session assembly.
 * Product floor: ~6 working movements at 45 min (mains + accessories).
 */

/** Rough count of working-set exercises (main + accessory) for intent proportionality. */
export function targetWorkingExerciseSlots(durationMinutes: number | undefined): number {
  const d = durationMinutes ?? 60;
  if (d <= 30) return 6;
  if (d <= 45) return 9;
  if (d <= 60) return 11;
  return 13;
}

/** Target compound main-lift count for strength-style sessions. */
export function targetMainCompoundCount(durationMinutes: number | undefined): number {
  const d = durationMinutes ?? 60;
  if (d <= 30) return 2;
  if (d <= 60) return 4;
  return 5;
}

/** Target accessory superset pair count for strength-style sessions. */
export function targetAccessoryPairCount(durationMinutes: number | undefined): number {
  const d = durationMinutes ?? 60;
  if (d <= 30) return 1;
  return 3;
}

/** Target hypertrophy / physique main-block pair count. */
export function targetHypertrophyPairCount(durationMinutes: number | undefined): number {
  const d = durationMinutes ?? 60;
  if (d <= 30) return 2;
  if (d <= 45) return 3;
  return 4;
}
