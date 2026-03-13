/**
 * Goal sub-focus: options and tag mapping for Manual mode sub-goals.
 * Use getExerciseTagsForGoalSubFocuses to get tag weights for exercise ranking.
 */

export type { GoalSubFocusOption, GoalSubFocusOptionsEntry, GoalSubFocusTagMap, GoalSubFocusTagMapEntry } from "./types";
export { GOAL_SUB_FOCUS_OPTIONS } from "./goalSubFocusOptions";
export { GOAL_SUB_FOCUS_TAG_MAP } from "./goalSubFocusTagMap";

import { GOAL_SUB_FOCUS_OPTIONS } from "./goalSubFocusOptions";
import { GOAL_SUB_FOCUS_TAG_MAP } from "./goalSubFocusTagMap";

/**
 * Resolve primary focus label + sub-focus labels to goal slug and sub-focus slugs.
 * Used when converting Manual preferences (subFocusByGoal keyed by goal label) to tag lookup.
 */
export function resolveGoalSubFocusSlugs(
  primaryFocusLabel: string,
  subFocusLabels: string[]
): { goalSlug: string; subFocusSlugs: string[] } {
  const entry = GOAL_SUB_FOCUS_OPTIONS[primaryFocusLabel];
  if (!entry) return { goalSlug: "", subFocusSlugs: [] };
  const nameToSlug = new Map(entry.subFocuses.map((f) => [f.name, f.slug]));
  const subFocusSlugs = subFocusLabels
    .map((name) => nameToSlug.get(name))
    .filter((s): s is string => s != null);
  return { goalSlug: entry.goalSlug, subFocusSlugs };
}

/**
 * Returns exercise tag slugs (with weights) for the given goal and selected sub-focus slugs.
 * Use the result to boost exercise selection toward matching tags in the workout generator.
 * @param subFocusWeights - Optional weights by rank (e.g. [0.5, 0.3, 0.2]). If not provided, sub-focuses are weighted equally.
 */
export function getExerciseTagsForGoalSubFocuses(
  goalSlug: string,
  subFocusSlugs: string[],
  subFocusWeights?: number[]
): { tag_slug: string; weight: number }[] {
  const byTag = new Map<string, number>();
  const weights = subFocusWeights?.length
    ? subFocusWeights
    : subFocusSlugs.map(() => 1);
  for (let i = 0; i < subFocusSlugs.length; i++) {
    const sub = subFocusSlugs[i];
    const rankWeight = weights[i] ?? 1;
    const key = `${goalSlug}:${sub}`;
    const entries = GOAL_SUB_FOCUS_TAG_MAP[key];
    if (!entries) continue;
    for (const { tag_slug, weight = 1 } of entries) {
      const w = (weight ?? 1) * rankWeight;
      const existing = byTag.get(tag_slug);
      byTag.set(tag_slug, existing != null ? existing + w : w);
    }
  }
  return Array.from(byTag.entries()).map(([tag_slug, weight]) => ({ tag_slug, weight }));
}
