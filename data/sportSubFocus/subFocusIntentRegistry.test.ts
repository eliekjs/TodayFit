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
  resolveCooldownPolicy,
  resolveSpeedPowerSessionTemplate,
  warmupCodPrepSelectionScore,
  exerciseIsSpeedPowerGoldenDrill,
  isVerticalJumpOnlySession,
  sessionRequiresPowerBlock,
  isSpeedSprintPowerBlockSubFocusSlug,
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

  it("maps manual goal speed/sprint slugs to sport speed archetypes", () => {
    expect(normalizeSubFocusSlug("speed_sprint")).toBe("speed");
    expect(normalizeSubFocusSlug("sprint")).toBe("speed");
    expect(normalizeSubFocusSlug("acceleration")).toBe("acceleration_power");
  });
});

describe("speed/sprint power block requirement", () => {
  it("identifies speed/sprint slugs that require power blocks", () => {
    expect(isSpeedSprintPowerBlockSubFocusSlug("speed_sprint")).toBe(true);
    expect(isSpeedSprintPowerBlockSubFocusSlug("repeat_sprint")).toBe(true);
    expect(isSpeedSprintPowerBlockSubFocusSlug("acceleration_power")).toBe(true);
    expect(isSpeedSprintPowerBlockSubFocusSlug("agility_cod")).toBe(false);
  });

  it("requires power block for manual athletic performance speed/sprint", () => {
    expect(
      sessionRequiresPowerBlock({
        primary_goal: "athletic_performance",
        goal_sub_focus: { athletic_performance: ["speed_sprint"] },
      })
    ).toBe(true);
  });

  it("requires power block for sport RSA / acceleration sub-focus", () => {
    expect(
      sessionRequiresPowerBlock({
        sport_sub_focus: { soccer: ["repeat_sprint"] },
      })
    ).toBe(true);
    expect(
      sessionRequiresPowerBlock({
        sport_sub_focus: { track_sprinting: ["acceleration_power"] },
      })
    ).toBe(true);
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
    expect(profile.requiresPowerBlock).toBe(true);
  });

  it("requires power block for manual goal speed_sprint sub-focus", () => {
    const profile = resolveBlockStructureProfile({
      primary_goal: "athletic_performance",
      goal_sub_focus: { athletic_performance: ["speed_sprint"] },
    });
    expect(profile.requiresPowerBlock).toBe(true);
    expect(profile.requiresConditioningBlock).toBe(true);
    expect(profile.suppressAccessoryBlocks).toBe(true);
  });

  it("requires conditioning and suppresses accessory for change_of_direction", () => {
    const profile = resolveBlockStructureProfile({
      primary_goal: "athletic_performance",
      sport_sub_focus: { lacrosse: ["change_of_direction"] },
    });
    expect(profile.requiresConditioningBlock).toBe(true);
    expect(profile.suppressAccessoryBlocks).toBe(true);
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

  it("never requires conditioning for hypertrophy primary even with RSA sub-focus", () => {
    const profile = resolveBlockStructureProfile({
      primary_goal: "hypertrophy",
      sport_sub_focus: { soccer: ["repeat_sprint"] },
    });
    expect(profile.requiresConditioningBlock).toBe(false);
  });

  it("requires cooldown for vertical jump and speed archetypes", () => {
    expect(
      resolveBlockStructureProfile({
        sport_sub_focus: { volleyball: ["vertical_jump"] },
      }).requiresCooldownBlock
    ).toBe(true);
    expect(
      resolveBlockStructureProfile({
        sport_sub_focus: { soccer: ["speed"] },
      }).requiresCooldownBlock
    ).toBe(true);
  });
});

describe("resolveSpeedPowerSessionTemplate", () => {
  it("enables multi power blocks and decel warmup for rugby COD + speed_power", () => {
    const template = resolveSpeedPowerSessionTemplate({
      sport_sub_focus: { rugby: ["change_of_direction", "speed_power"] },
    });
    expect(template.requiresPowerBlock).toBe(true);
    expect(template.preferMultipleIntentPowerBlocks).toBe(true);
    expect(template.warmupDecelPrep).toBe(true);
    expect(template.powerExerciseFamilies).toContain("lateral_power");
  });

  it("enables single power block for manual speed_sprint goal sub-focus", () => {
    const template = resolveSpeedPowerSessionTemplate({
      goal_sub_focus: { athletic_performance: ["speed_sprint"] },
    });
    expect(template.requiresPowerBlock).toBe(true);
    expect(template.preferMultipleIntentPowerBlocks).toBe(false);
    expect(template.warmupDecelPrep).toBe(false);
  });
});

describe("golden speed/COD exercise scoring", () => {
  const lateralBound = makeEx({
    id: "lateral_bound",
    name: "Lateral Bound",
    tags: {
      goal_tags: ["power"],
      sport_tags: ["sport_rugby"],
      energy_fit: ["high"],
      attribute_tags: ["explosive_power", "plyometric"],
    },
  });

  const backSquat = makeEx({
    id: "back_squat",
    name: "Barbell Back Squat",
    modality: "strength",
    movement_pattern: "squat",
    exercise_role: "main_compound",
    tags: {
      goal_tags: ["strength"],
      sport_tags: ["sport_rugby"],
      energy_fit: ["medium"],
    },
  });

  it("prefers lateral bound over generic squat for speed_power", () => {
    expect(subFocusExerciseSelectionScore(lateralBound, "speed_power")).toBeGreaterThan(
      subFocusExerciseSelectionScore(backSquat, "speed_power")
    );
    expect(exerciseIsSpeedPowerGoldenDrill(lateralBound)).toBe(true);
  });

  it("boosts decel/crossover prep for COD warmup scoring", () => {
    const decelStep = makeEx({
      id: "decel_step_ups",
      name: "Decel Step Ups",
      modality: "power",
      tags: {
        goal_tags: ["agility"],
        sport_tags: ["sport_rugby"],
        energy_fit: ["medium"],
        attribute_tags: ["deceleration"],
      },
    });
    expect(warmupCodPrepSelectionScore(decelStep)).toBeGreaterThan(10);
  });
});

describe("resolveCooldownPolicy", () => {
  it("requires cooldown for sport sessions at 45 min", () => {
    const policy = resolveCooldownPolicy({
      sport_slugs: ["basketball"],
      sport_sub_focus: { basketball: ["vertical_jump"] },
      duration_minutes: 45,
    });
    expect(policy.requiresCooldownBlock).toBe(true);
    expect(policy.minCooldownItems).toBe(3);
  });

  it("skips cooldown for recovery-primary sessions", () => {
    expect(
      resolveCooldownPolicy({ primary_goal: "recovery", duration_minutes: 30 }).requiresCooldownBlock
    ).toBe(false);
  });
});
