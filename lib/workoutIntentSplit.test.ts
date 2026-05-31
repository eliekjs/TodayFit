import { describe, expect, it } from "vitest";
import {
  computeDeclaredIntentSplitFromPrefs,
  filterDeclaredSplitToUserSelectedLeaves,
} from "./workoutIntentSplit";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import { workoutSessionToGeneratedWorkout } from "./dailyGeneratorAdapter";
import type { ManualPreferences } from "./types";

describe("workoutIntentSplit", () => {
  it("includes goal sub-focus slices that sum to 100%", () => {
    const split = computeDeclaredIntentSplitFromPrefs({
      sportSlugs: [],
      goalSlugs: ["muscle"],
      sportVsGoalPct: 0,
      goalMatchPrimaryPct: 100,
      goalMatchSecondaryPct: 0,
      goalMatchTertiaryPct: 0,
      orderedPrimaryLabelsForSubFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes", "Chest"] },
    });
    expect(split.filter((e) => e.kind === "goal_sub_focus").length).toBe(2);
    expect(split.reduce((s, e) => s + e.pct, 0)).toBe(100);
  });

  it("uses dual-sport priority percentages for the sport-only budget", () => {
    const split = computeDeclaredIntentSplitFromPrefs({
      sportSlugs: ["rock_climbing", "trail_running"],
      goalSlugs: [],
      sportVsGoalPct: 100,
      sportShareAmongSportsPct: [60, 40],
    });
    expect(split.find((e) => e.slug === "rock_climbing")?.pct).toBe(60);
    expect(split.find((e) => e.slug === "trail_running")?.pct).toBe(40);
  });

  it("normalizes two-goal match percentages to sum to 100% in the chart", () => {
    const split = computeDeclaredIntentSplitFromPrefs({
      sportSlugs: [],
      goalSlugs: ["strength", "muscle"],
      sportVsGoalPct: 0,
      goalMatchPrimaryPct: 50,
      goalMatchSecondaryPct: 30,
      goalMatchTertiaryPct: 20,
    });
    expect(split.length).toBe(2);
    expect(split.reduce((s, e) => s + e.pct, 0)).toBe(100);
    // ~62/38 from normalizeGoalMatchPct(50,30,20) for two goals; rounding may land 63/37
    expect(split[0]!.pct).toBeGreaterThanOrEqual(61);
    expect(split[0]!.pct).toBeLessThanOrEqual(63);
    expect(split[1]!.pct).toBe(100 - split[0]!.pct);
  });

  it("sport-only surfing sub-focuses exclude internal strength/endurance goal slices", () => {
    const split = computeDeclaredIntentSplitFromPrefs({
      sportSlugs: ["surfing"],
      goalSlugs: [],
      sportVsGoalPct: 100,
      sportSubFocusBySport: {
        surfing: ["shoulder_stability", "pop_up_power", "paddle_endurance"],
      },
    });
    expect(split.every((e) => e.kind === "sport_sub_focus")).toBe(true);
    expect(split.some((e) => e.slug.includes("strength") || e.slug === "endurance")).toBe(false);
    expect(split.reduce((s, e) => s + e.pct, 0)).toBe(100);
  });

  it("filterDeclaredSplitToUserSelectedLeaves drops parent goals when sport sub-focus dominates", () => {
    const filtered = filterDeclaredSplitToUserSelectedLeaves(
      [
        {
          slug: "surfing:shoulder_stability",
          label: "Shoulder Stability",
          weight: 0.33,
          kind: "sport_sub_focus",
          parent_slug: "surfing",
        },
        {
          slug: "strength",
          label: "Strength",
          weight: 0.34,
          kind: "goal",
        },
        {
          slug: "endurance",
          label: "Endurance",
          weight: 0.33,
          kind: "goal",
        },
      ],
      1
    );
    expect(filtered.map((e) => e.kind)).toEqual(["sport_sub_focus"]);
  });

  it("keeps generated workout header percentages on declared sub-goal weights", () => {
    const prefs: ManualPreferences = {
      primaryFocus: ["Build Strength", "Build Muscle"],
      targetBody: null,
      targetModifier: [],
      durationMinutes: 45,
      energyLevel: "medium",
      injuries: ["No restrictions"],
      upcoming: [],
      workoutStyle: [],
      subFocusByGoal: {
        "Build Strength": ["Squat"],
        "Build Muscle": ["Glutes"],
      },
      goalMatchPrimaryPct: 60,
      goalMatchSecondaryPct: 40,
      goalMatchTertiaryPct: 0,
      workoutTier: "intermediate",
    };

    const workout = workoutSessionToGeneratedWorkout(
      {
        title: "Strength",
        estimated_duration_minutes: 45,
        blocks: [
          {
            block_type: "main_strength",
            format: "straight_sets",
            items: [
              {
                exercise_id: "squat",
                exercise_name: "Squat",
                sets: 3,
                reps: 5,
                rest_seconds: 120,
                coaching_cues: "",
                reasoning_tags: ["strength"],
                session_intent_links: { goals: ["strength"] },
              },
            ],
          },
        ],
      },
      prefs,
      "w_test",
      {
        duration_minutes: 45,
        primary_goal: "strength",
        secondary_goals: ["hypertrophy"],
        goal_weights: [0.6, 0.4],
        goal_sub_focus: { strength: ["squat"], muscle: ["glutes"] },
        goal_sub_focus_weights: { strength: [1], muscle: [1] },
        energy_level: "medium",
        available_equipment: ["bodyweight"],
        injuries_or_constraints: [],
      }
    );

    expect(workout.intentSplit?.map((entry) => entry.pct)).toEqual([60, 40]);
    expect(workout.intentSplit?.every((entry) => entry.kind === "goal_sub_focus")).toBe(true);
  });
});
