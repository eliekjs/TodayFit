/**
 * Sub-focus intent registry: alias normalization, scoring, training gates.
 *
 * Run: npx vitest run data/sportSubFocus/subFocusIntentRegistry.test.ts
 */

import { describe, it, expect } from "vitest";
import type { Exercise } from "../../logic/workoutGeneration/types";
import {
  normalizeSubFocusSlug,
  subFocusExerciseSelectionScore,
  exercisePassesSubFocusTrainingGate,
  exerciseIsSprintOrCodDrill,
  resolveBlockStructureProfile,
  isVerticalJumpOnlySession,
} from "./subFocusIntentRegistry";
import { exerciseMatchesSportSubFocusSlug } from "../../logic/workoutGeneration/subFocusSlugMatch";

function makeEx(partial: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    movement_pattern: "locomotion",
    muscle_groups: ["legs"],
    modality: "power",
    equipment_required: ["bodyweight"],
    difficulty: 2,
    time_cost: "low",
    tags: { goal_tags: [], sport_tags: ["sport_soccer"], energy_fit: ["medium"] },
    ...partial,
  };
}

describe("normalizeSubFocusSlug", () => {
  it("maps repeat_sprint and deceleration aliases to canonical slugs", () => {
    expect(normalizeSubFocusSlug("repeat_sprint")).toBe("speed");
    expect(normalizeSubFocusSlug("deceleration")).toBe("change_of_direction");
    expect(normalizeSubFocusSlug("deceleration_control")).toBe("change_of_direction");
  });
});

describe("speed/COD scoring and gates", () => {
  const sprintDrill = makeEx({
    id: "soccer_10_yard_sprint",
    name: "10 Yard Sprint",
    tags: {
      goal_tags: ["speed"],
      sport_tags: ["sport_soccer"],
      energy_fit: ["high"],
      attribute_tags: ["sprinting", "acceleration"],
    },
  });

  const calfRaise = makeEx({
    id: "calf_raise",
    name: "Calf Raise",
    modality: "strength",
    movement_pattern: "squat",
    muscle_groups: ["calves"],
    exercise_role: "isolation",
    tags: {
      goal_tags: ["hypertrophy"],
      sport_tags: ["sport_soccer"],
      energy_fit: ["medium"],
    },
  });

  it("prefers sprint drills over isolation for repeat_sprint alias", () => {
    expect(subFocusExerciseSelectionScore(sprintDrill, "repeat_sprint")).toBeGreaterThan(
      subFocusExerciseSelectionScore(calfRaise, "repeat_sprint")
    );
  });

  it("passes training gate for sprint drills on speed sub-focus", () => {
    expect(exercisePassesSubFocusTrainingGate(sprintDrill, "repeat_sprint")).toBe(true);
    expect(exerciseIsSprintOrCodDrill(sprintDrill)).toBe(true);
  });

  it("matches soccer repeat_sprint via alias to speed tag map", () => {
    expect(exerciseMatchesSportSubFocusSlug(sprintDrill, "soccer", "repeat_sprint")).toBe(true);
  });

  const burpee = makeEx({
    id: "burpee",
    name: "Burpee",
    modality: "conditioning",
    movement_pattern: "locomotion",
    tags: {
      goal_tags: ["endurance", "athleticism"],
      sport_tags: ["sport_lacrosse"],
      energy_fit: ["high"],
      stimulus: ["plyometric", "anaerobic"],
      attribute_tags: ["intervals_hiit"],
    },
  });

  const proAgility = makeEx({
    id: "pro_agility_5_10_5",
    name: "Pro Agility 5-10-5",
    modality: "power",
    movement_pattern: "locomotion",
    tags: {
      goal_tags: ["speed"],
      sport_tags: ["sport_lacrosse"],
      energy_fit: ["high"],
      attribute_tags: ["agility", "acceleration"],
    },
  });

  it("prefers COD/sprint drills over burpee for change_of_direction", () => {
    expect(subFocusExerciseSelectionScore(proAgility, "change_of_direction")).toBeGreaterThan(
      subFocusExerciseSelectionScore(burpee, "change_of_direction")
    );
  });

  it("rejects burpee from change_of_direction training gate", () => {
    expect(exercisePassesSubFocusTrainingGate(burpee, "change_of_direction")).toBe(false);
    expect(exercisePassesSubFocusTrainingGate(proAgility, "change_of_direction")).toBe(true);
  });

  it("rejects burpee from repeat_sprint alias training gate", () => {
    expect(exercisePassesSubFocusTrainingGate(burpee, "repeat_sprint")).toBe(false);
    expect(exercisePassesSubFocusTrainingGate(sprintDrill, "repeat_sprint")).toBe(true);
  });
});

describe("block structure profile", () => {
  it("requires conditioning and suppresses accessory for repeat_sprint", () => {
    const profile = resolveBlockStructureProfile({
      primary_goal: "athletic_performance",
      sport_sub_focus: { soccer: ["repeat_sprint"] },
    });
    expect(profile.requiresConditioningBlock).toBe(true);
    expect(profile.suppressAccessoryBlocks).toBe(true);
    expect(profile.fieldDrillConditioningEligible).toBe(true);
  });

  it("requires conditioning for change_of_direction without suppressing accessory", () => {
    const profile = resolveBlockStructureProfile({
      primary_goal: "athletic_performance",
      sport_sub_focus: { lacrosse: ["change_of_direction"] },
    });
    expect(profile.requiresConditioningBlock).toBe(true);
    expect(profile.suppressAccessoryBlocks).toBe(false);
    expect(profile.fieldDrillConditioningEligible).toBe(true);
  });

  it("suppresses accessory for vertical jump only sessions", () => {
    const input = {
      primary_goal: "athletic_performance",
      sport_sub_focus: { volleyball: ["vertical_jump"] },
      secondary_goals: [],
    };
    expect(isVerticalJumpOnlySession(input)).toBe(true);
    expect(resolveBlockStructureProfile(input).suppressAccessoryBlocks).toBe(true);
  });

  it("requires accessory for hypertrophy primary", () => {
    expect(resolveBlockStructureProfile({ primary_goal: "hypertrophy" }).requiresAccessoryBlocks).toBe(
      true
    );
  });
});
