import { describe, expect, it } from "vitest";
import type { ManualPreferences } from "./types";
import {
  buildSubFocusOverrideAligningToBody,
  mapBodyResolutionToMode,
  modeChangeWouldOverrideDayBodyPicks,
  summarizeBodyChoiceVsSubFocusConflict,
} from "./bodyFocusModeOverride";

const basePrefs: ManualPreferences = {
  primaryFocus: ["Build Strength"],
  targetBody: "Upper",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  subFocusByGoal: {
    "Build Strength": ["Squat", "Bench / Press"],
  },
  workoutStyle: [],
};

describe("body focus mode override helpers", () => {
  it("detects when mode reseed would change day picks", () => {
    expect(modeChangeWouldOverrideDayBodyPicks(["upper", "lower"], ["push", "pull"])).toBe(
      true
    );
    expect(modeChangeWouldOverrideDayBodyPicks(["push", "pull"], ["push", "pull"])).toBe(
      false
    );
    expect(modeChangeWouldOverrideDayBodyPicks([], ["chest", "back"])).toBe(false);
  });

  it("maps region resolutions into pattern/muscle vocabulary", () => {
    expect(mapBodyResolutionToMode("upper", "pattern")).toBe("push");
    expect(mapBodyResolutionToMode("lower", "pattern")).toBe("legs");
    expect(mapBodyResolutionToMode("upper", "muscle")).toBe("chest");
    expect(mapBodyResolutionToMode("pull", "muscle")).toBe("back");
    expect(mapBodyResolutionToMode("full", "region")).toBe("full");
  });

  it("flags legs-day vs upper sub-goals", () => {
    const summary = summarizeBodyChoiceVsSubFocusConflict("legs", basePrefs);
    expect(summary).not.toBeNull();
    expect(summary!.displayNames).toContain("Bench / Press");
    expect(summary!.dayBodyLabel).toBe("Legs");
  });

  it("does not flag lower day when only lower-aligned sub-goals conflict would be empty for upper pick", () => {
    const ok = summarizeBodyChoiceVsSubFocusConflict("push", {
      ...basePrefs,
      subFocusByGoal: { "Build Strength": ["Bench / Press"] },
    });
    expect(ok).toBeNull();
  });

  it("builds per-day sub-focus override removing conflicting picks", () => {
    const patch = buildSubFocusOverrideAligningToBody("legs", basePrefs);
    expect(patch).not.toBeNull();
    expect(patch!["Build Strength"]).toEqual(["Squat"]);
  });
});
