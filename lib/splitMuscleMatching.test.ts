import { describe, expect, it } from "vitest";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import { matchesBodyPartFocus } from "../logic/workoutIntelligence/constraints/eligibilityHelpers";
import { exerciseMatchesHypertrophySubFocusSlug } from "../logic/workoutGeneration/subFocusSlugMatch";
import type { ExerciseWithQualities } from "../logic/workoutIntelligence/types";
import type { Exercise } from "../logic/workoutGeneration/types";
import {
  matchesMuscleSplitEmphasis,
  muscleSplitEmphasisFromFocusParts,
} from "./splitMuscleMatching";

function makeEx(
  overrides: Partial<ExerciseWithQualities> & { id: string; muscle_groups: string[] }
): ExerciseWithQualities {
  return {
    name: overrides.id,
    movement_pattern: "push",
    equipment_required: ["dumbbells"],
    training_quality_weights: {},
    ...overrides,
  };
}

describe("split muscle matching", () => {
  const bench = makeEx({
    id: "bench_press",
    movement_pattern: "push",
    muscle_groups: ["chest", "triceps"],
    primary_movement_family: "upper_push",
    movement_patterns: ["horizontal_push"],
    pairing_category: "chest",
  });
  const ohp = makeEx({
    id: "oh_press",
    movement_pattern: "push",
    muscle_groups: ["push"],
    primary_movement_family: "upper_push",
    movement_patterns: ["vertical_push"],
    pairing_category: "shoulders",
    tags: { attribute_tags: ["overhead_press"] },
  });
  const curl = makeEx({
    id: "db_curl",
    movement_pattern: "pull",
    muscle_groups: ["biceps"],
    primary_movement_family: "upper_pull",
    pairing_category: "biceps",
  });
  const row = makeEx({
    id: "cable_row",
    movement_pattern: "pull",
    muscle_groups: ["lats", "biceps"],
    primary_movement_family: "upper_pull",
    movement_patterns: ["horizontal_pull"],
    pairing_category: "back",
  });
  const hipThrust = makeEx({
    id: "hip_thrust",
    movement_pattern: "hinge",
    muscle_groups: ["legs"],
    primary_movement_family: "lower_body",
    movement_patterns: ["hinge"],
    pairing_category: "glutes",
    fatigue_regions: ["glutes"],
  });
  const squat = makeEx({
    id: "back_squat",
    movement_pattern: "squat",
    muscle_groups: ["quads", "glutes"],
    primary_movement_family: "lower_body",
    movement_patterns: ["squat"],
    pairing_category: "quads",
  });
  const pecsTaggedFly = makeEx({
    id: "cable_fly",
    movement_pattern: "push",
    muscle_groups: ["pecs"],
    primary_movement_family: "upper_push",
    pairing_category: "chest",
  });
  const facePull = makeEx({
    id: "face_pull",
    name: "Cable Face Pull",
    movement_pattern: "pull",
    muscle_groups: ["pull"],
    primary_movement_family: "upper_pull",
  });

  it("does not treat bench triceps as an arms-day match", () => {
    expect(matchesMuscleSplitEmphasis(bench, "chest")).toBe(true);
    expect(matchesMuscleSplitEmphasis(bench, "arms")).toBe(false);
    expect(matchesMuscleSplitEmphasis(bench, "shoulders")).toBe(false);
  });

  it("keeps OHP on shoulders, not chest", () => {
    expect(matchesMuscleSplitEmphasis(ohp, "shoulders")).toBe(true);
    expect(matchesMuscleSplitEmphasis(ohp, "chest")).toBe(false);
  });

  it("maps pecs aliases to chest", () => {
    expect(matchesMuscleSplitEmphasis(pecsTaggedFly, "chest")).toBe(true);
  });

  it("keeps rows on back and curls on arms", () => {
    expect(matchesMuscleSplitEmphasis(row, "back")).toBe(true);
    expect(matchesMuscleSplitEmphasis(row, "arms")).toBe(false);
    expect(matchesMuscleSplitEmphasis(curl, "arms")).toBe(true);
    expect(matchesMuscleSplitEmphasis(curl, "back")).toBe(false);
  });

  it("matches hip thrust to glutes via pairing even when muscle_groups is coarse legs", () => {
    expect(matchesMuscleSplitEmphasis(hipThrust, "glutes")).toBe(true);
    expect(matchesMuscleSplitEmphasis(squat, "glutes")).toBe(false);
    expect(matchesMuscleSplitEmphasis(squat, "legs")).toBe(true);
  });

  it("allows face pulls on shoulder day", () => {
    expect(matchesMuscleSplitEmphasis(facePull, "shoulders")).toBe(true);
    expect(matchesMuscleSplitEmphasis(facePull, "back")).toBe(false);
  });

  it("reads muscle emphasis from generator focus_body_parts", () => {
    expect(muscleSplitEmphasisFromFocusParts(["upper_push", "chest"])).toBe("chest");
    expect(muscleSplitEmphasisFromFocusParts(["upper_push"])).toBeNull();
    expect(muscleSplitEmphasisFromFocusParts(["lower", "legs"])).toBe("legs");
    expect(muscleSplitEmphasisFromFocusParts(["lower", "glutes"])).toBe("glutes");
  });
});

