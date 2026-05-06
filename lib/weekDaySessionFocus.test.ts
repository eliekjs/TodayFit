import { describe, it, expect } from "vitest";
import {
  buildDayFocusPresetsForDay,
  resolveDayFocusPreset,
  reorderPrimaryFocusForEmphasis,
} from "./weekDaySessionFocus";
import type { ManualPreferences } from "./types";
import type { AdaptiveSetup } from "../context/appStateModel";

const basePrefs: ManualPreferences = {
  primaryFocus: ["Build Muscle (Hypertrophy)", "Build Strength", "Mobility & Joint Health"],
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  workoutTier: "intermediate",
  includeCreativeVariations: false,
};

describe("weekDaySessionFocus", () => {
  it("builds sport + goal presets when adaptive has sports and prefs have goals", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique", "strength"],
      rankedSportSlugs: ["surfing", null],
      subFocusBySport: {},
      sportFocusPct: [60, 40],
      sportVsGoalPct: 55,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const presets = buildDayFocusPresetsForDay({
      manualPreferences: basePrefs,
      adaptiveSetup: adaptive,
      targetBody: "Upper",
      targetModifier: [],
    });
    expect(presets.length).toBe(3);
    expect(presets.some((p) => p.id === "sport_first")).toBe(true);
    expect(presets.some((p) => p.id === "goal_first")).toBe(true);
    expect(presets.some((p) => p.id === "balanced_split")).toBe(true);
  });

  it("resolve sport_first sets high sport_weight", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique"],
      rankedSportSlugs: ["surfing", null],
      subFocusBySport: {},
      sportFocusPct: [60, 40],
      sportVsGoalPct: 50,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const r = resolveDayFocusPreset("sport_first", basePrefs, adaptive);
    expect(r.sportGoalContext?.sport_weight).toBeCloseTo(0.72, 5);
    expect(r.sportGoalContext?.sport_slugs?.length).toBeGreaterThan(0);
  });

  it("resolve goal_emphasis_1 reorders primary focus", () => {
    const r = resolveDayFocusPreset("goal_emphasis_1", basePrefs, null);
    expect(r.primaryFocus[0]).toBe("Build Strength");
  });

  it("reorderPrimaryFocusForEmphasis rotates by index", () => {
    const labels = ["A", "B", "C"];
    expect(reorderPrimaryFocusForEmphasis(labels, 1)).toEqual(["B", "A", "C"]);
  });
});
