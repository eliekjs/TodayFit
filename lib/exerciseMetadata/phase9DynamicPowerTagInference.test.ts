import { describe, expect, it } from "vitest";
import type { ExerciseDefinition } from "../types";
import { exerciseDefinitionToGeneratorExercise } from "../dailyGeneratorAdapter";
import { tagSetHasDynamicPowerSignal } from "../../data/sportSubFocus/subFocusIntentArchetypes";
import {
  inferPhase9DynamicPowerTags,
  shouldRunPhase9DynamicPowerInference,
} from "./phase9DynamicPowerTagInference";
import { exerciseInferenceInputFromDefinition } from "./phase1MovementInference";

function partialDef(overrides: Partial<ExerciseDefinition> & Pick<ExerciseDefinition, "id" | "name">): ExerciseDefinition {
  return {
    muscles: ["legs"],
    modalities: ["conditioning"],
    equipment: ["bodyweight"],
    tags: [],
    ...overrides,
  } as ExerciseDefinition;
}

function exerciseTagSet(ex: ReturnType<typeof exerciseDefinitionToGeneratorExercise>): Set<string> {
  const tags = new Set<string>();
  for (const t of ex.tags.attribute_tags ?? []) tags.add(t.toLowerCase().replace(/\s/g, "_"));
  for (const t of ex.tags.stimulus ?? []) tags.add(t.toLowerCase().replace(/\s/g, "_"));
  for (const t of ex.tags.goal_tags ?? []) tags.add(t.toLowerCase().replace(/\s/g, "_"));
  return tags;
}

describe("phase9DynamicPowerTagInference", () => {
  it("tags lateral shuffle with agility and dynamic power signal", () => {
    const def = partialDef({ id: "lateral_shuffle", name: "Lateral Shuffle", modalities: ["conditioning"] });
    const input = exerciseInferenceInputFromDefinition(def);
    const ex = exerciseDefinitionToGeneratorExercise(def);
    expect(shouldRunPhase9DynamicPowerInference(input, ex)).toBe(true);
    const inferred = inferPhase9DynamicPowerTags(input, ex);
    expect(inferred.attribute_tags).toContain("agility");
    expect(tagSetHasDynamicPowerSignal(exerciseTagSet(ex))).toBe(true);
  });

  it("tags skater jump with plyometric stimulus", () => {
    const def = partialDef({
      id: "ff_bodyweight_skater_jump",
      name: "Skater Jump",
      modalities: ["power"],
    });
    const ex = exerciseDefinitionToGeneratorExercise(def);
    expect(ex.tags.stimulus).toContain("plyometric");
    expect(tagSetHasDynamicPowerSignal(exerciseTagSet(ex))).toBe(true);
  });

  it("does not tag skater squat as agility drill", () => {
    const def = partialDef({
      id: "ff_bodyweight_skater_squat",
      name: "Skater Squat",
      modalities: ["strength"],
    });
    const input = exerciseInferenceInputFromDefinition(def);
    expect(shouldRunPhase9DynamicPowerInference(input, { modality: "strength", movement_patterns: [] })).toBe(
      false
    );
    const ex = exerciseDefinitionToGeneratorExercise(def);
    expect(exerciseTagSet(ex).has("agility")).toBe(false);
  });

  it("tags sprint drill with speed", () => {
    const def = partialDef({
      id: "ph9_max_velocity_sprint",
      name: "Max Velocity Sprint",
      modalities: ["conditioning"],
    });
    const ex = exerciseDefinitionToGeneratorExercise(def);
    expect(ex.tags.attribute_tags).toEqual(expect.arrayContaining(["speed", "sprinting"]));
    expect(tagSetHasDynamicPowerSignal(exerciseTagSet(ex))).toBe(true);
  });
});
