/**
 * Filter exercise ids by phase-6 eligibility + feature flags (no side effects).
 */

import type { ExerciseEligibilityEntry, PruningGateFeatureFlags } from "./generatorEligibilityTypes";

/**
 * Returns true if the exercise id should be included in the gated generator pool.
 */
export function exercisePassesPruningGate(
  exerciseId: string,
  eligibilityById: Map<string, ExerciseEligibilityEntry>,
  flags: PruningGateFeatureFlags
): boolean {
  if (!flags.enable_pruning_gating) {
    return true;
  }
  const e = eligibilityById.get(exerciseId);
  if (!e) {
    return false;
  }
  switch (e.eligibility_state) {
    case "eligible_core":
      return true;
    case "eligible_niche":
      return flags.allow_niche_exercises;
    case "excluded_review":
      return flags.allow_review_exercises;
    case "excluded_merged":
    case "excluded_removed":
    case "excluded_unknown":
      return false;
  }
}

export function filterExerciseIdsByEligibility(
  exerciseIds: string[],
  eligibilityById: Map<string, ExerciseEligibilityEntry>,
  flags: PruningGateFeatureFlags
): string[] {
  return exerciseIds.filter((id) => exercisePassesPruningGate(id, eligibilityById, flags));
}

export function filterCatalogRowsByEligibility<T extends { id: string }>(
  rows: T[],
  eligibilityById: Map<string, ExerciseEligibilityEntry>,
  flags: PruningGateFeatureFlags
): T[] {
  return rows.filter((row) => exercisePassesPruningGate(row.id, eligibilityById, flags));
}
