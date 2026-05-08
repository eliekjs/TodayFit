import { describe, expect, it } from "vitest";
import {
  ENGINE_CARDIO_SUB_FOCUS_SLUGS,
  collectInvalidConditioningSubFocusSelections,
  conditioningSubFocusInvalidForPrimaryGoal,
  normalizeSubFocusByGoalAgainstConditioningPolicy,
  primaryFocusAllowsConditioningSubFocus,
  subFocusChoicesForManualPrimaryGoal,
} from "./preferencesConstants";

describe("conditioning sub-focus allowlist", () => {
  it("primaryFocusAllowsConditioningSubFocus matches product allow / deny", () => {
    expect(primaryFocusAllowsConditioningSubFocus("Sport Conditioning")).toBe(true);
    expect(primaryFocusAllowsConditioningSubFocus("Improve Endurance")).toBe(true);
    expect(primaryFocusAllowsConditioningSubFocus("Athletic Performance")).toBe(true);
    expect(primaryFocusAllowsConditioningSubFocus("Power & Explosiveness")).toBe(true);

    expect(primaryFocusAllowsConditioningSubFocus("Build Strength")).toBe(false);
    expect(primaryFocusAllowsConditioningSubFocus("Build Muscle (Hypertrophy)")).toBe(false);
    expect(primaryFocusAllowsConditioningSubFocus("Body Recomp (fat loss & muscle gain)")).toBe(false);
    expect(primaryFocusAllowsConditioningSubFocus("Mobility & Joint Health")).toBe(false);
    expect(primaryFocusAllowsConditioningSubFocus("Calisthenics")).toBe(false);
    expect(primaryFocusAllowsConditioningSubFocus("Recovery")).toBe(false);
  });

  it("flags engine-cardio placements on denied primaries only", () => {
    expect(
      conditioningSubFocusInvalidForPrimaryGoal("Build Strength", "Zone 2 / Aerobic base")
    ).toBe(true);
    expect(
      conditioningSubFocusInvalidForPrimaryGoal("Improve Endurance", "Zone 2 / Long steady")
    ).toBe(false);
    expect(
      conditioningSubFocusInvalidForPrimaryGoal("Athletic Performance", "Speed / Sprint")
    ).toBe(false);
    expect(
      conditioningSubFocusInvalidForPrimaryGoal("Power & Explosiveness", "Olympic / Triple extension")
    ).toBe(false);
    expect(conditioningSubFocusInvalidForPrimaryGoal("Build Muscle (Hypertrophy)", "Intervals")).toBe(
      true
    );
    expect(conditioningSubFocusInvalidForPrimaryGoal("Build Muscle (Hypertrophy)", "Glutes")).toBe(false);
  });

  it("normalizes persisted maps by stripping mismatched selections", () => {
    expect(
      normalizeSubFocusByGoalAgainstConditioningPolicy({
        "Build Muscle (Hypertrophy)": ["Chest", "Zone 2 / Aerobic base"],
      })
    ).toEqual({
      "Build Muscle (Hypertrophy)": ["Chest"],
    });
    expect(
      normalizeSubFocusByGoalAgainstConditioningPolicy({
        "Body Recomposition": ["Intervals"], // stale display name keyed under legacy physique label
      })
    ).toEqual({});
  });

  it("collectInvalid enumerates offending pairs before normalize", () => {
    expect(
      collectInvalidConditioningSubFocusSelections({
        "Build Strength": ["Threshold / Tempo", "Bench / Press"],
      })
    ).toEqual([
      { goalLabel: "Build Strength", displayName: "Threshold / Tempo" },
    ]);
  });

  it("filtered choices match full list when primary allows conditioning", () => {
    const full = subFocusChoicesForManualPrimaryGoal("Sport Conditioning").length;
    expect(full).toBeGreaterThan(0);
    expect(ENGINE_CARDIO_SUB_FOCUS_SLUGS.length).toBeGreaterThan(0);
  });

  it("denied-primary choices exclude engine names if ever present in data", () => {
    const muscle = subFocusChoicesForManualPrimaryGoal("Build Muscle (Hypertrophy)");
    expect(muscle.some((x) => x.includes("Zone 2"))).toBe(false);
    expect(muscle).toContain("Glutes");
  });
});
