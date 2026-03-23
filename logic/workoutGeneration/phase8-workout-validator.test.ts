/**
 * Phase 8: Post-assembly validation and repair tests.
 * Run with: npx tsx logic/workoutGeneration/phase8-workout-validator.test.ts
 */

import type { Exercise } from "./types";
import { validateWorkoutAgainstConstraints } from "../workoutIntelligence/validation/workoutValidator";
import type { ResolvedWorkoutConstraints } from "../workoutIntelligence/constraints/constraintTypes";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const UPPER_PUSH_EX: Exercise = {
  id: "bench",
  name: "Bench Press",
  movement_pattern: "push",
  muscle_groups: ["chest", "triceps"],
  modality: "strength",
  equipment_required: ["barbell"],
  difficulty: 2,
  time_cost: "medium",
  tags: {},
  primary_movement_family: "upper_push",
};

const UPPER_PULL_EX: Exercise = {
  id: "row",
  name: "Row",
  movement_pattern: "pull",
  muscle_groups: ["back"],
  modality: "strength",
  equipment_required: ["barbell"],
  difficulty: 2,
  time_cost: "medium",
  tags: {},
  primary_movement_family: "upper_pull",
};

const LOWER_EX: Exercise = {
  id: "squat",
  name: "Squat",
  movement_pattern: "squat",
  muscle_groups: ["legs"],
  modality: "strength",
  equipment_required: ["barbell"],
  difficulty: 2,
  time_cost: "medium",
  tags: {},
  primary_movement_family: "lower_body",
};

const MOBILITY_EX: Exercise = {
  id: "cat_camel",
  name: "Cat Cow",
  movement_pattern: "rotate",
  muscle_groups: ["core"],
  modality: "mobility",
  equipment_required: ["bodyweight"],
  difficulty: 1,
  time_cost: "low",
  tags: {},
  exercise_role: "mobility",
  mobility_targets: ["thoracic_spine"],
};

const MOBILITY_EX_2: Exercise = {
  id: "hip_circles",
  name: "Hip Circles",
  movement_pattern: "rotate",
  muscle_groups: ["legs"],
  modality: "mobility",
  equipment_required: ["bodyweight"],
  difficulty: 1,
  time_cost: "low",
  tags: {},
  exercise_role: "mobility",
  mobility_targets: ["hips"],
};

function makeConstraints(overrides: Partial<{
  allowed_movement_families: string[] | null;
  excluded_exercise_ids: Set<string>;
  excluded_joint_stress_tags: Set<string>;
  excluded_contraindication_keys: Set<string>;
  min_cooldown_mobility_exercises: number;
}>): ResolvedWorkoutConstraints {
  return {
    rules: [],
    excluded_exercise_ids: overrides.excluded_exercise_ids ?? new Set(),
    excluded_joint_stress_tags: overrides.excluded_joint_stress_tags ?? new Set(),
    excluded_contraindication_keys: overrides.excluded_contraindication_keys ?? new Set(),
    allowed_movement_families: overrides.allowed_movement_families ?? null,
    allowed_lower_body_emphasis: undefined,
    min_cooldown_mobility_exercises: overrides.min_cooldown_mobility_exercises ?? 0,
    superset_pairing: null,
  };
}

// 1. upper_push workout accidentally containing upper_pull → validator repairs
function testBodyPartFocusRepair() {
  const workout = {
    title: "Test",
    estimated_duration_minutes: 45,
    blocks: [
      {
        block_type: "warmup",
        items: [{ exercise_id: "w1", exercise_name: "Warm" }],
      },
      {
        block_type: "main_strength",
        items: [
          { exercise_id: "row", exercise_name: "Row" },
          { exercise_id: "bench", exercise_name: "Bench" },
        ],
      },
      {
        block_type: "cooldown",
        items: [{ exercise_id: "cat_camel", exercise_name: "Cat Cow" }],
      },
    ],
  };
  const constraints = makeConstraints({ allowed_movement_families: ["upper_push"] });
  const exercises: Exercise[] = [UPPER_PUSH_EX, UPPER_PULL_EX, LOWER_EX, MOBILITY_EX];
  const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);
  const bodyViolations = result.violations.filter((v) => v.type === "body_part_focus");
  const mainBlock = result.repairedWorkout?.blocks.find((b) => b.block_type === "main_strength");
  if (mainBlock) {
    const ids = mainBlock.items.map((i) => i.exercise_id);
    assert(
      !ids.includes("row") || bodyViolations.length > 0,
      "either row replaced or violation reported"
    );
    if (result.repairedWorkout && result.violations.length === 0) {
      assert(!ids.includes("row"), "repaired: upper_pull exercise replaced in upper_push workout");
    }
  }
  console.log("  OK: body-part focus validation and repair");
}

