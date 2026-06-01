import { describe, expect, it } from "vitest";
import {
  adjustGoalQualitiesForSessionFeel,
  getGoalQualityWeights,
  getGoalQualityWeightsForSession,
} from "./goalQualityWeights";
import { mergeTargetVector } from "./targetVector";

describe("goalQualityWeights session feel (Slice F)", () => {
  it("strength emphasis leaves athletic_performance base weights unchanged at goal level", () => {
    const base = getGoalQualityWeights("athletic_performance");
    const adjusted = getGoalQualityWeightsForSession("athletic_performance", "strength");
    expect(adjusted.max_strength).toBe(base.max_strength);
    expect(adjusted.plyometric_ability).toBe(base.plyometric_ability);
  });

  it("sports_training emphasis boosts plyometric and dampens max_strength", () => {
    const adjusted = getGoalQualityWeightsForSession("strength", "sports_training");
    const base = getGoalQualityWeights("strength");
    expect(adjusted.plyometric_ability ?? 0).toBeGreaterThan(base.plyometric_ability ?? 0);
    expect(adjusted.max_strength ?? 0).toBeLessThan(base.max_strength ?? 1);
  });

  it("athletic_performance sports_training caps max_strength and lifts plyometric", () => {
    const adjusted = adjustGoalQualitiesForSessionFeel(
      getGoalQualityWeights("athletic_performance"),
      "sports_training",
      "athletic_performance"
    );
    expect(adjusted.max_strength ?? 1).toBeLessThanOrEqual(0.32);
    expect(adjusted.plyometric_ability ?? 0).toBeGreaterThanOrEqual(0.6);
  });

  it("mergeTargetVector with sports_training feel weights plyometric above max_strength for athletic primary", () => {
    const strengthVec = mergeTargetVector({
      primary_goal: "athletic_performance",
      session_feel_emphasis: "strength",
    });
    const sportsVec = mergeTargetVector({
      primary_goal: "athletic_performance",
      session_feel_emphasis: "sports_training",
    });
    expect(sportsVec.get("plyometric_ability") ?? 0).toBeGreaterThan(
      strengthVec.get("plyometric_ability") ?? 0
    );
    expect(sportsVec.get("max_strength") ?? 1).toBeLessThan(strengthVec.get("max_strength") ?? 1);
  });

  it("strength-only merge is unchanged when session_feel_emphasis is strength", () => {
    const a = mergeTargetVector({ primary_goal: "strength" });
    const b = mergeTargetVector({ primary_goal: "strength", session_feel_emphasis: "strength" });
    expect(a.get("max_strength")).toBe(b.get("max_strength"));
  });
});
