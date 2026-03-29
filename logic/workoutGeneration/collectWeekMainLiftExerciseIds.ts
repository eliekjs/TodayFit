import type { WorkoutBlock } from "./types";

/** Extracts main-strength / hypertrophy / power exercise ids from a generated session (week diversity). */
export function collectWeekMainLiftExerciseIds(session: { blocks: WorkoutBlock[] }): string[] {
  const ids: string[] = [];
  for (const b of session.blocks) {
    if (
      b.block_type !== "main_strength" &&
      b.block_type !== "main_hypertrophy" &&
      b.block_type !== "power"
    )
      continue;
    for (const it of b.items) ids.push(it.exercise_id);
  }
  return ids;
}
