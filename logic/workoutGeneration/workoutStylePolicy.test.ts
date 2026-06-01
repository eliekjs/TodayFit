import { describe, expect, it } from "vitest";
import {
  applyWorkoutStyleToPolicy,
  normalizeWorkoutStyleLabels,
  resolveWorkoutStylePolicy,
  workoutStyleFeelScoreBoost,
} from "./workoutStylePolicy";
import { CARDIO_POLICY_BY_PRIMARY_GOAL } from "./cardioIntentPolicyConfig";

describe("normalizeWorkoutStyleLabels", () => {
  it("drops unknown labels and dedupes", () => {
    expect(
      normalizeWorkoutStyleLabels(["Functional / Athletic", "bogus", "Functional / Athletic"])
    ).toEqual(["Functional / Athletic"]);
  });
});

describe("resolveWorkoutStylePolicy", () => {
  it("returns neutral for empty selection", () => {
    const p = resolveWorkoutStylePolicy([]);
    expect(p.cardioShareBoost).toBe(0);
    expect(p.preferCircuitSuperset).toBe(false);
  });

  it("Compound Strength prefers straight sets and no supersets", () => {
    const p = resolveWorkoutStylePolicy(["Compound Strength"]);
    expect(p.preferStraightSetsMain).toBe(true);
    expect(p.wantsSupersets).toBe(false);
  });

  it("CrossFit-style / HIIT is conditioning-forward", () => {
    const p = resolveWorkoutStylePolicy(["CrossFit-style / HIIT"]);
    expect(p.conditioningForward).toBe(true);
    expect(p.cardioShareBoost).toBeGreaterThanOrEqual(0.12);
    expect(p.preferCircuitSuperset).toBe(true);
  });

  it("Compound + Functional yields athletic merge", () => {
    const p = resolveWorkoutStylePolicy(["Compound Strength", "Functional / Athletic"]);
    expect(p.preferCircuitSuperset).toBe(true);
    expect(p.wantsSupersets).toBe(true);
  });
});

describe("applyWorkoutStyleToPolicy", () => {
  it("boosts cardio share for Functional / Athletic", () => {
    const base = CARDIO_POLICY_BY_PRIMARY_GOAL.strength;
    const styled = applyWorkoutStyleToPolicy(
      base,
      resolveWorkoutStylePolicy(["Functional / Athletic"])
    );
    expect(styled.sessionCardioShare).toBeGreaterThan(base.sessionCardioShare);
    expect(styled.preferredMainFormats[0]).toBe("circuit");
  });
});

describe("workoutStyleFeelScoreBoost", () => {
  it("returns 0 when no styles", () => {
    expect(workoutStyleFeelScoreBoost([])).toBe(0);
  });

  it("returns boost for athletic styles", () => {
    expect(workoutStyleFeelScoreBoost(["Functional / Athletic"])).toBeGreaterThan(0);
  });
});
