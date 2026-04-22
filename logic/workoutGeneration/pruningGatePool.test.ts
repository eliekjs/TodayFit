/**
 * Phase 6 pruning gate pool tests.
 * Run: npx tsx logic/workoutGeneration/pruningGatePool.test.ts
 */

import type { Exercise, GenerateWorkoutInput } from "./types";
import {
  applyPruningGateToExercisePool,
  mergePruningGateFlags,
  resolveGatedExercisePoolForGeneration,
} from "./pruningGatePool";
import {
  DEFAULT_PRUNING_GATE_FLAGS,
  type ExerciseEligibilityEntry,
} from "../exerciseLibraryCuration/generatorEligibilityTypes";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function mkExercise(id: string): Exercise {
  return {
    id,
    name: id,
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: ["dumbbell"],
    difficulty: 2,
    time_cost: "low",
    tags: {},
  };
}

function entry(id: string, state: ExerciseEligibilityEntry["eligibility_state"]): ExerciseEligibilityEntry {
  const pruning_recommendation =
    state === "eligible_core"
      ? "keep_core"
      : state === "eligible_niche"
        ? "keep_niche"
        : state === "excluded_merged"
          ? "merge_into_canonical"
          : "keep_core";
  return {
    exercise_id: id,
    exercise_name: id,
    eligibility_state: state,
    pruning_recommendation,
    merge_target_exercise_id: state === "excluded_merged" ? "a_core" : null,
    is_canonical_in_cluster: false,
    cluster_id: null,
  };
}

const baseInput = (): GenerateWorkoutInput => ({
  duration_minutes: 45,
  primary_goal: "strength",
  energy_level: "medium",
  available_equipment: ["dumbbell"],
  injuries_or_constraints: [],
});

function run() {
  const pool = [mkExercise("a_core"), mkExercise("b_niche"), mkExercise("c_merged")];
  const map = new Map<string, ExerciseEligibilityEntry>([
    ["a_core", entry("a_core", "eligible_core")],
    ["b_niche", entry("b_niche", "eligible_niche")],
    ["c_merged", entry("c_merged", "excluded_merged")],
  ]);

  const off = applyPruningGateToExercisePool(pool, {
    flags: mergePruningGateFlags({
      ...baseInput(),
      pruning_gate: { ...DEFAULT_PRUNING_GATE_FLAGS, enable_pruning_gating: false },
    }),
    eligibilityById: map,
    includeIdLists: false,
  });
  assert(off.pool.length === 3, "gating off keeps full pool");

  const on = applyPruningGateToExercisePool(pool, {
    flags: mergePruningGateFlags({
      ...baseInput(),
      pruning_gate: { enable_pruning_gating: true, allow_niche_exercises: true, allow_review_exercises: false },
    }),
    eligibilityById: map,
    includeIdLists: false,
  });
  assert(on.pool.length === 2, "gating on drops excluded_merged");
  assert(on.pool.every((e) => e.id !== "c_merged"), "merged id absent");
  assert(on.debug.excluded_by_eligibility_state.excluded_merged === 1, "counts merged exclusion");

  const noNiche = applyPruningGateToExercisePool(pool, {
    flags: mergePruningGateFlags({
      ...baseInput(),
      pruning_gate: { enable_pruning_gating: true, allow_niche_exercises: false, allow_review_exercises: false },
    }),
    eligibilityById: map,
    includeIdLists: false,
  });
  assert(noNiche.pool.length === 1, "niche off drops niche");
  assert(noNiche.pool[0]!.id === "a_core", "only core remains");

  const gated = resolveGatedExercisePoolForGeneration(pool, {
    ...baseInput(),
    pruning_gate: { enable_pruning_gating: true, allow_niche_exercises: true, allow_review_exercises: false },
    pruning_gate_eligibility_by_id: Object.fromEntries(map),
  });
  assert(gated.pool.length === 2, "resolveGated matches manual apply");

  console.log("pruningGatePool.test.ts: all passed");
}

run();
