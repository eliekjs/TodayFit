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
  // #region agent log
  const dbConfigured = isDbConfigured();
  fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
    body: JSON.stringify({
      sessionId: "305ec8",
      location: "lib/exerciseProgressions.ts:getProgressionsRegressionsForExercise",
      message: "swap getProgressionsRegressionsForExercise entry",
      data: { exerciseId, isDbConfigured: dbConfigured },
      timestamp: Date.now(),
      hypothesisId: "H1-H2",
    }),
  }).catch(() => {});
  // #endregion
  if (dbConfigured) {
    try {
      const res = await getProgressionsRegressions(exerciseId);
      // #region agent log
      fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
        body: JSON.stringify({
          sessionId: "305ec8",
          location: "lib/exerciseProgressions.ts:getProgressionsRegressionsForExercise",
          message: "swap DB path result",
          data: {
            exerciseId,
            source: "db",
            progressionsCount: res.progressions.length,
            regressionsCount: res.regressions.length,
          },
          timestamp: Date.now(),
          hypothesisId: "H4-H5",
        }),
      }).catch(() => {});
      // #endregion
      return res;
    } catch (err) {
      // #region agent log
      fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
        body: JSON.stringify({
          sessionId: "305ec8",
          location: "lib/exerciseProgressions.ts:getProgressionsRegressionsForExercise",
          message: "swap DB path threw",
          data: { exerciseId, error: String(err) },
          timestamp: Date.now(),
          hypothesisId: "H1",
        }),
      }).catch(() => {});
      // #endregion
      return { progressions: [], regressions: [] };
    }
  }
  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  if (!exercise) {
    // #region agent log
    fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
      body: JSON.stringify({
        sessionId: "305ec8",
        location: "lib/exerciseProgressions.ts:getProgressionsRegressionsForExercise",
        message: "swap static path exercise not in EXERCISES",
        data: { exerciseId },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
    // #endregion
    return { progressions: [], regressions: [] };
  }
  const resolve = (ids: string[] | undefined): ProgressionsRegressionsOption[] =>
    (ids ?? [])
      .map((id) => {
        const ex = EXERCISES.find((e) => e.id === id);
        return ex ? { id: ex.id, name: ex.name } : null;
      })
      .filter((x): x is ProgressionsRegressionsOption => x != null);
  const result = {
    progressions: resolve(exercise.progressions),
    regressions: resolve(exercise.regressions),
  };
  // #region agent log
  fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
    body: JSON.stringify({
      sessionId: "305ec8",
      location: "lib/exerciseProgressions.ts:getProgressionsRegressionsForExercise",
      message: "swap static path result",
      data: {
        exerciseId,
        progressionsCount: result.progressions.length,
        regressionsCount: result.regressions.length,
      },
      timestamp: Date.now(),
      hypothesisId: "H2-H5",
    }),
  }).catch(() => {});
  // #endregion
  return result;
}
