/**
 * Phase 6: Resolve weekly training priorities from goals, sports, and days available.
 * Produces a normalized weekly demand profile (quality -> weight 0–1).
 */

import type { TrainingQualitySlug } from "../trainingQualities";
import type { WeeklyPlanningInput, WeeklyDemandProfile } from "./weeklyTypes";
import { mergeTargetVector } from "../targetVector";

/**
 * Resolve weekly training priorities from user input.
 * Uses existing goal + sport target vector merge; optional direct target_training_qualities override.
 * Output is normalized so max weight is 1 (relative emphasis preserved).
 */
export function resolveWeeklyDemand(input: WeeklyPlanningInput): WeeklyDemandProfile {
  if (
    input.target_training_qualities &&
    Object.keys(input.target_training_qualities).length > 0
  ) {
    return normalizeDemandProfile(input.target_training_qualities);
  }

  const allGoals = [
    input.primary_goal,
    ...(input.secondary_goals ?? []),
    ...(input.tertiary_goals ?? []),
  ].filter(Boolean);

  const targetVector = mergeTargetVector({
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals?.length ? input.secondary_goals : undefined,
    sport_slugs: input.sports,
    sport_sub_focus: input.sport_sub_focus,
    goal_weights: [0.6, 0.3, 0.1].slice(0, Math.max(1, allGoals.length)),
    sport_weight: input.sports?.length ? 0.5 : 0,
  });

  const profile: WeeklyDemandProfile = {};
  targetVector.forEach((weight, quality) => {
    if (weight > 0) profile[quality] = weight;
  });

  return normalizeDemandProfile(profile);
}

/** Normalize a demand profile so the maximum weight is 1. */
function normalizeDemandProfile(
  raw: Partial<Record<TrainingQualitySlug, number>>
): WeeklyDemandProfile {
  let max = 0;
  for (const v of Object.values(raw)) {
    if (typeof v === "number" && v > max) max = v;
  }
  if (max <= 0) return raw as WeeklyDemandProfile;
  const out: WeeklyDemandProfile = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number") out[k as TrainingQualitySlug] = v / max;
  }
  return out;
}

/**
 * Classify demand level for a quality (for allocation heuristics).
 * high >= 0.7, moderate >= 0.35, low > 0.
 */
export function demandLevel(
  profile: WeeklyDemandProfile,
  quality: TrainingQualitySlug
): "high" | "moderate" | "low" | "none" {
  const w = profile[quality] ?? 0;
  if (w >= 0.7) return "high";
  if (w >= 0.35) return "moderate";
  if (w > 0) return "low";
  return "none";
}

/** Check if the profile has significant emphasis on climbing-related qualities. */
export function hasClimbingDemand(profile: WeeklyDemandProfile): boolean {
  const climbingQualities: TrainingQualitySlug[] = [
    "pulling_strength",
    "grip_strength",
    "lockoff_strength",
    "scapular_stability",
    "forearm_endurance",
  ];
  return climbingQualities.some((q) => (profile[q] ?? 0) >= 0.4);
}

/** Check if the profile has significant emphasis on lower-body / ski-style demands. */
export function hasLowerEccentricDemand(profile: WeeklyDemandProfile): boolean {
  const lowerQualities: TrainingQualitySlug[] = [
    "eccentric_strength",
    "unilateral_strength",
    "hip_stability",
    "posterior_chain_endurance",
    "quad_hypertrophy",
  ];
  return lowerQualities.some((q) => (profile[q] ?? 0) >= 0.4);
}

/** Check if primary goal is hypertrophy (for session mix). */
export function isPrimaryHypertrophy(input: WeeklyPlanningInput): boolean {
  const g = input.primary_goal.toLowerCase().replace(/\s/g, "_");
  return g === "hypertrophy" || g === "physique" || g === "body_recomp" || g === "muscle";
}
