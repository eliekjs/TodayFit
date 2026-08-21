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
  it("defers region chips and physique muscle days; keeps lift / quality intents", () => {
    expect(isDeferredDayBodySubFocus("Build Muscle (Hypertrophy)", "Chest")).toBe(true);
    expect(isDeferredDayBodySubFocus("Build Muscle (Hypertrophy)", "Legs")).toBe(true);
    expect(isDeferredDayBodySubFocus("Build Muscle (Hypertrophy)", "Balanced")).toBe(false);
    expect(isDeferredDayBodySubFocus("Body Recomp (fat loss & muscle gain)", "Back")).toBe(true);
    expect(isDeferredDayBodySubFocus("Build Strength", "Squat")).toBe(false);
    expect(isDeferredDayBodySubFocus("Build Strength", "Full-body")).toBe(true);
    expect(isDeferredDayBodySubFocus("Athletic Performance", "Upper")).toBe(true);
    expect(isDeferredDayBodySubFocus("Athletic Performance", "Speed / Sprint")).toBe(false);
    expect(isDeferredDayBodySubFocus("Recovery & Mobility", "Shoulders")).toBe(false);
    expect(isDeferredDayBodySubFocus("Calisthenics", "Pull-ups")).toBe(false);
  });

  it("hides hypertrophy muscle-day sub-goals on the first week page", () => {
    const all = subFocusChoicesForManualPrimaryGoal("Build Muscle (Hypertrophy)");
    expect(all.length).toBeGreaterThan(0);
    expect(goalHasDeferredDayBodySubFocuses("Build Muscle (Hypertrophy)", all)).toBe(true);
    const kept = filterDeferredDayBodySubFocusChoices("Build Muscle (Hypertrophy)", all);
    expect(kept).toEqual(["Balanced"]);
    expect(kept).not.toContain("Chest");
    expect(kept).not.toContain("Legs");
  });

  it("hides all body recomp sub-goals on the first week page (body focus next)", () => {
    const all = subFocusChoicesForManualPrimaryGoal("Body Recomp (fat loss & muscle gain)");
    expect(all).not.toContain("Balanced");
    const kept = filterDeferredDayBodySubFocusChoices(
      "Body Recomp (fat loss & muscle gain)",
      all
    );
    expect(kept).toEqual([]);
    expect(goalHasDeferredDayBodySubFocuses("Body Recomp (fat loss & muscle gain)", all)).toBe(
      true
    );
  });

  it("strips legacy Body Recomp Balanced from week prefs", () => {
    const result = stripDeferredDayBodySubFocuses(
      {
        "Body Recomp (fat loss & muscle gain)": ["Balanced", "Chest"],
      },
      {
        "Body Recomp (fat loss & muscle gain)": { Balanced: 50, Chest: 50 },
      }
    );
    expect(result.changed).toBe(true);
    expect(result.subFocusByGoal["Body Recomp (fat loss & muscle gain)"]).toBeUndefined();
    expect(result.subFocusPctByGoal["Body Recomp (fat loss & muscle gain)"]).toBeUndefined();
  });

  it("keeps athletic qualities after dropping region chips", () => {
    const all = subFocusChoicesForManualPrimaryGoal("Athletic Performance");
    const kept = filterDeferredDayBodySubFocusChoices("Athletic Performance", all);
    expect(kept).toContain("Speed / Sprint");
    expect(kept).not.toContain("Upper");
    expect(kept).not.toContain("Lower");
    expect(kept).not.toContain("Full-body");
  });

  it("strips persisted physique body-part picks and renormalizes remaining pct", () => {
    const result = stripDeferredDayBodySubFocuses(
      {
        "Build Muscle (Hypertrophy)": ["Chest", "Legs", "Balanced"],
        "Athletic Performance": ["Speed / Sprint", "Upper"],
      },
      {
        "Build Muscle (Hypertrophy)": { Chest: 40, Legs: 40, Balanced: 20 },
        "Athletic Performance": { "Speed / Sprint": 60, Upper: 40 },
      }
    );
    expect(result.changed).toBe(true);
    expect(result.subFocusByGoal["Build Muscle (Hypertrophy)"]).toEqual(["Balanced"]);
    expect(result.subFocusPctByGoal["Build Muscle (Hypertrophy)"]).toEqual({ Balanced: 100 });
    expect(result.subFocusByGoal["Athletic Performance"]).toEqual(["Speed / Sprint"]);
    expect(result.subFocusPctByGoal["Athletic Performance"]).toEqual({
      "Speed / Sprint": 100,
    });
  });

  it("counts only selected goals and ignores leftover keys", () => {
    const map = {
      "Build Strength": ["Squat", "Deadlift / Hinge"],
      "Build Muscle (Hypertrophy)": ["Chest", "Back", "Arms", "Balanced"],
    };
    expect(countVisibleGoalSubFocusPicks(map, ["Build Strength"], true)).toBe(2);
    expect(countVisibleGoalSubFocusPicks(map, ["Build Muscle (Hypertrophy)"], true)).toBe(1);
  });
});
