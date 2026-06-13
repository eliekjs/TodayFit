import { describe, expect, it } from "vitest";
import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  exerciseMatchesJointHealthSubFocus,
  isJointHealthAppropriateExercise,
  isJointHealthExcludedExercise,
} from "./jointHealthSubFocus";

function mkEx(partial: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    movement_pattern: "rotate",
    muscle_groups: ["core"],
    modality: "strength",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: [], energy_fit: ["low"], joint_stress: [], stimulus: [] },
    ...partial,
  } as Exercise;
}

describe("jointHealthSubFocus", () => {
  it("excludes plyometric and heavy compound exercises", () => {
    const boxJump = mkEx({
      id: "box_jump",
      name: "Box Jump",
      modality: "power",
      tags: { goal_tags: ["power"], energy_fit: ["high"], stimulus: ["plyometric"] },
    });
    expect(isJointHealthExcludedExercise(boxJump)).toBe(true);
    expect(isJointHealthAppropriateExercise(boxJump)).toBe(false);
  });

  it("accepts PT-style prehab exercises for knee health", () => {
    const wallSit = mkEx({
      id: "wall_sit",
      name: "Wall Sit",
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["isometric"],
        attribute_tags: ["knee", "quad_strength"],
      },
      muscle_groups: ["quads"],
    });
    expect(isJointHealthAppropriateExercise(wallSit)).toBe(true);
    expect(exerciseMatchesJointHealthSubFocus(wallSit, "knee_health")).toBe(true);
  });

  it("accepts shoulder stability work for shoulder health", () => {
    const er = mkEx({
      id: "band_er",
      name: "Band External Rotation",
      tags: {
        goal_tags: ["mobility"],
        energy_fit: ["low"],
        stimulus: ["scapular_control"],
        attribute_tags: ["rotator_cuff"],
      },
      muscle_groups: ["shoulders"],
    });
    expect(exerciseMatchesJointHealthSubFocus(er, "shoulder_health")).toBe(true);
  });

  it("matches back/spine via core stability signals", () => {
    const deadBug = mkEx({
      id: "dead_bug",
      name: "Dead Bug",
      tags: {
        goal_tags: ["strength", "recovery"],
        energy_fit: ["low"],
        stimulus: ["anti_flexion", "trunk_anti_rotation"],
        attribute_tags: ["core_stability"],
      },
      muscle_groups: ["core"],
    });
    expect(exerciseMatchesJointHealthSubFocus(deadBug, "back_spine_health")).toBe(true);
  });
});
