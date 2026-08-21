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
  bodyFocusModeForChoiceId,
  resolveDayBodyFocusMode,
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

  it("infers day vocabulary from exclusive chips and keeps stored mode for Legs/Full", () => {
    expect(bodyFocusModeForChoiceId("chest")).toBe("muscle");
    expect(bodyFocusModeForChoiceId("push")).toBe("pattern");
    expect(bodyFocusModeForChoiceId("upper")).toBe("region");
    expect(bodyFocusModeForChoiceId("legs")).toBeNull();
    expect(resolveDayBodyFocusMode(["legs"], "pattern")).toBe("pattern");
    expect(resolveDayBodyFocusMode(["chest"], undefined, "region")).toBe("muscle");
    expect(resolveDayBodyFocusMode(["lower"], "muscle")).toBe("region");
    expect(mapBodyChoiceToModeVocab("lower", "muscle")).toBe("legs");
  });

  it("applies hypertrophy sub-focus only for physique goals", () => {
    expect(shouldApplyHypertrophySubFocusForBodyChoice(["Build Muscle (Hypertrophy)"])).toBe(
      true
    );
    expect(shouldApplyHypertrophySubFocusForBodyChoice(["Build Strength"])).toBe(false);
  });
});

describe("pattern and muscle week templates", () => {
  it("builds PPL-ish pattern weeks and rotates leftover days instead of filling with full body", () => {
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
    expect(getPatternBodyFocusDistribution(7)).toEqual([
      "push",
      "pull",
      "legs",
      "push",
      "pull",
      "legs",
      "push",
    ]);
    expect(getPatternBodyFocusDistribution(7)).not.toContain("core");
    expect(getPatternBodyFocusDistribution(7)).not.toContain("full");
  });

  it("builds bro-ish muscle weeks with even upper/lower spread and no core-only day", () => {
    expect(getMuscleBodyFocusDistribution(2)).toEqual(["chest", "legs"]);
    expect(getMuscleBodyFocusDistribution(4)).toEqual(["chest", "legs", "back", "glutes"]);
    expect(getMuscleBodyFocusDistribution(5)).toEqual([
      "chest",
      "legs",
      "back",
      "glutes",
      "shoulders",
    ]);
    expect(getMuscleBodyFocusDistribution(6)).toEqual([
      "chest",
      "legs",
      "back",
      "glutes",
      "shoulders",
      "arms",
    ]);
    expect(getMuscleBodyFocusDistribution(7)).toEqual([
      "chest",
      "legs",
      "back",
      "glutes",
      "shoulders",
      "arms",
      "chest",
    ]);
  });

  it("uses upper/lower rotations instead of leftover full body", () => {
    expect(getBodyFocusDistributionForMode("region", 1)).toEqual(["full"]);
    expect(getBodyFocusDistributionForMode("region", 3)).toEqual(["upper", "lower", "upper"]);
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
    expect(dayBodyFocusChoiceToBias("quad")).toEqual({
      targetBody: "Lower",
      targetModifier: ["Quad"],
      specificBodyFocus: ["quad"],
    });
    expect(dayBodyFocusChoiceToBias("posterior")).toEqual({
      targetBody: "Lower",
      targetModifier: ["Posterior"],
      specificBodyFocus: ["posterior"],
    });
  });

  it("maps choice ids to conflict regions", () => {
    expect(dayBodyFocusToRegion("chest")).toBe("upper");
    expect(dayBodyFocusToRegion("back")).toBe("upper");
    expect(dayBodyFocusToRegion("push")).toBe("upper");
    expect(dayBodyFocusToRegion("legs")).toBe("lower");
    expect(dayBodyFocusToRegion("quad")).toBe("lower");
    expect(dayBodyFocusToRegion("posterior")).toBe("lower");
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
      formatDayTitle("Build Muscle (Hypertrophy)", "lower", ["quad"])
    ).toBe("Build Muscle (Hypertrophy) - Quad");
    expect(
      formatDayTitle("Build Muscle (Hypertrophy)", "lower", ["posterior"])
    ).toBe("Build Muscle (Hypertrophy) - Posterior");
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

  it("maps leftover quad/posterior into region and muscle vocab", () => {
    expect(mapBodyChoiceToModeVocab("quad", "region")).toBe("lower");
    expect(mapBodyChoiceToModeVocab("posterior", "muscle")).toBe("glutes");
    expect(mapBodyChoiceToModeVocab("quad", "muscle")).toBe("legs");
  });

  it("collapses leftover muscle picks to Region without inventing a side", () => {
    expect(mapBodyChoiceToModeVocab("chest", "region")).toBe("upper");
    expect(mapBodyChoiceToModeVocab("glutes", "region")).toBe("lower");
  });

  it("exposes optional Quads and Posterior next to Legs in pattern mode", () => {
    const choices = buildDayBodyFocusChoicesForDay({
      manualPreferences: basePrefs,
      adaptiveSetup: null,
      slotIndex: 0,
      fallbackTargetBody: "Upper",
      mode: "pattern",
      templateChoiceId: "legs",
    });
    expect(choices.map((c) => c.id)).toEqual([
      "push",
      "pull",
      "legs",
      "quad",
      "posterior",
      "full",
      "core",
    ]);
    expect(choices.find((c) => c.id === "legs")?.recommended).toBe(true);
    expect(choices.find((c) => c.id === "quad")?.recommended).toBe(false);
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
