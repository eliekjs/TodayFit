import { describe, expect, it } from "vitest";
import { formatDayTitle } from "./dayTitle";
import { dayBodyFocusToRegion } from "./subFocusBodyRegion";
import type { ManualPreferences } from "./types";
import {
  applyBodyChoiceSubFocusToPrefs,
  bodyFocusEmphasisLabel,
  buildDayBodyFocusChoicesForDay,
  dayBodyFocusChoiceToBias,
  getMuscleBodyFocusDistribution,
  getPatternBodyFocusDistribution,
  isWeeklyBodyFocusModeUnlocked,
  resolveWeeklyBodyFocusMode,
  shouldApplyHypertrophySubFocusForBodyChoice,
} from "./weekDaySessionFocus";

const basePrefs: ManualPreferences = {
  primaryFocus: ["Build Muscle (Hypertrophy)"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
};

describe("weekly body focus mode unlock", () => {
  it("is always unlocked for sport and goal weeks", () => {
    expect(isWeeklyBodyFocusModeUnlocked(["Build Muscle (Hypertrophy)"])).toBe(true);
    expect(
      isWeeklyBodyFocusModeUnlocked(["Body Recomp (fat loss & muscle gain)"])
    ).toBe(true);
    expect(isWeeklyBodyFocusModeUnlocked(["Build Strength"])).toBe(true);
    expect(isWeeklyBodyFocusModeUnlocked([])).toBe(true);
    expect(isWeeklyBodyFocusModeUnlocked(undefined)).toBe(true);
  });

  it("preserves selected mode for any goal set", () => {
    expect(resolveWeeklyBodyFocusMode("muscle", ["Build Strength"])).toBe("muscle");
    expect(resolveWeeklyBodyFocusMode("pattern", ["Build Muscle (Hypertrophy)"])).toBe(
      "pattern"
    );
    expect(resolveWeeklyBodyFocusMode(undefined, [])).toBe("region");
  });

  it("applies hypertrophy sub-focus only for physique goals", () => {
    expect(shouldApplyHypertrophySubFocusForBodyChoice(["Build Muscle (Hypertrophy)"])).toBe(
      true
    );
    expect(shouldApplyHypertrophySubFocusForBodyChoice(["Build Strength"])).toBe(false);
  });
});

describe("pattern and muscle week templates", () => {
  it("builds PPL-ish pattern weeks", () => {
    expect(getPatternBodyFocusDistribution(3)).toEqual(["push", "pull", "legs"]);
    expect(getPatternBodyFocusDistribution(4)).toEqual(["push", "pull", "legs", "push"]);
    expect(getPatternBodyFocusDistribution(6)).toEqual([
      "push",
      "pull",
      "legs",
      "push",
      "pull",
      "legs",
    ]);
    expect(getPatternBodyFocusDistribution(7)).toContain("core");
  });

  it("builds bro-ish muscle weeks", () => {
    expect(getMuscleBodyFocusDistribution(5)).toEqual([
      "chest",
      "back",
      "shoulders",
      "arms",
      "legs",
    ]);
    expect(getMuscleBodyFocusDistribution(6)).toEqual([
      "chest",
      "back",
      "shoulders",
      "arms",
      "legs",
      "glutes",
    ]);
  });
});

describe("day body focus choice mapping", () => {
  it("maps chest/push/arms/glutes to generator bias", () => {
    expect(dayBodyFocusChoiceToBias("chest")).toEqual({
      targetBody: "Upper",
      targetModifier: ["Push"],
      specificBodyFocus: ["chest"],
    });
    expect(dayBodyFocusChoiceToBias("push")).toEqual({
      targetBody: "Upper",
      targetModifier: ["Push"],
      specificBodyFocus: ["push"],
    });
    expect(dayBodyFocusChoiceToBias("arms")).toEqual({
      targetBody: "Upper",
      targetModifier: [],
      specificBodyFocus: ["arms"],
    });
    expect(dayBodyFocusChoiceToBias("glutes")).toEqual({
      targetBody: "Lower",
      targetModifier: ["Posterior"],
      specificBodyFocus: ["glutes"],
    });
    expect(dayBodyFocusChoiceToBias("legs")).toEqual({
      targetBody: "Lower",
      targetModifier: [],
      specificBodyFocus: ["legs"],
    });
  });

  it("maps choice ids to conflict regions", () => {
    expect(dayBodyFocusToRegion("chest")).toBe("upper");
    expect(dayBodyFocusToRegion("back")).toBe("upper");
    expect(dayBodyFocusToRegion("push")).toBe("upper");
    expect(dayBodyFocusToRegion("legs")).toBe("lower");
    expect(dayBodyFocusToRegion("glutes")).toBe("lower");
    expect(dayBodyFocusToRegion("core")).toBe("core");
  });

  it("labels muscle/pattern days without Upper Body wording", () => {
    expect(bodyFocusEmphasisLabel(dayBodyFocusChoiceToBias("chest"))).toBe("Chest");
    expect(bodyFocusEmphasisLabel(dayBodyFocusChoiceToBias("push"))).toBe("Push");
    expect(
      formatDayTitle("Build Muscle (Hypertrophy)", "upper", ["chest"])
    ).toBe("Build Muscle (Hypertrophy) - Chest");
  });

  it("exposes muscle options when mode is muscle", () => {
    const choices = buildDayBodyFocusChoicesForDay({
      manualPreferences: basePrefs,
      adaptiveSetup: null,
      slotIndex: 0,
      fallbackTargetBody: "Upper",
      mode: "muscle",
      templateChoiceId: "chest",
    });
    expect(choices.map((c) => c.id)).toEqual([
      "chest",
      "back",
      "shoulders",
      "arms",
      "legs",
      "glutes",
      "core",
    ]);
    expect(choices.find((c) => c.id === "chest")?.recommended).toBe(true);
  });

  it("reinforces hypertrophy sub-focus for muscle days", () => {
    const next = applyBodyChoiceSubFocusToPrefs(basePrefs, "chest");
    expect(next.subFocusByGoal["Build Muscle (Hypertrophy)"]).toEqual(["Chest"]);
  });
});
