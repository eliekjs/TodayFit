/**
 * Session redundancy families — glute bridge / hip thrust max-one-per-workout.
 * Run: npx vitest run lib/sessionExerciseRedundancy.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  GLUTE_BRIDGE_HIP_THRUST_FAMILY,
  getSessionRedundancyFamilyId,
  isExerciseAvailableForSession,
  isGluteBridgeOrHipThrustSlug,
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

  it("does not group unrelated posterior chain exercises", () => {
    expect(getSessionRedundancyFamilyId("barbell_rdl")).toBeNull();
    expect(getSessionRedundancyFamilyId("back_extension")).toBeNull();
    expect(getSessionRedundancyFamilyId("leg_curl")).toBeNull();
  });

  it("blocks hip thrust when glute bridge is already in session", () => {
    const used = new Set(["glute_bridge"]);
    expect(sessionRedundancyFamilyAlreadyUsed(used, "hip_thrust")).toBe(true);
    expect(isExerciseAvailableForSession("hip_thrust", used)).toBe(false);
    expect(isExerciseAvailableForSession("single_leg_glute_bridge", used)).toBe(false);
    expect(isExerciseAvailableForSession("barbell_rdl", used)).toBe(true);
  });

  it("allows first pick from the family", () => {
    const used = new Set<string>();
    expect(isExerciseAvailableForSession("glute_bridge", used)).toBe(true);
    expect(isExerciseAvailableForSession("hip_thrust", used)).toBe(true);
  });
});
