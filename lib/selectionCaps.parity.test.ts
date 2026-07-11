/**
 * Shared Goal↔Sport selection caps and end-to-end sub-goal fidelity.
 *
 * Caps: both modes allow MAX_RANKED_GOALS goals and MAX_TOTAL_SUB_GOALS total
 * sub-goals (biased to Sport Mode's former week ceiling).
 *
 * Run: npx vitest run lib/selectionCaps.parity.test.ts
 */

import { describe, expect, it } from "vitest";
import type { ManualPreferences } from "./types";
import type { GymProfile } from "../data/gymProfiles";
import {
  MAX_RANKED_GOALS,
  MAX_SUB_GOALS_PER_PARENT,
  MAX_TOTAL_SUB_GOALS,
  countTotalSubGoalPicks,
} from "./selectionCaps";
import {
  MAX_TOTAL_SUB_GOALS_DAY,
  MAX_TOTAL_SUB_GOALS_WEEK,
} from "./sportModeOneDayValidation";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import { STUB_EXERCISES } from "../logic/workoutGeneration/exerciseStub";
import { collectDeclaredSportSubFocuses } from "../logic/workoutGeneration/sessionIntentCoverage";

const GYM: GymProfile = {
  id: "test",
  name: "Test Gym",
  equipment: [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable_machine",
    "squat_rack",
    "leg_press",
    "kettlebells",
  ],
};

const FULL_GOAL_MODE_PREFS: ManualPreferences = {
  primaryFocus: [
    "Build Strength",
    "Build Muscle (Hypertrophy)",
    "Athletic Performance",
  ],
  subFocusByGoal: {
    "Build Strength": ["Squat", "Deadlift / Hinge"],
    "Build Muscle (Hypertrophy)": ["Glutes", "Back"],
    "Athletic Performance": ["Vertical jump"],
  },
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 60,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  workoutTier: "intermediate",
};

describe("shared Goal↔Sport selection caps", () => {
  it("exposes the higher shared ceilings (3 goals, 5 total sub-goals)", () => {
    expect(MAX_RANKED_GOALS).toBe(3);
    expect(MAX_TOTAL_SUB_GOALS).toBe(5);
    expect(MAX_SUB_GOALS_PER_PARENT).toBe(3);
    expect(MAX_TOTAL_SUB_GOALS_DAY).toBe(MAX_TOTAL_SUB_GOALS);
    expect(MAX_TOTAL_SUB_GOALS_WEEK).toBe(MAX_TOTAL_SUB_GOALS);
  });

  it("counts total sub-goal picks across goal and sport maps", () => {
    expect(
      countTotalSubGoalPicks(
        { "Build Strength": ["Squat", "Pull"] },
        { volleyball: ["vertical_jump", "shoulder_stability"], surfing: ["paddle_endurance"] }
      )
    ).toBe(5);
  });
});

describe("goal mode: max goals + sub-goals reach adapter and generation", () => {
  it("accepts 3 goals and 5 total sub-goals under the shared cap", () => {
    expect(FULL_GOAL_MODE_PREFS.primaryFocus.length).toBe(MAX_RANKED_GOALS);
    expect(countTotalSubGoalPicks(FULL_GOAL_MODE_PREFS.subFocusByGoal)).toBe(MAX_TOTAL_SUB_GOALS);
  });

  it("maps every selected sub-goal into goal_sub_focus and ranked_intent_entries", () => {
    const input = manualPreferencesToGenerateWorkoutInput(FULL_GOAL_MODE_PREFS, GYM, 101);
    expect(input.primary_goal).toBe("strength");
    expect(input.secondary_goals?.length).toBeGreaterThanOrEqual(1);
    expect((input.secondary_goals?.length ?? 0) + 1).toBeLessThanOrEqual(MAX_RANKED_GOALS);

    const mergedSlugs = Object.values(input.goal_sub_focus ?? {}).flat();
    for (const slug of ["squat", "deadlift_hinge", "glutes", "back", "vertical_jump"]) {
      expect(mergedSlugs).toContain(slug);
    }

    const rankedSubs = (input.session_intent?.ranked_intent_entries ?? [])
      .filter((e) => e.kind === "goal_sub_focus")
      .map((e) => e.slug);
    for (const slug of ["squat", "deadlift_hinge", "glutes", "back", "vertical_jump"]) {
      expect(rankedSubs).toContain(slug);
    }
    expect(rankedSubs.length).toBeGreaterThanOrEqual(MAX_TOTAL_SUB_GOALS);
  });

  it("generates a workout that keeps all five sub-goals on session intent and links some training items", () => {
    const input = manualPreferencesToGenerateWorkoutInput(FULL_GOAL_MODE_PREFS, GYM, 202);
    const session = generateWorkoutSession(input, STUB_EXERCISES);
    expect(session.blocks.length).toBeGreaterThan(0);

    const intentSubs = Object.values(input.session_intent?.goal_sub_focus_by_goal ?? {}).flat();
    expect(new Set(intentSubs).size).toBeGreaterThanOrEqual(MAX_TOTAL_SUB_GOALS);

    const trainingItems = session.blocks
      .filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown")
      .flatMap((b) => b.items);

    const matchedSubSlugs = new Set<string>();
    for (const item of trainingItems) {
      for (const mi of item.session_intent_links?.matched_intents ?? []) {
        if (mi.kind === "goal_sub_focus" && mi.slug) matchedSubSlugs.add(mi.slug);
      }
      for (const sf of item.session_intent_links?.sub_focus ?? []) {
        if (sf.sub_slug) matchedSubSlugs.add(sf.sub_slug);
      }
    }
    // Stub pool is limited; require at least one declared sub-goal to surface on training work.
    expect(matchedSubSlugs.size).toBeGreaterThanOrEqual(1);
    for (const slug of matchedSubSlugs) {
      expect(intentSubs).toContain(slug);
    }
  });
});

