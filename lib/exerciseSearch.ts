import { isDbConfigured } from "./db";
import { listExercises } from "./db/exerciseRepository";

const MAX_SEARCH_RESULTS = 25;

/**
 * Search exercises by name (case-insensitive substring).
 * Uses the database (single source of truth). When Supabase is not configured, returns [].
 */
export async function searchExercisesAsync(query: string): Promise<{ id: string; name: string }[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (!isDbConfigured()) return [];
  try {
    const exercises = await listExercises();
    return exercises
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) || (e.id && e.id.toLowerCase().includes(q))
      )
      .slice(0, MAX_SEARCH_RESULTS)
      .map((e) => ({ id: e.id, name: e.name }));
  } catch {
    return [];
  }
}

/**
 * @deprecated Use searchExercisesAsync. Sync search for scripts/tests that load pool elsewhere.
 */
export function searchExercises(query: string): { id: string; name: string }[] {
  return [];
}
