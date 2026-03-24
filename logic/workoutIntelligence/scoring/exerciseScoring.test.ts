import { describe, expect, it } from "vitest";
import { scoreExerciseForSelection } from "./exerciseScoring";
import { createSessionSelectionState } from "./fatigueTracking";
import type { ExerciseWithQualities } from "../types";

function makeExercise(overrides: Partial<ExerciseWithQualities>): ExerciseWithQualities {
  return {
    id: "ex",
    name: "Exercise",
    movement_pattern: "pull",
    muscle_groups: ["back"],
    equipment_required: [],
    training_quality_weights: {},
    fatigue_cost: "medium",
    modality: "strength",
    ...overrides,
  };
}

describe("exercise scoring sport transfer", () => {
  it("prefers climbing transfer exercises over squat-dominant lower lifts", () => {
    const state = createSessionSelectionState("moderate", { max_same_pattern_per_session: 4 });
    const baseInput = {
      blockQualities: { weights: { pulling_strength: 1, grip_strength: 0.8, core_tension: 0.7 } },
      blockType: "main_strength",
      targetMovementPatterns: ["pull", "hinge", "squat"],
      stimulusProfile: "sport_support_strength" as const,
      state,
      recentExerciseIds: new Set<string>(),
      sports: ["ice_climbing"],
      sportSubFocus: { ice_climbing: ["pull_strength", "grip_endurance"] },
    };

    const pull = makeExercise({
      id: "weighted_pull_up",
      movement_pattern: "pull",
      muscle_groups: ["lats", "back", "biceps", "forearms"],
      training_quality_weights: { pulling_strength: 0.95, grip_strength: 0.7, lockoff_strength: 0.6 },
    });
    const squat = makeExercise({
      id: "barbell_back_squat",
      movement_pattern: "squat",
      muscle_groups: ["quads", "glutes", "hamstrings"],
      training_quality_weights: { max_strength: 0.9, unilateral_strength: 0.2 },
    });

    const pullScore = scoreExerciseForSelection({ ...baseInput, exercise: pull }).score;
    const squatScore = scoreExerciseForSelection({ ...baseInput, exercise: squat }).score;

    expect(pullScore).toBeGreaterThan(squatScore);
  });

  it("uses selected sport sub-focus tags to favor movement-specific matches", () => {
    const state = createSessionSelectionState("moderate", { max_same_pattern_per_session: 3 });
    const baseInput = {
      blockQualities: { weights: { aerobic_base: 0.9, unilateral_strength: 0.8, trunk_endurance: 0.5 } },
      blockType: "main_strength",
      targetMovementPatterns: ["squat", "hinge", "lunge"],
      stimulusProfile: "sport_support_strength" as const,
      state,
      recentExerciseIds: new Set<string>(),
      sports: ["cycling"],
      sportSubFocus: { cycling: ["leg_strength"] },
    };

    const splitSquat = makeExercise({
      id: "db_split_squat",
      movement_pattern: "lunge",
      movement_patterns: ["lunge"],
      muscle_groups: ["quads", "glutes"],
      training_quality_weights: { unilateral_strength: 0.9, trunk_endurance: 0.4 },
      attribute_tags: ["single_leg_strength", "squat_pattern", "glute_strength"],
    });
    const pushPress = makeExercise({
      id: "barbell_push_press",
      movement_pattern: "vertical_push",
      movement_patterns: ["vertical_push"],
      muscle_groups: ["shoulders", "triceps"],
      training_quality_weights: { power: 0.7, pushing_strength: 0.8 },
      attribute_tags: ["vertical_push"],
    });

    const cyclingMatch = scoreExerciseForSelection({ ...baseInput, exercise: splitSquat }).score;
    const nonMatch = scoreExerciseForSelection({ ...baseInput, exercise: pushPress }).score;
    expect(cyclingMatch).toBeGreaterThan(nonMatch);
  });

  it("applies sport demand fallback when no sub-focus is selected", () => {
    const state = createSessionSelectionState("moderate", { max_same_pattern_per_session: 3 });
    const baseInput = {
      blockQualities: { weights: { power: 0.7, max_strength: 0.5, unilateral_strength: 0.4 } },
      blockType: "main_strength",
      targetMovementPatterns: ["squat", "hinge"],
      stimulusProfile: "sport_support_strength" as const,
      state,
      recentExerciseIds: new Set<string>(),
      sports: ["track_sprinting"],
      sportSubFocus: {},
    };

    const explosiveLift = makeExercise({
      id: "box_jump",
      movement_pattern: "squat",
      muscle_groups: ["quads", "glutes"],
      training_quality_weights: { power: 0.95, rate_of_force_development: 0.9 },
      attribute_tags: ["explosive_power", "plyometric"],
    });
    const lowTransferLift = makeExercise({
      id: "seated_row",
      movement_pattern: "horizontal_pull",
      muscle_groups: ["back", "biceps"],
      training_quality_weights: { pulling_strength: 0.8 },
      attribute_tags: ["horizontal_pull"],
    });

    const sprintMatch = scoreExerciseForSelection({ ...baseInput, exercise: explosiveLift }).score;
    const lowerTransfer = scoreExerciseForSelection({ ...baseInput, exercise: lowTransferLift }).score;
    expect(sprintMatch).toBeGreaterThan(lowerTransfer);
  });
});
