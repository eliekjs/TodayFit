/**
 * App defaults for phase-6 pruning gate (GenerateWorkoutInput.pruning_gate).
 * Toggle via EXPO_PUBLIC_* for staged rollout; defaults keep gating off.
 */

import {
  DEFAULT_PRUNING_GATE_FLAGS,
  type PruningGateFeatureFlags,
} from "../logic/exerciseLibraryCuration/generatorEligibilityTypes";

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

/** Resolved once per call site; merges env overrides with defaults. */
export function getGenerationPruningGateFlags(): PruningGateFeatureFlags {
  const enable = readPublicEnvBool("EXPO_PUBLIC_ENABLE_PRUNING_GATING");
  const niche = readPublicEnvBool("EXPO_PUBLIC_ALLOW_NICHE_EXERCISES");
  const review = readPublicEnvBool("EXPO_PUBLIC_ALLOW_REVIEW_EXERCISES");
  return {
    enable_pruning_gating: enable ?? DEFAULT_PRUNING_GATE_FLAGS.enable_pruning_gating,
    allow_niche_exercises: niche ?? DEFAULT_PRUNING_GATE_FLAGS.allow_niche_exercises,
    allow_review_exercises: review ?? DEFAULT_PRUNING_GATE_FLAGS.allow_review_exercises,
  };
}
