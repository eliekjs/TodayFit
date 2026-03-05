/**
 * Sports Prep: sub-focus framework and sub-focus → exercise tag mapping.
 * Use this to bias the weekly training generator toward exercises that match
 * the user's selected sport and sub-focuses.
 */

export type { SportSubFocus, SportWithSubFocuses, SubFocusTagMap, SubFocusTagMapEntry, ExerciseTagTaxonomyEntry } from "./types";
export { SPORTS_WITH_SUB_FOCUSES } from "./sportsWithSubFocuses";
export { SUB_FOCUS_TAG_MAP } from "./subFocusTagMap";
export { SPORT_SUBFOCUS_EXERCISE_TAGS, NEW_TAGS_TO_ADD } from "./exerciseTagTaxonomy";

import { SUB_FOCUS_TAG_MAP } from "./subFocusTagMap";

/**
 * Returns exercise tag slugs (with optional weights) for the given sport and
 * selected sub-focus slugs. Use the result to boost exercise selection toward
 * matching tags in the workout generator.
 */
export function getExerciseTagsForSubFocuses(
  sportSlug: string,
  subFocusSlugs: string[]
): { tag_slug: string; weight: number }[] {
  const byTag = new Map<string, number>();
  for (const sub of subFocusSlugs) {
    const key = `${sportSlug}:${sub}`;
    const entries = SUB_FOCUS_TAG_MAP[key];
    if (!entries) continue;
    for (const { tag_slug, weight = 1 } of entries) {
      const existing = byTag.get(tag_slug);
      const w = weight ?? 1;
      byTag.set(tag_slug, existing != null ? Math.max(existing, w) : w);
    }
  }
  return Array.from(byTag.entries()).map(([tag_slug, weight]) => ({ tag_slug, weight }));
}
