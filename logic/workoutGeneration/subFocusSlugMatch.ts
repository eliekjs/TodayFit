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
import {
  isExplosivePlyometricSportSubFocusSlug,
  isStabilityPrehabSportSubFocusSlug,
  tagSetHasDynamicPowerSignal,
  tagSetHasStabilityPrehabSignal,
} from "../../data/sportSubFocus/subFocusIntentArchetypes";
import {
  exercisePassesVerticalJumpDynamicGate,
  isVerticalJumpSubFocusSlug,
} from "../../data/sportSubFocus/verticalJumpSubFocusShared";
import {
  exercisePassesSubFocusTrainingGate,
  exerciseIsSprintOrCodDrill,
  normalizeSubFocusSlug,
} from "../../data/sportSubFocus/subFocusIntentRegistry";
import type { Exercise } from "./types";

function tagToSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function exerciseHasGoalIntentSlug(exercise: Exercise, slug: string): boolean {
  const norm = tagToSlug(slug);
  const attrs = (exercise.tags?.attribute_tags ?? []).map((a) => tagToSlug(a));
  return attrs.includes(norm);
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
  if (norm === "balanced") {
    if (exerciseHasGoalIntentSlug(exercise, "balanced")) return true;
    const muscleSet = new Set((exercise.muscle_groups ?? []).map((m) => tagToSlug(m)));
    const attrSet = new Set((exercise.tags?.attribute_tags ?? []).map((a) => tagToSlug(a)));
    if (attrSet.has("compound") || attrSet.has("full_body")) return true;
    const regions = new Set<string>();
    for (const m of muscleSet) {
      if (["chest", "back", "lats", "legs", "quads", "glutes", "shoulders", "push", "pull"].includes(m)) {
        regions.add(m);
      }
    }
    return regions.size >= 2;
  }

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
  return isSpeedAgilityPowerStyleSubFocusSlug(subSlug) || isExplosivePlyometricSportSubFocusSlug(subSlug);
}

function passesSpeedAgilityDynamicGate(exercise: Exercise, subSlug: string): boolean {
  const canon = normalizeSubFocusSlug(subSlug);
  if (isVerticalJumpSubFocusSlug(canon)) {
    return exercisePassesVerticalJumpDynamicGate(exercise);
  }
  if (requiresSpeedAgilityDynamicGate(canon)) {
    return exercisePassesSubFocusTrainingGate(exercise, canon);
  }
  return true;
}

const REGIONAL_ANATOMY_SLUGS = new Set(["hips", "shoulders", "t_spine", "lower_back", "ankles"]);

/**
 * Recovery goal uses goal_slug `resilience`. User already declared Recovery — regional anatomy
 * (mobility / stretch / stability signals) should qualify without requiring a duplicate `recovery` tag
 * on every drill (see goalSubFocusTagMap resilience:* entries).
 */
function exerciseMatchesRegionalAnatomy(exercise: Exercise, subSlug: string): boolean {
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

function exerciseMatchesResilienceRegionalAnatomy(exercise: Exercise, subSlug: string): boolean {
  return exerciseMatchesRegionalAnatomy(exercise, subSlug);
}

/** Mobility regional sub-focus: require anatomy-specific signals, not generic `mobility` modality alone. */
function exerciseMatchesMobilityRegionalSlug(exercise: Exercise, subSlug: string): boolean {
  const norm = tagToSlug(subSlug);
  if (norm === "full_body") {
    const exTags = getExerciseTagSlugsForCoverage(exercise);
    if (exTags.has("mobility")) return true;
    const targets = [
      ...(exercise.mobility_targets ?? []),
      ...(exercise.stretch_targets ?? []),
    ];
    return targets.length > 0;
  }
  if (!REGIONAL_ANATOMY_SLUGS.has(norm)) return false;
  return exerciseMatchesRegionalAnatomy(exercise, subSlug);
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
  const canonSub = normalizeSubFocusSlug(subSlug);
  const entries = getExerciseTagsForSubFocuses(sportKey, [canonSub]);
  if (!entries.length) return false;
  const exTags = getExerciseTagSlugsForCoverage(exercise);
  if (requiresSpeedAgilityDynamicGate(canonSub)) {
    if (!passesSpeedAgilityDynamicGate(exercise, canonSub)) return false;
  }
  if (isStabilityPrehabSportSubFocusSlug(canonSub) && !tagSetHasStabilityPrehabSignal(exTags)) {
    return false;
  }
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
  const canonSub = normalizeSubFocusSlug(subSlug);
  const want = tagToSlug(getCanonicalSportSlug(sportKey));
  const hasSport = (exercise.tags.sport_tags ?? []).some(
    (t) => tagToSlug(getCanonicalSportSlug(String(t))) === want
  );
  if (hasSport) {
    return exerciseMatchesSportSubFocusSlug(exercise, sportKey, subSlug);
  }
  // Field-sport speed/COD drills are often tagged generically; accept sprint/COD evidence without sport chip.
  if (
    (canonSub === "speed" || canonSub === "change_of_direction") &&
    exerciseIsSprintOrCodDrill(exercise) &&
    exerciseMatchesSportSubFocusSlug(exercise, sportKey, subSlug)
  ) {
    return true;
  }
  return false;
}

export function exerciseMatchesGoalSubFocusSlugUnified(
  exercise: Exercise,
  goalSlug: string,
  slug: string
): boolean {
  if (goalSlug === "strength" || goalSlug === "calisthenics") {
    if (!exerciseHasStrengthSubFocusSlug(exercise, slug)) return false;
    return passesSpeedAgilityDynamicGate(exercise, slug);
  }
  if (goalSlug === "athletic_performance") {
    if (exerciseHasStrengthSubFocusSlug(exercise, slug)) {
      return passesSpeedAgilityDynamicGate(exercise, slug);
    }
    const entries = getExerciseTagsForGoalSubFocuses("athletic_performance", [slug]);
    if (!entries.length) return false;
    const exTags = getExerciseTagSlugsForCoverage(exercise);
    if (requiresSpeedAgilityDynamicGate(slug)) {
      if (isVerticalJumpSubFocusSlug(slug)) {
        if (!exercisePassesVerticalJumpDynamicGate(exercise)) return false;
      } else if (
        !exerciseTagSetHasSpeedAgilityDynamicMovement(exTags) &&
        !tagSetHasDynamicPowerSignal(exTags)
      ) {
        return false;
      }
    }
    return entries.some((e) => exTags.has(tagToSlug(e.tag_slug)));
  }
  if (goalSlug === "muscle" || goalSlug === "physique") {
    return exerciseMatchesHypertrophySubFocusSlug(exercise, slug);
  }
  if (goalSlug === "conditioning" || goalSlug === "endurance" || goalSlug === "power") {
    return exerciseHasSubFocusSlug(exercise, slug);
  }
  if (goalSlug === "mobility") {
    if (exerciseHasGoalIntentSlug(exercise, slug)) return true;
    if (exerciseHasSubFocusSlug(exercise, slug)) return true;
    return exerciseMatchesMobilityRegionalSlug(exercise, slug);
  }
  if (goalSlug === "resilience") {
    if (exerciseHasGoalIntentSlug(exercise, slug)) return true;
    if (exerciseHasSubFocusSlug(exercise, slug)) return true;
    if (exerciseMatchesResilienceRegionalAnatomy(exercise, slug)) return true;
    if (tagToSlug(slug) === "full_body") {
      const exTags = getExerciseTagSlugsForCoverage(exercise);
      return exTags.has("recovery") || exTags.has("mobility");
    }
    return false;
  }
  return false;
}
