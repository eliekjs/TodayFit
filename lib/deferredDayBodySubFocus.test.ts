import { describe, expect, it } from "vitest";
import { subFocusChoicesForManualPrimaryGoal } from "./preferencesConstants";
import {
  filterDeferredDayBodySubFocusChoices,
  goalHasDeferredDayBodySubFocuses,
  isDeferredDayBodySubFocus,
  stripDeferredDayBodySubFocuses,
} from "./deferredDayBodySubFocus";

describe("deferred day-body sub-focuses", () => {
  it("defers physique body-part chips, keeps lift and quality intents", () => {
    expect(isDeferredDayBodySubFocus("Build Muscle (Hypertrophy)", "Chest")).toBe(true);
    expect(isDeferredDayBodySubFocus("Build Muscle (Hypertrophy)", "Legs")).toBe(true);
    expect(isDeferredDayBodySubFocus("Build Strength", "Squat")).toBe(false);
    expect(isDeferredDayBodySubFocus("Build Strength", "Full-body")).toBe(true);
    expect(isDeferredDayBodySubFocus("Athletic Performance", "Upper")).toBe(true);
    expect(isDeferredDayBodySubFocus("Athletic Performance", "Speed / Sprint")).toBe(false);
    expect(isDeferredDayBodySubFocus("Recovery & Mobility", "Shoulders")).toBe(false);
    expect(isDeferredDayBodySubFocus("Calisthenics", "Pull-ups")).toBe(false);
  });

  it("filters hypertrophy choices down to none", () => {
    const all = subFocusChoicesForManualPrimaryGoal("Build Muscle (Hypertrophy)");
    expect(all.length).toBeGreaterThan(0);
    expect(goalHasDeferredDayBodySubFocuses("Build Muscle (Hypertrophy)", all)).toBe(true);
    expect(filterDeferredDayBodySubFocusChoices("Build Muscle (Hypertrophy)", all)).toEqual([]);
  });

  it("keeps athletic qualities after dropping region chips", () => {
    const all = subFocusChoicesForManualPrimaryGoal("Athletic Performance");
    const kept = filterDeferredDayBodySubFocusChoices("Athletic Performance", all);
    expect(kept).toContain("Speed / Sprint");
    expect(kept).not.toContain("Upper");
    expect(kept).not.toContain("Lower");
    expect(kept).not.toContain("Full-body");
  });

  it("strips persisted chest/legs picks and renormalizes remaining pct", () => {
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
    expect(result.subFocusByGoal["Build Muscle (Hypertrophy)"]).toBeUndefined();
    expect(result.subFocusByGoal["Athletic Performance"]).toEqual(["Speed / Sprint"]);
    expect(result.subFocusPctByGoal["Athletic Performance"]).toEqual({
      "Speed / Sprint": 100,
    });
  });
});
