import { describe, expect, it } from "vitest";
import {
  exerciseMatchesJointHealthSubFocus,
  isJointHealthExcludedExercise,
} from "./goalSubFocus/jointHealthSubFocus";
import { KNEE_HEALTH_TAGGED_EXERCISE_IDS, ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS, BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS, ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS, HIP_HEALTH_TAGGED_EXERCISE_IDS, SHOULDER_HEALTH_TAGGED_EXERCISE_IDS } from "./jointHealthExerciseEnrichment";
import type { Exercise } from "../logic/workoutGeneration/types";

function mkEx(partial: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: [], energy_fit: ["low"], joint_stress: [], stimulus: [], attribute_tags: [] },
    ...partial,
  } as Exercise;
}

describe("jointHealthExerciseEnrichment knee tagging", () => {
  it("tags expanded shoulder prep activation catalog ids", () => {
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("hip_90_90")).toBe(true);
    expect(SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has("wall_slide")).toBe(true);
    expect(SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has("band_pullapart")).toBe(true);
    expect(SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has("push_up_plus")).toBe(true);
    expect(SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has("scapular_push_up")).toBe(true);
    expect(SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has("cuban_press")).toBe(true);
    expect(SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has("band_external_rotation")).toBe(true);
    expect(SHOULDER_HEALTH_TAGGED_EXERCISE_IDS.has("sleeper_stretch")).toBe(true);
  });

  it("tags expanded hip prep activation catalog ids", () => {
    expect(HIP_HEALTH_TAGGED_EXERCISE_IDS.has("hip_90_90")).toBe(true);
    expect(HIP_HEALTH_TAGGED_EXERCISE_IDS.has("hip_cars")).toBe(true);
    expect(HIP_HEALTH_TAGGED_EXERCISE_IDS.has("clamshell")).toBe(true);
    expect(HIP_HEALTH_TAGGED_EXERCISE_IDS.has("worlds_greatest_stretch")).toBe(true);
    expect(HIP_HEALTH_TAGGED_EXERCISE_IDS.has("ff_bodyweight_copenhagen_plank")).toBe(true);
    expect(HIP_HEALTH_TAGGED_EXERCISE_IDS.has("hip_airplanes")).toBe(true);
    expect(HIP_HEALTH_TAGGED_EXERCISE_IDS.has("ff_miniband_thigh_lateral_walk")).toBe(true);
  });

  it("tags expanded ankle/foot prep activation catalog ids", () => {
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("ankle_cars")).toBe(true);
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("ankle_circles")).toBe(true);
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("tibialis_raise")).toBe(true);
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("bodyweight_calf_raise")).toBe(true);
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("iso_step_down")).toBe(true);
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("calf_stretch_wall")).toBe(true);
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("kneeling_dorsiflexion_stretch")).toBe(true);
    expect(ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS.has("ff_bodyweight_toe_balance_squat")).toBe(true);
  });

  it("tags expanded back/spine prep activation catalog ids", () => {
    expect(BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has("cat_camel")).toBe(true);
    expect(BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has("dead_bug")).toBe(true);
    expect(BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has("bird_dog")).toBe(true);
    expect(BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has("side_plank")).toBe(true);
    expect(BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has("ff_superband_pallof_press")).toBe(true);
    expect(BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has("open_books")).toBe(true);
    expect(BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS.has("childs_pose")).toBe(true);
  });

  it("tags expanded elbow/wrist prep and loading catalog ids", () => {
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("wrist_circles")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("finger_extensions")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("band_pullapart")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("push_up_plus")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("wrist_curl")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("dead_hang")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("farmer_carry")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("suitcase_carry")).toBe(true);
    expect(ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS.has("cross_body_stretch")).toBe(true);
  });

  it("tags expanded knee prep activation catalog ids", () => {
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("hip_90_90")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("ff_bodyweight_cossack_squat")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("standing_quad_stretch")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("bodyweight_squat")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("wall_sit")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("goblet_squat")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("tibialis_raise")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("clamshell")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("quad_set")).toBe(true);
    expect(KNEE_HEALTH_TAGGED_EXERCISE_IDS.has("straight_leg_raise")).toBe(true);
  });

  it("knee_health match requires explicit knee tag — not generic quads alone", () => {
    const pushUp = mkEx({
      id: "push_up",
      name: "Push-up",
      movement_pattern: "push",
      muscle_groups: ["chest", "triceps"],
      tags: { goal_tags: ["strength"], energy_fit: ["low"], stimulus: [], attribute_tags: ["push"] },
    });
    expect(exerciseMatchesJointHealthSubFocus(pushUp, "knee_health")).toBe(false);

    const catCow = mkEx({
      id: "cat_camel",
      name: "Cat Cow",
      modality: "mobility",
      movement_pattern: "rotate",
      muscle_groups: ["core"],
      mobility_targets: ["thoracic_spine"],
      tags: { goal_tags: ["mobility"], energy_fit: ["low"], stimulus: [], attribute_tags: ["mobility"] },
    });
    expect(exerciseMatchesJointHealthSubFocus(catCow, "knee_health")).toBe(false);
  });

  it("matches tagged knee exercises", () => {
    const wallSit = mkEx({
      id: "wall_sit",
      name: "Wall Sit",
      tags: {
        goal_tags: ["strength"],
        energy_fit: ["low"],
        stimulus: ["isometric"],
        attribute_tags: ["knee_health", "knee_strength", "quad_strength"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(wallSit, "knee_health")).toBe(true);
    expect(isJointHealthExcludedExercise(wallSit)).toBe(false);
  });

  it("straight leg raise matches knee_health despite legacy thoracic mobility metadata", () => {
    const slr = mkEx({
      id: "straight_leg_raise",
      name: "Straight Leg Raise",
      modality: "mobility",
      movement_pattern: "rotate",
      mobility_targets: ["thoracic_spine"],
      tags: {
        goal_tags: ["mobility"],
        energy_fit: ["low"],
        stimulus: ["isometric"],
        attribute_tags: ["knee_health", "knee_activation"],
      },
    });
    expect(exerciseMatchesJointHealthSubFocus(slr, "knee_health")).toBe(true);
  });
});
