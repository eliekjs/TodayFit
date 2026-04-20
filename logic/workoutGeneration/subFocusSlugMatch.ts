/**
 * Shared sub-focus slug matching for guarantees and weekly coverage (same rules as scoring).
 */

import { getExerciseTagsForGoalSubFocuses } from "../../data/goalSubFocus";
import {
  exerciseHasStrengthSubFocusSlug,
} from "../../data/goalSubFocus/strengthSubFocus";
import { exerciseHasSubFocusSlug } from "../../data/goalSubFocus/conditioningSubFocus";
import type { Exercise } from "./types";

function tagToSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/** Hypertrophy sub-focus: keep in sync with dailyGenerator scoreExercise. */
const HYPERTROPHY_SUB_FOCUS_MATCH_SLUGS: Record<string, string[]> = {
  glutes: ["glutes", "hamstrings", "legs", "posterior_chain"],
  back: ["back", "lats", "upper_back", "pull"],
  chest: ["chest", "pecs", "push"],
  arms: ["biceps", "triceps"],
  shoulders: ["shoulders", "push"],
  legs: ["legs", "quads", "glutes", "hamstrings", "calves"],
  core: ["core", "core_stability"],
  balanced: [],
};

export function exerciseMatchesHypertrophySubFocusSlug(exercise: Exercise, slug: string): boolean {
  const norm = tagToSlug(slug);
  if (norm === "balanced") return false;

  const matchSet = new Set(
    (HYPERTROPHY_SUB_FOCUS_MATCH_SLUGS[norm] ?? [norm]).map((s) => tagToSlug(s))
  );

  const muscleSet = new Set((exercise.muscle_groups ?? []).map((m) => tagToSlug(m)));
  const attrSet = new Set((exercise.tags?.attribute_tags ?? []).map((a) => tagToSlug(a)));
  const fatigueSet = new Set((exercise.fatigue_regions ?? []).map((f) => tagToSlug(f)));
  const pairing = tagToSlug(exercise.pairing_category ?? "");

  for (const m of matchSet) {
    if (muscleSet.has(m) || attrSet.has(m) || fatigueSet.has(m) || pairing === m) return true;
  }
  return false;
}

function getExerciseTagSlugsForCoverage(exercise: Exercise): Set<string> {
  const slugs = new Set<string>();
  const add = (s: string) => slugs.add(tagToSlug(s));
  for (const t of exercise.tags.goal_tags ?? []) add(t);
  for (const t of exercise.tags.sport_tags ?? []) add(t);
  for (const t of exercise.tags.stimulus ?? []) add(t);
  for (const t of exercise.tags.attribute_tags ?? []) add(t);
  for (const m of exercise.muscle_groups ?? []) add(m);
  if (exercise.movement_pattern) add(exercise.movement_pattern);
  const pairing = (exercise.pairing_category ?? "").trim();
  if (pairing) add(pairing);
  return slugs;
}

export function subFocusSlugsForGuarantee(goalSlug: string, slugs: string[]): string[] {
  if (goalSlug === "muscle" || goalSlug === "physique") {
    return slugs.filter((s) => tagToSlug(s) !== "balanced");
  }
  return slugs;
}

export function exerciseMatchesGoalSubFocusSlugUnified(
  exercise: Exercise,
  goalSlug: string,
  slug: string
): boolean {
  if (goalSlug === "strength") return exerciseHasStrengthSubFocusSlug(exercise, slug);
  if (goalSlug === "muscle" || goalSlug === "physique") {
    return exerciseMatchesHypertrophySubFocusSlug(exercise, slug);
  }
  if (goalSlug === "conditioning" || goalSlug === "endurance") {
    return exerciseHasSubFocusSlug(exercise, slug);
  }
  if (goalSlug === "mobility" || goalSlug === "resilience") {
    if (exerciseHasSubFocusSlug(exercise, slug)) return true;
    const entries = getExerciseTagsForGoalSubFocuses(goalSlug, [slug]);
    if (!entries.length) return false;
    const exTags = getExerciseTagSlugsForCoverage(exercise);
    return entries.some((e) => exTags.has(tagToSlug(e.tag_slug)));
  }
  return false;
}