describe("muscle-split hard eligibility", () => {
  function constraintsFor(focus: string[]) {
    return resolveWorkoutConstraints({
      primary_goal: "hypertrophy",
      body_region_focus: focus,
      available_equipment: ["barbell", "dumbbells", "bench"],
      duration_minutes: 45,
      energy_level: "medium",
    });
  }

  const bench: ExerciseWithQualities = {
    id: "bench",
    name: "Bench",
    movement_pattern: "push",
    muscle_groups: ["chest", "triceps"],
    equipment_required: ["barbell"],
    training_quality_weights: {},
    primary_movement_family: "upper_push",
    pairing_category: "chest",
    movement_patterns: ["horizontal_push"],
  };
  const curl: ExerciseWithQualities = {
    id: "curl",
    name: "Curl",
    movement_pattern: "pull",
    muscle_groups: ["biceps"],
    equipment_required: ["dumbbells"],
    training_quality_weights: {},
    primary_movement_family: "upper_pull",
    pairing_category: "biceps",
  };
  const ohp: ExerciseWithQualities = {
    id: "ohp",
    name: "OHP",
    movement_pattern: "push",
    muscle_groups: ["shoulders"],
    equipment_required: ["barbell"],
    training_quality_weights: {},
    primary_movement_family: "upper_push",
    pairing_category: "shoulders",
    movement_patterns: ["vertical_push"],
  };

  it("excludes bench from arms days and curls from chest days", () => {
    const arms = constraintsFor(["upper_push", "upper_pull", "arms"]);
    expect(arms.allowed_muscle_emphasis).toBe("arms");
    expect(matchesBodyPartFocus(curl, arms)).toBe(true);
    expect(matchesBodyPartFocus(bench, arms)).toBe(false);

    const chest = constraintsFor(["upper_push", "chest"]);
    expect(chest.allowed_muscle_emphasis).toBe("chest");
    expect(matchesBodyPartFocus(bench, chest)).toBe(true);
    expect(matchesBodyPartFocus(ohp, chest)).toBe(false);
  });

  it("allows rear-delt family on shoulders via upper_pull", () => {
    const shoulders = constraintsFor(["upper_push", "upper_pull", "shoulders"]);
    expect(shoulders.allowed_movement_families).toEqual(
      expect.arrayContaining(["upper_push", "upper_pull"])
    );
    expect(matchesBodyPartFocus(ohp, shoulders)).toBe(true);
    expect(matchesBodyPartFocus(bench, shoulders)).toBe(false);
  });
});

describe("hypertrophy sub-focus split tags", () => {
  const bench = {
    id: "bench",
    name: "Bench",
    movement_pattern: "push",
    muscle_groups: ["push"],
    modality: "strength",
    equipment_required: [],
    difficulty: 2,
    time_cost: "medium",
    tags: { attribute_tags: ["bench_press"] },
    pairing_category: "chest",
    movement_patterns: ["horizontal_push"],
  } as Exercise;
  const ohp = {
    id: "ohp",
    name: "OHP",
    movement_pattern: "push",
    muscle_groups: ["push"],
    modality: "strength",
    equipment_required: [],
    difficulty: 2,
    time_cost: "medium",
    tags: { attribute_tags: ["overhead_press"] },
    pairing_category: "shoulders",
    movement_patterns: ["vertical_push"],
  } as Exercise;

  it("does not let generic push tags satisfy both chest and shoulders", () => {
    expect(exerciseMatchesHypertrophySubFocusSlug(bench, "chest")).toBe(true);
    expect(exerciseMatchesHypertrophySubFocusSlug(bench, "shoulders")).toBe(false);
    expect(exerciseMatchesHypertrophySubFocusSlug(ohp, "shoulders")).toBe(true);
    expect(exerciseMatchesHypertrophySubFocusSlug(ohp, "chest")).toBe(false);
  });
});
