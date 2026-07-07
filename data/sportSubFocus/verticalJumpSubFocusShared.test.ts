import { describe, it, expect } from "vitest";
import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  exerciseEligibleForVerticalJumpSession,
  exerciseHasLowerBodyPlyoJumpSignal,
  exerciseIsMedBallPowerThrow,
  exerciseHasVerticalJumpStrengthFoundationSignal,
  exercisePassesVerticalJumpDynamicGate,
  exercisePassesVerticalJumpTrainingGate,
  inputHasVerticalJumpSubFocus,
  verticalJumpExerciseSelectionScore,
} from "./verticalJumpSubFocusShared";

function synth(overrides: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    movement_pattern: "locomotion",
    muscle_groups: ["legs"],
    modality: "power",
    equipment_required: ["bodyweight"],
    tags: { goal_tags: [], attribute_tags: [], stimulus: ["plyometric"] },
    ...overrides,
  } as Exercise;
}

describe("verticalJumpSubFocusShared", () => {
  it("detects med-ball throws and excludes them from vertical-jump plyo signal", () => {
    const medBall = synth({
      id: "med_ball_vertical_toss",
      name: "Med Ball Vertical Toss",
      tags: {
        goal_tags: ["power"],
        attribute_tags: ["explosive_power"],
        stimulus: ["plyometric"],
      },
    });
    expect(exerciseIsMedBallPowerThrow(medBall)).toBe(true);
    expect(exerciseHasLowerBodyPlyoJumpSignal(medBall)).toBe(false);
    expect(exercisePassesVerticalJumpDynamicGate(medBall)).toBe(false);
    expect(verticalJumpExerciseSelectionScore(medBall)).toBeLessThan(0);
  });

  it("accepts lower-body plyometric jumps", () => {
    const boxJump = synth({
      id: "box_jump",
      name: "Box Jump",
      tags: {
        goal_tags: ["power"],
        attribute_tags: ["explosive_power"],
        stimulus: ["plyometric"],
      },
    });
    const pogo = synth({ id: "pogo_jump", name: "Pogo Jump" });
    expect(exerciseHasLowerBodyPlyoJumpSignal(boxJump)).toBe(true);
    expect(exerciseHasLowerBodyPlyoJumpSignal(pogo)).toBe(true);
    expect(exercisePassesVerticalJumpDynamicGate(boxJump)).toBe(true);
    expect(verticalJumpExerciseSelectionScore(boxJump)).toBeGreaterThan(0);
  });

  it("hard-excludes med-ball throws when vertical jump intent is active", () => {
    const medBall = synth({ id: "med_ball_slam", name: "Med Ball Slam" });
    expect(exerciseEligibleForVerticalJumpSession(medBall, true)).toBe(false);
    expect(exerciseEligibleForVerticalJumpSession(medBall, false)).toBe(true);
  });

  it("accepts squat/hinge strength foundation for vertical jump training gate", () => {
    const backSquat = synth({
      id: "barbell_back_squat",
      name: "Barbell Back Squat",
      movement_pattern: "squat",
      modality: "strength",
      muscle_groups: ["quads", "glutes"],
      tags: {
        goal_tags: ["strength"],
        attribute_tags: ["squat"],
      },
      exercise_role: "main_compound",
    });
    expect(exerciseHasVerticalJumpStrengthFoundationSignal(backSquat)).toBe(true);
    expect(exercisePassesVerticalJumpTrainingGate(backSquat)).toBe(true);
    expect(exercisePassesVerticalJumpDynamicGate(backSquat)).toBe(false);
  });

  it("rejects leg-press family from vertical jump strength foundation signal", () => {
    const legPress = synth({
      id: "leg_press",
      name: "Leg Press",
      movement_pattern: "squat",
      modality: "strength",
      equipment_required: ["leg_press"],
      muscle_groups: ["quads"],
      tags: {
        goal_tags: ["strength"],
        attribute_tags: ["squat_pattern"],
      },
      exercise_role: "main_compound",
    });
    expect(exerciseHasVerticalJumpStrengthFoundationSignal(legPress)).toBe(false);
    expect(exercisePassesVerticalJumpTrainingGate(legPress)).toBe(false);
  });

  it("detects vertical_jump intent across sport and goal maps", () => {
    expect(
      inputHasVerticalJumpSubFocus({
        sport_sub_focus: { basketball: ["vertical_jump"] },
      })
    ).toBe(true);
    expect(
      inputHasVerticalJumpSubFocus({
        goal_sub_focus: { athletic_performance: ["vertical_jump"] },
        sport_sub_focus: { cycling: ["leg_strength"] },
      })
    ).toBe(true);
    expect(
      inputHasVerticalJumpSubFocus({
        sport_sub_focus: { cycling: ["aerobic_base"] },
      })
    ).toBe(false);
  });
});
