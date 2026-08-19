import { describe, expect, it } from "vitest";
import type { AdaptiveSetup } from "../context/appStateModel";
import type { ManualPreferences } from "./types";
import {
  assignBodyPicksAcrossDays,
  overlayUserDayFocusPicks,
  recommendWeekDayFocus,
  recommendWeeklyBodyFocusMode,
  weekFocusRecommendationSeed,
} from "./weekDayFocusRecommendation";
import {
  canCombineDayBodyFocus,
  dayBodyFocusChoicesToBias,
  buildDayFocusPresetsForDay,
  manualPreferencesForSportWeekFocus,
  toggleDayBodyFocusPick,
} from "./weekDaySessionFocus";
import { canonicalizePrimaryFocusLabel } from "./goalSlugMapping";

const basePrefs: ManualPreferences = {
  primaryFocus: ["Build Muscle (Hypertrophy)", "Recovery & Mobility"],
  targetBody: "Full",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  subFocusByGoal: {
    "Build Muscle (Hypertrophy)": ["Glutes", "Shoulders"],
  },
  workoutStyle: [],
  goalMatchPrimaryPct: 50,
  goalMatchSecondaryPct: 30,
  goalMatchTertiaryPct: 20,
  workoutTier: "intermediate",
  includeCreativeVariations: false,
};

describe("canonicalizePrimaryFocusLabel", () => {
  it("maps informal hypertrophy/recovery labels and sport-mode ids", () => {
    expect(canonicalizePrimaryFocusLabel("hypertrophy")).toBe("Build Muscle (Hypertrophy)");
    expect(canonicalizePrimaryFocusLabel("Hypertrophy")).toBe("Build Muscle (Hypertrophy)");
    expect(canonicalizePrimaryFocusLabel("recovery")).toBe("Recovery & Mobility");
    expect(canonicalizePrimaryFocusLabel("muscle")).toBe("Build Muscle (Hypertrophy)");
    expect(canonicalizePrimaryFocusLabel("recovery_mobility")).toBe("Recovery & Mobility");
    expect(canonicalizePrimaryFocusLabel("Build visible muscle")).toBe("Build Muscle (Hypertrophy)");
  });
});

describe("week day goal presets", () => {
  it("shows hypertrophy and recovery as day options instead of Standard session", () => {
    const presets = buildDayFocusPresetsForDay({
      manualPreferences: basePrefs,
      adaptiveSetup: null,
      targetBody: "Full",
      targetModifier: [],
      bodyChoiceIds: ["glutes"],
    });
    expect(presets.map((p) => p.id)).toEqual([
      "goal_emphasis_0",
      "goal_emphasis_1",
      "balanced_goals",
    ]);
    expect(presets.find((p) => p.id === "goal_emphasis_0")?.label).toBe("Build Muscle (Hypertrophy)");
    expect(presets.find((p) => p.id === "goal_emphasis_0")?.subtitle).toMatch(/Glutes/);
    expect(presets.find((p) => p.id === "goal_emphasis_1")?.label).toBe("Recovery & Mobility");
    expect(presets.some((p) => p.id === "default")).toBe(false);
  });

  it("surfaces Bench under Strength on an Upper day", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      primaryFocus: ["Build Strength"],
      subFocusByGoal: { "Build Strength": ["Bench / Press"] },
    };
    const presets = buildDayFocusPresetsForDay({
      manualPreferences: prefs,
      adaptiveSetup: null,
      targetBody: "Upper",
      targetModifier: [],
      bodyChoiceIds: ["upper"],
    });
    const single = presets.find((p) => p.id === "single_goal");
    expect(single?.label).toMatch(/Build Strength/);
    expect(single?.subtitle).toMatch(/Bench/);
  });

  it("recovers goals from adaptive slugs when primaryFocus is empty", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["muscle", "recovery_mobility"],
      rankedSportSlugs: [null, null],
      subFocusBySport: {},
      sportFocusPct: [60, 40],
      sportVsGoalPct: 50,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const empty: ManualPreferences = { ...basePrefs, primaryFocus: [], subFocusByGoal: {} };
    const resolved = manualPreferencesForSportWeekFocus(empty, adaptive);
    expect(resolved.primaryFocus).toEqual([
      "Build Muscle (Hypertrophy)",
      "Recovery & Mobility",
    ]);
    const presets = buildDayFocusPresetsForDay({
      manualPreferences: empty,
      adaptiveSetup: adaptive,
      targetBody: "Full",
      targetModifier: [],
    });
    expect(presets.some((p) => p.label === "Build Muscle (Hypertrophy)")).toBe(true);
    expect(presets.some((p) => p.label === "Recovery & Mobility")).toBe(true);
    expect(presets.some((p) => p.id === "default")).toBe(false);
  });

  it("ignores blank primaryFocus entries so adaptive goals still surface", () => {
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["muscle", "recovery_mobility"],
      rankedSportSlugs: [null, null],
      subFocusBySport: {},
      sportFocusPct: [60, 40],
      sportVsGoalPct: 50,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const blanks: ManualPreferences = { ...basePrefs, primaryFocus: ["", ""], subFocusByGoal: {} };
    const presets = buildDayFocusPresetsForDay({
      manualPreferences: blanks,
      adaptiveSetup: adaptive,
      targetBody: "Full",
      targetModifier: [],
    });
    expect(presets.map((p) => p.label)).toEqual(
      expect.arrayContaining(["Build Muscle (Hypertrophy)", "Recovery & Mobility"])
    );
  });
});

