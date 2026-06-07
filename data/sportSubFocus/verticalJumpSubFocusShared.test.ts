import { describe, it, expect } from "vitest";
import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  exerciseEligibleForVerticalJumpSession,
  exerciseHasLowerBodyPlyoJumpSignal,
  exerciseIsMedBallPowerThrow,
  exercisePassesVerticalJumpDynamicGate,
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
