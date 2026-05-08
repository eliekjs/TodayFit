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
