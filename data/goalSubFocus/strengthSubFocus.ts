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

/** Calisthenics-style sub-focuses under goal slug `strength` (from Calisthenics / athletic bodyweight primary). */
export const CALISTHENICS_STYLE_STRENGTH_SUB_SLUGS = [
  "full_body_calisthenics",
  "legs_pistol",
  "pull_ups",
  "push_ups",
  "dips",
  "handstand",
  "front_lever_advanced",
] as const;

const STRENGTH_INTENT_SET = new Set<string>([...STRENGTH_INTENT_SLUGS]);
const STRENGTH_OVERLAY_SET = new Set<string>([...STRENGTH_OVERLAY_SLUGS]);
const CALISTHENICS_STYLE_STRENGTH_SUB_SET = new Set<string>([...CALISTHENICS_STYLE_STRENGTH_SUB_SLUGS]);

export type ExerciseForStrengthSubFocus = {
  id: string;
  tags?: {
    attribute_tags?: string[];
    goal_tags?: string[];
    stimulus?: string[];
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

  // Intent: lower body / squat-dominant (avoid matching hinges via glutes-only — systemic double-count with deadlift_hinge)
  if (norm === "squat") {
    if (movementPattern === "hinge") return false;
    return (
      movementPattern === "squat" ||
      finePatterns.some((p) => ["squat", "lunge", "split_squat"].includes(p)) ||
      muscles.has("quads") ||
      (family === "lower_body" && muscles.has("quads"))
    );
  }

  // Intent: hinge / posterior chain (glutes alone also matches many squats; require hinge shape or hamstrings / chain tag)
  if (norm === "deadlift_hinge") {
    if (movementPattern === "squat") return false;
    return movementPattern === "hinge" || pairing === "posterior_chain" || muscles.has("hamstrings");
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

  if (CALISTHENICS_STYLE_STRENGTH_SUB_SET.has(norm)) {
    return exerciseMatchesCalisthenicsStyleStrengthSlug(exercise, norm);
  }

  // Athletic Performance sub-focuses (goal_slug = "strength" under Athletic Performance primary focus).
  // Evidence: NSCA — plyometric training (loaded jump squats, lateral bounds, horizontal jumps) is
  // the strongest stimulus for COD improvement; Olympic derivatives and sprint-loaded exercises drive
  // power/speed adaptation (NSCA Basics of Strength & Conditioning, 2024).
  if (norm === "agility_cod") {
    // Direct attribute_tag match already handled above (e.g. exercises tagged 'agility_cod').
    // Infer from related tags applied by the COD migration (agility, lateral_power, single_leg_strength).
    if (attrs.includes("agility") || attrs.includes("lateral_power") || attrs.includes("single_leg_strength")) return true;
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    // Plyometric + unilateral / lateral lower-body pattern → COD-relevant.
    if (stimulus.includes("plyometric") &&
        (finePatterns.some(p => ["lunge", "locomotion"].includes(p)) || family === "lower_body")) return true;
    return false;
  }

  if (norm === "power_explosive") {
    // Infer from explosive_power attribute tag or plyometric stimulus.
    if (attrs.includes("explosive_power") || attrs.includes("plyometric") || attrs.includes("power")) return true;
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (stimulus.includes("plyometric")) return true;
    // Olympic derivatives flagged via movement_pattern or fine-patterns.
    if (movementPattern === "power" || finePatterns.some(p => ["power", "olympic"].includes(p))) return true;
    // Goal tag "power" (e.g. hang clean, power clean).
    const goalTags = (exercise.tags?.goal_tags ?? []).map(toSlug);
    if (goalTags.includes("power") || goalTags.includes("athletic_performance")) return true;
    return false;
  }

  if (norm === "speed_sprint") {
    // Infer from speed/agility attribute tags or plyometric stimulus.
    if (attrs.includes("speed") || attrs.includes("agility") || attrs.includes("plyometric")) return true;
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (stimulus.includes("plyometric")) return true;
    // Sprint-type exercises (id contains 'sprint' or 'run').
    const id = toSlug(exercise.id ?? "");
    if (id.includes("sprint") || id.includes("running") || id.includes("bound")) return true;
    return false;
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

/**
 * Direct match for Calisthenics primary sub-focus slugs (same `strength` goal slug in tag map).
 * Prefer attribute_tags; fall back to id/name and movement shape.
 */
function exerciseMatchesCalisthenicsStyleStrengthSlug(
  exercise: ExerciseForStrengthSubFocus,
  norm: string
): boolean {
  const id = toSlug(exercise.id ?? "");
  const attrs = (exercise.tags?.attribute_tags ?? []).map(toSlug);
  const fine = (exercise.movement_patterns ?? []).map(toSlug);
  const pattern = toSlug(exercise.movement_pattern ?? "");

  if (norm === "handstand") {
    if (attrs.includes("handstand")) return true;
    if (id.includes("handstand")) return true;
    if (pattern === "push" && (fine.includes("vertical_push") || fine.includes("horizontal_push"))) {
      return id.includes("wall") || id.includes("freestanding") || id.includes("pike") || id.includes("press_handstand");
    }
    return false;
  }

  if (norm === "pull_ups") {
    if (attrs.includes("pull_ups") || attrs.includes("pull_up")) return true;
    if (id.includes("pull_up") || id.includes("pullup") || id.includes("chin")) return true;
    return (
      pattern === "pull" &&
      (fine.includes("vertical_pull") || fine.includes("horizontal_pull") || exercise.muscle_groups?.some((m) => toSlug(m) === "lats"))
    );
  }

  if (norm === "push_ups") {
    if (attrs.includes("push_ups") || attrs.includes("push_up")) return true;
    if (id.includes("push_up") || id.includes("pushup")) return true;
    return pattern === "push" && fine.includes("horizontal_push");
  }

  if (norm === "dips") {
    if (attrs.includes("dips") || attrs.includes("dip")) return true;
    return id.includes("dip") && !id.includes("hip_hinge");
  }

  if (norm === "legs_pistol") {
    if (attrs.includes("pistol") || attrs.includes("single_leg_squat")) return true;
    return (
      id.includes("pistol") ||
      id.includes("shrimp") ||
      (pattern === "squat" && fine.some((f) => f.includes("single") || f.includes("split")))
    );
  }

  if (norm === "front_lever_advanced") {
    if (attrs.includes("front_lever") || attrs.includes("lever")) return true;
    return id.includes("lever") || id.includes("front_lever");
  }

  if (norm === "full_body_calisthenics") {
    const goalTags = (exercise.tags?.goal_tags ?? []).map(toSlug);
    if (goalTags.includes("calisthenics")) return true;
    const muscles = new Set((exercise.muscle_groups ?? []).map(toSlug));
    const hasUpper =
      muscles.has("push") ||
      muscles.has("pull") ||
      muscles.has("chest") ||
      muscles.has("lats") ||
      muscles.has("shoulders");
    const hasLower = muscles.has("legs") || muscles.has("quads") || muscles.has("glutes");
    const hasCore = muscles.has("core");
    return hasCore && hasUpper && hasLower;
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

