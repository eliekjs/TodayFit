import { EXERCISES } from "../data/exercises";
import type { ExerciseDefinition } from "./types";
import { getSubstitutes } from "./generation/exerciseSubstitution";
import type { ExerciseLike } from "./generation/exerciseSubstitution";
import { isDbConfigured } from "./db";
import { getExercise, getProgressionsRegressions, listExercises } from "./db/exerciseRepository";

export type ProgressionsRegressionsOption = { id: string; name: string };

export type ProgressionsRegressions = {
  progressions: ProgressionsRegressionsOption[];
  regressions: ProgressionsRegressionsOption[];
};

const MIN_SUGGESTIONS = 3;

/** Map ExerciseDefinition to ExerciseLike for getSubstitutes (movement_pattern not on def, use empty). */
function definitionToExerciseLike(def: ExerciseDefinition): ExerciseLike {
  return {
    id: def.id,
    name: def.name,
    movement_pattern: "",
    muscle_groups: def.muscles,
    equipment_required: def.equipment,
    modality: def.modalities[0],
    progressions: def.progressions,
    regressions: def.regressions,
    tags: def.contraindications?.length ? { contraindications: def.contraindications } : undefined,
  };
}

/** Resolve progression/regression ids from static EXERCISES to { id, name } (for fallback when DB has no rows). */
function resolveFromStatic(exerciseId: string): ProgressionsRegressions {
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

/** When DB is configured, pad result with similar exercises from the pool so we return at least MIN_SUGGESTIONS. */
async function fillToAtLeastThree(
  result: ProgressionsRegressions,
  exerciseId: string
): Promise<ProgressionsRegressions> {
  const combined = [...result.regressions, ...result.progressions];
  if (combined.length >= MIN_SUGGESTIONS) return result;
  try {
    const [targetDef, poolDefs] = await Promise.all([
      getExercise(exerciseId),
      listExercises(),
    ]);
    if (!targetDef || !poolDefs?.length) return result;
    const existingIds = new Set(combined.map((x) => x.id));
    const target = definitionToExerciseLike(targetDef);
    const pool = poolDefs.map(definitionToExerciseLike);
    const substitutes = getSubstitutes(target, pool, {
      maxResults: MIN_SUGGESTIONS,
      excludeIds: existingIds,
    });
    const need = MIN_SUGGESTIONS - combined.length;
    const extra = substitutes
      .slice(0, need)
      .map((s) => ({ id: s.exercise.id, name: s.exercise.name }));
    return {
      progressions: result.progressions,
      regressions: [...result.regressions, ...extra],
    };
  } catch {
    return result;
  }
}

/**
 * Get progressions (harder) and regressions (easier) for an exercise.
 * Uses DB when configured, otherwise static EXERCISES data.
 * When DB is configured but returns no rows (e.g. progressions not seeded), falls back to static EXERCISES.
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
      const dbEmpty = res.progressions.length === 0 && res.regressions.length === 0;
      if (dbEmpty) {
        const fallback = resolveFromStatic(exerciseId);
        const staticHasAny = fallback.progressions.length > 0 || fallback.regressions.length > 0;
        if (staticHasAny) {
          // #region agent log
          fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
            body: JSON.stringify({
              sessionId: "305ec8",
              location: "lib/exerciseProgressions.ts:getProgressionsRegressionsForExercise",
              message: "swap DB empty, fallback to static",
              data: {
                exerciseId,
                fallbackProgressions: fallback.progressions.length,
                fallbackRegressions: fallback.regressions.length,
              },
              timestamp: Date.now(),
              hypothesisId: "H4",
            }),
          }).catch(() => {});
          // #endregion
          return fillToAtLeastThree(fallback, exerciseId);
        }
        // Static also empty (e.g. DB-only exercise like "ytw"): suggest similar by muscles/modality from DB pool.
        try {
          const [targetDef, poolDefs] = await Promise.all([
            getExercise(exerciseId),
            listExercises(),
          ]);
          if (!targetDef || !poolDefs?.length) return { progressions: [], regressions: [] };
          const target = definitionToExerciseLike(targetDef);
          const pool = poolDefs.map(definitionToExerciseLike);
          const substitutes = getSubstitutes(target, pool, { maxResults: 5 });
          const similar = substitutes.map((s) => ({ id: s.exercise.id, name: s.exercise.name }));
          // #region agent log
          fetch("http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "305ec8" },
            body: JSON.stringify({
              sessionId: "305ec8",
              location: "lib/exerciseProgressions.ts:getProgressionsRegressionsForExercise",
              message: "swap substitution fallback",
              data: { exerciseId, similarCount: similar.length },
              timestamp: Date.now(),
              hypothesisId: "H4",
            }),
          }).catch(() => {});
          // #endregion
          return fillToAtLeastThree({ progressions: [], regressions: similar }, exerciseId);
        } catch {
          return { progressions: [], regressions: [] };
        }
      }
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
      return fillToAtLeastThree(res, exerciseId);
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
  const result = resolveFromStatic(exerciseId);
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
