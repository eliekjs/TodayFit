import { describe, expect, it } from "vitest";
import {
  targetAccessoryPairCount,
  targetHypertrophyPairCount,
  targetMainCompoundCount,
  targetWorkingExerciseSlots,
} from "./sessionVolumeTargets";

describe("sessionVolumeTargets", () => {
  it("maps duration tiers to working slot floors", () => {
    expect(targetWorkingExerciseSlots(20)).toBe(6);
    expect(targetWorkingExerciseSlots(30)).toBe(6);
    expect(targetWorkingExerciseSlots(45)).toBe(9);
    expect(targetWorkingExerciseSlots(60)).toBe(11);
    expect(targetWorkingExerciseSlots(75)).toBe(13);
    expect(targetWorkingExerciseSlots(undefined)).toBe(11);
  });

  it("maps duration tiers to main compound counts", () => {
    expect(targetMainCompoundCount(30)).toBe(2);
    expect(targetMainCompoundCount(45)).toBe(4);
    expect(targetMainCompoundCount(60)).toBe(4);
    expect(targetMainCompoundCount(75)).toBe(5);
  });

  it("maps duration tiers to accessory pair counts", () => {
    expect(targetAccessoryPairCount(30)).toBe(1);
    expect(targetAccessoryPairCount(45)).toBe(3);
    expect(targetAccessoryPairCount(60)).toBe(3);
    expect(targetAccessoryPairCount(75)).toBe(3);
  });

  it("maps duration tiers to hypertrophy pair counts", () => {
    expect(targetHypertrophyPairCount(30)).toBe(2);
    expect(targetHypertrophyPairCount(45)).toBe(3);
    expect(targetHypertrophyPairCount(60)).toBe(4);
    expect(targetHypertrophyPairCount(75)).toBe(4);
  });

  it("supports ~6 working movements at 45 min via mains + accessory pairs", () => {
    const mains = targetMainCompoundCount(45);
    const accessories = targetAccessoryPairCount(45) * 2;
    expect(mains + accessories).toBeGreaterThanOrEqual(6);
    expect(targetHypertrophyPairCount(45) * 2).toBeGreaterThanOrEqual(6);
  });
});
