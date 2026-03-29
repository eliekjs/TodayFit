/**
 * Hiking enforcement: gating semantics, no main-slot leakage, repair coverage.
 * Run: npx tsx logic/workoutGeneration/hikingBackpackingEnforcement.test.ts
 */

import assert from "assert";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { gatePoolForHikingSlot } from "./sportPatternTransfer/hikingSession";
import {
  exerciseMatchesAnyHikingCategory,
  isExcludedFromHikingMainWorkSlot,
} from "./sportPatternTransfer/hikingExerciseCategories";

function mkEx(partial: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["barbell"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
    ...partial,
  };
}

const deadlift = mkEx({
  id: "deadlift",
  name: "Deadlift",
  movement_pattern: "hinge",
  exercise_role: "main_compound",
  equipment_required: ["barbell"],
});

const stepUp = mkEx({
  id: "stepup",
  name: "Step-up",
  movement_pattern: "squat",
  exercise_role: "main_compound",
  equipment_required: ["bench"],
});

const walkingLunge = mkEx({
  id: "walking_lunge",
  name: "Walking Lunge",
  movement_pattern: "squat",
  exercise_role: "main_compound",
  equipment_required: ["dumbbells"],
});

const kbCleanLunge = mkEx({
  id: "ff_double_kettlebell_clean_to_front_rack_alternating_forward_lunge",
  name: "KB clean lunge",
  movement_pattern: "squat",
  exercise_role: "main_compound",
  equipment_required: ["kettlebells"],
});

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 60,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: ["barbell", "squat_rack", "bench", "dumbbells", "kettlebells", "bodyweight"],
    injuries_or_constraints: [],
    seed: 100,
    sport_slugs: ["hiking_backpacking"],
    ...overrides,
  };
}

function mainIds(session: ReturnType<typeof generateWorkoutSession>): string[] {
  return session.blocks
    .filter((b) => b.block_type === "main_strength")
    .flatMap((b) => b.items.map((i) => i.exercise_id));
}

function assertHikingMainWork(ids: string[], pool: Exercise[]) {
  const byId = new Map(pool.map((e) => [e.id, e]));
  for (const id of ids) {
    const ex = byId.get(id);
    assert(ex, `missing exercise ${id}`);
    const gateOk = exerciseMatchesAnyHikingCategory(ex, ["locomotion_step_up", "unilateral_knee_dominant"]);
    assert(gateOk, `main ${id} must match hiking primary gate categories`);
    assert(!isExcludedFromHikingMainWorkSlot(ex), `main ${id} must not be excluded as overly complex`);
  }
}

function main() {
  // 1) Gate semantics: partial matches use gated pool only (not full pool)
  const gate = gatePoolForHikingSlot([deadlift, stepUp], "main_strength", { applyMainWorkExclusions: true });
  assert(gate.hasMatches === true, "hasMatches");
  assert(gate.usedFullPoolFallback === false, "no fallback when matches exist");
  assert(gate.poolForSelection.length === 1 && gate.poolForSelection[0].id === "stepup", "poolForSelection is gated only");
  assert(gate.matchCount === 1, "matchCount");

  const gateEmpty = gatePoolForHikingSlot([deadlift], "main_strength", { applyMainWorkExclusions: true });
  assert(gateEmpty.hasMatches === false, "no hiking matches");
  assert(gateEmpty.usedFullPoolFallback === true, "fallback only when zero matches");
  assert(gateEmpty.poolForSelection.length === 1 && gateEmpty.poolForSelection[0].id === "deadlift", "full pool");

  // 2) KB clean + lunge tagged overly complex
  assert(isExcludedFromHikingMainWorkSlot(kbCleanLunge), "clean+lunge should be main-work excluded when tagged");

  // 3) Two-main session: both slots hiking when multiple gated options exist
  const poolMulti = [deadlift, stepUp, walkingLunge];
  const sMulti = generateWorkoutSession(baseInput({ seed: 1 }), poolMulti);
  const mains = mainIds(sMulti);
  assert(mains.length >= 1, "at least one main");
  assert(mains.length <= 2, "at most two mains");
  assertHikingMainWork(mains, poolMulti);
  assert(!mains.includes("deadlift"), "deadlift must not appear in mains when hiking gate has options");

  // 4) Thin gate: one hiking compound → single main, still hiking
  const poolThin = [deadlift, stepUp];
  const sThin = generateWorkoutSession(baseInput({ seed: 2, duration_minutes: 60 }), poolThin);
  const thinMains = mainIds(sThin);
  assert(thinMains.length === 1, "single main when only one gated compound");
  assertHikingMainWork(thinMains, poolThin);

  // 5) Fallback only when zero gate matches
  const poolNoHike = [deadlift];
  const sFb = generateWorkoutSession(baseInput({ seed: 3 }), poolNoHike);
  assert(sFb.debug?.sport_pattern_transfer?.enforcement_snapshot?.main_strength?.usedFullPoolFallback === true);
  const fbMains = mainIds(sFb);
  assert(fbMains.includes("deadlift"), "deadlift allowed when no hiking matches");

  // 6) Prefer simple patterns: clean+lunge excluded from gated main pool when step/lunge exist
  const poolSkill = [kbCleanLunge, stepUp, walkingLunge, deadlift];
  const sSkill = generateWorkoutSession(baseInput({ seed: 4 }), poolSkill);
  const sm = mainIds(sSkill);
  assertHikingMainWork(sm, poolSkill);
  assert(
    !sm.includes(kbCleanLunge.id),
    "complex clean+lunge should not be selected for main when simpler gated exercises exist"
  );

  console.log("hikingBackpackingEnforcement.test.ts: all assertions passed");
}

main();
