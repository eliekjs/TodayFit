import { describe, expect, it } from "vitest";
import { formatDayTitle } from "./dayTitle";
import { dayBodyFocusToRegion } from "./subFocusBodyRegion";
import type { ManualPreferences } from "./types";
import {
  applyBodyChoiceSubFocusToPrefs,
  bodyFocusEmphasisLabel,
  buildDayBodyFocusChoicesForDay,
  dayBodyFocusChoiceToBias,
  mapBodyChoiceToModeVocab,
  getBodyFocusDistributionForMode,
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
  it("builds PPL-ish pattern weeks and fills leftover days with full body", () => {
    expect(getPatternBodyFocusDistribution(3)).toEqual(["push", "pull", "legs"]);
    expect(getPatternBodyFocusDistribution(4)).toEqual(["push", "pull", "legs", "full"]);
    expect(getPatternBodyFocusDistribution(6)).toEqual([
      "push",
      "pull",
      "legs",
      "push",
      "pull",
      "legs",
    ]);
    expect(getPatternBodyFocusDistribution(7)).toEqual([
      "push",
      "pull",
      "legs",
      "push",
      "pull",
      "legs",
      "full",
    ]);
    expect(getPatternBodyFocusDistribution(7)).not.toContain("core");
  });

  it("builds bro-ish muscle weeks without a core-only day", () => {
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
    expect(getMuscleBodyFocusDistribution(7)).toEqual([
      "chest",
      "back",
      "shoulders",
      "arms",
      "legs",
      "glutes",
      "full",
    ]);
  });

  it("uses upper/lower rotations and fills leftover region days with full body", () => {
    expect(getBodyFocusDistributionForMode("region", 1)).toEqual(["full"]);
    expect(getBodyFocusDistributionForMode("region", 3)).toEqual(["upper", "lower", "full"]);
    expect(getBodyFocusDistributionForMode("region", 4)).toEqual([
      "upper",
      "lower",
      "upper",
      "lower",
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
    expect(
      formatDayTitle("Build Muscle (Hypertrophy)", "full", ["glutes", "shoulders"])
    ).toBe("Build Muscle (Hypertrophy) - Glute + Shoulder");
  });

  it("does not invent Chest from Upper or Push when mapping into Muscle vocab", () => {
    expect(mapBodyChoiceToModeVocab("upper", "muscle")).toBe("upper");
    expect(mapBodyChoiceToModeVocab("push", "muscle")).toBe("push");
    expect(mapBodyChoiceToModeVocab("pull", "muscle")).toBe("pull");
    expect(mapBodyChoiceToModeVocab("chest", "muscle")).toBe("chest");
    expect(mapBodyChoiceToModeVocab("back", "muscle")).toBe("back");
  });

  it("does not invent Push from Upper when mapping into Pattern vocab", () => {
    expect(mapBodyChoiceToModeVocab("upper", "pattern")).toBe("upper");
    expect(mapBodyChoiceToModeVocab("chest", "pattern")).toBe("push");
    expect(mapBodyChoiceToModeVocab("back", "pattern")).toBe("pull");
    expect(mapBodyChoiceToModeVocab("glutes", "pattern")).toBe("legs");
  });

  it("collapses leftover muscle picks to Region without inventing a side", () => {
    expect(mapBodyChoiceToModeVocab("chest", "region")).toBe("upper");
    expect(mapBodyChoiceToModeVocab("glutes", "region")).toBe("lower");
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
      "full",
      "core",
    ]);
    expect(choices.find((c) => c.id === "chest")?.recommended).toBe(true);
  });

  it("marks Shoulders recommended when Overhead Press is a selected sub-goal", () => {
    const choices = buildDayBodyFocusChoicesForDay({
      manualPreferences: {
        ...basePrefs,
        primaryFocus: ["Build Strength"],
        subFocusByGoal: { "Build Strength": ["Overhead Press"] },
      },
      adaptiveSetup: null,
      slotIndex: 0,
      fallbackTargetBody: "Upper",
      mode: "muscle",
    });
    expect(choices.find((c) => c.id === "shoulders")?.recommended).toBe(true);
  });

  it("reinforces hypertrophy sub-focus for muscle days", () => {
    const next = applyBodyChoiceSubFocusToPrefs(basePrefs, "chest");
    expect(next.subFocusByGoal["Build Muscle (Hypertrophy)"]).toEqual(["Chest"]);
  });
});
