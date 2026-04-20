/**
 * Manual week: distribute minimum sub-focus exercise matches across training days (default 3 per sub-goal for the week).
 */

import type { ManualPreferences, GeneratedWorkout } from "../../lib/types";
import { resolveGoalSubFocusSlugs } from "../../data/goalSubFocus";
import type { Exercise } from "./types";
import { exerciseMatchesGoalSubFocusSlugUnified } from "./subFocusSlugMatch";

export type WeeklySubFocusKey = { goalSlug: string; subSlug: string };

export function buildWeeklySubFocusKeysFromPreferences(prefs: ManualPreferences): WeeklySubFocusKey[] {
  const seen = new Set<string>();
  const out: WeeklySubFocusKey[] = [];
  for (const [label, subs] of Object.entries(prefs.subFocusByGoal ?? {})) {
    if (!subs?.length) continue;
    const { goalSlug, subFocusSlugs } = resolveGoalSubFocusSlugs(label, subs);
    if (!goalSlug || !subFocusSlugs.length) continue;
    for (const subSlug of subFocusSlugs) {
      const k = `${goalSlug}:${subSlug}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ goalSlug, subSlug });
    }
  }
  return out;
}

/**
 * Minimum exercises matching each sub-focus that should appear in THIS session (ceil of remaining need / days left).
 */
export function computeWeeklySubFocusSessionMinimums(input: {
  matchCountsSoFar: Record<string, number>;
  trainingDayIndex: number;
  trainingDaysTotal: number;
  targetPerSubFocus: number;
  keys: WeeklySubFocusKey[];
}): Record<string, number> {
  const { matchCountsSoFar, trainingDayIndex, trainingDaysTotal, targetPerSubFocus, keys } = input;
  const daysRemaining = trainingDaysTotal - trainingDayIndex;
  if (daysRemaining <= 0 || keys.length === 0) return {};
  const out: Record<string, number> = {};
  for (const { goalSlug, subSlug } of keys) {
    const composite = `${goalSlug}:${subSlug}`;
    const soFar = matchCountsSoFar[composite] ?? 0;
    const need = Math.max(0, targetPerSubFocus - soFar);
    if (need <= 0) continue;
    const minToday = Math.ceil(need / daysRemaining);
    if (minToday > 0) out[composite] = minToday;
  }
  return out;
}

function collectTrainingExerciseIdsFromGeneratedWorkout(workout: GeneratedWorkout): string[] {
  const ids: string[] = [];
  for (const block of workout.blocks) {
    if (block.block_type === "warmup" || block.block_type === "cooldown") continue;
    for (const item of block.items) {
      ids.push(item.exercise_id);
    }
  }
  return ids;
}

/** Increment weekly counts: each training exercise counts once per sub-focus key it matches. */
export function accumulateWeeklySubFocusCountsFromGeneratedWorkout(
  counts: Record<string, number>,
  workout: GeneratedWorkout,
  exerciseById: Map<string, Exercise>,
  keys: WeeklySubFocusKey[]
): void {
  if (keys.length === 0) return;
  for (const id of collectTrainingExerciseIdsFromGeneratedWorkout(workout)) {
    const ex = exerciseById.get(id);
    if (!ex) continue;
    for (const { goalSlug, subSlug } of keys) {
      if (exerciseMatchesGoalSubFocusSlugUnified(ex, goalSlug, subSlug)) {
        const composite = `${goalSlug}:${subSlug}`;
        counts[composite] = (counts[composite] ?? 0) + 1;
      }
    }
  }
}
