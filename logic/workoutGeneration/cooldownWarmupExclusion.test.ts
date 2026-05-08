import { describe, expect, it } from "vitest";
import type { Exercise } from "./types";
import { isGentleRecoveryExercise, isWarmupPrimaryCooldownExcluded } from "./cooldownSelection";

describe("isWarmupPrimaryCooldownExcluded", () => {
  it("excludes high-warmup / low-cooldown activation drills from cooldown pools", () => {
    const ex = {
      id: "wall_slide",
      warmup_relevance: "high",
      cooldown_relevance: "low",
    } as Exercise;
    expect(isWarmupPrimaryCooldownExcluded(ex)).toBe(true);
  });

  it("allows stretches that are cooldown-first", () => {
    const ex = {
      id: "hamstring_stretch",
      warmup_relevance: "none",
      cooldown_relevance: "high",
    } as Exercise;
    expect(isWarmupPrimaryCooldownExcluded(ex)).toBe(false);
  });
});

describe("isGentleRecoveryExercise", () => {
  it("rejects strength-modality exercises even when tagged recovery", () => {
    const ex = {
      id: "overhead_cable_extension",
      name: "Overhead Cable Extension",
      modality: "strength",
      difficulty: 2,
    } as Exercise;
    expect(isGentleRecoveryExercise(ex)).toBe(false);
  });

  it("rejects conditioning-modality exercises tagged recovery", () => {
    const ex = {
      id: "dynamic_soccer_toss",
      name: "Dynamic Soccer Toss",
      modality: "conditioning",
      difficulty: 2,
    } as Exercise;
    expect(isGentleRecoveryExercise(ex)).toBe(false);
  });

  it("rejects high-impact recovery-modality exercises", () => {
    const ex = {
      id: "jump_drill",
      name: "Jump Drill",
      modality: "recovery",
      difficulty: 2,
      impact_level: "high",
    } as Exercise;
    expect(isGentleRecoveryExercise(ex)).toBe(false);
  });

  it("accepts a mobility-modality exercise that cleared hard gates (no targets required)", () => {
    const ex = {
      id: "open_book",
      name: "Open Book (T-Spine)",
      modality: "mobility",
      difficulty: 1,
    } as Exercise;
    expect(isGentleRecoveryExercise(ex)).toBe(true);
  });

  it("accepts easy stretch-based exercise with stretch_targets", () => {
    const ex = {
      id: "hip_flexor_stretch",
      name: "Hip Flexor Stretch",
      modality: "recovery",
      difficulty: 1,
      stretch_targets: ["hip_flexors"],
      exercise_role: "stretch",
    } as Exercise;
    expect(isGentleRecoveryExercise(ex)).toBe(true);
  });

  it("accepts a foam-rolling exercise by name signal alone", () => {
    const ex = {
      id: "foam_rolling_quads",
      name: "Foam Rolling Quads",
      modality: "recovery",
      difficulty: 1,
    } as Exercise;
    expect(isGentleRecoveryExercise(ex)).toBe(true);
  });
});
