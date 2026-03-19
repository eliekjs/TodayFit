/**
 * Strength sub-focus: direct slug matching as first-class signals.
 *
 * For strength, we intentionally avoid a large ontology layer:
 * - Primary intent slugs (e.g. `squat`, `deadlift_hinge`, `bench_press`, `overhead_press`, `pull`)
 *   should strongly bias main + accessory selection.
 * - Overlay slugs (e.g. `upper`, `lower`, `core`, `full_body`) bias filtering/secondary scoring.
 *
 * Matching strategy:
 * - Prefer `tags.attribute_tags` when present (canonical).
 * - Minimal fallbacks map slugs to existing exercise shape fields (movement_pattern, muscle_groups, primary_movement_family)
 *   so the system remains useful while the DB is being backfilled with `attribute_tags`.
 */

import type { SubFocusProfile } from "./types";

export const STRENGTH_INTENT_SLUGS = [
  "squat",
  "deadlift_hinge",
  "bench_press",
  "overhead_press",
  "pull",
] as const;

export const STRENGTH_OVERLAY_SLUGS = ["upper", "lower", "core", "full_body"] as const;

const STRENGTH_INTENT_SET = new Set<string>([...STRENGTH_INTENT_SLUGS]);
const STRENGTH_OVERLAY_SET = new Set<string>([...STRENGTH_OVERLAY_SLUGS]);

export type ExerciseForStrengthSubFocus = {
  id: string;
  tags?: {
    attribute_tags?: string[];
  };
  movement_pattern?: string;
  primary_movement_family?: string;
  movement_patterns?: string[];
  muscle_groups?: string[];
  pairing_category?: string;
  exercise_role?: string;
};

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_");
}

/**
 * True when an exercise matches the strength sub-focus slug.
 * If `attribute_tags` exist, they are the source of truth.
 * Otherwise, we apply minimal inference using movement shape.
 */
export function exerciseHasStrengthSubFocusSlug(exercise: ExerciseForStrengthSubFocus, slug: string): boolean {
  const norm = toSlug(slug);
  const attrs = (exercise.tags?.attribute_tags ?? []).map(toSlug);
  if (attrs.includes(norm)) return true;

  const movementPattern = toSlug(exercise.movement_pattern ?? "");
  const family = toSlug(exercise.primary_movement_family ?? "");
  const finePatterns = (exercise.movement_patterns ?? []).map(toSlug);
  const muscles = new Set((exercise.muscle_groups ?? []).map(toSlug));
  const pairing = toSlug(exercise.pairing_category ?? "");

  // Intent: lower body / squat-dominant
  if (norm === "squat") {
    return movementPattern === "squat" || family === "lower_body" || muscles.has("quads") || muscles.has("glutes");
  }

  // Intent: hinge / posterior chain
  if (norm === "deadlift_hinge") {
    return movementPattern === "hinge" || pairing === "posterior_chain" || muscles.has("hamstrings") || muscles.has("glutes");
  }

  // Intent: bench / horizontal press
  if (norm === "bench_press") {
    return movementPattern === "push" && (family === "upper_push" || finePatterns.includes("horizontal_push") || pairing === "chest" || muscles.has("chest"));
  }

  // Intent: overhead press / vertical press
  if (norm === "overhead_press") {
    return (
      movementPattern === "push" &&
      (family === "upper_push" || finePatterns.includes("vertical_push") || pairing === "shoulders" || muscles.has("shoulders"))
    );
  }

  // Intent: pull-up / horizontal or vertical pull
  if (norm === "pull") {
    return movementPattern === "pull" || family === "upper_pull" || finePatterns.includes("vertical_pull") || finePatterns.includes("horizontal_pull") || muscles.has("lats") || muscles.has("biceps") || muscles.has("back");
  }

  // Overlay: use same match primitives (best-effort).
  if (STRENGTH_OVERLAY_SET.has(norm)) {
    if (norm === "full_body") {
      const hasCore = muscles.has("core");
      const hasLegs = muscles.has("legs") || muscles.has("quads") || muscles.has("glutes") || muscles.has("hamstrings") || muscles.has("calves");
      const hasUpper = muscles.has("push") || muscles.has("pull") || muscles.has("chest") || muscles.has("back") || muscles.has("shoulders") || muscles.has("lats") || muscles.has("biceps");
      // full_body overlay is primarily a "compound, multi-region" signal.
      return hasCore && (hasLegs || hasUpper);
    }
    if (norm === "core") return muscles.has("core") || movementPattern === "rotate" || family === "core";
    if (norm === "upper") return family === "upper_push" || family === "upper_pull" || finePatterns.includes("horizontal_push") || finePatterns.includes("horizontal_pull") || finePatterns.includes("vertical_push") || finePatterns.includes("vertical_pull");
    if (norm === "lower") return family === "lower_body" || muscles.has("legs") || muscles.has("quads") || muscles.has("glutes") || muscles.has("hamstrings");
  }

  return false;
}

export function getStrengthIntentSlugs(profile: SubFocusProfile): string[] {
  return profile.effectiveSubFocusSlugs.filter((s) => STRENGTH_INTENT_SET.has(s));
}

export function getStrengthOverlayFilter(profile: SubFocusProfile): string | undefined {
  return profile.overlayFilter;
}

/**
 * Filter pool to exercises matching at least one of the given slugs.
 * If directMatches is empty, returns the original pool (soft behavior).
 */
export function filterPoolByDirectStrengthSubFocus<T extends ExerciseForStrengthSubFocus>(
  pool: T[],
  intentSlugs: string[]
): T[] {
  if (!intentSlugs.length) return pool;
  const directMatches = pool.filter((e) => intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug)));
  return directMatches.length > 0 ? directMatches : pool;
}

/** Check if an exercise matches any intent slug. */
export function exerciseMatchesAnyStrengthIntent(exercise: ExerciseForStrengthSubFocus, intentSlugs: string[]): boolean {
  if (!intentSlugs.length) return false;
  return intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(exercise, slug));
}

/** Check if an exercise matches any overlay slug. */
export function exerciseMatchesAnyStrengthOverlay(exercise: ExerciseForStrengthSubFocus, overlaySlugs: string[]): boolean {
  if (!overlaySlugs.length) return false;
  return overlaySlugs.some((slug) => exerciseHasStrengthSubFocusSlug(exercise, slug));
}

