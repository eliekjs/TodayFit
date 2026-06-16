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

  it("accepts shoulder stability work for shoulder health when explicitly tagged", () => {
    const er = mkEx({
      id: "band_face_pull_external_rotation",
      name: "Band Face Pull External Rotation",
      tags: {
        goal_tags: ["mobility"],
        energy_fit: ["low"],
        stimulus: ["scapular_control"],
        attribute_tags: ["shoulder_health", "shoulder_strength", "rotator_cuff", "scapular_control"],
      },
      muscle_groups: ["shoulders"],
    });
    expect(exerciseMatchesJointHealthSubFocus(er, "shoulder_health")).toBe(true);
  });

  it("shoulder_health rejects bench press and generic push-ups without shoulder tags", () => {
    const bench = mkEx({
      id: "bench_press_barbell",
      name: "Barbell Bench Press",
      movement_pattern: "push",
      muscle_groups: ["push", "shoulders"],
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["medium"],
        stimulus: ["eccentric"],
        attribute_tags: ["bench_press"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(bench, "shoulder_health")).toBe(false);

    const pushUp = mkEx({
      id: "push_up",
      name: "Push-up",
      movement_pattern: "push",
      muscle_groups: ["push", "shoulders"],
      tags: { goal_tags: ["strength"], energy_fit: ["low"], stimulus: [], attribute_tags: [] },
    });
    expect(exerciseMatchesJointHealthSubFocus(pushUp, "shoulder_health")).toBe(false);

    const scapPush = mkEx({
      id: "scapular_push_up",
      name: "Scapular Push-up",
      movement_pattern: "push",
      muscle_groups: ["push", "shoulders"],
      tags: {
        goal_tags: ["strength", "recovery"],
        energy_fit: ["low"],
        stimulus: ["scapular_control"],
        attribute_tags: ["shoulder_health", "shoulder_stability", "scapular_control"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(scapPush, "shoulder_health")).toBe(true);
  });

  it("shoulder_health rejects untagged lat mobility drills", () => {
    const dowel = mkEx({
      id: "dowel_lat_stretch_rockers",
      name: "Dowel Lat Stretch Rockers",
      modality: "mobility",
      movement_pattern: "pull",
      muscle_groups: ["lats"],
      stretch_targets: ["lats"],
      tags: { goal_tags: ["mobility"], energy_fit: ["low"], stimulus: [], attribute_tags: ["mobility"] },
    });
    expect(exerciseMatchesJointHealthSubFocus(dowel, "shoulder_health")).toBe(false);
  });

  it("hip_health accepts tagged hip prep and rejects bench press", () => {
    const clam = mkEx({
      id: "clamshell",
      name: "Clamshell",
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["isometric"],
        attribute_tags: ["hip_health", "hip_activation", "glute_med"],
      },
      muscle_groups: ["glutes"],
    });
    expect(exerciseMatchesJointHealthSubFocus(clam, "hip_health")).toBe(true);

    const bench = mkEx({
      id: "bench_press_barbell",
      name: "Barbell Bench Press",
      movement_pattern: "push",
      muscle_groups: ["push"],
      tags: { goal_tags: ["strength"], energy_fit: ["medium"], stimulus: [], attribute_tags: [] },
    });
    expect(exerciseMatchesJointHealthSubFocus(bench, "hip_health")).toBe(false);

    const catCow = mkEx({
      id: "cat_camel",
      name: "Cat Cow",
      modality: "mobility",
      mobility_targets: ["thoracic_spine"],
      tags: { goal_tags: ["mobility"], energy_fit: ["low"], stimulus: [], attribute_tags: ["mobility"] },
    });
    expect(exerciseMatchesJointHealthSubFocus(catCow, "hip_health")).toBe(false);

    const calfRaise = mkEx({
      id: "bodyweight_calf_raise",
      name: "Bodyweight Calf Raise",
      muscle_groups: ["calves"],
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["single_leg"],
        attribute_tags: ["knee_health", "knee_stability", "hip_stability"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(calfRaise, "hip_health")).toBe(false);
  });

  it("ankle_foot_health accepts tagged ankle prep and rejects hip clamshell", () => {
    const ankleCars = mkEx({
      id: "ankle_cars",
      name: "Ankle CARs",
      modality: "mobility",
      muscle_groups: ["calves"],
      tags: {
        goal_tags: ["mobility"],
        energy_fit: ["low"],
        stimulus: [],
        attribute_tags: ["ankle_foot_health", "ankle_foot_activation"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(ankleCars, "ankle_foot_health")).toBe(true);

    const clam = mkEx({
      id: "clamshell",
      name: "Clamshell",
      muscle_groups: ["glutes"],
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["isometric"],
        attribute_tags: ["hip_health", "hip_activation"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(clam, "ankle_foot_health")).toBe(false);

    const kneeOnlyCalf = mkEx({
      id: "bodyweight_calf_raise_fake",
      name: "Bodyweight Calf Raise",
      muscle_groups: ["calves"],
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["single_leg"],
        attribute_tags: ["knee_health", "knee_stability", "ankle_stability"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(kneeOnlyCalf, "ankle_foot_health")).toBe(false);
  });

  it("back_spine_health accepts tagged spine work and rejects generic core-only dead bug", () => {
    const taggedDeadBug = mkEx({
      id: "dead_bug",
      name: "Dead Bug",
      tags: {
        goal_tags: ["strength", "recovery"],
        energy_fit: ["low"],
        stimulus: ["anti_flexion", "trunk_anti_rotation"],
        attribute_tags: ["back_spine_health", "back_spine_strength", "core_stability"],
      },
      muscle_groups: ["core"],
    });
    expect(exerciseMatchesJointHealthSubFocus(taggedDeadBug, "back_spine_health")).toBe(true);

    const genericDeadBug = mkEx({
      id: "dead_bug_generic",
      name: "Dead Bug",
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["anti_flexion"],
        attribute_tags: ["core_stability"],
      },
      muscle_groups: ["core"],
    });
    expect(exerciseMatchesJointHealthSubFocus(genericDeadBug, "back_spine_health")).toBe(false);

    const deadlift = mkEx({
      id: "barbell_deadlift",
      name: "Barbell Deadlift",
      movement_pattern: "hinge",
      muscle_groups: ["lower_back", "hamstrings"],
      tags: { goal_tags: ["strength"], energy_fit: ["high"], stimulus: [], attribute_tags: [] },
    });
    expect(exerciseMatchesJointHealthSubFocus(deadlift, "back_spine_health")).toBe(false);

    const catCow = mkEx({
      id: "cat_camel",
      name: "Cat Cow",
      modality: "mobility",
      tags: {
        goal_tags: ["mobility"],
        energy_fit: ["low"],
        stimulus: [],
        attribute_tags: ["back_spine_health", "back_spine_activation"],
      },
      muscle_groups: ["core"],
    });
    expect(exerciseMatchesJointHealthSubFocus(catCow, "back_spine_health")).toBe(true);
    expect(exerciseMatchesJointHealthSubFocus(catCow, "knee_health")).toBe(false);

    const shoulderEr = mkEx({
      id: "seated_shoulder_external_rotation",
      name: "Seated Shoulder External Rotation",
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["scapular_control"],
        attribute_tags: ["shoulder_health", "shoulder_strength", "rotator_cuff"],
      },
      muscle_groups: ["shoulders"],
    });
    expect(exerciseMatchesJointHealthSubFocus(shoulderEr, "back_spine_health")).toBe(false);
  });

  it("elbow_wrist_health accepts tagged forearm work and rejects shoulder-only or generic grip", () => {
    const taggedWristCurl = mkEx({
      id: "wrist_curl",
      name: "Wrist Curl",
      muscle_groups: ["forearms"],
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["eccentric", "grip"],
        attribute_tags: ["elbow_wrist_health", "elbow_wrist_strength", "forearm"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(taggedWristCurl, "elbow_wrist_health")).toBe(true);

    const shoulderPullApart = mkEx({
      id: "band_pullapart_shoulder_only",
      name: "Band Pull-Apart",
      muscle_groups: ["upper_back"],
      tags: {
        goal_tags: ["mobility"],
        energy_fit: ["low"],
        stimulus: ["scapular_control"],
        attribute_tags: ["shoulder_health", "shoulder_activation"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(shoulderPullApart, "elbow_wrist_health")).toBe(false);

    const taggedPullApart = mkEx({
      id: "band_pullapart_tagged",
      name: "Band Pull-Apart",
      muscle_groups: ["upper_back"],
      tags: {
        goal_tags: ["mobility"],
        energy_fit: ["low"],
        stimulus: ["scapular_control"],
        attribute_tags: ["elbow_wrist_health", "elbow_wrist_activation"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(taggedPullApart, "elbow_wrist_health")).toBe(true);

    const dip = mkEx({
      id: "dips",
      name: "Dips",
      movement_pattern: "push",
      muscle_groups: ["triceps", "chest"],
      tags: { goal_tags: ["strength"], energy_fit: ["medium"], stimulus: [], attribute_tags: [] },
    });
    expect(exerciseMatchesJointHealthSubFocus(dip, "elbow_wrist_health")).toBe(false);
  });
});
