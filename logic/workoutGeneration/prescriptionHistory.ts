/**
 * Phase 11: Prescription influence from history recommendation.
 * Conservative adjustments only; no aggressive progression jumps.
 */

import type { Recommendation } from "./recommendationLayer";

export type PrescriptionShape = {
  sets: number;
  reps?: number;
  time_seconds?: number;
  rest_seconds: number;
  coaching_cues: string;
};

/**
 * Adjust prescription based on progress/maintain/regress/rotate recommendation.
 * Modest changes only.
 */
export function applyRecommendationToPrescription(
  base: PrescriptionShape,
  recommendation: Recommendation
): PrescriptionShape {
  switch (recommendation) {
    case "progress": {
      const sets = Math.min(base.sets + 1, 6);
      const reps = base.reps != null ? Math.max(4, base.reps + 1) : base.reps;
      return {
        ...base,
        sets: sets > base.sets ? sets : base.sets,
        reps,
        coaching_cues: base.coaching_cues + " Consider slightly more load or one extra rep if form allows.",
      };
    }
    case "regress": {
      const sets = Math.max(1, base.sets - 1);
      const reps = base.reps != null ? Math.max(6, base.reps - 2) : base.reps;
      return {
        ...base,
        sets,
        reps,
        rest_seconds: Math.min(base.rest_seconds + 15, 180),
        coaching_cues: base.coaching_cues + " Prioritize form; reduce load if needed.",
      };
    }
    case "rotate":
      return { ...base };
    case "maintain":
    default:
      return { ...base };
  }
}
