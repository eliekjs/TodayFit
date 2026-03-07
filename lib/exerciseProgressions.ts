import { EXERCISES } from "../data/exercises";
import { isDbConfigured } from "./db";
import { getProgressionsRegressions } from "./db/exerciseRepository";

export type ProgressionsRegressionsOption = { id: string; name: string };

export type ProgressionsRegressions = {
  progressions: ProgressionsRegressionsOption[];
  regressions: ProgressionsRegressionsOption[];
};

/**
 * Get progressions (harder) and regressions (easier) for an exercise.
 * Uses DB when configured, otherwise static EXERCISES data.
 */
export async function getProgressionsRegressionsForExercise(
  exerciseId: string
): Promise<ProgressionsRegressions> {
  if (isDbConfigured()) {
    try {
      return await getProgressionsRegressions(exerciseId);
    } catch {
      return { progressions: [], regressions: [] };
    }
  }
  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  if (!exercise) return { progressions: [], regressions: [] };
  const resolve = (ids: string[] | undefined): ProgressionsRegressionsOption[] =>
    (ids ?? [])
      .map((id) => {
        const ex = EXERCISES.find((e) => e.id === id);
        return ex ? { id: ex.id, name: ex.name } : null;
      })
      .filter((x): x is ProgressionsRegressionsOption => x != null);
  return {
    progressions: resolve(exercise.progressions),
    regressions: resolve(exercise.regressions),
  };
}
