/**
 * Filter goal sub-focus slugs and exercises by session body emphasis (upper / lower / full).
 * Used for power-primary days and session titles so lower-body power subs do not dominate upper days.
 */

import { getLegacyMovementPattern } from "../../lib/ontology/legacyMapping";
import { filterSplitSensitiveSlugsForFocusParts } from "../../lib/subGoalSplitCoverage";
import type { Exercise, FocusBodyPart } from "./types";
import { isUpperOnlyFocusBodyParts } from "./upperHypertrophySessionGate";
import { muscleSplitEmphasisFromFocusParts } from "../../lib/splitMuscleMatching";

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

/** Hypertrophy / physique muscle slugs that must follow the day's body contract. */
const HYPERTROPHY_MUSCLE_SLUGS = new Set([
  "chest",
  "back",
  "shoulders",
  "arms",
  "glutes",
  "legs",
  "core",
]);

const LOWER_HYPERTROPHY_SLUGS = new Set(["glutes", "legs"]);
const UPPER_HYPERTROPHY_SLUGS = new Set(["chest", "back", "shoulders", "arms"]);

/** When a Muscle-mode emphasis is set, keep only these hypertrophy slugs. */
const HYPERTROPHY_SLUGS_FOR_EMPHASIS: Record<string, ReadonlySet<string>> = {
  chest: new Set(["chest"]),
  back: new Set(["back"]),
  shoulders: new Set(["shoulders"]),
  arms: new Set(["arms"]),
  glutes: new Set(["glutes"]),
  legs: new Set(["legs", "glutes"]),
};

export function isLowerOnlyFocusBodyParts(focus: FocusBodyPart[] | undefined): boolean {
  if (!focus?.length) return false;
  const parts = focus.map((f) => norm(String(f)));
  if (parts.some((p) => p === "full_body")) return false;
  if (parts.some((p) => p.startsWith("upper") || p === "chest" || p === "back" || p === "shoulders" || p === "arms"))
    return false;
  return parts.some((p) => p === "lower" || p === "quad" || p === "posterior" || p === "glutes" || p === "legs");
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

  let next = slugs;

  if (isUpperOnlyFocusBodyParts(focus)) {
    const withoutLower = next.filter((s) => !LOWER_BIAS_POWER_SUB_FOCUS.has(norm(s)));
    const withoutLowerAthletic = withoutLower.filter((s) => !LOWER_BIAS_ATHLETIC_SUB_FOCUS.has(norm(s)));
    const upperPreferred = withoutLowerAthletic.filter((s) => UPPER_BIAS_POWER_SUB_FOCUS.has(norm(s)));
    if (upperPreferred.length > 0) next = upperPreferred;
    else if (withoutLowerAthletic.length > 0) next = withoutLowerAthletic;
  } else if (isLowerOnlyFocusBodyParts(focus)) {
    const withoutUpper = next.filter((s) => !UPPER_BIAS_POWER_SUB_FOCUS.has(norm(s)));
    if (withoutUpper.length > 0) next = withoutUpper;
  }

  next = filterHypertrophyMuscleSlugsForBodyFocus(next, focus);
  next = filterSplitSensitiveSlugsForFocusParts(next, focus);
  return next;
}

const STRENGTH_LIFT_SLUGS = new Set([
  "squat",
  "deadlift_hinge",
  "bench_press",
  "overhead_press",
  "pull",
]);
const STRENGTH_OVERLAY_SLUGS = new Set(["upper", "lower", "core", "full_body"]);

/**
 * Region overlay to use when Build Strength has no lift-specific sub-goal.
 * Lower day → all lower-body strength (squat + hinge), not Squat alone.
 */
export function regionalStrengthOverlayForFocus(
  focus: FocusBodyPart[] | undefined
): "lower" | "upper" | null {
  if (!focus?.length) return null;
  const parts = focus.map((f) => norm(String(f)));
  if (parts.includes("full_body") || parts.includes("core")) return null;
  const emphasis = muscleSplitEmphasisFromFocusParts(focus);
  if (emphasis && emphasis !== "legs") return null;
  if (isLowerOnlyFocusBodyParts(focus)) return "lower";
  const hasPush = parts.includes("upper_push");
  const hasPull = parts.includes("upper_pull");
  if (isUpperOnlyFocusBodyParts(focus) && hasPush && hasPull) return "upper";
  return null;
}

