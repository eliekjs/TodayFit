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

  it("45 min zone2_long_steady uses sustained Zone 2 blocks, not short 20–45s intervals", () => {
    const seeds = [0, 1, 7, 42, 55, 100, 501];
    for (const seed of seeds) {
      const session = generateWorkoutSession(
        {
          duration_minutes: 45,
          primary_goal: "endurance",
          energy_level: "medium",
          available_equipment: [...CARDIO_EQUIPMENT],
          injuries_or_constraints: [],
          goal_sub_focus: { endurance: ["zone2_long_steady"] },
          seed,
        },
        STUB_EXERCISES
      );
      const cond = conditioningBlocks(session);
      expect(cond.length, `seed ${seed}: expected conditioning`).toBeGreaterThanOrEqual(1);
      for (const b of cond) {
        expect(b.title ?? "", `seed ${seed}: ${b.title}`).toMatch(/zone 2/i);
        expect(b.format, `seed ${seed}`).toBe("straight_sets");
        for (const item of b.items) {
          expect(item.reps, `seed ${seed}: ${item.exercise_id}`).toBeUndefined();
          expect(item.time_seconds ?? 0, `seed ${seed}: sustained bout`).toBeGreaterThanOrEqual(8 * 60);
          expect(item.sets ?? 1).toBeLessThanOrEqual(2);
        }
      }
      const longest = Math.max(
        ...cond.map((b) =>
          b.items.reduce((m, i) => Math.max(m, (i.sets ?? 1) * (i.time_seconds ?? 0)), 0)
        )
      );
      expect(longest, `seed ${seed}: at least one ~15 min sustained piece`).toBeGreaterThanOrEqual(14 * 60);

      const condMins = cond.reduce((s, b) => s + (b.estimated_minutes ?? 0), 0);
      expect(condMins, `seed ${seed}: aerobic volume should fill most of 45 min`).toBeGreaterThanOrEqual(
        28
      );
      const total = sessionTotalMinutes(session);
      expect(total, `seed ${seed}: session near selected duration`).toBeGreaterThanOrEqual(38);
      expect(total).toBeLessThanOrEqual(55);
    }
  });

  it(
    "catalog dual-tagged zone2 ergs stay sustained on 45 min long-steady days",
    { timeout: 60_000 },
    async () => {
      const { EXERCISES } = await import("../../data/exercisesMerged");
      const { exerciseDefinitionToGeneratorExercise } = await import("../../lib/dailyGeneratorAdapter");
      const pool = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
      for (const seed of [0, 1, 7, 42]) {
        const session = generateWorkoutSession(
          {
            duration_minutes: 45,
            primary_goal: "endurance",
            energy_level: "medium",
            available_equipment: [...CARDIO_EQUIPMENT, "bike"],
            injuries_or_constraints: [],
            goal_sub_focus: { endurance: ["zone2_long_steady"] },
            seed,
          },
          pool
        );
        const cond = conditioningBlocks(session);
        expect(cond.length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        for (const b of cond) {
          expect(b.title ?? "", `seed ${seed}: ${b.title}`).toMatch(/zone 2/i);
          expect(/interval/i.test(b.title ?? "")).toBe(false);
          for (const item of b.items) {
            expect(item.time_seconds ?? 0, `seed ${seed}: ${item.exercise_id}`).toBeGreaterThanOrEqual(
              8 * 60
            );
          }
        }
        const longest = Math.max(
          ...cond.flatMap((b) => b.items.map((i) => (i.sets ?? 1) * (i.time_seconds ?? 0)))
        );
        expect(longest, `seed ${seed}`).toBeGreaterThanOrEqual(14 * 60);
      }
    }
  );
});
