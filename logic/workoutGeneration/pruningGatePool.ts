/**
 * Phase 6 — apply pruning eligibility to the generator exercise pool (feature-flagged, no catalog mutation).
 */

import type { Exercise, GenerateWorkoutInput } from "./types";
import type {
  CountsByEligibilityState,
  ExerciseEligibilityEntry,
  GeneratorEligibilityState,
  PruningGateFeatureFlags,
} from "../exerciseLibraryCuration/generatorEligibilityTypes";
import { DEFAULT_PRUNING_GATE_FLAGS } from "../exerciseLibraryCuration/generatorEligibilityTypes";
import { exercisePassesPruningGate } from "../exerciseLibraryCuration/filterExercisesByEligibility";
import eligibilityBundle from "../../data/generator-eligibility-by-id.json";
import { getUseCuratedEligibilityFromExercisePool } from "../../lib/curationDbFields";
import type { PruningGateMovementRoleBreakdown, PruningGateSessionDebug } from "./pruningGateDebugTypes";

export type { PruningGateSessionDebug } from "./pruningGateDebugTypes";

const EMPTY_EXCLUDED = (): CountsByEligibilityState => ({
  eligible_core: 0,
  eligible_niche: 0,
  excluded_merged: 0,
  excluded_removed: 0,
  excluded_review: 0,
  excluded_unknown: 0,
});

let bundledMapCache: Map<string, ExerciseEligibilityEntry> | undefined;

export function getBundledEligibilityById(): Map<string, ExerciseEligibilityEntry> {
  if (!bundledMapCache) {
    const raw = eligibilityBundle as { by_id?: Record<string, ExerciseEligibilityEntry> };
    bundledMapCache = new Map(Object.entries(raw.by_id ?? {}));
  }
  return bundledMapCache;
}

export function mergePruningGateFlags(input: GenerateWorkoutInput | undefined): PruningGateFeatureFlags {
  const p = input?.pruning_gate;
  return {
    enable_pruning_gating: p?.enable_pruning_gating ?? DEFAULT_PRUNING_GATE_FLAGS.enable_pruning_gating,
    allow_niche_exercises: p?.allow_niche_exercises ?? DEFAULT_PRUNING_GATE_FLAGS.allow_niche_exercises,
    allow_review_exercises: p?.allow_review_exercises ?? DEFAULT_PRUNING_GATE_FLAGS.allow_review_exercises,
  };
}

function incrementState(m: CountsByEligibilityState, s: GeneratorEligibilityState) {
  m[s] += 1;
}

function breakdownMovementAndRole(pool: Exercise[]): PruningGateMovementRoleBreakdown {
  const mp = new Map<string, number>();
  const role = new Map<string, number>();
  for (const ex of pool) {
    const mk = ex.movement_pattern ?? "_unknown_";
    mp.set(mk, (mp.get(mk) ?? 0) + 1);
    const rk = ex.exercise_role ?? "_unknown_";
    role.set(rk, (role.get(rk) ?? 0) + 1);
  }
  const toSorted = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  return {
    by_movement_pattern: toSorted(mp),
    by_exercise_role: toSorted(role),
  };
}