describe("dayBodyFocusChoicesToBias", () => {
  it("merges glutes + shoulders into a full-body combo with both specifics", () => {
    const bias = dayBodyFocusChoicesToBias(["glutes", "shoulders"]);
    expect(bias.targetBody).toBe("Full");
    expect(bias.specificBodyFocus).toEqual(expect.arrayContaining(["glutes", "shoulders"]));
    expect(bias.targetModifier).not.toContain("Push");
    expect(bias.targetModifier).not.toContain("Pull");
  });
});

describe("canCombineDayBodyFocus", () => {
  it("allows glutes + shoulders and blocks push + pull", () => {
    expect(canCombineDayBodyFocus("glutes", "shoulders")).toBe(true);
    expect(canCombineDayBodyFocus("chest", "arms")).toBe(true);
    expect(canCombineDayBodyFocus("push", "pull")).toBe(false);
    expect(canCombineDayBodyFocus("pull", "push")).toBe(false);
    expect(canCombineDayBodyFocus("glutes", "glutes")).toBe(false);
    expect(canCombineDayBodyFocus("full", "chest")).toBe(false);
    expect(canCombineDayBodyFocus("upper", "lower")).toBe(false);
    expect(canCombineDayBodyFocus("lower", "upper")).toBe(false);
    expect(canCombineDayBodyFocus("legs", "quad")).toBe(false);
    expect(canCombineDayBodyFocus("quad", "posterior")).toBe(false);
    expect(canCombineDayBodyFocus("quad", "push")).toBe(true);
  });
});

describe("toggleDayBodyFocusPick", () => {
  it("switches Upper to Lower instead of no-op or combining", () => {
    expect(toggleDayBodyFocusPick(["upper"], "lower")).toEqual(["lower"]);
  });

  it("switches Push to Pull instead of leaving Push selected", () => {
    expect(toggleDayBodyFocusPick(["push"], "pull")).toEqual(["pull"]);
  });

  it("still combines compatible areas", () => {
    expect(toggleDayBodyFocusPick(["glutes"], "shoulders")).toEqual(["glutes", "shoulders"]);
  });

  it("replaces a two-area combo when picking a third option", () => {
    expect(toggleDayBodyFocusPick(["glutes", "shoulders"], "chest")).toEqual(["chest"]);
  });
});

