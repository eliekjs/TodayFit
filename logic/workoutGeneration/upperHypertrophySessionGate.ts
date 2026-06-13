/**
 * Session gates for Build Muscle (hypertrophy): upper-only body-part days should not pull
 * lower-body main volume into remainder fills, and optional cardio finishers can be omitted
 * when the user did not ask for conditioning/endurance emphasis.
 */

import { getLegacyMovementPattern } from "../../lib/ontology/legacyMapping";
import { hypertrophyPrimaryExcludesConditioning } from "./blockIntentProfile";
import type { Exercise, FocusBodyPart, GenerateWorkoutInput } from "./types";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_").replace(/-/g, "_");
}

const LOWER_MUSCLE_SUB_FOCUS_SLUGS = new Set(["glutes", "legs"]);

const LOWER_MUSCLE_MARKERS = new Set(["legs", "quads", "glutes", "hamstrings", "calves"]);

const UPPER_MUSCLE_MARKERS = new Set(["chest", "lats", "biceps", "triceps", "shoulders", "upper_back", "push", "pull"]);

/**
 * True when `focus_body_parts` are exclusively upper-region or core (no lower / full_body).
 * Empty or missing focus does not qualify — unknown intent keeps legacy remainder behavior.
 */
export function isUpperOnlyFocusBodyParts(focus: FocusBodyPart[] | undefined): boolean {
  if (!focus?.length) return false;
  const parts = focus.map((f) => norm(String(f)));
  if (parts.some((p) => p === "lower" || p === "full_body")) return false;
  return parts.every((p) => p === "upper_push" || p === "upper_pull" || p === "core");
}

export function hypertrophyMuscleSubFocusRequestsLowerBody(slugs: string[]): boolean {
  return slugs.some((s) => LOWER_MUSCLE_SUB_FOCUS_SLUGS.has(norm(s)));
}

/** When true, remainder fills after dominant sub-focus picks exclude lower-body main movements. */
export function shouldGateLowerBodyHypertrophyRemainder(
  input: GenerateWorkoutInput,
  directMuscleSubFocusSlugs: string[]
): boolean {
  if (!isUpperOnlyFocusBodyParts(input.focus_body_parts)) return false;
  if (hypertrophyMuscleSubFocusRequestsLowerBody(directMuscleSubFocusSlugs)) return false;
  return true;
}

function muscleGroupsCanonical(ex: Exercise): Set<string> {
  return new Set((ex.muscle_groups ?? []).map(norm));
}

function legacyMovementPattern(ex: Exercise): string {
  return norm(
    getLegacyMovementPattern({
      movement_patterns: ex.movement_patterns,
      movement_pattern: ex.movement_pattern,
    })
  );
}

/**
 * Identifies lower-body-dominant strength/hypertrophy picks that should not appear as remainder
 * volume on upper-only sessions (hinge/squat/lunge-style work with clear leg/glute emphasis).
 */
export function exerciseIsPrimaryLowerBodyHypertrophyMovement(ex: Exercise): boolean {
  if (ex.modality !== "strength" && ex.modality !== "hypertrophy") return false;

  const pat = legacyMovementPattern(ex);
  const muscles = muscleGroupsCanonical(ex);
  const fine = (ex.movement_patterns ?? []).map(norm);
  const family = norm(ex.primary_movement_family ?? "");
  const pairing = norm(ex.pairing_category ?? "");

  const hasLowerMuscle = [...muscles].some((m) => LOWER_MUSCLE_MARKERS.has(m));
  const hasUpperMuscle = [...muscles].some((m) => UPPER_MUSCLE_MARKERS.has(m));
  const lowerFamily = family.includes("lower_body") || family === "lower";

  if (fine.some((p) => p.includes("lunge") || p.includes("split_squat") || p.includes("single_leg_squat"))) {
    return true;
  }

  if (pat === "squat") return true;

  if (pat === "locomotion") {
    return hasLowerMuscle || lowerFamily;
  }

  if (pat === "hinge") {
    if (hasLowerMuscle || lowerFamily) return true;
    if (pairing === "posterior_chain" || pairing === "glutes") return true;
    return false;
  }

  if (pat === "carry") {
    return hasLowerMuscle && !hasUpperMuscle;
  }

  return false;
}

/** Hypertrophy-primary sessions never receive optional or required conditioning finishers. */
export function shouldOmitOptionalHypertrophyUpperOnlyConditioning(input: GenerateWorkoutInput): boolean {
  return hypertrophyPrimaryExcludesConditioning(input);
}
