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
  sportGoalPrioritySectionNote,
  goalEmphasisPresetSubtitle,
  presetUsesEmphasisGoalWeights,
  presetUsesExclusiveDayFocus,
  EMPHASIS_GOAL_WEIGHTS_PCT,
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

  it("resolve sport_emphasis selects only that sport exclusively", () => {
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
    expect(r.sportGoalContext?.sport_weight).toBe(1);
    expect(r.sportGoalContext?.sport_slugs).toEqual(["rock_climbing"]);
    expect(r.sportGoalContext?.sport_sub_focus).toEqual({ rock_climbing: ["grip_endurance"] });
    expect(r.sportGoalContext?.goal_weights).toBeUndefined();
    expect(r.primaryFocus).toEqual(["Climbing performance"]);
    const params = resolvedDayFocusToWorkoutParams(r, ["muscle"], [50, 30, 20]);
    expect(params.exclusive).toBe(true);
    expect(params.orderedGoalSlugs).toEqual([]);
    expect(params.goalWeightsPct).toEqual([0, 0, 0]);
  });

  it("resolve goal_emphasis with sports makes that goal exclusive (no sport blend)", () => {
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
    expect(params.exclusive).toBe(true);
    expect(params.orderedGoalSlugs).toEqual(["strength"]);
    expect(params.sportWeightOverride).toBeUndefined();
    expect(params.goalWeightsPct).toEqual([100, 0, 0]);
  });

  it("resolve goal_emphasis_1 uses only that goal", () => {
    const r = resolveDayFocusPreset("goal_emphasis_1", basePrefs, null);
    expect(r.primaryFocus).toEqual(["Build Strength"]);
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

  it("resolvedDayFocusToWorkoutParams keeps only the exclusive goal slug", () => {
    const resolved = resolveDayFocusPreset("goal_emphasis_1", basePrefs, null);
    const params = resolvedDayFocusToWorkoutParams(resolved, ["muscle", "strength", "mobility"], [
      50, 30, 20,
    ]);
    expect(params.orderedGoalSlugs).toEqual(["strength"]);
    expect(params.exclusive).toBe(true);
    expect(params.goalWeightsPct).toEqual([100, 0, 0]);
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

  it("buildDayFocusPresetsForDay omits body prefix and shared goal-emphasis subtitles", () => {
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
      expect(p.subtitle).not.toMatch(/^Core — /);
      expect(p.subtitle).not.toMatch(/^Full body — /);
    }
    expect(presets.find((p) => p.id === "goal_emphasis_0")?.subtitle).toBe(goalEmphasisPresetSubtitle());
    expect(presets.find((p) => p.id === "sport_emphasis_0")?.subtitle).toBe("");
    expect(presets.find((p) => p.id === "sport_emphasis_0")?.label).toBe("Surfing");
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

  it("sport and goal emphasis presets are exclusive labels; balanced options keep descriptive subtitles", () => {
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
    expect(presets.find((p) => p.id === "sport_emphasis_0")?.subtitle).toBe("");
    expect(presets.find((p) => p.id === "goal_emphasis_0")?.subtitle).toBe(goalEmphasisPresetSubtitle());
    expect(presets.find((p) => p.id === "balanced_split")?.subtitle).toMatch(/55% sport/);
    expect(presets.find((p) => p.id === "balanced_split")?.subtitle).toMatch(/50\/30\/20/);
  });

  it("sportGoalPrioritySectionNote explains exclusive day override vs balanced presets", () => {
    expect(sportGoalPrioritySectionNote(basePrefs, null)).toContain("exclusive");
    expect(sportGoalPrioritySectionNote(basePrefs, null)).toContain("earlier pages");
    expect(sportGoalPrioritySectionNote(basePrefs, null)).toContain("global goal match");
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["physique", "strength"],
      rankedSportSlugs: ["surfing"],
      subFocusBySport: {},
      sportFocusPct: [60, 40],
      sportVsGoalPct: 55,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    expect(sportGoalPrioritySectionNote(basePrefs, adaptive)).toContain("exclusive");
  });

  it("presetUsesEmphasisGoalWeights identifies goal emphasis presets", () => {
    expect(presetUsesEmphasisGoalWeights("goal_emphasis_0")).toBe(true);
    expect(presetUsesEmphasisGoalWeights("goal_first")).toBe(true);
    expect(presetUsesEmphasisGoalWeights("balanced_goals")).toBe(false);
    expect(presetUsesEmphasisGoalWeights("balanced_split")).toBe(false);
  });

  it("presetUsesExclusiveDayFocus covers sport and goal day picks", () => {
    expect(presetUsesExclusiveDayFocus("goal_emphasis_0")).toBe(true);
    expect(presetUsesExclusiveDayFocus("sport_emphasis_0")).toBe(true);
    expect(presetUsesExclusiveDayFocus("single_goal")).toBe(true);
    expect(presetUsesExclusiveDayFocus("balanced_goals")).toBe(false);
    expect(presetUsesExclusiveDayFocus("balanced_split")).toBe(false);
  });

  it("resolve balanced_goals uses global goal weights not emphasis split", () => {
    const prefs = { ...basePrefs, goalMatchPrimaryPct: 70, goalMatchSecondaryPct: 20, goalMatchTertiaryPct: 10 };
    const r = resolveDayFocusPreset("balanced_goals", prefs, null);
    expect(r.sportGoalContext?.goal_weights?.[0]).toBeCloseTo(0.7, 5);
    const params = resolvedDayFocusToWorkoutParams(r, ["muscle", "strength", "mobility"], [70, 20, 10]);
    expect(params.exclusive).toBe(false);
    expect(params.orderedGoalSlugs).toEqual(["muscle", "strength", "mobility"]);
  });

  it("resolve goal_emphasis uses exclusive 100% weights", () => {
    const r = resolveDayFocusPreset("goal_emphasis_1", basePrefs, null);
    expect(r.sportGoalContext?.goal_weights?.[0]).toBeCloseTo(EMPHASIS_GOAL_WEIGHTS_PCT[0] / 100, 5);
    expect(r.sportGoalContext?.goal_weights?.[1]).toBe(0);
  });

  it("buildPriorityFocusSummary uses preset label and shortened subtitle", () => {
    const summary = buildPriorityFocusSummary(
      {
        label: "Climbing",
        subtitle: "",
      },
      { displayTitle: "Strength - Upper Body", workoutFocus: ["Strength"] }
    );
    expect(summary?.label).toBe("Climbing");
    expect(summary?.subtitle).toBeNull();

    const balanced = buildPriorityFocusSummary(
      {
        label: "Balanced sport + goals",
        subtitle: "About 55% sport / 45% goals; goal share uses your 50/30/20% settings.",
      },
      { displayTitle: "Strength - Upper Body", workoutFocus: ["Strength"] }
    );
    expect(balanced?.subtitle).toContain("55% sport");
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
