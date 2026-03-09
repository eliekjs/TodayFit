/**
 * Phase 11: History input contract for progression, regression, and personalization.
 * All fields optional so generation works without history.
 * App can populate from backend when available.
 */

/** Single recent session (richer than RecentSessionSummary). */
export type RecentSessionRecord = {
  /** Exercise IDs performed (order preserved). */
  exercise_ids: string[];
  /** Muscle groups trained (aggregate). */
  muscle_groups?: string[];
  modality?: string;
  /** ISO date or YYYY-MM-DD. */
  completed_at?: string;
  /** Session was completed (true) or skipped/abandoned (false). */
  completed?: boolean;
  /** Optional: set/rep/load/RPE per exercise (by exercise_id). */
  performance_by_exercise?: Record<
    string,
    {
      sets?: number;
      reps?: number;
      load_kg?: number;
      rpe?: number;
      completed_sets?: number;
    }
  >;
};

/** Exposure counts for personalization (exercise, family, region). */
export type ExerciseExposure = {
  /** Exercise ID -> number of sessions it appeared in (over a window). */
  by_exercise?: Record<string, number>;
  /** Movement family -> count of sessions that included that family. */
  by_movement_family?: Record<string, number>;
  /** Fatigue region -> count. */
  by_fatigue_region?: Record<string, number>;
  /** Body region (e.g. upper_push, lower_body) -> count. */
  by_body_region?: Record<string, number>;
};

/** Last performed date per exercise (ISO date). */
export type LastPerformedMap = Record<string, string>;

/** Optional subjective/soreness signals (e.g. from user check-in). */
export type ReadinessSignals = {
  /** Overall readiness 1–10 (higher = more ready). */
  overall_readiness?: number;
  /** Sore/fatigued body regions (canonical slugs). */
  sore_regions?: string[];
  /** Prefer lower volume today. */
  prefer_lighter?: boolean;
};

/**
 * Full history context for the generator.
 * When absent or empty, generator behaves as before (no history-aware scoring).
 */
export type TrainingHistoryContext = {
  /** Recent sessions (most recent first). Replaces or supplements recent_history for richer use. */
  recent_sessions?: RecentSessionRecord[];
  /** Recently used exercise IDs (e.g. last N sessions). Used for variety penalty. */
  recently_used_exercise_ids?: string[];
  /** Exposure counts over a window (e.g. last 2–4 weeks). */
  exposure?: ExerciseExposure;
  /** Last performed date per exercise ID. */
  last_performed_by_exercise?: LastPerformedMap;
  /** Optional performance/set-rep-load-RPE for progression decisions. */
  recent_performance?: Record<
    string,
    { sets?: number; reps?: number; load_kg?: number; rpe?: number; completed_sets?: number }
  >;
  /** Optional: completion rate or skipped-workout signal. */
  completion_signal?: {
    /** Fraction of recent sessions completed (0–1). */
    recent_completion_rate?: number;
    /** Last session was skipped. */
    last_skipped?: boolean;
  };
  /** Optional soreness/readiness for regress or lighter prescription. */
  readiness?: ReadinessSignals;
};

/** Build minimal recently_used_exercise_ids from legacy recent_history. */
export function recentHistoryToRecentIds(
  recent_history: { exercise_ids: string[] }[] | undefined
): string[] {
  if (!recent_history?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of recent_history) {
    for (const id of h.exercise_ids ?? []) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/** Build TrainingHistoryContext from legacy input.recent_history only (no backend). */
export function buildHistoryContextFromLegacy(input: {
  recent_history?: { exercise_ids: string[]; muscle_groups?: string[]; modality?: string }[];
}): TrainingHistoryContext | undefined {
  const history = input.recent_history;
  if (!history?.length) return undefined;
  const recent_sessions: RecentSessionRecord[] = history.map((h) => ({
    exercise_ids: h.exercise_ids ?? [],
    muscle_groups: h.muscle_groups,
    modality: h.modality,
    completed: true,
  }));
  return {
    recent_sessions,
    recently_used_exercise_ids: recentHistoryToRecentIds(history),
  };
}
