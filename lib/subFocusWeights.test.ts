import { describe, expect, it } from "vitest";
import {
  buildMergedGoalSubFocusSlugWeights,
  commitSubFocusPctEdit,
  equalIntegerPctsForLabels,
  normalizeSubFocusPctRecord,
  redistributeSubFocusPctsOnRemoval,
} from "./subFocusWeights";

describe("subFocusWeights", () => {
  it("equalIntegerPctsForLabels sums to 100", () => {
    expect(equalIntegerPctsForLabels(["A", "B", "C"])).toMatchObject({
      A: expect.any(Number),
      B: expect.any(Number),
      C: expect.any(Number),
    });
    const rec = equalIntegerPctsForLabels(["A", "B", "C"]);
    expect(Object.values(rec).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("redistributeSubFocusPctsOnRemoval preserves ratios roughly", () => {
    const prev = { A: 50, B: 30, C: 20 };
    const next = redistributeSubFocusPctsOnRemoval(["A", "B"], prev);
    expect(next.A + next.B).toBe(100);
    expect(next.A).toBeGreaterThan(next.B);
  });

  it("commitSubFocusPctEdit adjusts others to fill remaining budget", () => {
    const prev = { A: 40, B: 35, C: 25 };
    const ordered = ["A", "B", "C"];
    const next = commitSubFocusPctEdit(ordered, prev, "A", 70);
    expect(next.A).toBe(70);
    expect(next.B + next.C).toBe(30);
    expect(next.B + next.C + next.A).toBe(100);
  });

  it("buildMerged respects explicit pct when recorded", () => {
    const labelsForSubFocusMerge = ["Build Strength"];
    const subFocusByGoal = { "Build Strength": ["Squat", "Bench / Press"] };
    const subFocusPctByGoal = {
      "Build Strength": { Squat: 70, "Bench / Press": 30 },
    };
    const { goal_sub_focus, goal_sub_focus_weights } = buildMergedGoalSubFocusSlugWeights({
      labelsForSubFocusMerge,
      subFocusByGoal,
      subFocusPctByGoal,
    });
    const slugs = goal_sub_focus["strength"];
    expect(slugs?.length).toBe(2);
    const w = goal_sub_focus_weights["strength"]!;
    expect(w.length).toBe(2);
    const squatIdx = slugs!.indexOf("squat");
    const benchIdx = slugs!.indexOf("bench_press");
    expect(squatIdx).toBeGreaterThanOrEqual(0);
    expect(benchIdx).toBeGreaterThanOrEqual(0);
    expect(w[squatIdx]!).toBeGreaterThan(w[benchIdx]!);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it("normalizeSubFocusPctRecord fills missing subs equally", () => {
    expect(
      normalizeSubFocusPctRecord(["X", "Y"], {})
    ).toMatchObject({
      X: 50,
      Y: 50,
    });
  });

  it("buildMerged resolves adaptive display labels to canonical sub-focus keys", () => {
    const { goal_sub_focus } = buildMergedGoalSubFocusSlugWeights({
      labelsForSubFocusMerge: ["Build Strength"],
      subFocusByGoal: {
        "Build muscle": ["Glutes"],
      },
    });
    expect(goal_sub_focus["muscle"]).toContain("glutes");
  });

  it("buildMerged includes subFocusByGoal keys not listed in labelsForSubFocusMerge", () => {
    const { goal_sub_focus } = buildMergedGoalSubFocusSlugWeights({
      labelsForSubFocusMerge: ["Build Strength"],
      subFocusByGoal: {
        "Build Strength": ["Squat"],
        "Improve Endurance": ["Hills"],
      },
    });
    expect(goal_sub_focus["strength"]).toContain("squat");
    expect(goal_sub_focus["endurance"]).toContain("hills");
  });
});
