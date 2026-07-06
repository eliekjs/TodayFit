import { describe, expect, it } from "vitest";
import {
  detectDaySessionFocusConflict,
  dayHasUnresolvedSessionFocusConflict,
  mergeDaySubFocusOverride,
} from "./daySessionFocusConflict";
import type { ManualPreferences } from "./types";
import {
  getSubFocusBodyRegion,
  isLowerBodySubFocusSlug,
  subFocusRegionConflictsWithDay,
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
      focusPresetId: "goal_emphasis_0",
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
