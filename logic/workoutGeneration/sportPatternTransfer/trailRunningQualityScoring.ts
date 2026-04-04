/**
 * Trail-running within-pool quality — delegates to running family (`trail_running` kind).
 */

import type { Exercise } from "../types";
import {
  addExerciseToRunningSessionCounts,
  computeRunningEmphasisBucket,
  computeRunningWithinPoolQualityScore,
  isSignatureRunningMovement,
  type RunningFamilyQualityBreakdown,
} from "./runningFamily/runningQualityScoring";
import type { RunningFamilyQualityContext } from "./runningFamily/runningQualityScoring";

export type TrailRunningQualityScoreContext = RunningFamilyQualityContext;

export type TrailRunningQualityScoreBreakdown = RunningFamilyQualityBreakdown;

export function computeTrailRunningEmphasisBucket(seed: number): number {
  return computeRunningEmphasisBucket(seed, "trail_running");
}

export function isSignatureTrailMovement(ex: Exercise): boolean {
  return isSignatureRunningMovement(ex, "trail_running");
}

export { isTrailForwardSteppingLungePattern } from "./runningFamily/runningQualityScoring";

export function addExerciseToTrailRunningSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  addExerciseToRunningSessionCounts(ex, counts, "trail_running");
}

export function computeTrailRunningWithinPoolQualityScore(
  ex: Exercise,
  ctx: TrailRunningQualityScoreContext
): TrailRunningQualityScoreBreakdown {
  return computeRunningWithinPoolQualityScore(ex, ctx, "trail_running");
}
