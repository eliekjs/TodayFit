import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import type { ManualPreferences } from "./types";

const BASE: ManualPreferences = {
  primaryFocus: ["Athletic Performance"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 60,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {
    "Athletic Performance": ["Vertical jump"],
  },
  workoutStyle: [],
  workoutTier: "intermediate",
};

/** Minimal ManualPreferences with no explicit fitness goal (simulates sport-prep-only flow). */
const SPORT_ONLY_BASE: ManualPreferences = {
  primaryFocus: ["Sport preparation"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 60,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  workoutTier: "intermediate",
};

describe("buildRankedIntentEntries via manualPreferencesToGenerateWorkoutInput", () => {
  it("applies dual-sport sport_focus_pct to sport-related intent weights (volleyball > surfing when pct favors slot 2)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(BASE, undefined, 1, undefined, {
      sport_slugs: ["surfing", "volleyball"],
      sport_sub_focus: { volleyball: ["vertical_jump"] },
      sport_weight: 0.72,
      sport_focus_pct: [40, 60],
    });
    const ranked = input.session_intent!.ranked_intent_entries ?? [];
    const surf = ranked.find((e) => e.kind === "sport" && e.slug === "surfing");
    const vol = ranked.find((e) => e.kind === "sport" && e.slug === "volleyball");
    expect(surf && vol).toBeTruthy();
    expect((vol!.weight ?? 0) > (surf!.weight ?? 0)).toBe(true);
  });

  it("drops duplicate goal_sub_focus when the same sub slug is already declared on a sport", () => {
    const input = manualPreferencesToGenerateWorkoutInput(BASE, undefined, 1, undefined, {
      sport_slugs: ["surfing", "volleyball"],
      sport_sub_focus: { volleyball: ["vertical_jump"] },
      sport_weight: 0.72,
      sport_focus_pct: [40, 60],
    });
    const ranked = input.session_intent!.ranked_intent_entries ?? [];
    const dupGoalSubs = ranked.filter(
      (e) => e.kind === "goal_sub_focus" && e.slug === "vertical_jump"
    );
    expect(dupGoalSubs.length).toBe(0);
    const sportSub = ranked.filter(
      (e) =>
        e.kind === "sport_sub_focus" &&
        e.slug === "vertical_jump" &&
        e.parent_slug === "volleyball"
    );
    expect(sportSub.length).toBeGreaterThanOrEqual(1);
  });

  it("omits the bare strength goal row when Athletic Performance subs are fully covered by sport subs", () => {
    const input = manualPreferencesToGenerateWorkoutInput(BASE, undefined, 1, undefined, {
      sport_slugs: ["surfing", "volleyball"],
      sport_sub_focus: { volleyball: ["vertical_jump"] },
      sport_weight: 0.72,
      sport_focus_pct: [40, 60],
    });
    const ranked = input.session_intent!.ranked_intent_entries ?? [];
    expect(ranked.some((e) => e.kind === "goal" && e.slug === "strength")).toBe(false);
  });
});

describe("sport-only session (no explicit fitness goal)", () => {
  it("'Sport preparation' focus label maps to primary_goal = 'strength' (not 'athletic_performance')", () => {
    const input = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_BASE, undefined, 1, undefined, {
      sport_slugs: ["golf"],
      sport_sub_focus: { golf: ["rotational_power", "core_rotation"] },
    });
    expect(input.primary_goal).toBe("strength");
    expect(input.primary_goal).not.toBe("athletic_performance");
  });

  it("sport-only session elevates sport_weight to 1.0 so no fitness-goal quality blend", () => {
    const input = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_BASE, undefined, 1, undefined, {
      sport_slugs: ["golf"],
      sport_sub_focus: { golf: ["rotational_power", "core_rotation"] },
      sport_weight: 0.5, // caller provides 50% but should be overridden to 1.0 for sport-only
    });
    expect(input.sport_weight).toBe(1.0);
  });

  it("sport-only session: ranked_intent_entries contains only sport sub-focus entries (strength has zero weight)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_BASE, undefined, 1, undefined, {
      sport_slugs: ["golf"],
      sport_sub_focus: { golf: ["rotational_power", "core_rotation"] },
    });
    const ranked = input.session_intent!.ranked_intent_entries ?? [];
    const sportEntries = ranked.filter((e) => e.kind === "sport_sub_focus" || e.kind === "sport");
    expect(sportEntries.length).toBeGreaterThanOrEqual(2); // rotational_power + core_rotation
    // "strength" entry should have negligible weight (was zeroed by sport_weight=1.0)
    const strengthEntry = ranked.find((e) => e.kind === "goal" && e.slug === "strength");
    if (strengthEntry) {
      expect(strengthEntry.weight).toBeLessThan(0.01);
    }
  });

  it("sport-only session: no 'athletic_performance' entry in ranked_intent_entries", () => {
    const input = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_BASE, undefined, 1, undefined, {
      sport_slugs: ["golf"],
      sport_sub_focus: { golf: ["rotational_power", "core_rotation"] },
    });
    const ranked = input.session_intent!.ranked_intent_entries ?? [];
    expect(ranked.some((e) => e.slug === "athletic_performance")).toBe(false);
  });

  it("sport_sub_focus entries carry parent_slug (sport slug), not 'athletic_performance'", () => {
    const input = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_BASE, undefined, 1, undefined, {
      sport_slugs: ["golf"],
      sport_sub_focus: { golf: ["rotational_power", "core_rotation"] },
    });
    const ranked = input.session_intent!.ranked_intent_entries ?? [];
    const sportSubEntries = ranked.filter((e) => e.kind === "sport_sub_focus");
    for (const entry of sportSubEntries) {
      expect(entry.parent_slug).not.toBe("athletic_performance");
      expect(entry.parent_slug).toBeTruthy(); // must have a sport parent slug
    }
  });

  it("surfing paddle_endurance keeps sport_weight 1.0 (implied endurance must not break sport-only)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(SPORT_ONLY_BASE, undefined, 1, undefined, {
      sport_slugs: ["surfing"],
      sport_sub_focus: {
        surfing: ["shoulder_stability", "pop_up_power", "paddle_endurance"],
      },
      sport_weight: 0.5,
    });
    expect(input.sport_weight).toBe(1.0);
    expect(input.secondary_goals).toContain("endurance");
    const splitKinds = new Set(
      (input.session_intent?.ranked_intent_entries ?? [])
        .filter((e) => e.weight >= 0.01)
        .map((e) => e.kind)
    );
    expect(splitKinds.has("sport_sub_focus")).toBe(true);
    expect(splitKinds.has("goal")).toBe(false);
  });

  it("session with explicit fitness goal + sport keeps configured sport_weight", () => {
    const withGoal: ManualPreferences = {
      ...SPORT_ONLY_BASE,
      primaryFocus: ["Build Strength"],
    };
    const input = manualPreferencesToGenerateWorkoutInput(withGoal, undefined, 1, undefined, {
      sport_slugs: ["golf"],
      sport_sub_focus: { golf: ["rotational_power"] },
      sport_weight: 0.5,
    });
    expect(input.primary_goal).toBe("strength");
    // Explicit goal selected: sport_weight should remain as configured, not forced to 1.0
    expect(input.sport_weight).toBe(0.5);
  });
});
