import { describe, expect, it } from "vitest";
import type { AdaptiveSetup } from "../context/appStateModel";
import type { ManualPreferences } from "./types";
import {
  buildDayBodyFocusChoicesForDay,
  defaultBodyFocusChoiceIdForDay,
} from "./weekDaySessionFocus";

const basePrefs: ManualPreferences = {
  primaryFocus: [],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
};

function adaptiveForSports(sports: string[]): AdaptiveSetup {
  return {
    rankedGoals: [null, null, null],
    rankedSportSlugs: [sports[0] ?? null, sports[1] ?? null],
    subFocusBySport: {},
    sportFocusPct: [60, 40],
    sportVsGoalPct: 70,
    intensityLevel: "Moderate",
    injuryStatus: "No Concerns",
    injuryTypes: [],
  };
}

describe("weekly day body focus recommendations", () => {
  it("preselects lower/core/full options for trail running instead of upper body", () => {
    const choices = buildDayBodyFocusChoicesForDay({
      manualPreferences: basePrefs,
      adaptiveSetup: adaptiveForSports(["trail_running"]),
      slotIndex: 0,
      fallbackTargetBody: "Upper",
    });

    const recommendedIds = choices.filter((c) => c.recommended).map((c) => c.id);
    expect(recommendedIds).toEqual(expect.arrayContaining(["lower", "core"]));
    expect(recommendedIds).not.toContain("upper");
    expect(defaultBodyFocusChoiceIdForDay(choices, { slotIndex: 0 })).toBe("lower");
  });

  it("preselects upper pull-friendly days for climbing", () => {
    const choices = buildDayBodyFocusChoicesForDay({
      manualPreferences: basePrefs,
      adaptiveSetup: adaptiveForSports(["rock_climbing"]),
      slotIndex: 0,
      fallbackTargetBody: "Lower",
    });

    const recommendedIds = choices.filter((c) => c.recommended).map((c) => c.id);
    expect(recommendedIds).toEqual(expect.arrayContaining(["upper", "core"]));
    expect(recommendedIds).not.toContain("lower");
    expect(defaultBodyFocusChoiceIdForDay(choices, { slotIndex: 0 })).toBe("upper");
  });
});
