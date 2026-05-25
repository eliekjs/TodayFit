import { describe, expect, it } from "vitest";
import type { Exercise } from "./types";
import {
  isGentleRecoveryExercise,
  isRecoveryPrimaryFriendlyExercise,
  isWarmupPrimaryCooldownExcluded,
} from "./cooldownSelection";

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

describe("isRecoveryPrimaryFriendlyExercise", () => {
  it("rejects cossack-pattern mobility even when otherwise gentle", () => {
    const ex = {
      id: "bodyweight_alternating_cossack_squat",
      name: "Bodyweight Alternating Cossack Squat",
      modality: "mobility",
      difficulty: 2,
      stretch_targets: ["hip_flexors"],
    } as Exercise;
    expect(isRecoveryPrimaryFriendlyExercise(ex)).toBe(false);
  });

  it("rejects cuban press patterns", () => {
    const ex = {
      id: "cuban_press",
      name: "Cuban Press",
      modality: "mobility",
      difficulty: 2,
    } as Exercise;
    expect(isRecoveryPrimaryFriendlyExercise(ex)).toBe(false);
  });

  it("rejects inchworm / dynamic walkout prep", () => {
    const ex = {
      id: "inchworm",
      name: "Inchworm",
      modality: "mobility",
      difficulty: 2,
    } as Exercise;
    expect(isRecoveryPrimaryFriendlyExercise(ex)).toBe(false);
  });

  it("rejects straight leg raise", () => {
    const ex = {
      id: "straight_leg_raise",
      name: "Straight Leg Raise",
      modality: "mobility",
      difficulty: 2,
      exercise_role: "mobility",
    } as Exercise;
    expect(isRecoveryPrimaryFriendlyExercise(ex)).toBe(false);
  });

  it("rejects activation-first drills excluded from cooldown", () => {
    const ex = {
      id: "wall_slide",
      name: "Wall Slide",
      modality: "mobility",
      difficulty: 2,
      warmup_relevance: "high",
      cooldown_relevance: "low",
    } as Exercise;
    expect(isRecoveryPrimaryFriendlyExercise(ex)).toBe(false);
  });

  it("allows stretch-first cooldown movements", () => {
    const ex = {
      id: "figure_4_glute_stretch",
      name: "Figure-4 Glute Stretch",
      modality: "recovery",
      difficulty: 1,
      exercise_role: "stretch",
      stretch_targets: ["glutes"],
      warmup_relevance: "none",
      cooldown_relevance: "high",
    } as Exercise;
    expect(isRecoveryPrimaryFriendlyExercise(ex)).toBe(true);
  });
});
