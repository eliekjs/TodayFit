/**
 * Resilience regional anatomy + conditioning threshold / upper-body power matching.
 *
 * Run: npx vitest run logic/workoutGeneration/subFocusResilienceThreshold.test.ts
 */

import { describe, it, expect } from "vitest";
import type { Exercise } from "./types";
import { exerciseMatchesGoalSubFocusSlugUnified } from "./subFocusSlugMatch";
import { exerciseHasSubFocusSlug } from "../../data/goalSubFocus";

describe("resilience regional anatomy (Recovery goal → resilience slug)", () => {
  it("matches t_spine from stretch_targets thoracic_spine without recovery tag", () => {
    const ex: Exercise = {
      id: "cat_camel",
      name: "Cat Camel",
      movement_pattern: "locomotion",
      muscle_groups: ["core"],
      modality: "mobility",
      equipment_required: [],
      difficulty: 1,
      time_cost: "low",
      tags: { goal_tags: ["mobility"], attribute_tags: ["mobility"] },
      stretch_targets: ["thoracic_spine", "low_back"],
    };
    expect(exerciseMatchesGoalSubFocusSlugUnified(ex, "resilience", "t_spine")).toBe(true);
  });

  it("matches lower_back from anti_rotation attribute", () => {
    const ex: Exercise = {
      id: "pallof",
      name: "Pallof",
      movement_pattern: "anti_rotation",
      muscle_groups: ["core"],
      modality: "strength",
      equipment_required: ["cable_machine"],
      difficulty: 2,
      time_cost: "low",
      tags: { goal_tags: ["strength"], attribute_tags: ["anti_rotation", "core_stability"] },
    };
    expect(exerciseMatchesGoalSubFocusSlugUnified(ex, "resilience", "lower_back")).toBe(true);
  });

  it("matches ankles from stretch_targets calves", () => {
    const ex: Exercise = {
      id: "calf_stretch",
      name: "Calf stretch wall",
      movement_pattern: "locomotion",
      muscle_groups: ["calves"],
      modality: "recovery",
      equipment_required: [],
      difficulty: 1,
      time_cost: "low",
      tags: { goal_tags: ["recovery"], attribute_tags: ["mobility"] },
      stretch_targets: ["calves"],
    };
    expect(exerciseMatchesGoalSubFocusSlugUnified(ex, "resilience", "ankles")).toBe(true);
  });
});

describe("conditioning threshold_tempo + upper_body_power", () => {
  it("threshold_tempo matches lactate_threshold attribute", () => {
    const ex: Exercise = {
      id: "zone2_rower",
      name: "Zone 2 Rower",
      movement_pattern: "hinge",
      muscle_groups: ["legs", "core"],
      modality: "conditioning",
      equipment_required: ["rower"],
      difficulty: 2,
      time_cost: "medium",
      tags: {
        goal_tags: ["conditioning"],
        attribute_tags: ["zone2_aerobic_base", "lactate_threshold"],
        stimulus: ["aerobic_zone2"],
      },
    };
    expect(exerciseHasSubFocusSlug(ex, "threshold_tempo")).toBe(true);
    expect(exerciseMatchesGoalSubFocusSlugUnified(ex, "conditioning", "threshold_tempo")).toBe(true);
    expect(exerciseMatchesGoalSubFocusSlugUnified(ex, "endurance", "threshold_tempo")).toBe(true);
  });

  it("upper_body_power matches plyometric + chest", () => {
    const ex: Exercise = {
      id: "medicine_ball_chest_pass",
      name: "Medicine ball chest pass",
      movement_pattern: "push",
      muscle_groups: ["chest", "shoulders"],
      modality: "power",
      equipment_required: ["medicine_ball"],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["power"],
        stimulus: ["plyometric"],
        attribute_tags: ["push"],
      },
      primary_movement_family: "upper_push",
    };
    expect(exerciseHasSubFocusSlug(ex, "upper_body_power")).toBe(true);
    expect(exerciseMatchesGoalSubFocusSlugUnified(ex, "conditioning", "upper_body_power")).toBe(true);
  });
});