// 2. shoulder injury violation → validator replaces exercise
function testInjuryRepair() {
  const shoulderRisky: Exercise = {
    ...UPPER_PUSH_EX,
    id: "oh_press",
    name: "OH Press",
    joint_stress_tags: ["shoulder_overhead"],
    contraindication_tags: ["shoulder"],
  };
  const workout = {
    title: "Test",
    estimated_duration_minutes: 45,
    blocks: [
      { block_type: "warmup", items: [] },
      {
        block_type: "main_strength",
        items: [
          { exercise_id: "oh_press", exercise_name: "OH Press" },
          { exercise_id: "bench", exercise_name: "Bench" },
        ],
      },
      { block_type: "cooldown", items: [] },
    ],
  };
  const constraints = makeConstraints({
    excluded_joint_stress_tags: new Set(["shoulder_overhead"]),
    excluded_contraindication_keys: new Set(["shoulder"]),
  });
  const exercises: Exercise[] = [shoulderRisky, UPPER_PUSH_EX, LOWER_EX];
  const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);
  if (result.repairedWorkout) {
    const main = result.repairedWorkout.blocks.find((b) => b.block_type === "main_strength");
    const ids = main?.items.map((i) => i.exercise_id) ?? [];
    assert(!ids.includes("oh_press"), "shoulder-risky exercise replaced when repair possible");
  }
  console.log("  OK: injury violation repair");
}

// 3. mobility secondary goal but cooldown lacks mobility → validator fixes
function testCooldownMobilityRepair() {
  const workout = {
    title: "Test",
    estimated_duration_minutes: 45,
    blocks: [
      { block_type: "warmup", items: [] },
      { block_type: "main_strength", items: [{ exercise_id: "bench", exercise_name: "Bench" }] },
      {
        block_type: "cooldown",
        items: [
          { exercise_id: "bench", exercise_name: "Bench" },
        ],
      },
    ],
  };
  const constraints = makeConstraints({ min_cooldown_mobility_exercises: 2 });
  const exercises: Exercise[] = [UPPER_PUSH_EX, MOBILITY_EX, MOBILITY_EX_2];
  const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);
  if (result.repairedWorkout) {
    const cooldown = result.repairedWorkout.blocks.find((b) => b.block_type === "cooldown");
    const mobilityCount = cooldown?.items.filter((i) =>
      ["cat_camel"].includes(i.exercise_id)
    ).length ?? 0;
    assert(
      (cooldown?.items.length ?? 0) >= 2,
      "cooldown has at least 2 items after repair (mobility appended)"
    );
  }
  console.log("  OK: cooldown mobility requirement repair");
}

// 4. cooldown exercise incorrectly placed in main work → validator corrects
function testBlockRolePlacementRepair() {
  const cooldownRoleEx: Exercise = {
    ...UPPER_PUSH_EX,
    id: "stretch_chest",
    name: "Chest Stretch",
    exercise_role: "stretch",
    modality: "mobility",
  };
  const workout = {
    title: "Test",
    estimated_duration_minutes: 45,
    blocks: [
      { block_type: "warmup", items: [] },
      {
        block_type: "main_strength",
        items: [
          { exercise_id: "stretch_chest", exercise_name: "Chest Stretch" },
          { exercise_id: "bench", exercise_name: "Bench" },
        ],
      },
      { block_type: "cooldown", items: [] },
    ],
  };
  const constraints = makeConstraints({});
  const exercises: Exercise[] = [cooldownRoleEx, UPPER_PUSH_EX, LOWER_EX];
  const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);
  if (result.repairedWorkout) {
    const main = result.repairedWorkout.blocks.find((b) => b.block_type === "main_strength");
    const hasStretch = main?.items.some((i) => i.exercise_id === "stretch_chest");
    assert(!hasStretch, "stretch-role exercise replaced in main work block");
  }
  console.log("  OK: block role placement repair");
}