describe("assignBodyPicksAcrossDays", () => {
  it("prioritizes selected units then fills remaining days with other splits", () => {
    const days = assignBodyPicksAcrossDays(
      ["glutes", "shoulders"],
      3,
      ["chest", "back", "shoulders", "arms", "legs", "glutes"]
    );
    expect(days.flat()).toEqual(["shoulders", "glutes", "chest"]);
  });

  it("uses as many unique splits as there are days instead of combining", () => {
    const days = assignBodyPicksAcrossDays(
      ["chest", "back", "glutes"],
      2,
      ["chest", "back", "shoulders", "arms", "legs", "glutes"]
    );
    expect(days).toEqual([["chest"], ["glutes"]]);
  });

  it("spreads muscle days evenly between upper and lower", () => {
    const days = assignBodyPicksAcrossDays(
      [],
      4,
      ["chest", "back", "shoulders", "arms", "legs", "glutes"]
    );
    const ids = days.flat();
    const upper = ids.filter((id) => ["chest", "back", "shoulders", "arms"].includes(id));
    const lower = ids.filter((id) => ["legs", "glutes"].includes(id));
    expect(upper).toHaveLength(2);
    expect(lower).toHaveLength(2);
    expect(ids).toEqual(["chest", "legs", "back", "glutes"]);
  });

  it("rotates leftover days instead of filling with full body", () => {
    const days = assignBodyPicksAcrossDays([], 4, ["push", "pull", "legs"]);
    expect(days).toEqual([["push"], ["pull"], ["legs"], ["push"]]);
  });
});

