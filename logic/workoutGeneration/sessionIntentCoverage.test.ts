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

  it("computeSessionIntentLinks ties sport sub-focus chips to sport_tags + sub-focus map (not generic overlap)", () => {
    const ex: Exercise = {
      id: "row_like",
      name: "Row-like pull accessory",
      movement_pattern: "pull",
      muscle_groups: ["back"],
      modality: "strength",
      equipment_required: ["cable_machine"],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["strength"],
        sport_tags: ["rock_climbing"],
        attribute_tags: ["grip_endurance"],
      },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      available_equipment: ["cable_machine"],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["strength"],
        selected_sports: ["rock_climbing"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { rock_climbing: ["finger_strength", "endurance_stamina"] },
        ranked_intent_entries: [
          {
            kind: "sport_sub_focus",
            slug: "finger_strength",
            parent_slug: "rock_climbing",
            rank: 1,
            weight: 0.5,
            tag_slugs: [],
          },
          {
            kind: "sport_sub_focus",
            slug: "endurance_stamina",
            parent_slug: "rock_climbing",
            rank: 2,
            weight: 0.5,
            tag_slugs: [],
          },
        ],
      },
    };
    const links = computeSessionIntentLinks(ex, input);
    const subs = (links.matched_intents ?? []).filter((m) => m.kind === "sport_sub_focus");
    expect(subs.some((m) => m.slug === "endurance_stamina")).toBe(true);
    expect(subs.some((m) => m.slug === "finger_strength")).toBe(false);
  });

  it("computeSessionIntentLinks skips sport sub-focus when sport_tags omit that sport (even with shared quality tags)", () => {
    const ex: Exercise = {
      id: "generic_upper",
      name: "Generic accessory",
      movement_pattern: "push",
      muscle_groups: ["shoulders"],
      modality: "hypertrophy",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["hypertrophy"],
        attribute_tags: ["grip_endurance", "finger_strength"],
      },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["hypertrophy"],
        selected_sports: ["rock_climbing"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { rock_climbing: ["finger_strength"] },
        ranked_intent_entries: [
          {
            kind: "sport_sub_focus",
            slug: "finger_strength",
            parent_slug: "rock_climbing",
            rank: 1,
            weight: 1,
            tag_slugs: [],
          },
        ],
      },
    };
    const links = computeSessionIntentLinks(ex, input);
    expect((links.matched_intents ?? []).some((m) => m.kind === "sport_sub_focus")).toBe(false);
  });

  it.each([
    ["lacrosse"],
    ["soccer"],
    ["hockey"],
  ] as const)("does not count static balance-only accessories as %s COD", (sportSlug) => {
    const ex: Exercise = {
      id: "single_leg_calf_raise",
      name: "Single-Leg Calf Raise",
      movement_pattern: "squat",
      muscle_groups: ["calves"],
      modality: "hypertrophy",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["hypertrophy"],
        sport_tags: [sportSlug],
        attribute_tags: ["balance", "single_leg_strength", "calves"],
      },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["hypertrophy"],
        selected_sports: [sportSlug],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { [sportSlug]: ["change_of_direction"] },
        ranked_intent_entries: [
          {
            kind: "sport_sub_focus",
            slug: "change_of_direction",
            parent_slug: sportSlug,
            rank: 1,
            weight: 1,
            tag_slugs: ["agility", "single_leg_strength", "balance"],
          },
        ],
      },
    };
    const links = computeSessionIntentLinks(ex, input);
    expect((links.matched_intents ?? []).some((m) => m.kind === "sport_sub_focus")).toBe(false);
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

  it("buildFallbackSessionIntentLinks omits declared sport sub-focuses without exercise metadata", () => {
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
    expect(links.declared_sport_sub_focuses?.length ?? 0).toBe(0);
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
    expect(block.items[0].session_intent_links?.intent_inferred).toBe(true);
    expect(block.items[0].session_intent_links?.declared_sport_sub_focuses?.length ?? 0).toBe(0);
  });

  it("buildWorkoutItemSessionIntentLinks omits declared sport subs when exercise does not match sport sub-focus map", () => {
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
    expect(links.declared_sport_sub_focuses?.length ?? 0).toBe(0);
  });

  it("filterMatchedIntents suppresses athletic_performance goal chip when sport sub-focus matched", () => {
    const ex: Exercise = {
      id: "med_ball_throw",
      name: "Medicine Ball Rotational Throw",
      movement_pattern: "rotate",
      muscle_groups: ["core"],
      modality: "strength",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["athleticism"],
        sport_tags: ["golf"],
        attribute_tags: ["rotation", "core_anti_rotation"],
      },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["athletic_performance"],
        selected_sports: ["golf"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { golf: ["core_rotation"] },
        ranked_intent_entries: [
          { kind: "goal", slug: "athletic_performance", rank: 1, weight: 0.5, tag_slugs: ["athleticism", "power"] },
          {
            kind: "sport_sub_focus",
            slug: "core_rotation",
            parent_slug: "golf",
            rank: 2,
            weight: 0.5,
            tag_slugs: [],
          },
        ],
      },
    };
    const links = buildWorkoutItemSessionIntentLinks(ex, input, "main_strength");
    const mis = links.matched_intents ?? [];
    expect(mis.some((m) => m.kind === "sport_sub_focus" && m.slug === "core_rotation")).toBe(true);
    expect(mis.some((m) => m.kind === "goal" && m.slug === "athletic_performance")).toBe(false);
    expect(links.session_sport_slugs).toContain("golf");
  });

  it("session_sport_slugs is populated for exercises with no sport_tags (gives UI fallback context)", () => {
    const ex: Exercise = {
      id: "overhead_cable_ext",
      name: "Overhead Cable Extension",
      movement_pattern: "push",
      muscle_groups: ["arms"],
      modality: "strength",
      equipment_required: ["cable_machine"],
      difficulty: 2,
      time_cost: "low",
      tags: { goal_tags: ["strength"] },
    };
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "medium",
      available_equipment: ["cable_machine"],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["athletic_performance"],
        selected_sports: ["golf", "volleyball"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { golf: ["core_rotation"], volleyball: ["vertical_jump"] },
        ranked_intent_entries: [
          { kind: "goal", slug: "athletic_performance", rank: 1, weight: 0.5, tag_slugs: ["athleticism", "power"] },
        ],
      },
    };
    const links = buildWorkoutItemSessionIntentLinks(ex, input, "accessory");
    expect(links.session_sport_slugs).toContain("golf");
    expect(links.session_sport_slugs).toContain("volleyball");
    expect((links.matched_intents ?? []).some((m) => m.slug === "athletic_performance")).toBe(false);
  });

  it("buildFallbackSessionIntentLinks populates session_sport_slugs", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["athletic_performance"],
        selected_sports: ["golf", "volleyball"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: {},
      },
    };
    const links = buildFallbackSessionIntentLinks(input, "accessory");
    expect(links.session_sport_slugs).toContain("golf");
    expect(links.session_sport_slugs).toContain("volleyball");
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

  it("keeps sport COD blocks from inheriting build-muscle goal assignment", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      energy_level: "medium",
      available_equipment: ["bodyweight"],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["hypertrophy"],
        selected_sports: ["lacrosse"],
        goal_sub_focus_by_goal: { muscle: ["legs"] },
        sport_sub_focus_by_sport: { lacrosse: ["change_of_direction"] },
        ranked_intent_entries: [
          {
            kind: "goal_sub_focus",
            slug: "legs",
            parent_slug: "hypertrophy",
            rank: 1,
            weight: 0.6,
            tag_slugs: ["legs"],
          },
          {
            kind: "sport_sub_focus",
            slug: "change_of_direction",
            parent_slug: "lacrosse",
            rank: 2,
            weight: 0.4,
            tag_slugs: ["agility", "speed", "explosive_power"],
          },
        ],
      },
    };
    const hypertrophyEx: Exercise = {
      id: "leg_press",
      name: "Leg Press",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      modality: "hypertrophy",
      equipment_required: [],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["hypertrophy"], attribute_tags: ["legs"] },
    };
    const codEx: Exercise = {
      id: "crossover_bounds",
      name: "Crossover Bounds",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      modality: "power",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["power", "athleticism"],
        sport_tags: ["lacrosse"],
        attribute_tags: ["agility", "speed", "explosive_power"],
        stimulus: ["plyometric"],
      },
    };
    const hypertrophyBlock: WorkoutBlock = {
      block_type: "main_hypertrophy",
      format: "straight_sets",
      title: "Main (Hypertrophy)",
      goal_intent: {
        intent_kind: "goal_sub_focus",
        parent_slug: "hypertrophy",
        goal_slug: "hypertrophy",
        sub_focus_slug: "legs",
        swap_pool_exercise_ids: ["leg_press"],
      },
      items: [
        {
          exercise_id: "leg_press",
          exercise_name: "Leg Press",
          sets: 3,
          reps: 10,
          rest_seconds: 60,
          coaching_cues: "",
          unilateral: false,
        },
      ],
    };
    const codBlock: WorkoutBlock = {
      block_type: "power",
      format: "straight_sets",
      title: "Main (Lacrosse Change Of Direction)",
      goal_intent: {
        intent_kind: "sport_sub_focus",
        parent_slug: "lacrosse",
        goal_slug: "lacrosse",
        sub_focus_slug: "change_of_direction",
        swap_pool_exercise_ids: ["crossover_bounds"],
      },
      items: [
        {
          exercise_id: "crossover_bounds",
          exercise_name: "Crossover Bounds",
          sets: 3,
          reps: 5,
          rest_seconds: 90,
          coaching_cues: "",
          unilateral: false,
        },
      ],
    };

    annotateSessionIntentLinksOnBlocks(
      [hypertrophyBlock, codBlock],
      input,
      new Map([
        ["leg_press", hypertrophyEx],
        ["crossover_bounds", codEx],
      ])
    );

    expect(hypertrophyBlock.items[0].session_intent_links?.goals ?? []).toEqual([]);
    const codLinks = codBlock.items[0].session_intent_links;
    expect(codLinks?.goals ?? []).not.toContain("hypertrophy");
    expect(codLinks?.matched_intents?.some((m) => m.kind === "sport_sub_focus" && m.slug === "change_of_direction")).toBe(true);
  });

  it("keeps strength + sport sub-focus blocks free of strength goal chips", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["strength"],
        selected_sports: ["soccer"],
        goal_sub_focus_by_goal: {},
        sport_sub_focus_by_sport: { soccer: ["acceleration"] },
      },
    };
    const ex: Exercise = {
      id: "soccer_bound",
      name: "Soccer Bound",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      modality: "power",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["strength", "power"],
        sport_tags: ["soccer"],
        attribute_tags: ["acceleration", "agility"],
      },
    };
    const block: WorkoutBlock = {
      block_type: "power",
      format: "straight_sets",
      title: "Main (Soccer Acceleration)",
      goal_intent: {
        intent_kind: "sport_sub_focus",
        parent_slug: "soccer",
        goal_slug: "soccer",
        sub_focus_slug: "acceleration",
        swap_pool_exercise_ids: ["soccer_bound"],
      },
      items: [
        {
          exercise_id: "soccer_bound",
          exercise_name: "Soccer Bound",
          sets: 3,
          reps: 5,
          rest_seconds: 90,
          coaching_cues: "",
          unilateral: false,
        },
      ],
    };
    annotateSessionIntentLinksOnBlocks([block], input, new Map([["soccer_bound", ex]]));
    const links = block.items[0].session_intent_links;
    expect(links?.goals ?? []).toEqual([]);
  });

  it("keeps non-strength + sport sub-focus blocks free of primary goal chips", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["hypertrophy"],
        selected_sports: ["basketball"],
        goal_sub_focus_by_goal: { muscle: ["shoulders"] },
        sport_sub_focus_by_sport: { basketball: ["core_rotation"] },
      },
    };
    const ex: Exercise = {
      id: "rotational_throw",
      name: "Rotational Throw",
      movement_pattern: "rotate",
      muscle_groups: ["core"],
      modality: "power",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["hypertrophy", "power"],
        sport_tags: ["basketball"],
        attribute_tags: ["rotation", "core_rotation"],
      },
    };
    const block: WorkoutBlock = {
      block_type: "power",
      format: "straight_sets",
      title: "Main (Basketball Core Rotation)",
      goal_intent: {
        intent_kind: "sport_sub_focus",
        parent_slug: "basketball",
        goal_slug: "basketball",
        sub_focus_slug: "core_rotation",
        swap_pool_exercise_ids: ["rotational_throw"],
      },
      items: [
        {
          exercise_id: "rotational_throw",
          exercise_name: "Rotational Throw",
          sets: 3,
          reps: 6,
          rest_seconds: 90,
          coaching_cues: "",
          unilateral: false,
        },
      ],
    };
    annotateSessionIntentLinksOnBlocks([block], input, new Map([["rotational_throw", ex]]));
    const links = block.items[0].session_intent_links;
    expect(links?.goals ?? []).toEqual([]);
  });

  it("keeps multi-sub-goal dedicated blocks separated from fitness-goal chips", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 50,
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      goal_weights: [0.7, 0.3],
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["hypertrophy", "strength"],
        selected_sports: [],
        goal_sub_focus_by_goal: { muscle: ["chest", "back"] },
        sport_sub_focus_by_sport: {},
      },
    };
    const chestEx: Exercise = {
      id: "incline_press",
      name: "Incline Press",
      movement_pattern: "push",
      muscle_groups: ["chest"],
      modality: "hypertrophy",
      equipment_required: [],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["hypertrophy", "strength"], attribute_tags: ["chest"] },
    };
    const backEx: Exercise = {
      id: "chest_supported_row",
      name: "Chest Supported Row",
      movement_pattern: "pull",
      muscle_groups: ["back"],
      modality: "hypertrophy",
      equipment_required: [],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["hypertrophy", "strength"], attribute_tags: ["back"] },
    };
    const blocks: WorkoutBlock[] = [
      {
        block_type: "main_hypertrophy",
        format: "straight_sets",
        title: "Main (Chest)",
        goal_intent: {
          goal_slug: "hypertrophy",
          goal_sub_focus_key: "muscle",
          sub_focus_slug: "chest",
          swap_pool_exercise_ids: ["incline_press"],
        },
        items: [
          {
            exercise_id: "incline_press",
            exercise_name: "Incline Press",
            sets: 3,
            reps: 10,
            rest_seconds: 75,
            coaching_cues: "",
            unilateral: false,
          },
        ],
      },
      {
        block_type: "main_hypertrophy",
        format: "straight_sets",
        title: "Main (Back)",
        goal_intent: {
          goal_slug: "hypertrophy",
          goal_sub_focus_key: "muscle",
          sub_focus_slug: "back",
          swap_pool_exercise_ids: ["chest_supported_row"],
        },
        items: [
          {
            exercise_id: "chest_supported_row",
            exercise_name: "Chest Supported Row",
            sets: 3,
            reps: 10,
            rest_seconds: 75,
            coaching_cues: "",
            unilateral: false,
          },
        ],
      },
    ];
    annotateSessionIntentLinksOnBlocks(
      blocks,
      input,
      new Map([
        ["incline_press", chestEx],
        ["chest_supported_row", backEx],
      ])
    );
    for (const block of blocks) {
      expect(block.items[0].session_intent_links?.goals ?? []).toEqual([]);
    }
  });

  it("regression: dedicated sub-intent blocks never show mixed goal + sub-intent chips", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      goal_weights: [0.6, 0.4],
      energy_level: "medium",
      available_equipment: [],
      injuries_or_constraints: [],
      session_intent: {
        selected_goals: ["hypertrophy", "strength"],
        selected_sports: ["basketball"],
        goal_sub_focus_by_goal: { muscle: ["legs"] },
        sport_sub_focus_by_sport: { basketball: ["core_rotation"] },
      },
    };
    const legEx: Exercise = {
      id: "split_squat",
      name: "Split Squat",
      movement_pattern: "squat",
      muscle_groups: ["legs"],
      modality: "hypertrophy",
      equipment_required: [],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["hypertrophy", "strength"], attribute_tags: ["legs"] },
    };
    const sportEx: Exercise = {
      id: "med_ball_rotation",
      name: "Med Ball Rotation",
      movement_pattern: "rotate",
      muscle_groups: ["core"],
      modality: "power",
      equipment_required: [],
      difficulty: 2,
      time_cost: "low",
      tags: {
        goal_tags: ["hypertrophy", "power"],
        sport_tags: ["basketball"],
        attribute_tags: ["core_rotation", "rotation"],
      },
    };
    const blocks: WorkoutBlock[] = [
      {
        block_type: "main_hypertrophy",
        format: "straight_sets",
        title: "Main (Legs)",
        goal_intent: {
          intent_kind: "goal_sub_focus",
          parent_slug: "hypertrophy",
          goal_slug: "hypertrophy",
          goal_sub_focus_key: "muscle",
          sub_focus_slug: "legs",
          swap_pool_exercise_ids: ["split_squat"],
        },
        items: [
          {
            exercise_id: "split_squat",
            exercise_name: "Split Squat",
            sets: 3,
            reps: 10,
            rest_seconds: 75,
            coaching_cues: "",
            unilateral: false,
          },
        ],
      },
      {
        block_type: "power",
        format: "straight_sets",
        title: "Main (Basketball Core Rotation)",
        goal_intent: {
          intent_kind: "sport_sub_focus",
          parent_slug: "basketball",
          goal_slug: "basketball",
          sub_focus_slug: "core_rotation",
          swap_pool_exercise_ids: ["med_ball_rotation"],
        },
        items: [
          {
            exercise_id: "med_ball_rotation",
            exercise_name: "Med Ball Rotation",
            sets: 3,
            reps: 5,
            rest_seconds: 90,
            coaching_cues: "",
            unilateral: false,
          },
        ],
      },
    ];

    annotateSessionIntentLinksOnBlocks(
      blocks,
      input,
      new Map([
        ["split_squat", legEx],
        ["med_ball_rotation", sportEx],
      ])
    );

    for (const block of blocks) {
      const links = block.items[0].session_intent_links;
      const hasGoalChip = (links?.goals?.length ?? 0) > 0 || (links?.matched_intents ?? []).some((m) => m.kind === "goal");
      const hasSubIntentChip =
        (links?.sub_focus?.length ?? 0) > 0 ||
        (links?.matched_intents ?? []).some(
          (m) => m.kind === "goal_sub_focus" || m.kind === "sport_sub_focus"
        );
      expect(hasGoalChip && hasSubIntentChip).toBe(false);
    }
  });
});
