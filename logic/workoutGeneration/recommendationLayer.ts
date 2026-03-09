/**
 * Phase 11: Progress / maintain / regress / rotate recommendation layer.
 * Rule-based and explainable. No AI; driven by exposure, completion, fatigue, optional performance.
 */

import type { Exercise } from "./types";
import type { TrainingHistoryContext } from "./historyTypes";
import { getCanonicalExerciseRole, getCanonicalMovementFamilies } from "./ontologyNormalization";
import { getExerciseExposureCount } from "./historyScoring";

export type Recommendation = "progress" | "maintain" | "regress" | "rotate";

export type RecommendationResult = {
  recommendation: Recommendation;
  reason: string;
};

const ANCHOR_ROLES = new Set(["main_compound", "secondary_compound"]);
const ACCESSORY_ROLES = new Set(["accessory", "isolation"]);

/**
 * Decide progress / maintain / regress / rotate for a selected exercise.
 * Conservative; explainable.
 */
export function getRecommendation(
  exercise: Exercise,
  blockType: string | undefined,
  historyContext: TrainingHistoryContext | undefined,
  options: {
    /** Exercise was in recent sessions (e.g. from recentIds). */
    wasRecentlyUsed?: boolean;
    /** Last performance: completed well (true), poorly/failed (false), unknown (undefined). */
    lastCompletionSuccess?: boolean;
    /** User readiness suggests lighter work. */
    preferLighter?: boolean;
  } = {}
): RecommendationResult {
  const role = getCanonicalExerciseRole({
    id: exercise.id,
    exercise_role: exercise.exercise_role,
  });
  const exposureCount = getExerciseExposureCount(exercise.id, historyContext);
  const bt = blockType?.toLowerCase().replace(/\s/g, "_") ?? "";
  const isMainBlock = bt === "main_strength" || bt === "main_hypertrophy";

  if (options.preferLighter) {
    return { recommendation: "regress", reason: "readiness_prefer_lighter" };
  }

  if (historyContext?.completion_signal?.last_skipped) {
    return { recommendation: "maintain", reason: "last_session_skipped" };
  }

  if (role && ANCHOR_ROLES.has(role) && isMainBlock) {
    if (options.lastCompletionSuccess === false) {
      return { recommendation: "regress", reason: "anchor_last_poor_completion" };
    }
    if (options.wasRecentlyUsed && exposureCount <= 2 && options.lastCompletionSuccess !== false) {
      return { recommendation: "progress", reason: "anchor_repeat_progression" };
    }
    if (options.wasRecentlyUsed && exposureCount >= 2) {
      return { recommendation: "maintain", reason: "anchor_recent_maintain" };
    }
    return { recommendation: "maintain", reason: "anchor_default" };
  }

  if (role && ACCESSORY_ROLES.has(role)) {
    if (exposureCount >= 4) {
      return { recommendation: "rotate", reason: "accessory_overused" };
    }
    if (options.wasRecentlyUsed && exposureCount >= 2) {
      return { recommendation: "rotate", reason: "accessory_recent_repeat" };
    }
    return { recommendation: "maintain", reason: "accessory_default" };
  }

  return { recommendation: "maintain", reason: "default" };
}
