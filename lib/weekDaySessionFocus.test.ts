import { describe, it, expect } from "vitest";
import {
  buildDayFocusPresetsForDay,
  buildBodyFocusSummary,
  buildGymDayFocusCardLabel,
  buildPriorityFocusSummary,
  bodyFocusLineFromBias,
  resolveDayFocusPreset,
  reorderPrimaryFocusForEmphasis,
  primaryFocusLabelsFromGoalSlugs,
  resolvedDayFocusToWorkoutParams,
  adaptiveSetupFromPlanContext,
  summarizePresetSubtitle,
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
  it("builds per-sport and per-goal presets when adaptive has sports and prefs have goals", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique", "strength"],
      rankedSportSlugs: ["surfing", "rock_climbing"],
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
    expect(presets.map((p) => p.id)).toEqual([
      "sport_emphasis_0",
      "sport_emphasis_1",
      "goal_emphasis_0",
      "goal_emphasis_1",
      "goal_emphasis_2",
      "balanced_split",
    ]);
    expect(presets.some((p) => p.id === "balanced_split")).toBe(true);
  });

  it("resolve sport_emphasis selects only that sport and sets high sport_weight", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique"],
      rankedSportSlugs: ["surfing", "rock_climbing"],
      subFocusBySport: { rock_climbing: ["grip_endurance"] },
      sportFocusPct: [60, 40],
      sportVsGoalPct: 50,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const r = resolveDayFocusPreset("sport_emphasis_1", basePrefs, adaptive);
    expect(r.sportGoalContext?.sport_weight).toBeCloseTo(0.72, 5);
    expect(r.sportGoalContext?.sport_slugs).toEqual(["rock_climbing"]);
    expect(r.sportGoalContext?.sport_sub_focus).toEqual({ rock_climbing: ["grip_endurance"] });
    expect(r.primaryFocus).toEqual(["Climbing performance"]);
  });

  it("resolve goal_emphasis with sports makes that goal the day focus", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique", "strength"],
      rankedSportSlugs: ["surfing", "rock_climbing"],
      subFocusBySport: {},
      sportFocusPct: [60, 40],
      sportVsGoalPct: 50,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const r = resolveDayFocusPreset("goal_emphasis_1", basePrefs, adaptive);
    const params = resolvedDayFocusToWorkoutParams(r, ["muscle", "strength", "mobility"], [
      50, 30, 20,
    ]);
    expect(r.primaryFocus).toEqual(["Build Strength"]);
    expect(params.orderedGoalSlugs[0]).toBe("strength");
    expect(params.sportWeightOverride).toBeCloseTo(0.14, 5);
    expect(params.goalWeightsPct[0]).toBeGreaterThan(params.goalWeightsPct[1] ?? 0);
  });

  it("resolve goal_emphasis_1 reorders primary focus", () => {
    const r = resolveDayFocusPreset("goal_emphasis_1", basePrefs, null);
    expect(r.primaryFocus[0]).toBe("Build Strength");
  });

  it("reorderPrimaryFocusForEmphasis rotates by index", () => {
    const labels = ["A", "B", "C"];
    expect(reorderPrimaryFocusForEmphasis(labels, 1)).toEqual(["B", "A", "C"]);
  });

  it("primaryFocusLabelsFromGoalSlugs maps slugs to labels", () => {
    const labels = primaryFocusLabelsFromGoalSlugs(["strength", "muscle"]);
    expect(labels[0]).toBe("Build Strength");
    expect(labels[1]).toBe("Build Muscle (Hypertrophy)");
  });

  it("resolvedDayFocusToWorkoutParams reorders goal slugs for goal_emphasis_1", () => {
    const resolved = resolveDayFocusPreset("goal_emphasis_1", basePrefs, null);
    const params = resolvedDayFocusToWorkoutParams(resolved, ["muscle", "strength", "mobility"], [
      50, 30, 20,
    ]);
    expect(params.orderedGoalSlugs[0]).toBe("strength");
    expect(params.goalWeightsPct[0]).toBeGreaterThan(params.goalWeightsPct[1] ?? 0);
  });

  it("adaptiveSetupFromPlanContext builds setup from plan fields", () => {
    const setup = adaptiveSetupFromPlanContext({
      goalSlugs: ["strength", "muscle"],
      rankedSportSlugs: ["surfing"],
      sportVsGoalPct: 40,
    });
    expect(setup?.rankedGoals[0]).toBe("strength");
    expect(setup?.rankedSportSlugs[0]).toBe("surfing");
    expect(setup?.sportVsGoalPct).toBe(40);
  });

  it("buildGymDayFocusCardLabel uses weekday and body emphasis without calendar date", () => {
    expect(buildGymDayFocusCardLabel(0, 0, "Upper", ["Pull"])).toBe("Mon · Upper (Pull)");
    expect(buildGymDayFocusCardLabel(4, 2, "Lower", [])).toBe("Fri · Lower");
    expect(buildGymDayFocusCardLabel(99, 2, "Full", [])).toBe("Gym day 3 · Full");
    expect(buildGymDayFocusCardLabel(0, 0, "Full", [], ["core"])).toBe("Mon · Core");
    expect(buildGymDayFocusCardLabel(0, 0, "Upper", [])).not.toMatch(/\d{2}-\d{2}/);
  });

  it("bodyFocusLineFromBias shows Core for core-specific focus", () => {
    expect(
      bodyFocusLineFromBias({ targetBody: "Full", targetModifier: [], specificBodyFocus: ["core"] })
    ).toBe("Core");
    expect(
      bodyFocusLineFromBias({ targetBody: "Upper", targetModifier: [], specificBodyFocus: ["core"] })
    ).toBe("Core");
    expect(bodyFocusLineFromBias({ targetBody: "Upper", targetModifier: [] })).toBe("Upper body");
  });

  it("buildDayFocusPresetsForDay uses Core in subtitles when specificBodyFocus includes core", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique"],
      rankedSportSlugs: ["surfing"],
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
      targetBody: "Full",
      targetModifier: [],
      specificBodyFocus: ["core"],
    });
    expect(presets.length).toBeGreaterThan(0);
    for (const p of presets) {
      expect(p.subtitle).toMatch(/^Core — /);
      expect(p.subtitle).not.toMatch(/^Full body — /);
    }
  });

  it("buildBodyFocusSummary fallback shows Core when specificBodyFocus includes core", () => {
    const summary = buildBodyFocusSummary(null, {
      targetBody: "Full",
      targetModifier: [],
      specificBodyFocus: ["core"],
    });
    expect(summary?.label).toBe("Core");
    expect(summary?.subtitle).toBeNull();
  });

  it("summarizePresetSubtitle strips body prefix from preset subtitles", () => {
    expect(
      summarizePresetSubtitle(
        "Upper body — this day mainly supports Climbing; goals fill the rest."
      )
    ).toBe("this day mainly supports Climbing; goals fill the rest.");
  });

  it("sport and goal emphasis presets include body line; balanced options keep descriptive subtitles", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique", "strength"],
      rankedSportSlugs: ["surfing", "rock_climbing"],
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
    expect(presets.find((p) => p.id === "sport_emphasis_0")?.subtitle).toMatch(/^Upper body — /);
    expect(presets.find((p) => p.id === "goal_emphasis_0")?.subtitle).toMatch(/^Upper body — /);
    expect(presets.find((p) => p.id === "balanced_split")?.subtitle).toMatch(/^Upper body — about 55%/);
  });

  it("buildPriorityFocusSummary uses preset label and shortened subtitle", () => {
    const summary = buildPriorityFocusSummary(
      {
        label: "Climbing first",
        subtitle: "Upper body — this day mainly supports Climbing; goals fill the rest.",
      },
      { displayTitle: "Strength - Upper Body", workoutFocus: ["Strength"] }
    );
    expect(summary?.label).toBe("Climbing first");
    expect(summary?.subtitle).toContain("Climbing");

    const balanced = buildPriorityFocusSummary(
      {
        label: "Balanced sport + goals",
        subtitle: "Upper body — about 55% sport focus and 45% goals (your Sport vs goals setting).",
      },
      { displayTitle: "Strength - Upper Body", workoutFocus: ["Strength"] }
    );
    expect(balanced?.subtitle).toContain("55% sport focus");
  });

  it("buildPriorityFocusSummary falls back to goals only from display title", () => {
    const summary = buildPriorityFocusSummary(null, {
      displayTitle: "Strength + Hypertrophy - Upper Body",
      workoutFocus: ["Strength"],
    });
    expect(summary?.label).toBe("Strength + Hypertrophy");
    expect(summary?.subtitle).toBeUndefined();
  });

  it("buildBodyFocusSummary includes modifier as subtitle", () => {
    const summary = buildBodyFocusSummary(null, {
      targetBody: "Upper",
      targetModifier: ["Push"],
    });
    expect(summary?.label).toBe("Upper body");
    expect(summary?.subtitle).toBe("Push");
  });
});