/** When strength is the session goal and no lift sub-goal remains, attach the region overlay. */
export function ensureRegionalStrengthOverlay(
  goalSubFocus: Record<string, string[]>,
  goalSubFocusWeights: Record<string, number[]>,
  focus: FocusBodyPart[] | undefined,
  primaryGoal: string
): {
  goal_sub_focus: Record<string, string[]>;
  goal_sub_focus_weights: Record<string, number[]>;
} {
  if (primaryGoal !== "strength") {
    return { goal_sub_focus: goalSubFocus, goal_sub_focus_weights: goalSubFocusWeights };
  }
  const overlay = regionalStrengthOverlayForFocus(focus);
  if (!overlay) {
    return { goal_sub_focus: goalSubFocus, goal_sub_focus_weights: goalSubFocusWeights };
  }
  const existing = goalSubFocus.strength ?? [];
  if (existing.some((s) => STRENGTH_LIFT_SLUGS.has(norm(s)))) {
    return { goal_sub_focus: goalSubFocus, goal_sub_focus_weights: goalSubFocusWeights };
  }
  if (existing.some((s) => STRENGTH_OVERLAY_SLUGS.has(norm(s)))) {
    return { goal_sub_focus: goalSubFocus, goal_sub_focus_weights: goalSubFocusWeights };
  }
  return {
    goal_sub_focus: { ...goalSubFocus, strength: [overlay] },
    goal_sub_focus_weights: { ...goalSubFocusWeights, strength: [1] },
  };
}

function filterHypertrophyMuscleSlugsForBodyFocus(
  slugs: string[],
  focus: FocusBodyPart[]
): string[] {
  const parts = focus.map((f) => norm(String(f)));
  const selectedMuscles = parts.filter((p) => HYPERTROPHY_MUSCLE_SLUGS.has(p));
  if (selectedMuscles.length >= 2) {
    const keep = new Set(selectedMuscles);
    return slugs.filter((s) => {
      const n = norm(s);
      if (!HYPERTROPHY_MUSCLE_SLUGS.has(n)) return true;
      return keep.has(n);
    });
  }

  const emphasis = muscleSplitEmphasisFromFocusParts(focus);
  if (emphasis && HYPERTROPHY_SLUGS_FOR_EMPHASIS[emphasis]) {
    const keep = HYPERTROPHY_SLUGS_FOR_EMPHASIS[emphasis]!;
    return slugs.filter((s) => {
      const n = norm(s);
      if (!HYPERTROPHY_MUSCLE_SLUGS.has(n)) return true;
      return keep.has(n);
    });
  }

  const pushOnly = parts.includes("upper_push") && !parts.includes("upper_pull");
  const pullOnly = parts.includes("upper_pull") && !parts.includes("upper_push");
  if (pushOnly) {
    return slugs.filter((s) => {
      const n = norm(s);
      return n !== "back" && !LOWER_HYPERTROPHY_SLUGS.has(n);
    });
  }
  if (pullOnly) {
    return slugs.filter((s) => {
      const n = norm(s);
      return n !== "chest" && n !== "shoulders" && !LOWER_HYPERTROPHY_SLUGS.has(n);
    });
  }

  if (isCoreOnlyFocusBodyParts(focus)) {
    return slugs.filter((s) => {
      const n = norm(s);
      return !HYPERTROPHY_MUSCLE_SLUGS.has(n) || n === "core";
    });
  }

  if (isUpperOnlyFocusBodyParts(focus)) {
    return slugs.filter((s) => !LOWER_HYPERTROPHY_SLUGS.has(norm(s)));
  }
  if (isLowerOnlyFocusBodyParts(focus)) {
    return slugs.filter((s) => !UPPER_HYPERTROPHY_SLUGS.has(norm(s)));
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
