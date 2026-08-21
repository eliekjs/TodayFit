/**
 * Duration volume floors: 45-min sessions should land ≥6 working exercises
 * (exclude warmup / cooldown), for strength and a parallel goal path.
 */

import { describe, expect, it } from "vitest";
import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";
import { getEffectiveMovementFamilies } from "../workoutIntelligence/constraints/eligibilityHelpers";

const WORKING_BLOCK_TYPES = new Set([
  "main_strength",
  "main_hypertrophy",
  "accessory",
  "power",
  "conditioning",
  "core",
  "carry",
  "skill",
]);

function countWorkingExercises(session: ReturnType<typeof generateWorkoutSession>): number {
  return session.blocks
    .filter((b) => WORKING_BLOCK_TYPES.has(b.block_type))
    .reduce((sum, b) => sum + b.items.length, 0);
}

function workingBodyRegions(
  session: ReturnType<typeof generateWorkoutSession>
): Set<"upper" | "lower" | "core"> {
  const byId = new Map(STUB_EXERCISES.map((exercise) => [exercise.id, exercise]));
  const regions = new Set<"upper" | "lower" | "core">();
  for (const block of session.blocks) {
    if (!WORKING_BLOCK_TYPES.has(block.block_type)) continue;
    for (const item of block.items) {
      const exercise = byId.get(item.exercise_id);
      if (!exercise) continue;
      const families = getEffectiveMovementFamilies(exercise);
      if (families.includes("upper_push") || families.includes("upper_pull")) regions.add("upper");
      if (families.includes("lower_body")) regions.add("lower");
      if (families.includes("core")) regions.add("core");
    }
  }
  return regions;
}

const SHARED_EQUIPMENT = [
  "barbell",
  "bench",
  "dumbbells",
  "bodyweight",
  "kettlebells",
  "pullup_bar",
  "cable_machine",
  "squat_rack",
] as const;

describe("45-minute working exercise volume floors", () => {
  it("keeps upper, lower, and core coverage in short full-body strength sessions", () => {
    const session = generateWorkoutSession(
      {
        duration_minutes: 20,
        primary_goal: "strength",
        energy_level: "medium",
        focus_body_parts: ["full_body"],
        available_equipment: [...SHARED_EQUIPMENT],
        injuries_or_constraints: [],
        seed: 4001,
      },
      STUB_EXERCISES
    );
    expect(workingBodyRegions(session)).toEqual(new Set(["upper", "lower", "core"]));
  });

  it("strength sessions include at least 6 working exercises", () => {
    const seeds = [4101, 4102, 4103];
    for (const seed of seeds) {
      const input: GenerateWorkoutInput = {
        duration_minutes: 45,
        primary_goal: "strength",
        energy_level: "medium",
        focus_body_parts: ["full_body"],
        available_equipment: [...SHARED_EQUIPMENT],
        injuries_or_constraints: [],
        style_prefs: { wants_supersets: true },
        seed,
      };
      const session = generateWorkoutSession(input, STUB_EXERCISES);
      expect(
        countWorkingExercises(session),
        `strength seed ${seed}: expected ≥6 working exercises`
      ).toBeGreaterThanOrEqual(6);
      expect(
        workingBodyRegions(session),
        `strength seed ${seed}: full-body must include upper, lower, and core work`
      ).toEqual(new Set(["upper", "lower", "core"]));
    }
  });

  it("keeps full-body coverage when an upper-body strength intent anchors selection", () => {
    const session = generateWorkoutSession(
      {
        duration_minutes: 45,
        primary_goal: "strength",
        energy_level: "medium",
        focus_body_parts: ["full_body"],
        goal_sub_focus: { strength: ["bench_press"] },
        available_equipment: [...SHARED_EQUIPMENT],
        injuries_or_constraints: [],
        seed: 4150,
      },
      STUB_EXERCISES
    );
    expect(workingBodyRegions(session)).toEqual(new Set(["upper", "lower", "core"]));
  });

  it("hypertrophy sessions include at least 6 working exercises", () => {
    const seeds = [4201, 4202, 4203];
    for (const seed of seeds) {
      const input: GenerateWorkoutInput = {
        duration_minutes: 45,
        primary_goal: "hypertrophy",
        energy_level: "medium",
        focus_body_parts: ["full_body"],
        available_equipment: [...SHARED_EQUIPMENT],
        injuries_or_constraints: [],
        style_prefs: { wants_supersets: true },
        seed,
      };
      const session = generateWorkoutSession(input, STUB_EXERCISES);
      expect(
        countWorkingExercises(session),
        `hypertrophy seed ${seed}: expected ≥6 working exercises`
      ).toBeGreaterThanOrEqual(6);
      expect(
        workingBodyRegions(session),
        `hypertrophy seed ${seed}: full-body must include upper, lower, and core work`
      ).toEqual(new Set(["upper", "lower", "core"]));
    }
  });
});
