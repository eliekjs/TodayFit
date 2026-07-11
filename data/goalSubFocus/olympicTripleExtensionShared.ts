/**
 * Shared Olympic / triple-extension sub-focus signals, tag weights, and session intent helpers.
 * Keeps power-block selection and hard-filter bypass aligned with direct attribute_tags matching.
 *
 * Evidence: NSCA Essentials — Olympic derivatives (hang/power clean, high pull, DB/KB clean/snatch)
 * for rate-of-force and triple-extension power. Intermediate users who explicitly select this
 * sub-focus should see those derivatives, not only generic plyometrics.
 */

import type { GoalSubFocusTagMapEntry } from "./types";
import type { Exercise } from "../../logic/workoutGeneration/types";

export const OLYMPIC_TRIPLE_EXTENSION_SUB_FOCUS_SLUG = "olympic_triple_extension";

/** Soft scoring weights — include the intent slug so tagged cleans outrank generic hinge/power. */
export const SHARED_TAG_WEIGHTS_OLYMPIC_TRIPLE_EXTENSION: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "olympic_triple_extension", weight: 1.5 },
  { tag_slug: "power", weight: 1.2 },
  { tag_slug: "hinge", weight: 1.1 },
  { tag_slug: "compound", weight: 1 },
  { tag_slug: "explosive_power", weight: 0.9 },
];

export type OlympicTripleExtensionIntentInput = {
  goal_sub_focus?: Record<string, string[] | undefined>;
  sport_sub_focus?: Record<string, string[] | undefined>;
  session_intent?: {
    sport_sub_focus_by_sport?: Record<string, string[] | undefined>;
    goal_sub_focus_by_goal?: Record<string, string[] | undefined>;
  };
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

export function isOlympicTripleExtensionSubFocusSlug(slug: string): boolean {
  return norm(slug) === OLYMPIC_TRIPLE_EXTENSION_SUB_FOCUS_SLUG;
}

export function inputHasOlympicTripleExtensionSubFocus(
  input: OlympicTripleExtensionIntentInput
): boolean {
  const fromMap = (map: Record<string, string[] | undefined> | undefined): boolean => {
    if (!map) return false;
    return Object.values(map).some((slugs) =>
      (slugs ?? []).some((s) => isOlympicTripleExtensionSubFocusSlug(s))
    );
  };
  return (
    fromMap(input.goal_sub_focus) ||
    fromMap(input.sport_sub_focus) ||
    fromMap(input.session_intent?.sport_sub_focus_by_sport) ||
    fromMap(input.session_intent?.goal_sub_focus_by_goal)
  );
}

export function exerciseBlobForOlympic(exercise: Pick<Exercise, "id" | "name">): string {
  return norm(`${exercise.id ?? ""}_${exercise.name ?? ""}`);
}

/** Name/id signals for Olympic / triple-extension derivatives (excludes curls). */
export function exerciseHasOlympicTripleExtensionNameSignal(
  exercise: Pick<Exercise, "id" | "name">
): boolean {
  const blob = exerciseBlobForOlympic(exercise);
  if (blob.includes("curl") || blob.includes("hammer_curl")) return false;
  return (
    /\b(power_clean|hang_clean|squat_clean|muscle_clean|power_snatch|hang_snatch|split_jerk|push_jerk|high_pull)\b/.test(
      blob
    ) ||
    ((blob.includes("clean") || blob.includes("snatch") || blob.includes("jerk")) &&
      !blob.includes("curl"))
  );
}

/** Direct attribute tag or name/id evidence for olympic_triple_extension. */
export function exerciseMatchesOlympicTripleExtension(
  exercise: Pick<Exercise, "id" | "name" | "tags">
): boolean {
  const attrs = (exercise.tags?.attribute_tags ?? []).map(norm);
  if (attrs.includes(OLYMPIC_TRIPLE_EXTENSION_SUB_FOCUS_SLUG)) return true;
  return exerciseHasOlympicTripleExtensionNameSignal(exercise);
}

/**
 * Intermediate-accessible Olympic derivatives when the user opted into this sub-focus.
 * Still excludes advanced-only patterns (bottoms-up, start-stop, snatch balance, etc.).
 */
export function exerciseIsIntermediateOlympicDerivative(
  exercise: Pick<Exercise, "id" | "name" | "tags">
): boolean {
  if (!exerciseMatchesOlympicTripleExtension(exercise)) return false;
  const blob = exerciseBlobForOlympic(exercise);
  if (
    /(?:^|_)(bottoms_up|start_stop|waiter|snatch_balance|muscle_snatch|overhead_squat|sots_press|bent_press|tactical|horn_grip)(?:_|$)/.test(
      blob
    ) ||
    /\b(bottoms[\s_]+up|start[\s_-]+stop|waiter\s+clean|snatch\s+balance|sots\s+press|bent\s+press|horn\s+grip)\b/.test(
      blob
    )
  ) {
    return false;
  }
  // Multi-part complexes (clean to thruster / press chains) stay advanced unless hang/power clean staples.
  if (/_to_/.test(blob) && !/\b(hang_power_clean|power_clean|hang_clean)\b/.test(blob)) {
    // Allow simple clean/snatch alone; block clean_to_* chains for non-advanced bypass.
    if (/clean_to_|snatch_to_|jerk_to_/.test(blob)) return false;
  }
  return true;
}

/** Prefer hang/power cleans and high pulls over vague slam/swing proxies when scoring. */
export function olympicTripleExtensionExerciseSelectionScore(exercise: Exercise): number {
  let score = 0;
  if (!exerciseMatchesOlympicTripleExtension(exercise)) return score;
  const blob = exerciseBlobForOlympic(exercise);
  if (/\b(power_clean|hang_power_clean|hang_clean|squat_clean)\b/.test(blob)) score += 14;
  if (/\b(power_snatch|hang_snatch|push_jerk|split_jerk)\b/.test(blob)) score += 12;
  if (/\b(high_pull|dead_clean)\b/.test(blob)) score += 10;
  if (/\b(kettlebell|dumbbell|kb_|db_)\b/.test(blob) && /\b(clean|snatch|jerk)\b/.test(blob)) {
    score += 8;
  }
  if (/\b(jump_squat|box_jump|med_ball_slam|kb_swing)\b/.test(blob)) score -= 8;
  const attrs = new Set((exercise.tags?.attribute_tags ?? []).map(norm));
  if (attrs.has(OLYMPIC_TRIPLE_EXTENSION_SUB_FOCUS_SLUG)) score += 6;
  if (exercise.modality === "power") score += 2;
  return score;
}
