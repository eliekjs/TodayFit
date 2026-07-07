import { describe, expect, it } from "vitest";
import {
  detectDaySessionFocusConflict,
  dayHasUnresolvedSessionFocusConflict,
  goalEmphasisLabelForPreset,
  mergeDaySubFocusOverride,
  reconcileDaySessionFocusConflictState,
} from "./daySessionFocusConflict";
import type { ManualPreferences } from "./types";
import {
  getSubFocusBodyRegion,
  isLowerBodySubFocusSlug,
  subFocusRegionConflictsWithDay,
  catalogSubFocusesMatchingDayRegion,
} from "./subFocusBodyRegion";

function basePrefs(overrides: Partial<ManualPreferences> = {}): ManualPreferences {
  return {
    primaryFocus: [],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: null,
    injuries: [],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
    ...overrides,
  };
}

describe("subFocusBodyRegion", () => {
  it("maps joint health and recovery regional slugs", () => {
    expect(getSubFocusBodyRegion("knee_health")).toBe("lower");
    expect(getSubFocusBodyRegion("shoulder_health")).toBe("upper");
    expect(getSubFocusBodyRegion("knees")).toBe("lower");
    expect(isLowerBodySubFocusSlug("squat")).toBe(true);
  });

  it("detects upper vs lower conflict", () => {
    expect(subFocusRegionConflictsWithDay("lower", "upper")).toBe(true);
    expect(subFocusRegionConflictsWithDay("upper", "lower")).toBe(true);
    expect(subFocusRegionConflictsWithDay("lower", "full")).toBe(false);
    expect(subFocusRegionConflictsWithDay("lower", "core")).toBe(false);
  });

  it("finds catalog subs matching a day body region", () => {
    const upperMatches = catalogSubFocusesMatchingDayRegion(
      "Strength Training for Joint Health",
      "upper"
    );
    expect(upperMatches.map((m) => m.slug)).toContain("shoulder_health");
    expect(upperMatches.map((m) => m.slug)).not.toContain("knee_health");
  });
});

