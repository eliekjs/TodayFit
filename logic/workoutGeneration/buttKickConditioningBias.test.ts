/**
 * Butt-kick conditioning should be uncommon when alternatives exist.
 * Run: npx tsx logic/workoutGeneration/buttKickConditioningBias.test.ts
 */

import assert from "assert";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";

function ex(id: string, name: string): Exercise {
  return {
    id,
    name,
    movement_pattern: "locomotion",
    muscle_groups: ["legs"],
    modality: "conditioning",
    equipment_required: ["bodyweight"],
    difficulty: 2,
    time_cost: "medium",
    tags: { goal_tags: ["conditioning"], energy_fit: ["medium"] },
  };
}

function input(seed: number): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    secondary_goals: ["conditioning"],
    energy_level: "medium",
    available_equipment: ["bodyweight"],
    injuries_or_constraints: [],
    seed,
  };
}

function sessionUsesButtKickInConditioning(session: ReturnType<typeof generateWorkoutSession>): boolean {
  const c = session.blocks.find((b) => b.block_type === "conditioning");
  if (!c) return false;
  return c.items.some((i) => i.exercise_id.includes("butt_kick"));
}

function run() {
  const simpleStrength: Exercise = {
    id: "bodyweight_squat",
    name: "Bodyweight Squat",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
  };
  const buttKick = ex("butt_kick_run", "Butt Kick Run");
  const highKnees = ex("high_knee_run", "High Knee Run");
  const jumpRope = ex("jump_rope", "Jump Rope");

  let buttKickHits = 0;
  let conditioningSessions = 0;
  const runs = 200;
  for (let s = 1; s <= runs; s++) {
    const session = generateWorkoutSession(input(s), [simpleStrength, buttKick, highKnees, jumpRope]);
    const hasConditioning = session.blocks.some((b) => b.block_type === "conditioning");
    if (!hasConditioning) continue;
    conditioningSessions += 1;
    if (sessionUsesButtKickInConditioning(session)) buttKickHits += 1;
  }
  assert(conditioningSessions >= 150, "most sessions should include a conditioning block in this setup");
  const ratio = buttKickHits / conditioningSessions;
  assert(
    ratio < 0.35,
    `butt-kick ratio should be low when alternatives exist (got ${ratio.toFixed(2)})`
  );

  let onlyButtHits = 0;
  for (let s = 1; s <= 30; s++) {
    const session = generateWorkoutSession(input(1000 + s), [simpleStrength, buttKick]);
    if (sessionUsesButtKickInConditioning(session)) onlyButtHits += 1;
  }
  assert(onlyButtHits > 0, "butt-kick remains available when it is the only conditioning option");

  console.log("buttKickConditioningBias.test.ts: all passed");
}

run();

