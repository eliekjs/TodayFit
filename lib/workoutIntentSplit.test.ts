import { describe, expect, it } from "vitest";
import { computeDeclaredIntentSplitFromPrefs } from "./workoutIntentSplit";

describe("workoutIntentSplit", () => {
  it("includes goal sub-focus slices that sum to 100%", () => {
    const split = computeDeclaredIntentSplitFromPrefs({
      sportSlugs: [],
      goalSlugs: ["muscle"],
      sportVsGoalPct: 0,
      goalMatchPrimaryPct: 100,
      goalMatchSecondaryPct: 0,
      goalMatchTertiaryPct: 0,
      orderedPrimaryLabelsForSubFocus: ["Build Muscle (Hypertrophy)"],
      subFocusByGoal: { "Build Muscle (Hypertrophy)": ["Glutes", "Chest"] },
    });
    expect(split.filter((e) => e.kind === "goal_sub_focus").length).toBe(2);
    expect(split.reduce((s, e) => s + e.pct, 0)).toBe(100);
  });

  it("uses dual-sport priority percentages for the sport-only budget", () => {
    const split = computeDeclaredIntentSplitFromPrefs({
      sportSlugs: ["rock_climbing", "trail_running"],
      goalSlugs: [],
      sportVsGoalPct: 100,
      sportShareAmongSportsPct: [60, 40],
    });
    expect(split.find((e) => e.slug === "rock_climbing")?.pct).toBe(60);
    expect(split.find((e) => e.slug === "trail_running")?.pct).toBe(40);
  });

  it("normalizes two-goal match percentages to sum to 100% in the chart", () => {
    const split = computeDeclaredIntentSplitFromPrefs({
      sportSlugs: [],
      goalSlugs: ["strength", "muscle"],
      sportVsGoalPct: 0,
      goalMatchPrimaryPct: 50,
      goalMatchSecondaryPct: 30,
      goalMatchTertiaryPct: 20,
    });
    expect(split.length).toBe(2);
    expect(split.reduce((s, e) => s + e.pct, 0)).toBe(100);
    // ~62/38 from normalizeGoalMatchPct(50,30,20) for two goals; rounding may land 63/37
    expect(split[0]!.pct).toBeGreaterThanOrEqual(61);
    expect(split[0]!.pct).toBeLessThanOrEqual(63);
    expect(split[1]!.pct).toBe(100 - split[0]!.pct);
  });
});
