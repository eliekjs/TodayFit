/**
 * Session redundancy families — max-one-per-workout for programming-equivalent movements.
 * Run: npx vitest run lib/sessionExerciseRedundancy.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  GLUTE_BRIDGE_HIP_THRUST_FAMILY,
  KETTLEBELL_SWING_FAMILY,
  getNearDuplicateFamilyId,
  getSessionRedundancyFamilyId,
  isExerciseAvailableForSession,
  isGluteBridgeOrHipThrustSlug,
  isKettlebellSwingSlug,
  sessionRedundancyFamilyAlreadyUsed,
} from "./sessionExerciseRedundancy";
import { getSimilarExerciseClusterId } from "./workoutRules";

describe("sessionExerciseRedundancy", () => {
  it("groups core catalog glute bridge and hip thrust slugs", () => {
    for (const slug of [
      "glute_bridge",
      "single_leg_glute_bridge",
      "hip_thrust",
      "barbell_hip_thrust",
      "single_leg_hip_thrust",
      "kettlebell_hip_thrust",
    ]) {
      expect(getSessionRedundancyFamilyId(slug)).toBe(GLUTE_BRIDGE_HIP_THRUST_FAMILY);
      expect(getSimilarExerciseClusterId({ id: slug })).toBe(GLUTE_BRIDGE_HIP_THRUST_FAMILY);
    }
  });

  it("groups ff_ catalog variants by slug pattern", () => {
    expect(isGluteBridgeOrHipThrustSlug("ff_barbell_hip_thrust")).toBe(true);
    expect(isGluteBridgeOrHipThrustSlug("ff_bodyweight_single_leg_glute_bridge")).toBe(true);
    expect(getSessionRedundancyFamilyId("ff_miniband_hip_thrust")).toBe(GLUTE_BRIDGE_HIP_THRUST_FAMILY);
  });

  it("groups kettlebell swing variants (two-hand, single-arm, double)", () => {
    for (const slug of [
      "kb_swing",
      "kettlebell_swing",
      "banded_kb_swing",
      "ff_kettlebell_swing",
      "ff_single_arm_kettlebell_swing",
      "ff_double_kettlebell_swing",
      "ff_alternating_single_arm_kettlebell_swing",
      "ff_single_arm_kettlebell_staggered_stance_swing",
    ]) {
      expect(isKettlebellSwingSlug(slug)).toBe(true);
      expect(getSessionRedundancyFamilyId(slug)).toBe(KETTLEBELL_SWING_FAMILY);
      expect(getSimilarExerciseClusterId({ id: slug })).toBe(KETTLEBELL_SWING_FAMILY);
    }
  });

  it("does not group club / bag swings or unrelated hinges with KB swings", () => {
    expect(getSessionRedundancyFamilyId("ff_clubbell_hammer_swing")).not.toBe(KETTLEBELL_SWING_FAMILY);
    expect(getSessionRedundancyFamilyId("ff_bulgarian_bag_swing")).not.toBe(KETTLEBELL_SWING_FAMILY);
    expect(
      getSessionRedundancyFamilyId("ff_single_arm_indian_club_outer_heart_shaped_swing")
    ).not.toBe(KETTLEBELL_SWING_FAMILY);
    expect(getSessionRedundancyFamilyId("barbell_rdl")).not.toBe(KETTLEBELL_SWING_FAMILY);
    expect(getSessionRedundancyFamilyId("back_extension")).not.toBe(KETTLEBELL_SWING_FAMILY);
    expect(getSessionRedundancyFamilyId("leg_curl")).not.toBe(KETTLEBELL_SWING_FAMILY);
    expect(isKettlebellSwingSlug("kb_deadlift")).toBe(false);
  });

  it("blocks hip thrust when glute bridge is already in session", () => {
    const used = new Set(["glute_bridge"]);
    expect(sessionRedundancyFamilyAlreadyUsed(used, "hip_thrust")).toBe(true);
    expect(isExerciseAvailableForSession("hip_thrust", used)).toBe(false);
    expect(isExerciseAvailableForSession("single_leg_glute_bridge", used)).toBe(false);
    expect(isExerciseAvailableForSession("barbell_rdl", used)).toBe(true);
  });

  it("blocks second KB swing variant when one is already in session", () => {
    const used = new Set(["ff_single_arm_kettlebell_swing"]);
    expect(sessionRedundancyFamilyAlreadyUsed(used, "ff_kettlebell_swing")).toBe(true);
    expect(isExerciseAvailableForSession("kb_swing", used)).toBe(false);
    expect(isExerciseAvailableForSession("ff_double_kettlebell_swing", used)).toBe(false);
    expect(isExerciseAvailableForSession("barbell_rdl", used)).toBe(true);
  });

  it("blocks laterality variants globally (rows, presses, split squats)", () => {
    expect(isExerciseAvailableForSession("ff_single_arm_dumbbell_row", new Set(["db_row"]))).toBe(
      false
    );
    expect(
      isExerciseAvailableForSession("ff_single_arm_dumbbell_press", new Set(["dumbbell_press"]))
    ).toBe(false);
    expect(
      isExerciseAvailableForSession("bulgarian_split_squat", new Set(["split_squat"]))
    ).toBe(false);
    expect(isExerciseAvailableForSession("db_bench", new Set(["bench_press_barbell"]))).toBe(true);
    expect(isExerciseAvailableForSession("incline_db_press", new Set(["db_bench"]))).toBe(true);
  });

  it("allows first pick from each family", () => {
    const used = new Set<string>();
    expect(isExerciseAvailableForSession("glute_bridge", used)).toBe(true);
    expect(isExerciseAvailableForSession("hip_thrust", used)).toBe(true);
    expect(isExerciseAvailableForSession("kb_swing", used)).toBe(true);
    expect(isExerciseAvailableForSession("ff_single_arm_kettlebell_swing", used)).toBe(true);
  });
});

describe("nearDuplicateFamily", () => {
  it("groups same-implement laterality and stance variants", () => {
    expect(getNearDuplicateFamilyId("ff_single_arm_kettlebell_swing")).toBe(
      getNearDuplicateFamilyId("kb_swing")
    );
    expect(getNearDuplicateFamilyId("single_arm_db_row")).toBe(getNearDuplicateFamilyId("db_row"));
    expect(getNearDuplicateFamilyId("ff_seated_cable_row")).toBe(getNearDuplicateFamilyId("cable_row"));
    expect(getNearDuplicateFamilyId("single_leg_rdl")).toBe(getNearDuplicateFamilyId("rdl"));
  });

  it("keeps distinct implements, angles, and patterns apart", () => {
    expect(getNearDuplicateFamilyId("db_bench")).not.toBe(
      getNearDuplicateFamilyId("bench_press_barbell")
    );
    expect(getNearDuplicateFamilyId("incline_db_press")).not.toBe(getNearDuplicateFamilyId("db_bench"));
    expect(getNearDuplicateFamilyId("barbell_rdl")).not.toBe(getNearDuplicateFamilyId("barbell_deadlift"));
    expect(getNearDuplicateFamilyId("leg_curl")).not.toBe(getNearDuplicateFamilyId("arm_curl"));
    expect(getNearDuplicateFamilyId("ff_clubbell_hammer_swing")).not.toBe(
      getNearDuplicateFamilyId("kb_swing")
    );
  });
});
