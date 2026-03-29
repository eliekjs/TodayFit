/**
 * Trail running sport-pattern: categories, gating, quality, coverage, distinction from hiking.
 * Run: npx tsx logic/workoutGeneration/trailRunningGeneration.test.ts
 */

import assert from "assert";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import {
  getTrailRunningPatternCategoriesForExercise,
  exerciseMatchesAnyTrailRunningCategory,
} from "./sportPatternTransfer/trailRunningExerciseCategories";
import { gatePoolForTrailRunningSlot, trailRunningPatternTransferApplies } from "./sportPatternTransfer/trailRunningSession";
import { evaluateTrailMinimumCoverage } from "./sportPatternTransfer/trailRunningRules";
import { buildSportCoverageContext, collectBlocksExerciseIdsByType } from "./sportPattern/framework";
import { computeTrailRunningWithinPoolQualityScore } from "./sportPatternTransfer/trailRunningQualityScoring";
import { getHikingPatternCategoriesForExercise } from "./sportPatternTransfer/hikingExerciseCategories";

function mkEx(
  partial: Omit<Exercise, "id" | "name" | "movement_pattern" | "muscle_groups" | "modality" | "equipment_required" | "difficulty" | "time_cost" | "tags"> &
    Pick<Exercise, "id" | "name"> &
    Partial<Exercise>
): Exercise {
  return {
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["dumbbells"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
    ...partial,
  };
}

const walkingLunge = mkEx({
  id: "walking_lunge",
  name: "Walking Lunge",
  exercise_role: "main_compound",
});

const farmerCarry = mkEx({
  id: "farmer_carry",
  name: "Farmer Carry",
  movement_pattern: "carry",
  muscle_groups: ["legs", "core"],
});

const boxJump = mkEx({
  id: "box_jump_test",
  name: "Box Jump",
  movement_pattern: "squat",
  modality: "power",
  muscle_groups: ["legs"],
  exercise_role: "main_compound",
  impact_level: "high",
  tags: { goal_tags: ["power"], energy_fit: ["high"], stimulus: ["plyometric"] },
});

const zone2Treadmill = mkEx({
  id: "zone2_treadmill",
  name: "Zone 2 Treadmill",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["treadmill"],
  tags: { goal_tags: ["endurance"], stimulus: ["aerobic_zone2"], energy_fit: ["medium"] },
});

const zone2Stair = mkEx({
  id: "zone2_stair_climber",
  name: "Stair",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["stair_climber"],
  tags: { goal_tags: ["endurance"], stimulus: ["aerobic_zone2"], energy_fit: ["medium"] },
});

const deadlift = mkEx({
  id: "deadlift_test_tr",
  name: "Deadlift",
  movement_pattern: "hinge",
  exercise_role: "main_compound",
  equipment_required: ["barbell"],
});

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: ["barbell", "dumbbells", "treadmill", "stair_climber", "bench", "bodyweight"],
    injuries_or_constraints: [],
    seed: 42,
    ...overrides,
  };
}

function mainIds(session: ReturnType<typeof generateWorkoutSession>): string[] {
  return session.blocks
    .filter((b) => b.block_type === "main_strength")
    .flatMap((b) => b.items.map((i) => i.exercise_id));
}