describe("detectDaySessionFocusConflict", () => {
  it("flags knee health + upper body day", () => {
    const prefs = basePrefs({
      primaryFocus: ["Strength Training for Joint Health", "Build Strength"],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: prefs,
      adaptiveSetup: null,
      presetOptions: [
        {
          id: "goal_emphasis_0",
          label: "Strength Training for Joint Health first",
          subtitle: "Upper body",
        },
      ],
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.conflicting.map((c) => c.slug)).toContain("knee_health");
    expect(conflict!.resolutions.some((r) => r.label === "Switch to Full body")).toBe(true);
    expect(conflict!.resolutions.some((r) => r.label === "Switch to Lower body")).toBe(true);
    expect(
      conflict!.resolutions.some((r) =>
        r.label.includes("Shoulder Health") && r.label.includes("Upper body")
      )
    ).toBe(true);
  });

  it("no conflict for shoulder health on upper day", () => {
    const prefs = basePrefs({
      primaryFocus: ["Strength Training for Joint Health"],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Shoulder Health"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(conflict).toBeNull();
  });

  it("offers aligned joint-health subs when knee and shoulder both selected on upper day", () => {
    const prefs = basePrefs({
      primaryFocus: ["Strength Training for Joint Health"],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health", "Shoulder Health"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: prefs,
      adaptiveSetup: null,
      presetOptions: [
        {
          id: "goal_emphasis_0",
          label: "Strength Training for Joint Health first",
          subtitle: "Upper body",
        },
      ],
    });
    expect(conflict).not.toBeNull();
    expect(
      conflict!.resolutions.some((r) => r.label.includes("Shoulder Health"))
    ).toBe(true);
    expect(conflict!.resolutions[0]?.subFocusByGoalPatch).toEqual({
      "Strength Training for Joint Health": ["Shoulder Health"],
    });
  });

  it("offers emphasize other goal when it has upper subs", () => {
    const prefs = basePrefs({
      primaryFocus: ["Strength Training for Joint Health", "Build Strength"],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health"],
        "Build Strength": ["Overhead Press"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "balanced_goals",
      manualPreferences: prefs,
      adaptiveSetup: null,
      presetOptions: [
        {
          id: "goal_emphasis_0",
          label: "Strength Training for Joint Health first",
          subtitle: "Upper body",
        },
        {
          id: "goal_emphasis_1",
          label: "Build Strength first",
          subtitle: "Upper body",
        },
      ],
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.resolutions.some((r) => r.label.includes("Build Strength"))).toBe(true);
  });

  it("flags recovery mobility ankles on upper day", () => {
    const prefs = basePrefs({
      primaryFocus: ["Recovery & Mobility"],
      subFocusByGoal: {
        "Recovery & Mobility": ["Ankles"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "single_goal",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.conflicting[0]?.slug).toBe("ankles");
  });

  it("flags cross-goal lower subs on upper day when blending all ranked goals", () => {
    const prefs = basePrefs({
      primaryFocus: [
        "Strength Training for Joint Health",
        "Body Recomp (fat loss & muscle gain)",
      ],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health"],
        "Body Recomp (fat loss & muscle gain)": ["Glutes"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "balanced_goals",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.conflicting.map((c) => c.slug).sort()).toEqual(["glutes", "knee_health"]);
  });

  it("clears cross-goal conflict when emphasizing an upper-aligned goal", () => {
    const prefs = basePrefs({
      primaryFocus: [
        "Strength Training for Joint Health",
        "Body Recomp (fat loss & muscle gain)",
      ],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health"],
        "Body Recomp (fat loss & muscle gain)": ["Chest", "Back"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_1",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(conflict).toBeNull();
  });

  it("still flags emphasized goal subs that conflict with the day body focus", () => {
    const prefs = basePrefs({
      primaryFocus: [
        "Strength Training for Joint Health",
        "Body Recomp (fat loss & muscle gain)",
      ],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health"],
        "Body Recomp (fat loss & muscle gain)": ["Glutes"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_1",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.conflicting.map((c) => c.slug)).toEqual(["glutes"]);
  });

  it("offers switch sub-goal to match body on lower day with upper sub", () => {
    const prefs = basePrefs({
      primaryFocus: ["Build Strength"],
      subFocusByGoal: {
        "Build Strength": ["Overhead Press"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "lower",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(conflict).not.toBeNull();
    expect(
      conflict!.resolutions.some((r) =>
        r.label.includes("Squat") && r.label.includes("Lower body")
      )
    ).toBe(true);
    const matchDay = conflict!.resolutions.find((r) => r.id.startsWith("match_day_lower_"));
    expect(matchDay?.subFocusByGoalPatch).toEqual({
      "Build Strength": ["Squat"],
    });
  });

  it("offers multi-goal sub-goal switch when several goals conflict on one day", () => {
    const prefs = basePrefs({
      primaryFocus: [
        "Strength Training for Joint Health",
        "Body Recomp (fat loss & muscle gain)",
      ],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health"],
        "Body Recomp (fat loss & muscle gain)": ["Glutes"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "balanced_goals",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(conflict).not.toBeNull();
    const multi = conflict!.resolutions.find((r) => r.id === "match_day_upper_multi");
    expect(multi).toBeDefined();
    expect(multi!.subFocusByGoalPatch).toEqual({
      "Strength Training for Joint Health": ["Shoulder Health"],
      "Body Recomp (fat loss & muscle gain)": ["Back"],
    });
  });

  it("clears conflict on one day via override while another upper day still conflicts", () => {
    const prefs = basePrefs({
      primaryFocus: ["Strength Training for Joint Health"],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health"],
      },
    });
    const day0Override = {
      "Strength Training for Joint Health": ["Shoulder Health"],
    };
    const day0 = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: prefs,
      adaptiveSetup: null,
      subFocusByGoalOverride: day0Override,
    });
    const day1 = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: prefs,
      adaptiveSetup: null,
    });
    expect(day0).toBeNull();
    expect(day1).not.toBeNull();
  });

  it("uses per-day sub-focus overrides when detecting conflicts", () => {
    const prefs = basePrefs({
      primaryFocus: ["Strength Training for Joint Health"],
      subFocusByGoal: {
        "Strength Training for Joint Health": ["Knee Health", "Shoulder Health"],
      },
    });
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: prefs,
      adaptiveSetup: null,
      subFocusByGoalOverride: {
        "Strength Training for Joint Health": ["Shoulder Health"],
      },
    });
    expect(conflict).toBeNull();
  });
});

describe("mergeDaySubFocusOverride", () => {
  it("merges per-day override into base subs", () => {
    const merged = mergeDaySubFocusOverride(
      {
        "Strength Training for Joint Health": ["Knee Health", "Shoulder Health"],
        "Build Strength": ["Squat"],
      },
      {
        "Strength Training for Joint Health": ["Shoulder Health"],
      }
    );
    expect(merged["Strength Training for Joint Health"]).toEqual(["Shoulder Health"]);
    expect(merged["Build Strength"]).toEqual(["Squat"]);
  });
});

describe("dayHasUnresolvedSessionFocusConflict", () => {
  it("requires matching conflict id", () => {
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: basePrefs({
        primaryFocus: ["Strength Training for Joint Health"],
        subFocusByGoal: { "Strength Training for Joint Health": ["Knee Health"] },
      }),
      adaptiveSetup: null,
    });
    expect(dayHasUnresolvedSessionFocusConflict(conflict, undefined)).toBe(true);
    expect(dayHasUnresolvedSessionFocusConflict(conflict, conflict!.id)).toBe(false);
    expect(dayHasUnresolvedSessionFocusConflict(null, undefined)).toBe(false);
  });
});

describe("goalEmphasisLabelForPreset", () => {
  it("returns ranked goal label only for goal_emphasis presets", () => {
    const prefs = basePrefs({
      primaryFocus: ["Build Strength", "Body Recomp (fat loss & muscle gain)"],
    });
    expect(goalEmphasisLabelForPreset("goal_emphasis_1", prefs, null)).toBe(
      "Body Recomp (fat loss & muscle gain)"
    );
    expect(goalEmphasisLabelForPreset("balanced_goals", prefs, null)).toBeNull();
  });
});

describe("reconcileDaySessionFocusConflictState", () => {
  it("clears stale resolution when conflict is gone or id changed", () => {
    const conflict = detectDaySessionFocusConflict({
      bodyFocusId: "upper",
      focusPresetId: "goal_emphasis_0",
      manualPreferences: basePrefs({
        primaryFocus: ["Strength Training for Joint Health"],
        subFocusByGoal: { "Strength Training for Joint Health": ["Knee Health"] },
      }),
      adaptiveSetup: null,
    })!;
    expect(
      reconcileDaySessionFocusConflictState({
        conflict: null,
        resolvedId: conflict.id,
        subFocusOverride: { "Strength Training for Joint Health": ["Shoulder Health"] },
      })
    ).toEqual({ resolvedId: undefined, subFocusOverride: undefined });
    expect(
      reconcileDaySessionFocusConflictState({
        conflict,
        resolvedId: "stale_id",
        subFocusOverride: undefined,
      })
    ).toEqual({ resolvedId: undefined, subFocusOverride: undefined });
    expect(
      reconcileDaySessionFocusConflictState({
        conflict,
        resolvedId: conflict.id,
        subFocusOverride: { "Strength Training for Joint Health": ["Shoulder Health"] },
      })
    ).toEqual({
      resolvedId: conflict.id,
      subFocusOverride: { "Strength Training for Joint Health": ["Shoulder Health"] },
    });
  });
});
