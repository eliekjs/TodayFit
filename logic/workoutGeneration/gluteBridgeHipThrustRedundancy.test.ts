/**
 * Integration: hypertrophy lower sessions must not include both glute bridge and hip thrust.
 * Run: npx vitest run logic/workoutGeneration/gluteBridgeHipThrustRedundancy.test.ts
 */

import { describe, expect, it } from "vitest";
import { isExerciseAvailableForSession } from "../../lib/workoutRules";
import { getSessionRedundancyFamilyId } from "../../lib/sessionExerciseRedundancy";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { GenerateWorkoutInput } from "./types";

const BRIDGE_THRUST_FAMILY = "glute_bridge_hip_thrust_family";

function sessionBridgeThrustIds(session: ReturnType<typeof generateWorkoutSession>): string[] {
  const ids: string[] = [];
  for (const block of session.blocks) {
    for (const item of block.items) {
      if (getSessionRedundancyFamilyId(item.exercise_id) === BRIDGE_THRUST_FAMILY) {
        ids.push(item.exercise_id);
      }
    }
  }
  return ids;
}

const hypertrophyLowerInput = (seed: number): GenerateWorkoutInput => ({
  duration_minutes: 45,
  primary_goal: "hypertrophy",
  focus_body_parts: ["lower"],
  goal_sub_focus: { hypertrophy: ["glutes", "legs"] },
  available_equipment: ["barbell", "dumbbells", "bench", "bodyweight", "cable_machine"],
  injuries_or_constraints: [],
  energy_level: "medium",
  seed,
});

describe("gluteBridgeHipThrustRedundancy", () => {
  it("selectExercises-style rule: hip thrust unavailable after glute bridge in used set", () => {
    const used = new Set(["glute_bridge"]);
    expect(isExerciseAvailableForSession("hip_thrust", used)).toBe(false);
  });

  it("hypertrophy lower seed 92008 has at most one bridge/thrust family exercise", () => {
    const session = generateWorkoutSession(hypertrophyLowerInput(92008), STUB_EXERCISES);
    const familyIds = sessionBridgeThrustIds(session);
    expect(familyIds.length).toBeLessThanOrEqual(1);
  });

  it("multiple seeds never pair glute_bridge with hip_thrust in stub pool sessions", () => {
    for (const seed of [92008, 92009, 92010, 424242]) {
      const session = generateWorkoutSession(hypertrophyLowerInput(seed), STUB_EXERCISES);
      const familyIds = sessionBridgeThrustIds(session);
      expect(familyIds.length, `seed ${seed}`).toBeLessThanOrEqual(1);
      if (familyIds.includes("glute_bridge")) {
        expect(familyIds).not.toContain("hip_thrust");
      }
    }
  });
});
