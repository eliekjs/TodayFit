/**
 * Post-assembly validator repair gates (accessory superset swap pool).
 * Run: npx vitest run logic/workoutIntelligence/validation/workoutValidator.test.ts
 */

import { describe, expect, it } from "vitest";
import type { ResolvedWorkoutConstraints } from "../constraints/constraintTypes";
import { validateWorkoutAgainstConstraints } from "./workoutValidator";
import type { Exercise } from "../../workoutGeneration/types";

function makeConstraints(
  overrides: Partial<{
    superset_pairing: ResolvedWorkoutConstraints["superset_pairing"];
  }> = {}
): ResolvedWorkoutConstraints {
  return {
    rules: [],
    excluded_exercise_ids: new Set(),
    excluded_joint_stress_tags: new Set(),
    excluded_contraindication_keys: new Set(),
    allowed_movement_families: null,
    allowed_lower_body_emphasis: undefined,
    min_cooldown_mobility_exercises: 0,
    superset_pairing: overrides.superset_pairing ?? null,
  };
}

const CHEST_PRESS: Exercise = {
  id: "chest_press_machine",
  name: "Chest Press Machine",
  movement_pattern: "push",
  muscle_groups: ["chest", "triceps"],
  modality: "strength",
  equipment_required: ["chest_press"],
  difficulty: 2,
  time_cost: "medium",
  tags: {},
  primary_movement_family: "upper_push",
  pairing_category: "chest",
};

const INCLINE_PRESS: Exercise = {
  id: "incline_db_press",
  name: "Incline DB Press",
  movement_pattern: "push",
  muscle_groups: ["chest", "shoulders"],
  modality: "hypertrophy",
  equipment_required: ["dumbbells", "bench"],
  difficulty: 2,
  time_cost: "medium",
  tags: {},
  primary_movement_family: "upper_push",
  pairing_category: "chest",
};

const WALL_DRILL: Exercise = {
  id: "wall_drill_single_switch",
  name: "Wall Drill Single Switch",
  movement_pattern: "locomotion",
  muscle_groups: ["legs", "core"],
  modality: "power",
  exercise_role: "prep",
  equipment_required: ["bodyweight"],
  difficulty: 2,
  time_cost: "low",
  tags: { attribute_tags: ["speed", "sprint"] },
  primary_movement_family: "lower_body",
};

const FACE_PULL: Exercise = {
  id: "face_pull",
  name: "Face Pull",
  movement_pattern: "pull",
  muscle_groups: ["back", "shoulders"],
  modality: "hypertrophy",
  exercise_role: "isolation",
  equipment_required: ["cable_machine"],
  difficulty: 1,
  time_cost: "low",
  tags: {},
  primary_movement_family: "upper_pull",
  pairing_category: "back",
};

describe("validateWorkoutAgainstConstraints accessory superset repair", () => {
  it("does not swap accessory superset partner to sprint wall drills", () => {
    const workout = {
      title: "Accessory superset repair",
      estimated_duration_minutes: 45,
      blocks: [
        { block_type: "warmup", items: [] },
        {
          block_type: "accessory",
          format: "superset",
          items: [
            { exercise_id: "chest_press_machine", exercise_name: "Chest Press Machine" },
            { exercise_id: "incline_db_press", exercise_name: "Incline DB Press" },
          ],
        },
        { block_type: "cooldown", items: [] },
      ],
    };

    const constraints = makeConstraints({
      superset_pairing: {
        kind: "superset_pairing_rules",
        forbidden_same_pattern: true,
        forbid_double_grip: false,
      },
    });

    const exercises = [CHEST_PRESS, INCLINE_PRESS, WALL_DRILL, FACE_PULL];
    const result = validateWorkoutAgainstConstraints(workout, constraints, exercises);

    const accessory =
      result.repairedWorkout?.blocks.find((b) => b.block_type === "accessory") ??
      workout.blocks.find((b) => b.block_type === "accessory");
    expect(accessory).toBeDefined();
    const ids = accessory!.items.map((i) => i.exercise_id);
    expect(ids).not.toContain("wall_drill_single_switch");
    expect(ids).toContain("face_pull");
  });

  it("does not swap main_hypertrophy superset partner to sprint wall drills", () => {
    const workout = {
      title: "Hypertrophy main repair",
      estimated_duration_minutes: 45,
      blocks: [
        {
          block_type: "main_hypertrophy",
          format: "superset",
          items: [
            { exercise_id: "chest_press_machine", exercise_name: "Chest Press Machine" },
            { exercise_id: "incline_db_press", exercise_name: "Incline DB Press" },
          ],
        },
      ],
    };

    const constraints = makeConstraints({
      superset_pairing: {
        kind: "superset_pairing_rules",
        forbidden_same_pattern: true,
        forbid_double_grip: false,
      },
    });

    const result = validateWorkoutAgainstConstraints(workout, constraints, [
      CHEST_PRESS,
      INCLINE_PRESS,
      WALL_DRILL,
      FACE_PULL,
    ]);

    const main =
      result.repairedWorkout?.blocks.find((b) => b.block_type === "main_hypertrophy") ??
      workout.blocks.find((b) => b.block_type === "main_hypertrophy");
    expect(main).toBeDefined();
    const ids = main!.items.map((i) => i.exercise_id);
    expect(ids).not.toContain("wall_drill_single_switch");
  });
});
