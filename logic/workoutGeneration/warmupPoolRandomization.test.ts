/**
 * Warmup pool randomization regression:
 * warmup selection should vary across seeds when multiple relevant candidates exist.
 */

import assert from "node:assert/strict";
import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function testWarmupSelectionVariesAcrossSeeds() {
  const baseInput: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    focus_body_parts: ["full_body"],
    goal_sub_focus: { strength: ["deadlift_hinge"] },
    available_equipment: [
      "barbell",
      "bench",
      "dumbbells",
      "bodyweight",
      "kettlebells",
      "pullup_bar",
      "cable_machine",
    ],
    injuries_or_constraints: [],
    seed: 1200,
  };

  const warmupCombos = new Set<string>();
  for (let i = 0; i < 16; i++) {
    const session = generateWorkoutSession({ ...baseInput, seed: baseInput.seed + i }, STUB_EXERCISES);
    const warmup = session.blocks.find((b) => b.block_type === "warmup");
    assert.ok(warmup, "session should include a warmup block");
    warmupCombos.add(warmup.items.map((it) => it.exercise_id).sort().join("|"));
  }

  assert.ok(
    warmupCombos.size >= 2,
    `expected at least 2 distinct warmup combinations, got ${warmupCombos.size}`
  );
}

function run() {
  testWarmupSelectionVariesAcrossSeeds();
  console.log("warmupPoolRandomization.test.ts: all passed");
}

run();
