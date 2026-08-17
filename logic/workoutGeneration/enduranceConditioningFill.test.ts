/**
 * Endurance / conditioning primary sessions should fill selected duration with
 * multiple conditioning blocks (not warmup + one short cardio + cooldown).
 */
import { describe, expect, it } from "vitest";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { GenerateWorkoutInput } from "./types";

function sessionTotalMinutes(session: { blocks: { estimated_minutes?: number }[] }): number {
  return session.blocks.reduce((sum, b) => sum + (b.estimated_minutes ?? 0), 0);
}

function conditioningBlocks(session: { blocks: { block_type: string }[] }) {
  return session.blocks.filter((b) => b.block_type === "conditioning");
}

const CARDIO_EQUIPMENT = [
  "barbell",
  "bench",
  "dumbbells",
  "bodyweight",
  "kettlebell",
  "treadmill",
  "rower",
  "assault_bike",
] as const;

describe("endurance / conditioning primary duration fill", () => {
  it("endurance-only 60 min: multiple conditioning blocks and near-duration total", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 60,
      primary_goal: "endurance",
      energy_level: "medium",
      available_equipment: [...CARDIO_EQUIPMENT],
      injuries_or_constraints: [],
      seed: 610,
    };
    const session = generateWorkoutSession(input, STUB_EXERCISES);
    const cond = conditioningBlocks(session);
    expect(cond.length, "expected multiple conditioning blocks").toBeGreaterThanOrEqual(2);
    const total = sessionTotalMinutes(session);
    expect(total).toBeGreaterThanOrEqual(50);
    expect(total).toBeLessThanOrEqual(70);
  });

  it("endurance-only 45 min: at least 2 conditioning blocks and fills most of the clock", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 45,
      primary_goal: "endurance",
      energy_level: "medium",
      available_equipment: [...CARDIO_EQUIPMENT],
      injuries_or_constraints: [],
      seed: 450,
    };
    const session = generateWorkoutSession(input, STUB_EXERCISES);
    const cond = conditioningBlocks(session);
    expect(cond.length).toBeGreaterThanOrEqual(2);
    const condMins = cond.reduce((s, b) => s + (b.estimated_minutes ?? 0), 0);
    expect(condMins).toBeGreaterThanOrEqual(28);
    const total = sessionTotalMinutes(session);
    expect(total).toBeGreaterThanOrEqual(38);
    expect(total).toBeLessThanOrEqual(55);
  });

  it("conditioning-only 60 min: multiple conditioning blocks (not a single short finisher)", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 60,
      primary_goal: "conditioning",
      energy_level: "medium",
      available_equipment: [...CARDIO_EQUIPMENT],
      injuries_or_constraints: [],
      seed: 612,
    };
    const session = generateWorkoutSession(input, STUB_EXERCISES);
    const cond = conditioningBlocks(session);
    expect(cond.length).toBeGreaterThanOrEqual(2);
    const condMins = cond.reduce((s, b) => s + (b.estimated_minutes ?? 0), 0);
    expect(condMins).toBeGreaterThanOrEqual(36);
  });

  it("endurance + strength secondary still includes conditioning scaled around strength work", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 60,
      primary_goal: "endurance",
      secondary_goals: ["strength"],
      energy_level: "medium",
      available_equipment: [...CARDIO_EQUIPMENT],
      injuries_or_constraints: [],
      seed: 999,
    };
    const session = generateWorkoutSession(input, STUB_EXERCISES);
    expect(session.blocks.some((b) => b.block_type === "main_strength")).toBe(true);
    const cond = conditioningBlocks(session);
    expect(cond.length).toBeGreaterThanOrEqual(1);
    const condMins = cond.reduce((s, b) => s + (b.estimated_minutes ?? 0), 0);
    expect(condMins).toBeGreaterThanOrEqual(18);
    const total = sessionTotalMinutes(session);
    expect(total).toBeGreaterThanOrEqual(48);
  });

  it("endurance zone2 intent still time-based and fills longer sessions with multiple cardio blocks", () => {
    const input: GenerateWorkoutInput = {
      duration_minutes: 60,
      primary_goal: "endurance",
      energy_level: "medium",
      available_equipment: [
        "bodyweight",
        "treadmill",
        "assault_bike",
        "rower",
        "cable_machine",
        "bench",
        "dumbbells",
        "kettlebells",
        "pullup_bar",
      ],
      injuries_or_constraints: [],
      goal_sub_focus: { endurance: ["zone2_long_steady"] },
      seed: 501,
    };
    const session = generateWorkoutSession(input, STUB_EXERCISES);
    const cond = conditioningBlocks(session);
    expect(cond.length).toBeGreaterThanOrEqual(2);
    const hasTimeBased = cond.some((b) =>
      b.items.some((i) => i.time_seconds != null && i.time_seconds > 0 && i.reps == null)
    );
    expect(hasTimeBased).toBe(true);
  });
});