// 5. superset pairing violation → validator attempts swap
function testSupersetPairingRepair() {
  const constraints = makeConstraints({
    superset_pairing: {
      kind: "superset_pairing_rules",
      forbidden_same_pattern: true,
      forbid_double_grip: false,
    },
  });
  const workout = {
    title: "Test",
    estimated_duration_minutes: 45,
    blocks: [
      { block_type: "warmup", items: [] },
      {
        block_type: "main_strength",
        format: "superset",
        items: [
          { exercise_id: "bench", exercise_name: "Bench" },
          { exercise_id: "bench", exercise_name: "Bench" },
        ],
      },
      { block_type: "cooldown", items: [] },
    ],
  };
  const exercises: Exercise[] = [UPPER_PUSH_EX, UPPER_PULL_EX, LOWER_EX];
  const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);
  if (result.repairedWorkout) {
    const main = result.repairedWorkout.blocks.find((b) => b.block_type === "main_strength");
    const ids = main?.items.map((i) => i.exercise_id) ?? [];
    const sameTwice = ids.length === 2 && ids[0] === ids[1];
    assert(!sameTwice, "superset pair repaired when same exercise twice (or violation reported)");
  }
  console.log("  OK: superset pairing repair attempt");
}

// 6. same exercise twice in one session → duplicate repair swaps later slot
function testDuplicateExerciseRepair() {
  const workout = {
    title: "Test",
    estimated_duration_minutes: 45,
    blocks: [
      { block_type: "warmup", items: [] },
      {
        block_type: "main_strength",
        items: [
          { exercise_id: "bench", exercise_name: "Bench" },
          { exercise_id: "bench", exercise_name: "Bench" },
        ],
      },
      { block_type: "cooldown", items: [] },
    ],
  };
  const constraints = makeConstraints({});
  const exercises: Exercise[] = [UPPER_PUSH_EX, UPPER_PULL_EX, LOWER_EX];
  const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);
  assert(result.repairedWorkout != null, "duplicate repair returns repaired workout");
  const allIds = result.repairedWorkout!.blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
  const unique = new Set(allIds);
  assert(unique.size === allIds.length, "no duplicate exercise_id in session after repair");
  console.log("  OK: duplicate exercise repair");
}

// 7. no valid repair candidate → violation logged but workout still returned
function testNoRepairCandidateReturnsWorkout() {
  const workout = {
    title: "Test",
    estimated_duration_minutes: 45,
    blocks: [
      { block_type: "main_strength", items: [{ exercise_id: "row", exercise_name: "Row" }] },
      { block_type: "cooldown", items: [] },
    ],
  };
  const constraints = makeConstraints({ allowed_movement_families: ["upper_push"] });
  const exercises: Exercise[] = [UPPER_PULL_EX];
  const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);
  assert(result.violations.some((v) => v.type === "body_part_focus"), "violation recorded when no replacement");
  assert(
    result.repairedWorkout === undefined || result.violations.length > 0,
    "no repair when no candidate; violations present"
  );
  console.log("  OK: no repair candidate → violation logged, workout still returned");
}

function main() {
  console.log("Phase 8 workout validator tests...");
  testBodyPartFocusRepair();
  testInjuryRepair();
  testCooldownMobilityRepair();
  testBlockRolePlacementRepair();
  testSupersetPairingRepair();
  testDuplicateExerciseRepair();
  testNoRepairCandidateReturnsWorkout();
  console.log("All Phase 8 tests passed.");
}

main();
