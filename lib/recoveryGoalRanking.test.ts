import { describe, expect, it } from "vitest";
import {
  isRecoveryStructureGoal,
  resolvePrimaryAndSecondaryGoalsFromFocus,
} from "./recoveryGoalRanking";
import { primaryFocusLabelToPrimaryGoal } from "./goalRegistry";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import type { ManualPreferences } from "./types";

describe("recoveryGoalRanking", () => {
  it("identifies recovery_mobility as recovery structure", () => {
    expect(isRecoveryStructureGoal("recovery_mobility")).toBe(true);
    expect(isRecoveryStructureGoal("strength")).toBe(false);
  });

  it("keeps Recovery alone as primary", () => {
    const r = resolvePrimaryAndSecondaryGoalsFromFocus(
      ["Recovery & Mobility"],
      primaryFocusLabelToPrimaryGoal
    );
    expect(r.primary_goal).toBe("recovery_mobility");
    expect(r.secondary_goals).toEqual([]);
  });

  it("demotes Recovery when listed first with Strength", () => {
    const r = resolvePrimaryAndSecondaryGoalsFromFocus(
      ["Recovery & Mobility", "Build Strength"],
      primaryFocusLabelToPrimaryGoal
    );
    expect(r.primary_goal).toBe("strength");
    expect(r.secondary_goals).toContain("recovery_mobility");
    expect(r.secondary_goals).not.toContain("strength");
  });

  it("keeps Strength primary when Recovery is secondary (already ranked correctly)", () => {
    const r = resolvePrimaryAndSecondaryGoalsFromFocus(
      ["Build Strength", "Recovery & Mobility"],
      primaryFocusLabelToPrimaryGoal
    );
    expect(r.primary_goal).toBe("strength");
    expect(r.secondary_goals).toEqual(["recovery_mobility"]);
  });

  it("preserves order among training goals and appends recovery", () => {
    const r = resolvePrimaryAndSecondaryGoalsFromFocus(
      ["Recovery & Mobility", "Build Muscle (Hypertrophy)", "Build Strength"],
      primaryFocusLabelToPrimaryGoal
    );
    expect(r.primary_goal).toBe("hypertrophy");
    expect(r.secondary_goals).toEqual(["strength", "recovery_mobility"]);
  });
});

describe("manualPreferencesToGenerateWorkoutInput recovery pairing", () => {
  const base: ManualPreferences = {
    primaryFocus: [],
    targetBody: null,
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
  };

  it("maps Recovery-first + Strength to strength primary + recovery secondary", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...base,
        primaryFocus: ["Recovery & Mobility", "Build Strength"],
      },
      undefined,
      1
    );
    expect(input.primary_goal).toBe("strength");
    expect(input.secondary_goals).toContain("recovery_mobility");
  });

  it("leaves Recovery-only as recovery_mobility primary", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...base,
        primaryFocus: ["Recovery & Mobility"],
      },
      undefined,
      1
    );
    expect(input.primary_goal).toBe("recovery_mobility");
    expect(input.secondary_goals ?? []).not.toContain("strength");
  });
});
