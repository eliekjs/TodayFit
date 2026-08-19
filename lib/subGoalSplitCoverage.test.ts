import { describe, expect, it } from "vitest";
import type { ManualPreferences } from "./types";
import {
  dayBodyChoiceCoversSubFocus,
  detectUncoveredSubGoalsForDay,
  detectUncoveredSubGoalsForWeek,
  matchingSubFocusNamesForBodyPicks,
  recommendedBodyChoiceForSubFocus,
  recommendedBodyChoiceIdsFromSubFocusPrefs,
  subFocusSlugCoveredByFocusParts,
} from "./subGoalSplitCoverage";

const strengthPrefs = (subs: string[]): ManualPreferences => ({
  primaryFocus: ["Build Strength"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: [],
  upcoming: [],
  subFocusByGoal: { "Build Strength": subs },
  workoutStyle: [],
});

describe("sub-goal split coverage", () => {
  it("maps overhead press to Upper / Push / Shoulders by split type", () => {
    expect(recommendedBodyChoiceForSubFocus("overhead_press", "region")).toBe("upper");
    expect(recommendedBodyChoiceForSubFocus("overhead_press", "pattern")).toBe("push");
    expect(recommendedBodyChoiceForSubFocus("overhead_press", "muscle")).toBe("shoulders");
    expect(dayBodyChoiceCoversSubFocus("upper", "overhead_press")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("push", "overhead_press")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("shoulders", "overhead_press")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("pull", "overhead_press")).toBe(false);
    expect(dayBodyChoiceCoversSubFocus("chest", "overhead_press")).toBe(false);
    expect(dayBodyChoiceCoversSubFocus("legs", "overhead_press")).toBe(false);
  });

  it("maps bench, pull, and squat to the matching chips", () => {
    expect(recommendedBodyChoiceForSubFocus("bench_press", "muscle")).toBe("chest");
    expect(recommendedBodyChoiceForSubFocus("pull", "pattern")).toBe("pull");
    expect(recommendedBodyChoiceForSubFocus("squat", "region")).toBe("lower");
    expect(dayBodyChoiceCoversSubFocus("chest", "bench_press")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("back", "pull")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("legs", "squat")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("quad", "squat")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("posterior", "squat")).toBe(false);
    expect(dayBodyChoiceCoversSubFocus("posterior", "deadlift_hinge")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("quad", "deadlift_hinge")).toBe(false);
  });

  it("keeps overhead press in generator focus on upper/push/shoulders contracts", () => {
    expect(subFocusSlugCoveredByFocusParts("overhead_press", ["upper_push", "upper_pull"])).toBe(
      true
    );
    expect(subFocusSlugCoveredByFocusParts("overhead_press", ["upper_push"])).toBe(true);
    expect(
      subFocusSlugCoveredByFocusParts("overhead_press", ["upper_push", "upper_pull", "shoulders"])
    ).toBe(true);
    expect(subFocusSlugCoveredByFocusParts("overhead_press", ["upper_pull"])).toBe(false);
    expect(subFocusSlugCoveredByFocusParts("overhead_press", ["lower"])).toBe(false);
  });

  it("covers squat on a Quads day and hinge on a Posterior day", () => {
    expect(subFocusSlugCoveredByFocusParts("squat", ["lower", "quad"])).toBe(true);
    expect(subFocusSlugCoveredByFocusParts("deadlift_hinge", ["lower", "quad"])).toBe(false);
    expect(subFocusSlugCoveredByFocusParts("deadlift_hinge", ["lower", "posterior"])).toBe(true);
    expect(subFocusSlugCoveredByFocusParts("squat", ["lower", "posterior"])).toBe(false);
    expect(subFocusSlugCoveredByFocusParts("squat", ["lower", "legs"])).toBe(true);
    expect(subFocusSlugCoveredByFocusParts("deadlift_hinge", ["lower", "legs"])).toBe(true);
  });

  it("recommends Shoulders from Overhead Press in muscle mode", () => {
    expect(
      recommendedBodyChoiceIdsFromSubFocusPrefs(strengthPrefs(["Overhead Press"]), "muscle")
    ).toEqual(["shoulders"]);
    expect(
      recommendedBodyChoiceIdsFromSubFocusPrefs(strengthPrefs(["Overhead Press"]), "pattern")
    ).toEqual(["push"]);
    expect(
      recommendedBodyChoiceIdsFromSubFocusPrefs(strengthPrefs(["Overhead Press"]), "region")
    ).toEqual(["upper"]);
  });

  it("does not prompt when a week day already covers the sub-goal", () => {
    expect(
      detectUncoveredSubGoalsForWeek({
        manualPreferences: strengthPrefs(["Overhead Press"]),
        dayBodyPicks: [["pull"], ["push"], ["legs"]],
        mode: "pattern",
      })
    ).toBeNull();
    expect(
      detectUncoveredSubGoalsForWeek({
        manualPreferences: strengthPrefs(["Overhead Press"]),
        dayBodyPicks: [["upper"], ["lower"]],
        mode: "region",
      })
    ).toBeNull();
    expect(
      detectUncoveredSubGoalsForWeek({
        manualPreferences: strengthPrefs(["Overhead Press"]),
        dayBodyPicks: [["shoulders"], ["back"]],
        mode: "muscle",
      })
    ).toBeNull();
  });

  it("prompts on next when no day covers overhead press, with a split-specific chip", () => {
    const pattern = detectUncoveredSubGoalsForWeek({
      manualPreferences: strengthPrefs(["Overhead Press"]),
      dayBodyPicks: [["pull"], ["legs"]],
      mode: "pattern",
    });
    expect(pattern).not.toBeNull();
    expect(pattern!.message).toMatch(/Overhead Press will get lost/);
    expect(pattern!.message).toMatch(/Select Push/);
    expect(pattern!.recommendedChoiceIds).toEqual(["push"]);

    const muscle = detectUncoveredSubGoalsForWeek({
      manualPreferences: strengthPrefs(["Overhead Press"]),
      dayBodyPicks: [["chest"], ["back"], ["arms"]],
      mode: "muscle",
    });
    expect(muscle!.message).toMatch(/Select Shoulders/);
    expect(muscle!.recommendedChoiceIds).toEqual(["shoulders"]);

    const region = detectUncoveredSubGoalsForWeek({
      manualPreferences: strengthPrefs(["Overhead Press"]),
      dayBodyPicks: [["lower"], ["core"]],
      mode: "region",
    });
    expect(region!.message).toMatch(/Select Upper body/);
    expect(region!.recommendedChoiceIds).toEqual(["upper"]);
  });

  it("prompts on a single Pull day that cannot host overhead press", () => {
    const prompt = detectUncoveredSubGoalsForDay({
      manualPreferences: strengthPrefs(["Overhead Press"]),
      bodyChoiceId: "pull",
      mode: "pattern",
    });
    expect(prompt).not.toBeNull();
    expect(prompt!.message).toMatch(/Overhead Press will get lost/);
    expect(prompt!.message).toMatch(/Push/);
    expect(
      detectUncoveredSubGoalsForDay({
        manualPreferences: strengthPrefs(["Overhead Press"]),
        bodyChoiceId: "push",
        mode: "pattern",
      })
    ).toBeNull();
  });

  it("keeps Bench on Upper in region mode and surfaces matching names", () => {
    expect(dayBodyChoiceCoversSubFocus("upper", "bench_press")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("push", "bench_press")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("pull", "bench_press")).toBe(false);
    expect(
      matchingSubFocusNamesForBodyPicks(strengthPrefs(["Bench / Press"]), ["upper"])
    ).toEqual(["Bench / Press"]);
    expect(
      matchingSubFocusNamesForBodyPicks(strengthPrefs(["Bench / Press"]), ["pull"])
    ).toEqual([]);
  });

  it("covers joint-health and recovery regional sub-goals on matching splits", () => {
    expect(dayBodyChoiceCoversSubFocus("lower", "knee_health")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("upper", "knee_health")).toBe(false);
    expect(dayBodyChoiceCoversSubFocus("upper", "shoulder_health")).toBe(true);
    expect(dayBodyChoiceCoversSubFocus("core", "back_spine_health")).toBe(true);
    expect(recommendedBodyChoiceForSubFocus("hip_health", "region")).toBe("lower");
  });
});