export function applyPruningGateToExercisePool(
  exercisePool: Exercise[],
  params: {
    flags: PruningGateFeatureFlags;
    eligibilityById: Map<string, ExerciseEligibilityEntry> | null;
    includeIdLists: boolean;
  }
): { pool: Exercise[]; debug: PruningGateSessionDebug } {
  const { flags, eligibilityById, includeIdLists } = params;
  const pool_size_before_pruning_gate = exercisePool.length;

  if (!flags.enable_pruning_gating) {
    const debug: PruningGateSessionDebug = {
      resolved_flags: flags,
      eligibility_map_loaded: eligibilityById != null,
      eligibility_row_count: eligibilityById?.size ?? 0,
      pool_size_before_pruning_gate,
      pool_size_after_pruning_gate: pool_size_before_pruning_gate,
      excluded_by_eligibility_state: EMPTY_EXCLUDED(),
      excluded_missing_eligibility_row: 0,
      included_eligible_core: 0,
      included_eligible_niche: 0,
      gated_breakdown: breakdownMovementAndRole(exercisePool),
    };
    if (includeIdLists) {
      debug.exercise_ids_before_pruning_gate = exercisePool.map((e) => e.id);
      debug.exercise_ids_after_pruning_gate = exercisePool.map((e) => e.id);
    }
    return { pool: exercisePool, debug };
  }

  if (!eligibilityById || eligibilityById.size === 0) {
    const debug: PruningGateSessionDebug = {
      resolved_flags: flags,
      eligibility_map_loaded: false,
      eligibility_row_count: 0,
      pool_size_before_pruning_gate,
      pool_size_after_pruning_gate: pool_size_before_pruning_gate,
      excluded_by_eligibility_state: EMPTY_EXCLUDED(),
      excluded_missing_eligibility_row: 0,
      included_eligible_core: 0,
      included_eligible_niche: 0,
      gated_breakdown: breakdownMovementAndRole(exercisePool),
    };
    if (includeIdLists) {
      debug.exercise_ids_before_pruning_gate = exercisePool.map((e) => e.id);
      debug.exercise_ids_after_pruning_gate = exercisePool.map((e) => e.id);
    }
    return { pool: exercisePool, debug };
  }

  const excluded = EMPTY_EXCLUDED();
  let excluded_missing_eligibility_row = 0;
  const gated: Exercise[] = [];

  for (const ex of exercisePool) {
    const passes = exercisePassesPruningGate(ex.id, eligibilityById, flags);
    if (passes) {
      gated.push(ex);
    } else {
      const row = eligibilityById.get(ex.id);
      if (row) incrementState(excluded, row.eligibility_state);
      else excluded_missing_eligibility_row += 1;
    }
  }

  let included_eligible_core = 0;
  let included_eligible_niche = 0;
  for (const ex of gated) {
    const st = eligibilityById.get(ex.id)?.eligibility_state;
    if (st === "eligible_core") included_eligible_core += 1;
    if (st === "eligible_niche") included_eligible_niche += 1;
  }

  const debug: PruningGateSessionDebug = {
    resolved_flags: flags,
    eligibility_map_loaded: true,
    eligibility_row_count: eligibilityById.size,
    pool_size_before_pruning_gate,
    pool_size_after_pruning_gate: gated.length,
    excluded_by_eligibility_state: excluded,
    excluded_missing_eligibility_row,
    included_eligible_core,
    included_eligible_niche,
    gated_breakdown: breakdownMovementAndRole(gated),
  };

  if (includeIdLists) {
    debug.exercise_ids_before_pruning_gate = exercisePool.map((e) => e.id);
    debug.exercise_ids_after_pruning_gate = gated.map((e) => e.id);
  }

  return { pool: gated, debug };
}

/**
 * Builds per-id eligibility: tests override → hybrid DB columns on pool exercises + bundled JSON fallback
 * → else bundled JSON only.
 */
export function resolveEligibilityMapForGeneration(
  input: GenerateWorkoutInput,
  exercisePool: Exercise[]
): Map<string, ExerciseEligibilityEntry> {
  if (input.pruning_gate_eligibility_by_id && Object.keys(input.pruning_gate_eligibility_by_id).length > 0) {
    return new Map(Object.entries(input.pruning_gate_eligibility_by_id));
  }
  const fallback = getBundledEligibilityById();
  if (!getUseCuratedEligibilityFromExercisePool()) {
    return fallback;
  }
  if (!exercisePool.some((e) => e.curation_generator_eligibility_state)) {
    return fallback;
  }
  const merged = new Map<string, ExerciseEligibilityEntry>();
  for (const ex of exercisePool) {
    const st = ex.curation_generator_eligibility_state;
    if (st) {
      merged.set(ex.id, {
        exercise_id: ex.id,
        exercise_name: ex.name,
        eligibility_state: st as GeneratorEligibilityState,
        pruning_recommendation: (ex.curation_pruning_recommendation ?? "unknown") as ExerciseEligibilityEntry["pruning_recommendation"],
        merge_target_exercise_id: ex.curation_merge_target_exercise_id ?? null,
        is_canonical_in_cluster: ex.curation_is_canonical ?? false,
        cluster_id: ex.curation_cluster_id ?? null,
      });
    } else {
      const b = fallback.get(ex.id);
      if (b) merged.set(ex.id, b);
    }
  }
  return merged;
}

/** Single entry point for `generateWorkoutSession` / regenerate: gate pool + build debug snapshot. */
export function resolveGatedExercisePoolForGeneration(
  exercisePool: Exercise[],
  input: GenerateWorkoutInput
): { pool: Exercise[]; debug: PruningGateSessionDebug } {
  const flags = mergePruningGateFlags(input);
  const eligibilityById = resolveEligibilityMapForGeneration(input, exercisePool);
  return applyPruningGateToExercisePool(exercisePool, {
    flags,
    eligibilityById: eligibilityById.size > 0 ? eligibilityById : null,
    includeIdLists: input.include_pruning_gate_comparison === true,
  });
}

export function logPruningGateToConsole(debug: PruningGateSessionDebug): void {
  const f = debug.resolved_flags;
  console.info(
    `[pruning_gate] enabled=${f.enable_pruning_gating} niche=${f.allow_niche_exercises} review=${f.allow_review_exercises} map=${debug.eligibility_map_loaded ? debug.eligibility_row_count : "none"} baseline=${debug.pool_size_before_pruning_gate} gated=${debug.pool_size_after_pruning_gate} core=${debug.included_eligible_core} niche=${debug.included_eligible_niche} missing_row=${debug.excluded_missing_eligibility_row}`
  );
}
