/**
 * Phase 5: Superset grouping and formatting.
 * Assigns A, B, C labels and rest-after-pair for superset/alternating blocks.
 */

import type { BlockFormat } from "../types";
import type { GeneratedExerciseSlot } from "../workoutTypes";

const SUPERSET_LABELS = "ABCDEFGH".split("");

/**
 * Assign superset_group (A, B, C...) to exercises in a block.
 * Pairs: A1/A2 = group A, B1/B2 = group B, etc.
 */
export function assignSupersetGroups(
  exercises: GeneratedExerciseSlot[],
  format: BlockFormat
): void {
  if (format !== "superset" && format !== "alternating_sets") return;
  if (exercises.length === 0) return;

  let groupIndex = 0;
  for (let i = 0; i < exercises.length; i += 2) {
    const label = SUPERSET_LABELS[groupIndex] ?? String(groupIndex + 1);
    if (exercises[i].prescription) exercises[i].prescription!.superset_group = label;
    if (i + 1 < exercises.length && exercises[i + 1].prescription) {
      exercises[i + 1].prescription!.superset_group = label;
    }
    groupIndex++;
  }
}

/**
 * Format rest instruction for superset block (e.g. "Rest 60 sec after each pair").
 */
export function formatSupersetRestInstruction(restSeconds: number): string {
  if (restSeconds <= 0) return "";
  if (restSeconds < 60) return `Rest ${restSeconds} sec after each pair`;
  const min = Math.floor(restSeconds / 60);
  return min === 1
    ? "Rest 1 min after each pair"
    : `Rest ${min} min after each pair`;
}
