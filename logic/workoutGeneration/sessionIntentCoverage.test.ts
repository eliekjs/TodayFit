/**
 * Session intent: goals ↔ exercises helpers.
 *
 * Run: npx vitest run logic/workoutGeneration/sessionIntentCoverage.test.ts
 */

import { describe, it, expect } from "vitest";
import type { WorkoutBlock } from "../../lib/types";
import type { Exercise } from "./types";
import type { GenerateWorkoutInput } from "./types";
import {
  allocateFitnessGoalsToSlots,
  annotateSessionIntentLinksOnBlocks,
  buildFallbackSessionIntentLinks,
  buildWorkoutItemSessionIntentLinks,
  collectActiveGoalSubFocusKeys,
  collectDeclaredSportSubFocuses,
  collectUniqueSessionGoals,
  computeSessionIntentLinks,
  exerciseMatchesDeclaredGoal,
  exerciseSatisfiesSessionIntent,
  goalSubFocusKeysForPrimary,
} from "./sessionIntentCoverage";

describe("sessionIntentCoverage", () => {
  it("collectUniqueSessionGoals dedupes primary and secondaries", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "strength",
      secondary_goals: ["hypertrophy", "strength"],
      energy_level: "medium",
      available_equipment: ["barbell"],
      injuries_or_constraints: [],
    };
    expect(collectUniqueSessionGoals(input)).toEqual(["strength", "hypertrophy"]);
  });

  it("collectActiveGoalSubFocusKeys unions keys for all session goals", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      energy_level: "medium",
      available_equipment: ["barbell"],
      injuries_or_constraints: [],
    };
    const keys = collectActiveGoalSubFocusKeys(input);
    expect(keys.has("muscle")).toBe(true);
    expect(keys.has("strength")).toBe(true);
    expect(keys.has("hypertrophy")).toBe(true);
  });

  it("goalSubFocusKeysForPrimary maps power to conditioning sub-focus bucket", () => {
    expect(goalSubFocusKeysForPrimary("power")).toContain("conditioning");
  });

  it("exerciseMatchesDeclaredGoal reads goal_tags and modality fallbacks", () => {
    const ex: Exercise = {
      id: "x",
      name: "Test",
      movement_pattern: "squat",
      muscle_groups: [],
      modality: "strength",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: { goal_tags: ["strength"] },
    };
    expect(exerciseMatchesDeclaredGoal(ex, "strength")).toBe(true);
    expect(exerciseMatchesDeclaredGoal(ex, "hypertrophy")).toBe(false);
  });

  it("computeSessionIntentLinks picks up sub-focus overlap", () => {
    const ex: Exercise = {
      id: "leg_press",
      name: "Leg Press",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      modality: "hypertrophy",
      equipment_required: ["leg_press"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["hypertrophy", "strength"], attribute_tags: ["squat"] },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      energy_level: "medium",
      available_equipment: ["leg_press"],
      injuries_or_constraints: [],
      goal_sub_focus: { muscle: ["legs"] },
    };
    const links = computeSessionIntentLinks(ex, input);
    expect(links.goals).toContain("hypertrophy");
    expect(links.sub_focus.some((s) => s.goal_slug === "muscle" && s.sub_slug === "legs")).toBe(true);
  });

  it("collectDeclaredSportSubFocuses merges session_intent and legacy sport_sub_focus", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      sport_sub_focus: { trail_running: ["ankle_stability"] },
      session_intent: {
        selected_goals: ["athletic_performance"],
        selected_sports: ["trail_running"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { trail_running: ["uphill_endurance"] },
      },
    };
    const rows = collectDeclaredSportSubFocuses(input);
    const keys = new Set(rows.map((r) => `${r.parent_slug}:${r.slug}`));
    expect(keys.has("trail_running:uphill_endurance")).toBe(true);
    expect(keys.has("trail_running:ankle_stability")).toBe(true);
  });

  it("allocateFitnessGoalsToSlots respects weights (10 slots, 50/30/20)", () => {
    const goals = ["strength", "hypertrophy", "endurance"] as const;
    const weights = [0.5, 0.3, 0.2];
    const seq = allocateFitnessGoalsToSlots([...goals], weights, 10, 42);
    const counts = { strength: 0, hypertrophy: 0, endurance: 0 };
    for (const g of seq) counts[g as keyof typeof counts]++;
    expect(counts.strength).toBe(5);
    expect(counts.hypertrophy).toBe(3);
    expect(counts.endurance).toBe(2);
  });

  it("buildFallbackSessionIntentLinks carries declared sport sub-focuses without exercise metadata", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["athletic_performance"],
        selected_sports: ["cycling"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { cycling: ["threshold"] },
      },
    };
    const links = buildFallbackSessionIntentLinks(input, "accessory");
    expect(links.declared_sport_sub_focuses?.some((d) => d.slug === "threshold")).toBe(true);
    expect(links.intent_inferred).toBe(true);
  });

  it("annotateSessionIntentLinksOnBlocks uses fallback when exercise is missing from map", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["athletic_performance"],
        selected_sports: ["cycling"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { cycling: ["threshold"] },
      },
    };
    const block: WorkoutBlock = {
      block_type: "accessory",
      format: "superset",
      title: "Accessory",
      items: [
        {
          exercise_id: "not-in-annotation-map",
          exercise_name: "Ghost Move",
          sets: 3,
          reps: 8,
          rest_seconds: 60,
          coaching_cues: "",
          unilateral: false,
        },
      ],
    };
    annotateSessionIntentLinksOnBlocks([block], input, new Map());
    expect(block.items[0].session_intent_links?.declared_sport_sub_focuses?.length).toBeGreaterThan(0);
  });

  it("buildWorkoutItemSessionIntentLinks attaches declared_sport_sub_focuses for UI chips", () => {
    const ex: Exercise = {
      id: "squat",
      name: "Back Squat",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      modality: "strength",
      equipment_required: ["barbell"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["athleticism"], attribute_tags: ["squat_pattern"] },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "medium",
      available_equipment: ["barbell"],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["athletic_performance"],
        selected_sports: ["basketball"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { basketball: ["vertical_jump", "core_stability"] },
        ranked_intent_entries: [
          { kind: "goal", slug: "athletic_performance", rank: 1, weight: 0.5, tag_slugs: ["athleticism", "power"] },
          {
            kind: "sport_sub_focus",
            slug: "vertical_jump",
            parent_slug: "basketball",
            rank: 2,
            weight: 0.25,
            tag_slugs: ["nonexistent_tag_for_test"],
          },
        ],
      },
    };
    const links = buildWorkoutItemSessionIntentLinks(ex, input, "main_strength");
    expect(links.declared_sport_sub_focuses?.length).toBe(2);
    expect(links.declared_sport_sub_focuses?.some((d) => d.slug === "vertical_jump")).toBe(true);
  });

  it("exerciseSatisfiesSessionIntent accepts sport-tagged exercises when sport_slugs set", () => {
    const ex: Exercise = {
      id: "climb",
      name: "Hangboard",
      movement_pattern: "pull",
      muscle_groups: [],
      modality: "strength",
      equipment_required: [],
      difficulty: 3,
      time_cost: "low",
      tags: { goal_tags: ["strength"], sport_tags: ["rock_climbing"] },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      sport_slugs: ["rock_climbing"],
    };
    expect(exerciseSatisfiesSessionIntent(ex, input)).toBe(true);
  });
});
