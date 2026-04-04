/**
 * Sports Prep: sub-focus framework and sub-focus → exercise tag mapping.
 * Use this to bias the weekly training generator toward exercises that match
 * the user's selected sport and sub-focuses.
 */

export type { SportSubFocus, SportWithSubFocuses, SubFocusTagMap, SubFocusTagMapEntry, ExerciseTagTaxonomyEntry } from "./types";
export { SPORTS_WITH_SUB_FOCUSES } from "./sportsWithSubFocuses";
export { SUB_FOCUS_TAG_MAP } from "./subFocusTagMap";
export { SPORT_SUBFOCUS_EXERCISE_TAGS, NEW_TAGS_TO_ADD } from "./exerciseTagTaxonomy";
export { getCanonicalSportSlug, LEGACY_TO_CANONICAL_SPORT } from "./canonicalSportSlug";

import { SUB_FOCUS_TAG_MAP } from "./subFocusTagMap";
import { getCanonicalSportSlug } from "./canonicalSportSlug";

/**
 * Returns exercise tag slugs (with optional weights) for the given sport and
 * selected sub-focus slugs. Use the result to boost exercise selection toward
 * matching tags in the workout generator.
 * Legacy sport slugs (e.g. rock_bouldering) are mapped to canonical (rock_climbing) for lookup.
 * @param subFocusWeights - Optional weights by rank (e.g. [0.5, 0.3, 0.2] for 50/30/20). If not provided, sub-focuses are weighted equally.
 */
export function getExerciseTagsForSubFocuses(
  sportSlug: string,
  subFocusSlugs: string[],
  subFocusWeights?: number[]
): { tag_slug: string; weight: number }[] {
  const canonicalSlug = getCanonicalSportSlug(sportSlug);
  const byTag = new Map<string, number>();
  const weights = subFocusWeights?.length
    ? subFocusWeights
    : subFocusSlugs.map(() => 1);
  for (let i = 0; i < subFocusSlugs.length; i++) {
    const sub = subFocusSlugs[i];
    const rankWeight = weights[i] ?? 1;
    const entries =
      SUB_FOCUS_TAG_MAP[`${canonicalSlug}:${sub}`] ??
      (sportSlug !== canonicalSlug ? SUB_FOCUS_TAG_MAP[`${sportSlug}:${sub}`] : undefined);
    if (!entries) continue;
    for (const { tag_slug, weight = 1 } of entries) {
      const w = (weight ?? 1) * rankWeight;
      const existing = byTag.get(tag_slug);
      byTag.set(tag_slug, existing != null ? existing + w : w);
    }
  }
  return Array.from(byTag.entries()).map(([tag_slug, weight]) => ({ tag_slug, weight }));
}
