import { describe, expect, it } from "vitest";
import { subFocusChoicesForManualPrimaryGoal } from "./preferencesConstants";
import {
  countVisibleGoalSubFocusPicks,
  filterDeferredDayBodySubFocusChoices,
  goalHasDeferredDayBodySubFocuses,
  isDeferredDayBodySubFocus,
  stripDeferredDayBodySubFocuses,
} from "./deferredDayBodySubFocus";

describe("deferred day-body sub-focuses", () => {
  it("defers region chips, keeps physique muscle days and lift / quality intents", () => {
    expect(isDeferredDayBodySubFocus("Build Muscle (Hypertrophy)", "Chest")).toBe(false);
    expect(isDeferredDayBodySubFocus("Build Muscle (Hypertrophy)", "Legs")).toBe(false);
    expect(isDeferredDayBodySubFocus("Build Strength", "Squat")).toBe(false);
    expect(isDeferredDayBodySubFocus("Build Strength", "Full-body")).toBe(true);
    expect(isDeferredDayBodySubFocus("Athletic Performance", "Upper")).toBe(true);
    expect(isDeferredDayBodySubFocus("Athletic Performance", "Speed / Sprint")).toBe(false);
    expect(isDeferredDayBodySubFocus("Recovery & Mobility", "Shoulders")).toBe(false);
    expect(isDeferredDayBodySubFocus("Calisthenics", "Pull-ups")).toBe(false);
  });

  it("keeps hypertrophy muscle-day sub-goals on the first page", () => {
    const all = subFocusChoicesForManualPrimaryGoal("Build Muscle (Hypertrophy)");
    expect(all.length).toBeGreaterThan(0);
    expect(goalHasDeferredDayBodySubFocuses("Build Muscle (Hypertrophy)", all)).toBe(false);
    expect(filterDeferredDayBodySubFocusChoices("Build Muscle (Hypertrophy)", all)).toEqual([...all]);
  });

  it("keeps athletic qualities after dropping region chips", () => {
    const all = subFocusChoicesForManualPrimaryGoal("Athletic Performance");
    const kept = filterDeferredDayBodySubFocusChoices("Athletic Performance", all);
    expect(kept).toContain("Speed / Sprint");
    expect(kept).not.toContain("Upper");
    expect(kept).not.toContain("Lower");
    expect(kept).not.toContain("Full-body");
  });

  it("strips persisted region picks and renormalizes remaining pct", () => {
    const result = stripDeferredDayBodySubFocuses(
      {
        "Build Muscle (Hypertrophy)": ["Chest", "Legs"],
        "Athletic Performance": ["Speed / Sprint", "Upper"],
      },
      {
        "Build Muscle (Hypertrophy)": { Chest: 50, Legs: 50 },
        "Athletic Performance": { "Speed / Sprint": 60, Upper: 40 },
      }
    );
    expect(result.changed).toBe(true);
    expect(result.subFocusByGoal["Build Muscle (Hypertrophy)"]).toEqual(["Chest", "Legs"]);
    expect(result.subFocusByGoal["Athletic Performance"]).toEqual(["Speed / Sprint"]);
    expect(result.subFocusPctByGoal["Athletic Performance"]).toEqual({
      "Speed / Sprint": 100,
    });
  });

  it("counts only selected goals and ignores leftover keys", () => {
    const map = {
      "Build Strength": ["Squat", "Deadlift / Hinge"],
      "Build Muscle (Hypertrophy)": ["Chest", "Back", "Arms"],
    };
    expect(countVisibleGoalSubFocusPicks(map, ["Build Strength"], true)).toBe(2);
    expect(countVisibleGoalSubFocusPicks(map, ["Build Muscle (Hypertrophy)"], true)).toBe(3);
  });
});