describe("sport mode: shared sub-goal ceiling reaches adapter and generation", () => {
  const sportPrefs: ManualPreferences = {
    primaryFocus: ["Build Strength"],
    subFocusByGoal: {
      "Build Strength": ["Squat", "Pull-ups / Pull"],
    },
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 60,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    workoutStyle: [],
    workoutTier: "intermediate",
  };

  const sportCtx = {
    sport_slugs: ["volleyball", "basketball"] as string[],
    sport_sub_focus: {
      volleyball: ["vertical_jump", "shoulder_stability"],
      basketball: ["lateral_speed"],
    },
    sport_weight: 0.55,
    sport_focus_pct: [50, 50] as [number, number],
  };

  it("stays within the shared total sub-goal ceiling across goals + sports", () => {
    const total =
      countTotalSubGoalPicks(sportPrefs.subFocusByGoal) +
      countTotalSubGoalPicks(sportCtx.sport_sub_focus);
    expect(total).toBe(MAX_TOTAL_SUB_GOALS);
  });

  it("surfaces every sport and goal sub-focus in ranked intent", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      sportPrefs,
      GYM,
      303,
      undefined,
      sportCtx
    );
    const ranked = input.session_intent?.ranked_intent_entries ?? [];
    const sportSubs = ranked.filter((e) => e.kind === "sport_sub_focus").map((e) => e.slug);
    const goalSubs = ranked.filter((e) => e.kind === "goal_sub_focus").map((e) => e.slug);

    expect(sportSubs).toEqual(
      expect.arrayContaining(["vertical_jump", "shoulder_stability", "lateral_speed"])
    );
    // Squat should remain as a goal sub; pull may remain unless duplicated by a sport tag.
    expect(goalSubs).toContain("squat");

    const declared = collectDeclaredSportSubFocuses(input);
    const declaredKeys = new Set(declared.map((r) => `${r.parent_slug}:${r.slug}`));
    expect(declaredKeys.has("volleyball:vertical_jump")).toBe(true);
    expect(declaredKeys.has("volleyball:shoulder_stability")).toBe(true);
    expect(declaredKeys.has("basketball:lateral_speed")).toBe(true);
  });

  it("generates a workout with sport sub-focuses reflected on training items", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      sportPrefs,
      GYM,
      404,
      undefined,
      sportCtx
    );
    const session = generateWorkoutSession(input, STUB_EXERCISES);
    const trainingItems = session.blocks
      .filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown")
      .flatMap((b) => b.items);

    const matchedSportSubs = new Set<string>();
    for (const item of trainingItems) {
      for (const mi of item.session_intent_links?.matched_intents ?? []) {
        if (mi.kind === "sport_sub_focus" && mi.slug) matchedSportSubs.add(mi.slug);
      }
      for (const d of item.session_intent_links?.declared_sport_sub_focuses ?? []) {
        if (d.slug) matchedSportSubs.add(d.slug);
      }
    }
    expect(matchedSportSubs.size).toBeGreaterThanOrEqual(1);
  });
});
