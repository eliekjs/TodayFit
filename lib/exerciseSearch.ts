import { EXERCISES } from "../data/exercises";

const MAX_SEARCH_RESULTS = 25;

/**
 * Search exercises by name (case-insensitive substring).
 * Returns up to MAX_SEARCH_RESULTS matches for use in swap/search UI.
 */
export function searchExercises(query: string): { id: string; name: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return EXERCISES.filter(
    (e) => e.name.toLowerCase().includes(q) || (e.id && e.id.toLowerCase().includes(q))
  )
    .slice(0, MAX_SEARCH_RESULTS)
    .map((e) => ({ id: e.id, name: e.name }));
}
