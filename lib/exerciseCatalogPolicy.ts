/**
 * When Supabase has at least this many active exercises, the runtime treats the DB as the
 * production source of truth and does not merge the large static TypeScript catalogs.
 * Below the threshold (or when Supabase is missing / errors), the app merges static data
 * so local dev and partially seeded projects still work.
 *
 * Override: EXPO_PUBLIC_MIN_DB_EXERCISES_FOR_SOURCE_OF_TRUTH (integer >= 1).
 */
export function minActiveExercisesForDbSourceOfTruth(): number {
  const raw = process.env.EXPO_PUBLIC_MIN_DB_EXERCISES_FOR_SOURCE_OF_TRUTH;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return 50;
}

export function isDbCatalogAuthoritative(activeCount: number): boolean {
  return activeCount >= minActiveExercisesForDbSourceOfTruth();
}
