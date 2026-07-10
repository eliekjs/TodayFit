/**
 * Maps app session state (completed history, saved/in-progress workouts) to Phase 11
 * `TrainingHistoryContext` for `generateWorkoutAsync` / `manualPreferencesToGenerateWorkoutInput`.
 */

import type {
  ExecutionProgress,
  GeneratedWorkout,
  SavedWorkout,
  WorkoutHistoryItem,
} from "./types";
import { collectWorkoutExerciseIds } from "./workoutUtils";
import type {
  RecentSessionRecord,
  TrainingHistoryContext,
} from "../logic/workoutGeneration/historyTypes";
import { buildRollingTrainingHistory } from "../logic/workoutIntelligence/weekly/weeklyDailyGeneratorBridge";

const MAX_RECENT_SESSIONS = 12;

export type AppHistorySources = {
  workoutHistory?: WorkoutHistoryItem[];
  savedWorkouts?: SavedWorkout[];
  inProgressWorkout?: GeneratedWorkout | null;
  inProgressProgress?: ExecutionProgress | null;
  /** Workouts generated earlier in the same batch (e.g. manual week loop). */
  priorBatchSessions?: GeneratedWorkout[];
  regenerationAvoidExerciseIds?: string[];
};

function primaryModalityFromWorkout(workout: GeneratedWorkout): string {
  const focus = workout.focus?.[0];
  if (!focus) return "strength";
  return focus.toLowerCase().replace(/\s+/g, "_");
}

function performanceFromProgress(
  workout: GeneratedWorkout,
  progress: ExecutionProgress | null | undefined
): RecentSessionRecord["performance_by_exercise"] | undefined {
  if (!progress || Object.keys(progress).length === 0) return undefined;
  const ids = collectWorkoutExerciseIds(workout);
  const out: NonNullable<RecentSessionRecord["performance_by_exercise"]> = {};
  for (const id of ids) {
    const p = progress[id];
    if (!p) continue;
    const rows = p.sets;
    if (rows && rows.length > 0) {
      const last = rows[rows.length - 1]!;
      out[id] = {
        completed_sets: rows.length,
        reps: last.reps,
        load_kg: last.load_kg,
      };
    } else {
      out[id] = {
        completed_sets: p.setsCompleted,
      };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sessionFromGeneratedWorkout(
  workout: GeneratedWorkout,
  opts: {
    completed_at?: string;
    completed?: boolean;
    progress?: ExecutionProgress | null;
  } = {}
): RecentSessionRecord {
  const exercise_ids = collectWorkoutExerciseIds(workout);
  const allDone =
    opts.progress != null &&
    exercise_ids.length > 0 &&
    exercise_ids.every((id) => opts.progress![id]?.completed === true);
  let completed = opts.completed;
  if (completed == null) {
    if (opts.progress != null) completed = allDone;
    else completed = true;
  }
  return {
    exercise_ids,
    modality: primaryModalityFromWorkout(workout),
    completed_at: opts.completed_at,
    completed,
    performance_by_exercise: performanceFromProgress(workout, opts.progress),
  };
}

function summariesFromWorkouts(workouts: GeneratedWorkout[]): {
  exercise_ids: string[];
  muscle_groups: string[];
  modality: string;
}[] {
  return workouts.map((w) => ({
    exercise_ids: collectWorkoutExerciseIds(w),
    muscle_groups: [],
    modality: primaryModalityFromWorkout(w),
  }));
}

/** Merge regeneration-avoid IDs into history (legacy recent_history path + exposure). */
export function mergeRegenerationAvoidIntoHistory(
  base: TrainingHistoryContext | undefined,
  avoidIds: string[] | undefined
): TrainingHistoryContext | undefined {
  const ids = avoidIds?.filter(Boolean) ?? [];
  if (ids.length === 0) return base;
  const avoidSession: RecentSessionRecord = {
    exercise_ids: ids,
    modality: "regeneration_penalty",
    completed: true,
  };
  if (!base) {
    return {
      recent_sessions: [avoidSession],
      recently_used_exercise_ids: [...new Set(ids)],
      exposure: {
        by_exercise: Object.fromEntries(ids.map((id) => [id, 2])),
      },
    };
  }
  const recent_sessions = [avoidSession, ...(base.recent_sessions ?? [])];
  const recently_used_exercise_ids = [
    ...new Set([...ids, ...(base.recently_used_exercise_ids ?? [])]),
  ];
  const by_exercise = { ...(base.exposure?.by_exercise ?? {}) };
  for (const id of ids) {
    by_exercise[id] = Math.max(by_exercise[id] ?? 0, 2) + 1;
  }
  return {
    ...base,
    recent_sessions,
    recently_used_exercise_ids,
    exposure: { ...base.exposure, by_exercise },
  };
}

/**
 * Build training history from app state for the daily generator.
 */
export function buildAppTrainingHistory(sources: AppHistorySources): TrainingHistoryContext | undefined {
  const sessions: RecentSessionRecord[] = [];
  const lastPerformed: Record<string, string> = {};

  const history = sources.workoutHistory ?? [];
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  for (const item of sortedHistory.slice(0, MAX_RECENT_SESSIONS)) {
    if (!item.workout) continue;
    const rec = sessionFromGeneratedWorkout(item.workout, {
      completed_at: item.date,
      completed: true,
    });
    sessions.push(rec);
    for (const id of rec.exercise_ids) {
      if (!lastPerformed[id]) lastPerformed[id] = item.date;
    }
  }

  for (const saved of sources.savedWorkouts ?? []) {
    sessions.push(
      sessionFromGeneratedWorkout(saved.workout, {
        completed_at: saved.savedAt,
        completed: false,
        progress: saved.progress,
      })
    );
  }

  if (sources.inProgressWorkout) {
    sessions.unshift(
      sessionFromGeneratedWorkout(sources.inProgressWorkout, {
        completed_at: new Date().toISOString(),
        completed: false,
        progress: sources.inProgressProgress ?? undefined,
      })
    );
  }

  for (const w of sources.priorBatchSessions ?? []) {
    sessions.unshift(sessionFromGeneratedWorkout(w, { completed: true }));
  }

  const cappedSessions = sessions.slice(0, MAX_RECENT_SESSIONS);
  const batchSummaries = summariesFromWorkouts([
    ...(sources.priorBatchSessions ?? []),
    ...sortedHistory
      .filter((h) => h.workout)
      .map((h) => h.workout!)
      .slice(0, MAX_RECENT_SESSIONS),
  ]);

  let ctx: TrainingHistoryContext | undefined =
    cappedSessions.length > 0 || batchSummaries.length > 0
      ? {
          ...(batchSummaries.length > 0
            ? buildRollingTrainingHistory(batchSummaries)
            : {}),
          recent_sessions: cappedSessions,
          recently_used_exercise_ids: [
            ...new Set(cappedSessions.flatMap((s) => s.exercise_ids)),
          ],
          last_performed_by_exercise:
            Object.keys(lastPerformed).length > 0 ? lastPerformed : undefined,
        }
      : undefined;

  const completedCount = cappedSessions.filter((s) => s.completed !== false).length;
  const skipped = cappedSessions[0]?.completed === false;
  if (ctx && cappedSessions.length > 0) {
    ctx = {
      ...ctx,
      completion_signal: {
        recent_completion_rate:
          cappedSessions.length > 0 ? completedCount / cappedSessions.length : undefined,
        last_skipped: skipped,
      },
    };
  }

  return mergeRegenerationAvoidIntoHistory(
    ctx,
    sources.regenerationAvoidExerciseIds
  );
}
