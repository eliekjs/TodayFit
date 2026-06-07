import { SPORTS_WITH_SUB_FOCUSES } from "../../data/sportSubFocus";
import type { Sport } from "./types";

let cached: Sport[] | null = null;

/**
 * Offline Sports Prep catalog from canonical TypeScript data (`data/sportSubFocus`).
 * Used when Supabase is unavailable or the sports query cannot reach the server.
 */
export function listBundledSportsForPrep(): Sport[] {
  if (cached) return cached;
  cached = SPORTS_WITH_SUB_FOCUSES.map((sport, index) => ({
    id: `bundled:${sport.slug}`,
    slug: sport.slug,
    name: sport.name,
    category: sport.category,
    is_active: true,
    sort_order: index,
  }));
  return cached;
}

/** @internal Test helper */
export function clearBundledSportsCacheForTests(): void {
  cached = null;
}