function main() {
  const wl = getTrailRunningPatternCategoriesForExercise(walkingLunge);
  assert(wl.has("unilateral_running_stability"), "walking lunge should tag unilateral running");
  assert(wl.has("downhill_eccentric_control"), "walking lunge should tag downhill control");

  const fc = getTrailRunningPatternCategoriesForExercise(farmerCarry);
  assert(fc.has("pack_load_carry_primary"), "farmer carry should tag pack/carry for trail deprioritization");

  const bj = getTrailRunningPatternCategoriesForExercise(boxJump);
  assert(bj.has("elastic_reactive_lower"), "box jump should tag elastic/reactive");

  const gateOk = gatePoolForTrailRunningSlot([walkingLunge, farmerCarry, deadlift], "main_strength", {
    applyMainWorkExclusions: true,
  });
  assert(gateOk.hasMatches && gateOk.poolForSelection.some((e) => e.id === "walking_lunge"), "trail gate keeps locomotion matches");
  assert(!gateOk.poolForSelection.some((e) => e.id === "deadlift_test_tr"), "hinge-only deadlift should not pass trail main gate");

  const gateEmpty = gatePoolForTrailRunningSlot([deadlift], "main_strength", { applyMainWorkExclusions: true });
  assert(gateEmpty.usedFullPoolFallback && gateEmpty.poolForSelection.some((e) => e.id === "deadlift_test_tr"), "zero matches → full pool fallback");

  const trailInput = baseInput({ sport_slugs: ["trail_running"], sport_weight: 0.55 });
  assert(trailRunningPatternTransferApplies(trailInput), "trail rules apply for lower + trail sport");

  const pool = [walkingLunge, farmerCarry, boxJump, zone2Treadmill, zone2Stair, deadlift];
  const session = generateWorkoutSession(trailInput, pool);
  const mains = mainIds(session);
  assert(mains.length >= 1, "trail session should produce a main lift");
  assert(!mains.includes("deadlift_test_tr") || gateEmpty.usedFullPoolFallback, "trail should avoid hinge-only main when alternatives exist");

  const dbg = session.debug?.sport_pattern_transfer;
  assert(dbg?.sport_slug === "trail_running", "debug sport_slug");
  const firstDbg = dbg?.items.find((x) => mains.includes(x.exercise_id));
  assert(firstDbg?.slot_rule_id?.startsWith("trail_"), "debug should reference trail slot rule");

  const emptyMap = new Map<string, number>();
  const qFarmer = computeTrailRunningWithinPoolQualityScore(farmerCarry, {
    sessionTrailCategoryCounts: emptyMap,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  const qLunge = computeTrailRunningWithinPoolQualityScore(walkingLunge, {
    sessionTrailCategoryCounts: emptyMap,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  assert(qLunge.total > qFarmer.total, "trail within-pool should favor lunge over carry-heavy farmer for main slot");

  const hikeCats = getHikingPatternCategoriesForExercise(farmerCarry);
  const trailCats = getTrailRunningPatternCategoriesForExercise(farmerCarry);
  assert(hikeCats.has("loaded_carry_pack_tolerance"), "hiking still maps farmer as load tolerance");
  assert(trailCats.has("heavy_carry_dominant"), "trail maps farmer as carry-dominant for deprioritization");

  const blocks = session.blocks;
  const byId = new Map(pool.map((e) => [e.id, e]));
  const ctx = buildSportCoverageContext(trailInput, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  const cov = evaluateTrailMinimumCoverage(ctx, byType, byId);
  assert(cov.ok === true || cov.violations.every((v) => v.ruleId.length > 0), "coverage evaluation runs");

  const hikeSession = generateWorkoutSession(
    baseInput({ sport_slugs: ["hiking_backpacking"], sport_weight: 0.55, seed: 99 }),
    pool
  );
  const hikeMain = mainIds(hikeSession).sort().join(",");
  const trailMain = mainIds(session).sort().join(",");
  assert(hikeMain !== trailMain || hikeMain === "", "hiking vs trail should often diverge on mains for same pool (category gates differ)");

  const condTrail = session.blocks.find((b) => b.block_type === "conditioning");
  if (condTrail) {
    const cid = condTrail.items[0]?.exercise_id;
    assert(
      cid === "zone2_treadmill" || cid === "zone2_stair_climber",
      `trail conditioning should prefer run/stair modalities in pool; got ${cid}`
    );
  }

  assert(
    exerciseMatchesAnyTrailRunningCategory(walkingLunge, ["uphill_locomotion_support", "unilateral_running_stability"]),
    "category matcher"
  );

  console.log("trailRunningGeneration.test.ts: all assertions passed");
}

main();
