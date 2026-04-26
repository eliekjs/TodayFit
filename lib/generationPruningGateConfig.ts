/**
 * App defaults for phase-6 pruning gate (GenerateWorkoutInput.pruning_gate).
 * Toggle via EXPO_PUBLIC_* for staged rollout; defaults keep gating off.
 */

import {
  DEFAULT_PRUNING_GATE_FLAGS,
  type PruningGateFeatureFlags,
} from "../logic/exerciseLibraryCuration/generatorEligibilityTypes";
import type { WorkoutTierPreference } from "./types";

function readPublicEnvBool(name: string): boolean | undefined {
  try {
    const env = typeof process !== "undefined" ? process.env?.[name] : undefined;
    if (env === "1" || env === "true") return true;
    if (env === "0" || env === "false") return false;
  } catch {
    /* ignore */
  }
  return undefined;
}

function tierDefaultPruningFlags(
  workoutTier: WorkoutTierPreference | undefined
): PruningGateFeatureFlags {
  if (workoutTier === "advanced") {
    return {
      enable_pruning_gating: true,
      allow_niche_exercises: true,
      allow_review_exercises: true,
    };
  }
  if (workoutTier === "intermediate") {
    return {
      enable_pruning_gating: true,
      allow_niche_exercises: true,
      allow_review_exercises: false,
    };
  }
  // Beginner/intermediate: smaller, simpler pool (core-only by default).
  return {
    enable_pruning_gating: true,
    allow_niche_exercises: false,
    allow_review_exercises: false,
  };
}

/** Resolved once per call site; merges env overrides with tier defaults. */
export function getGenerationPruningGateFlags(
  workoutTier?: WorkoutTierPreference
): PruningGateFeatureFlags {
  const enable = readPublicEnvBool("EXPO_PUBLIC_ENABLE_PRUNING_GATING");
  const niche = readPublicEnvBool("EXPO_PUBLIC_ALLOW_NICHE_EXERCISES");
  const review = readPublicEnvBool("EXPO_PUBLIC_ALLOW_REVIEW_EXERCISES");
  const tierDefaults = tierDefaultPruningFlags(workoutTier);
  return {
    enable_pruning_gating:
      enable ??
      tierDefaults.enable_pruning_gating ??
      DEFAULT_PRUNING_GATE_FLAGS.enable_pruning_gating,
    allow_niche_exercises:
      niche ??
      tierDefaults.allow_niche_exercises ??
      DEFAULT_PRUNING_GATE_FLAGS.allow_niche_exercises,
    allow_review_exercises:
      review ??
      tierDefaults.allow_review_exercises ??
      DEFAULT_PRUNING_GATE_FLAGS.allow_review_exercises,
  };
}
