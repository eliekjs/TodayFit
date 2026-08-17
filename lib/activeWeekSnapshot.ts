import type { ExecutionProgress, GeneratedWorkout, ManualWeekPlan } from "./types";
import type { PlanWeekResult } from "../services/sportPrepPlanner";

/**
 * The week the user is currently training, plus any session mid-execution.
 * Persisted locally so the Workout tab survives an app restart — everything here
 * used to be in-memory only and was lost on cold start.
 */
export type ActiveWeekSnapshot = {
  version: 1;
  savedAt: number;
  manualWeekPlan: ManualWeekPlan | null;
  sportPrepWeekPlan: PlanWeekResult | null;
  generatedWorkout: GeneratedWorkout | null;
  manualSessionProgress: ExecutionProgress | null;
  manualExecutionStarted: boolean;
};

export const ACTIVE_WEEK_SNAPSHOT_VERSION = 1;

/** Abandoned plans should not resurface months later. */
export const ACTIVE_WEEK_MAX_AGE_DAYS = 28;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ActiveWeekSnapshotInput = {
  manualWeekPlan: ManualWeekPlan | null;
  sportPrepWeekPlan: PlanWeekResult | null;
  generatedWorkout: GeneratedWorkout | null;
  manualSessionProgress: ExecutionProgress | null;
  manualExecutionStarted: boolean;
};

/** Nothing to restore: no plan and no session in flight. */
export function activeWeekInputIsEmpty(input: ActiveWeekSnapshotInput): boolean {
  const hasManualWeek = (input.manualWeekPlan?.days.length ?? 0) > 0;
  const hasSportWeek = (input.sportPrepWeekPlan?.days.length ?? 0) > 0;
  return !hasManualWeek && !hasSportWeek && input.generatedWorkout == null;
}

export function buildActiveWeekSnapshot(
  input: ActiveWeekSnapshotInput,
  nowMs: number = Date.now()
): ActiveWeekSnapshot | null {
  if (activeWeekInputIsEmpty(input)) return null;
  return {
    version: ACTIVE_WEEK_SNAPSHOT_VERSION,
    savedAt: nowMs,
    manualWeekPlan: input.manualWeekPlan,
    sportPrepWeekPlan: input.sportPrepWeekPlan,
    generatedWorkout: input.generatedWorkout,
    manualSessionProgress: input.manualSessionProgress,
    // Only meaningful alongside a workout; a bare flag would resume into nothing.
    manualExecutionStarted:
      input.manualExecutionStarted && input.generatedWorkout != null,
  };
}

function isPlanShape(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== "object") return false;
  const days = (value as { days?: unknown }).days;
  return Array.isArray(days);
}

export function parseActiveWeekSnapshot(
  raw: unknown,
  nowMs: number = Date.now()
): ActiveWeekSnapshot | null {
  if (raw == null || typeof raw !== "object") return null;
  const candidate = raw as Partial<ActiveWeekSnapshot>;
  if (candidate.version !== ACTIVE_WEEK_SNAPSHOT_VERSION) return null;
  if (typeof candidate.savedAt !== "number" || !Number.isFinite(candidate.savedAt)) return null;
  if (nowMs - candidate.savedAt > ACTIVE_WEEK_MAX_AGE_DAYS * MS_PER_DAY) return null;
  if (!isPlanShape(candidate.manualWeekPlan)) return null;
  if (!isPlanShape(candidate.sportPrepWeekPlan)) return null;

  const input: ActiveWeekSnapshotInput = {
    manualWeekPlan: candidate.manualWeekPlan ?? null,
    sportPrepWeekPlan: candidate.sportPrepWeekPlan ?? null,
    generatedWorkout: candidate.generatedWorkout ?? null,
    manualSessionProgress: candidate.manualSessionProgress ?? null,
    manualExecutionStarted: candidate.manualExecutionStarted === true,
  };
  if (activeWeekInputIsEmpty(input)) return null;
  return { ...input, version: ACTIVE_WEEK_SNAPSHOT_VERSION, savedAt: candidate.savedAt };
}
