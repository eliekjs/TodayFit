/**
 * Shared sub-focus slug matching for guarantees and weekly coverage (same rules as scoring).
 */

import { getExerciseTagsForGoalSubFocuses } from "../../data/goalSubFocus";
import { getExerciseTagsForSubFocuses, getCanonicalSportSlug } from "../../data/sportSubFocus";
import {
  exerciseHasStrengthSubFocusSlug,
} from "../../data/goalSubFocus/strengthSubFocus";
import { exerciseHasSubFocusSlug } from "../../data/goalSubFocus/conditioningSubFocus";
import {
  exerciseTagSetHasSpeedAgilityDynamicMovement,
  isSpeedAgilityPowerStyleSubFocusSlug,
} from "../../data/sportSubFocus/speedAgilitySubFocusShared";
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

function requiresSpeedAgilityDynamicGate(subSlug: string): boolean {
  return isSpeedAgilityPowerStyleSubFocusSlug(subSlug);
}

/**
 * Recovery goal uses goal_slug `resilience`. User already declared Recovery — regional anatomy
 * (mobility / stretch / stability signals) should qualify without requiring a duplicate `recovery` tag
 * on every drill (see goalSubFocusTagMap resilience:* entries).
 */
function exerciseMatchesResilienceRegionalAnatomy(exercise: Exercise, subSlug: string): boolean {
  const norm = tagToSlug(subSlug);
  const exTags = getExerciseTagSlugsForCoverage(exercise);
  const muscles = new Set((exercise.muscle_groups ?? []).map((m) => tagToSlug(m)));
  const targets = [
    ...(exercise.mobility_targets ?? []),
    ...(exercise.stretch_targets ?? []),
  ].map((t) => tagToSlug(t));
  const hasTarget = (sub: string) => targets.some((t) => t.includes(sub));

  if (norm === "t_spine") {
    if (exTags.has("thoracic_mobility") || exTags.has("t_spine")) return true;
    if (hasTarget("thoracic") || hasTarget("t_spine")) return true;
    return false;
  }
  if (norm === "lower_back") {
    if (exTags.has("anti_rotation")) return true;
    if (hasTarget("low_back") || hasTarget("lumbar")) return true;
    if (
      exTags.has("core_stability") &&
      (muscles.has("lower_back") || muscles.has("low_back") || hasTarget("low_back") || hasTarget("lumbar"))
    ) {
      return true;
    }
    return false;
  }
  if (norm === "ankles") {
    if (exTags.has("ankle_stability")) return true;
    if (hasTarget("calves") || hasTarget("ankle")) return true;
    return false;
  }
  if (norm === "hips") {
    if (exTags.has("hip_mobility") || exTags.has("hips")) return true;
    if (hasTarget("hip")) return true;
    return false;
  }
  if (norm === "shoulders") {
    return (
      exTags.has("shoulder_stability") ||
      exTags.has("scapular_control") ||
      exTags.has("scapular_strength") ||
      exTags.has("rotator_cuff")
    );
  }
  return false;
}

export function subFocusSlugsForGuarantee(goalSlug: string, slugs: string[]): string[] {
  if (goalSlug === "muscle" || goalSlug === "physique") {
    return slugs.filter((s) => tagToSlug(s) !== "balanced");
  }
  return slugs;
}

/**
 * True when the exercise carries at least one tag from the sport sub-focus → tag map
 * (same signal as `ranked_intent_entries` sport_sub_focus matching).
 */
export function exerciseMatchesSportSubFocusSlug(
  exercise: Exercise,
  sportKey: string,
  subSlug: string
): boolean {
  const entries = getExerciseTagsForSubFocuses(sportKey, [subSlug]);
  if (!entries.length) return false;
  const exTags = getExerciseTagSlugsForCoverage(exercise);
  if (requiresSpeedAgilityDynamicGate(subSlug) && !exerciseTagSetHasSpeedAgilityDynamicMovement(exTags))
    return false;
  return entries.some((e) => exTags.has(tagToSlug(e.tag_slug)));
}

/**
 * Session coverage: require canonical sport_tags match so shared quality tags (e.g. explosive_power)
 * from another sport’s work do not satisfy a different sport’s sub-focus slot.
 */
export function exerciseMatchesSportSubFocusForCoverage(
  exercise: Exercise,
  sportKey: string,
  subSlug: string
): boolean {
  const want = tagToSlug(getCanonicalSportSlug(sportKey));
  const hasSport = (exercise.tags.sport_tags ?? []).some(
    (t) => tagToSlug(getCanonicalSportSlug(String(t))) === want
  );
  if (!hasSport) return false;
  return exerciseMatchesSportSubFocusSlug(exercise, sportKey, subSlug);
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
    if (goalSlug === "resilience" && exerciseMatchesResilienceRegionalAnatomy(exercise, slug)) return true;
    const entries = getExerciseTagsForGoalSubFocuses(goalSlug, [slug]);
    if (!entries.length) return false;
    const exTags = getExerciseTagSlugsForCoverage(exercise);
    return entries.some((e) => exTags.has(tagToSlug(e.tag_slug)));
  }
  return false;
}
