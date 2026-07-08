/**
 * Filter goal sub-focus slugs and exercises by session body emphasis (upper / lower / full).
 * Used for power-primary days and session titles so lower-body power subs do not dominate upper days.
 */

import { getLegacyMovementPattern } from "../../lib/ontology/legacyMapping";
import type { Exercise, FocusBodyPart } from "./types";
import { isUpperOnlyFocusBodyParts } from "./upperHypertrophySessionGate";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_").replace(/-/g, "_");
}

/** Power goal sub-focus slugs that target lower-body plyos / sprint / jump. */
const LOWER_BIAS_POWER_SUB_FOCUS = new Set([
  "lower_body_power_plyos",
  "vertical_jump",
  "sprint",
]);

/** Power goal sub-focus slugs that target upper-body explosive work. */
const UPPER_BIAS_POWER_SUB_FOCUS = new Set(["upper_body_power"]);

/** Athletic-performance subs that imply lower-body power on upper-only days. */
const LOWER_BIAS_ATHLETIC_SUB_FOCUS = new Set(["vertical_jump", "power_explosive"]);

export function isLowerOnlyFocusBodyParts(focus: FocusBodyPart[] | undefined): boolean {
  if (!focus?.length) return false;
  const parts = focus.map((f) => norm(String(f)));
  if (parts.some((p) => p === "full_body")) return false;
  if (parts.some((p) => p.startsWith("upper"))) return false;
  return parts.some((p) => p === "lower");
}

/** True when the session's body-part focus is exclusively core (no upper/lower/full_body mixed in). */
export function isCoreOnlyFocusBodyParts(focus: FocusBodyPart[] | undefined): boolean {
  if (!focus?.length) return false;
  const parts = focus.map((f) => norm(String(f)));
  if (parts.some((p) => p === "full_body")) return false;
  return parts.every((p) => p === "core");
}

/**
 * Drop body-mismatched power / athletic intent slugs when the session has explicit upper or lower focus.
 * Keeps neutral slugs (e.g. olympic_triple_extension) on both; prefers upper slugs on upper-only days.
 */
export function filterSubFocusSlugsForBodyFocus(
  slugs: string[],
  focus: FocusBodyPart[] | undefined
): string[] {
  if (!slugs.length || !focus?.length) return slugs;
  if (focus.some((f) => norm(String(f)) === "full_body")) return slugs;

  if (isUpperOnlyFocusBodyParts(focus)) {
    const withoutLower = slugs.filter((s) => !LOWER_BIAS_POWER_SUB_FOCUS.has(norm(s)));
    const withoutLowerAthletic = withoutLower.filter((s) => !LOWER_BIAS_ATHLETIC_SUB_FOCUS.has(norm(s)));
    const upperPreferred = withoutLowerAthletic.filter((s) => UPPER_BIAS_POWER_SUB_FOCUS.has(norm(s)));
    if (upperPreferred.length > 0) return upperPreferred;
    return withoutLowerAthletic.length > 0 ? withoutLowerAthletic : slugs;
  }

  if (isLowerOnlyFocusBodyParts(focus)) {
    const withoutUpper = slugs.filter((s) => !UPPER_BIAS_POWER_SUB_FOCUS.has(norm(s)));
    return withoutUpper.length > 0 ? withoutUpper : slugs;
  }

  return slugs;
}

const LOWER_MUSCLE_MARKERS = new Set(["legs", "quads", "glutes", "hamstrings", "calves"]);
const UPPER_MUSCLE_MARKERS = new Set(["chest", "lats", "biceps", "triceps", "shoulders", "upper_back", "push", "pull"]);

function legacyMovementPattern(ex: Exercise): string {
  return norm(
    getLegacyMovementPattern({
      movement_patterns: ex.movement_patterns,
      movement_pattern: ex.movement_pattern,
    })
  );
}

/**
 * Lower-body-dominant power picks (hinge/squat/plyo jump) that should not fill upper-only power blocks.
 */
export function exerciseIsLowerBodyDominantPowerMovement(ex: Exercise): boolean {
  if (ex.modality !== "power" && !(ex.tags?.goal_tags ?? []).includes("power")) return false;

  const pat = legacyMovementPattern(ex);
  const muscles = new Set((ex.muscle_groups ?? []).map(norm));
  const hasLowerMuscle = [...muscles].some((m) => LOWER_MUSCLE_MARKERS.has(m));
  const hasUpperMuscle = [...muscles].some((m) => UPPER_MUSCLE_MARKERS.has(m));
  const family = norm(ex.primary_movement_family ?? "");
  const lowerFamily = family.includes("lower") || family === "hinge" || family === "squat";

  if (pat === "squat" || pat === "locomotion") return true;
  if (pat === "hinge") {
    if (hasUpperMuscle && !hasLowerMuscle) return false;
    return hasLowerMuscle || lowerFamily || !hasUpperMuscle;
  }

  const stimulus = (ex.tags?.stimulus ?? []).map(norm);
  if (stimulus.includes("plyometric") && hasLowerMuscle && !hasUpperMuscle) return true;

  return false;
}

/** True when exercise reads as upper-body power (push/pull/med-ball throw patterns). */
export function exerciseIsUpperBodyPowerMovement(ex: Exercise): boolean {
  const pat = legacyMovementPattern(ex);
  if (pat === "push" || pat === "pull") return true;
  const family = norm(ex.primary_movement_family ?? "");
  if (family.includes("upper") || family === "push" || family === "pull") return true;
  const muscles = new Set((ex.muscle_groups ?? []).map(norm));
  return [...muscles].some((m) => UPPER_MUSCLE_MARKERS.has(m));
}
