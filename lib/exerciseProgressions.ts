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

/** Derive energy_fit from tags array (e.g. from DB tag slugs). */
function energyFitFromTags(tags: string[] | undefined): ("low" | "medium" | "high")[] | undefined {
  if (!tags?.length) return undefined;
  const out: ("low" | "medium" | "high")[] = [];
  if (tags.includes("energy_low")) out.push("low");
  if (tags.includes("energy_medium")) out.push("medium");
  if (tags.includes("energy_high")) out.push("high");
  return out.length ? out : undefined;
}

/** Map ExerciseDefinition to ExerciseLike for getSubstitutes (movement_pattern not on def, use empty). */
function definitionToExerciseLike(def: ExerciseDefinition): ExerciseLike {
  const tags = Array.isArray(def.tags) ? def.tags : [];
  const energy_fit = energyFitFromTags(tags);
  return {
    id: def.id,
    name: def.name,
    movement_pattern: "",
    muscle_groups: def.muscles,
    equipment_required: def.equipment,
    modality: def.modalities?.[0],
    progressions: def.progressions,
    regressions: def.regressions,
    tags: def.contraindications?.length ? { contraindications: def.contraindications } : undefined,
    energy_fit,
  };
}

export type ProgressionsRegressionsOptions = {
  /** When provided, suggested substitutes are filtered to match this energy (e.g. low → no high-only). */
  energyLevel?: "low" | "medium" | "high";
};

/** When DB is configured, pad result with similar exercises from the pool so we return at least MIN_SUGGESTIONS. */
async function fillToAtLeastThree(
  result: ProgressionsRegressions,
  exerciseId: string,
  options?: ProgressionsRegressionsOptions
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
      energyLevel: options?.energyLevel,
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
 * Uses the database (single source of truth). When Supabase is not configured, returns empty.
 * When DB has no progressions/regressions for the exercise, suggests similar exercises from the catalog.
 * Optional energyLevel filters suggested substitutes to match session energy (e.g. low → no high-only).
 */
export async function getProgressionsRegressionsForExercise(
  exerciseId: string,
  options?: ProgressionsRegressionsOptions
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
        // No progressions/regressions in DB: suggest similar exercises from catalog (single source = DB).
        try {
          const [targetDef, poolDefs] = await Promise.all([
            getExercise(exerciseId),
            listExercises(),
          ]);
          if (!targetDef || !poolDefs?.length) return { progressions: [], regressions: [] };
          const target = definitionToExerciseLike(targetDef);
          const pool = poolDefs.map(definitionToExerciseLike);
          const substitutes = getSubstitutes(target, pool, { maxResults: 5, energyLevel: options?.energyLevel });
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
          return fillToAtLeastThree({ progressions: [], regressions: similar }, exerciseId, options);
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
      return fillToAtLeastThree(res, exerciseId, options);
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
  // Single source = DB; when Supabase is not configured, no progressions/regressions.
  return { progressions: [], regressions: [] };
}