describe("recommendWeekDayFocus", () => {
  it("recommends muscle mode from hypertrophy body-part sub-goals", () => {
    expect(recommendWeeklyBodyFocusMode(basePrefs)).toBe("muscle");
  });

  it("keeps Region mode for strength lifts so Upper is not collapsed to Push", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      primaryFocus: ["Build Strength"],
      weeklyBodyFocusMode: undefined,
      subFocusByGoal: { "Build Strength": ["Bench / Press"] },
    };
    expect(recommendWeeklyBodyFocusMode(prefs)).toBe("region");
    const plan = recommendWeekDayFocus({
      gymDays: 2,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: false,
    });
    expect(plan.mode).toBe("region");
    expect(plan.days.flatMap((d) => d.bodyIds)).toContain("upper");
    expect(plan.days.flatMap((d) => d.bodyIds)).not.toContain("push");
    const upperDays = plan.days.filter((d) => d.bodyIds.includes("upper"));
    expect(upperDays.length).toBeGreaterThan(0);
    for (const day of upperDays) {
      expect(Object.values(day.subFocusByGoal ?? {}).flat()).toContain("Bench / Press");
      expect(day.summary).toMatch(/Bench/);
      expect(day.summary.toLowerCase()).toMatch(/upper/);
    }
  });

  it("preselects featured goals across days instead of blend-all-goals", () => {
    const plan = recommendWeekDayFocus({
      gymDays: 3,
      manualPreferences: basePrefs,
      adaptiveSetup: null,
    });
    expect(plan.days.map((d) => d.goalPresetId)).toEqual([
      "goal_emphasis_0",
      "goal_emphasis_1",
      "goal_emphasis_0",
    ]);
    expect(plan.days.every((d) => d.goalPresetId !== "balanced_goals")).toBe(true);
  });

  it("spreads goals and selected sub-focuses across the week", () => {
    const plan = recommendWeekDayFocus({
      gymDays: 3,
      manualPreferences: basePrefs,
      adaptiveSetup: null,
      dedicateDays: true,
    });
    expect(plan.mode).toBe("muscle");
    expect(plan.days).toHaveLength(3);
    const featured = plan.days.map((d) => d.goalLabel);
    expect(featured).toEqual(
      expect.arrayContaining(["Build Muscle (Hypertrophy)", "Recovery & Mobility"])
    );
    const bodies = plan.days.flatMap((d) => d.bodyIds);
    expect(bodies).toEqual(expect.arrayContaining(["glutes", "shoulders"]));
    expect(new Set(bodies).size).toBe(3);
    expect(plan.days.every((d) => d.bodyIds.length === 1)).toBe(true);
    expect(bodies).not.toContain("core");
    expect(plan.days.some((d) => d.summary.toLowerCase().includes("hypertrophy") || d.summary.toLowerCase().includes("recovery"))).toBe(
      true
    );
  });

  it("keeps Overhead Press on covering upper days and drops it on Pull/Legs", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      primaryFocus: ["Build Strength"],
      weeklyBodyFocusMode: "pattern",
      subFocusByGoal: { "Build Strength": ["Overhead Press"] },
    };
    const plan = recommendWeekDayFocus({
      gymDays: 3,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: false,
    });
    const bodies = plan.days.flatMap((d) => d.bodyIds);
    expect(bodies).toContain("push");
    for (const day of plan.days) {
      const subs = Object.values(day.subFocusByGoal ?? {}).flat();
      if (day.bodyIds.includes("push") || day.bodyIds.includes("upper")) {
        expect(subs).toContain("Overhead Press");
      } else {
        expect(subs).not.toContain("Overhead Press");
      }
    }
  });

  it("seeds Muscle mode with Shoulders when Overhead Press is selected", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      primaryFocus: ["Build Strength"],
      weeklyBodyFocusMode: "muscle",
      subFocusByGoal: { "Build Strength": ["Overhead Press"] },
    };
    const plan = recommendWeekDayFocus({
      gymDays: 3,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: false,
    });
    expect(plan.days.flatMap((d) => d.bodyIds)).toContain("shoulders");
    const shoulderDays = plan.days.filter((d) => d.bodyIds.includes("shoulders"));
    expect(shoulderDays.length).toBeGreaterThan(0);
    for (const day of shoulderDays) {
      expect(Object.values(day.subFocusByGoal ?? {}).flat()).toContain("Overhead Press");
    }
  });

  it("preselects a different split each day and rotates leftover pattern days", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      weeklyBodyFocusMode: "pattern",
      subFocusByGoal: {},
    };
    const plan = recommendWeekDayFocus({
      gymDays: 4,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: true,
    });
    expect(plan.days.map((d) => d.bodyIds)).toEqual([
      ["push"],
      ["pull"],
      ["legs"],
      ["push"],
    ]);
  });

  it("spreads muscle-group days evenly between upper and lower", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      weeklyBodyFocusMode: "muscle",
      subFocusByGoal: {},
    };
    const plan = recommendWeekDayFocus({
      gymDays: 4,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: false,
    });
    const bodies = plan.days.flatMap((d) => d.bodyIds);
    const upper = bodies.filter((id) => ["chest", "back", "shoulders", "arms"].includes(id));
    const lower = bodies.filter((id) => ["legs", "glutes"].includes(id));
    expect(upper).toHaveLength(2);
    expect(lower).toHaveLength(2);
    expect(bodies).toEqual(["chest", "legs", "back", "glutes"]);
  });

  it("does not recommend core as its own day", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      weeklyBodyFocusMode: "muscle",
      subFocusByGoal: {},
    };
    const plan = recommendWeekDayFocus({
      gymDays: 7,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: false,
    });
    const bodies = plan.days.flatMap((d) => d.bodyIds);
    expect(bodies).not.toContain("core");
    expect(bodies.filter((id) => id === "full")).toEqual([]);
    expect(new Set(bodies).size).toBeGreaterThan(1);
  });

  it("tags a body pick on recovery days that are not body-part specific", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      subFocusByGoal: {
        "Recovery & Mobility": ["Hips"],
      },
    };
    const plan = recommendWeekDayFocus({
      gymDays: 2,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: true,
    });
    expect(plan.days.every((d) => d.bodyIds.length >= 1)).toBe(true);
  });

  it("does not dump opposing muscle sub-goals onto a Chest day", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      subFocusByGoal: {
        "Build Muscle (Hypertrophy)": ["Chest", "Glutes"],
      },
    };
    const plan = recommendWeekDayFocus({
      gymDays: 2,
      manualPreferences: prefs,
      adaptiveSetup: null,
      dedicateDays: true,
    });
    const chestDays = plan.days.filter((d) => d.bodyIds.length === 1 && d.bodyIds[0] === "chest");
    for (const day of chestDays) {
      const subs = Object.values(day.subFocusByGoal ?? {}).flat();
      expect(subs).not.toContain("Glutes");
    }
  });

  it("changes recommendation seed when goals or sub-focuses change", () => {
    const a = weekFocusRecommendationSeed({
      manualPreferences: basePrefs,
      adaptiveSetup: null,
    });
    const b = weekFocusRecommendationSeed({
      manualPreferences: {
        ...basePrefs,
        subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Chest"] },
      },
      adaptiveSetup: null,
    });
    expect(a).not.toBe(b);
    expect(
      weekFocusRecommendationSeed({
        manualPreferences: basePrefs,
        adaptiveSetup: null,
      })
    ).toBe(a);
  });

  it("pairs lower/legs days with skiing, not climbing endurance, and keeps strength as an option", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      primaryFocus: ["Build Strength", "Improve Endurance"],
      weeklyBodyFocusMode: "pattern",
      subFocusByGoal: {
        "Improve Endurance": ["Zone 2 / Long steady"],
      },
    };
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["strength", "endurance"],
      rankedSportSlugs: ["rock_climbing", "backcountry_skiing"],
      subFocusBySport: {
        rock_climbing: ["pull_strength", "endurance_stamina"],
        backcountry_skiing: [],
      },
      sportFocusPct: [50, 50],
      sportVsGoalPct: 70,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const plan = recommendWeekDayFocus({
      gymDays: 3,
      manualPreferences: prefs,
      adaptiveSetup: adaptive,
    });
    const legs = plan.days.find((d) => d.bodyIds.includes("legs"));
    expect(legs?.goalPresetId).toBe("sport_emphasis_1");
    expect(legs?.goalLabel).toMatch(/ski|splitboard/i);
    const pull = plan.days.find((d) => d.bodyIds.includes("pull"));
    expect(pull?.goalPresetId).toBe("sport_emphasis_0");
    const push = plan.days.find((d) => d.bodyIds.includes("push"));
    expect(push?.goalPresetId).not.toMatch(/goal_emphasis_1/);
    const pushPresets = buildDayFocusPresetsForDay({
      manualPreferences: prefs,
      adaptiveSetup: adaptive,
      targetBody: "Upper",
      targetModifier: ["Push"],
      bodyChoiceIds: ["push"],
    });
    expect(pushPresets.some((p) => p.id === "goal_emphasis_0")).toBe(true);
    const endurancePreset = pushPresets.find((p) => /endurance/i.test(p.label));
    expect(endurancePreset?.subtitle ?? "").not.toMatch(/zone 2/i);
  });

  it("does not treat leftover Zone 2 as a ranked week goal", () => {
    const prefs: ManualPreferences = {
      ...basePrefs,
      primaryFocus: ["Build Strength"],
      weeklyBodyFocusMode: "pattern",
      subFocusByGoal: {
        "Improve Endurance": ["Zone 2 / Long steady"],
      },
    };
    const adaptive: AdaptiveSetup = {
      rankedGoals: ["strength"],
      rankedSportSlugs: ["rock_climbing"],
      subFocusBySport: { rock_climbing: ["endurance_stamina"] },
      sportFocusPct: [100, 0],
      sportVsGoalPct: 70,
      intensityLevel: "medium",
      injuryStatus: "ok",
      injuryTypes: [],
    };
    const plan = recommendWeekDayFocus({
      gymDays: 3,
      manualPreferences: prefs,
      adaptiveSetup: adaptive,
    });
    expect(plan.days.some((d) => /zone 2/i.test(d.summary))).toBe(false);
    expect(plan.days.some((d) => /endurance/i.test(d.goalLabel ?? "") && !/climb/i.test(d.goalLabel ?? ""))).toBe(
      false
    );
  });

  it("keeps a locked Legs pick when the recommendation would auto-fill Full", () => {
    const rec = recommendWeekDayFocus({
      gymDays: 3,
      manualPreferences: {
        ...basePrefs,
        weeklyBodyFocusMode: "pattern",
        primaryFocus: ["Build Strength"],
      },
      adaptiveSetup: null,
    });
    const merged = overlayUserDayFocusPicks({
      gymDays: 3,
      recommendation: {
        ...rec,
        days: rec.days.map((d) => ({ ...d, bodyIds: ["full"] })),
      },
      existingBodyPicks: [["legs"], [], []],
      existingFocusIds: ["sport_emphasis_1", "", ""],
      lockedDays: [true, false, false],
    });
    expect(merged.bodyPicks[0]).toEqual(["legs"]);
    expect(merged.focusIds[0]).toBe("sport_emphasis_1");
    expect(merged.bodyPicks[1]).toEqual(["full"]);
    expect(merged.lockedDays[0]).toBe(true);
    expect(merged.lockedDays[1]).toBe(false);
  });
});
