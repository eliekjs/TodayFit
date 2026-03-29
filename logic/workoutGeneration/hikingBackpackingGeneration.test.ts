/**
 * Hiking/backpacking sport pattern transfer: gating, coverage, conditioning preference.
 * Run: npx tsx logic/workoutGeneration/hikingBackpackingGeneration.test.ts
 */

import assert from "assert";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { getHikingPatternCategoriesForExercise } from "./sportPatternTransfer/hikingExerciseCategories";
import { gatePoolForHikingSlot, hikingPatternTransferApplies } from "./sportPatternTransfer/hikingSession";
import { exerciseMatchesAnyHikingCategory } from "./sportPatternTransfer/hikingExerciseCategories";

function mkEx(
  partial: Omit<Exercise, "id" | "name" | "movement_pattern" | "muscle_groups" | "modality" | "equipment_required" | "difficulty" | "time_cost" | "tags"> &
    Pick<Exercise, "id" | "name"> &
    Partial<Exercise>
): Exercise {
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

const rackPullLike = mkEx({
  id: "rack_pull_test",
  name: "Rack Pull",
  movement_pattern: "pull",
  muscle_groups: ["pull", "legs"],
  exercise_role: "main_compound",
  equipment_required: ["barbell", "squat_rack"],
  tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
});

const stepUp = mkEx({
  id: "stepup",
  name: "Step-up",
  movement_pattern: "squat",
  muscle_groups: ["legs"],
  equipment_required: ["bench", "dumbbells"],
  exercise_role: "main_compound",
});

const backSquat = mkEx({
  id: "back_squat_test",
  name: "Back Squat",
  movement_pattern: "squat",
  exercise_role: "main_compound",
  equipment_required: ["barbell", "squat_rack"],
});

const farmerCarry = mkEx({
  id: "farmer_carry",
  name: "Farmer Carry",
  movement_pattern: "carry",
  muscle_groups: ["core", "legs"],
  modality: "strength",
  equipment_required: ["dumbbells"],
});

const zone2Bike = mkEx({
  id: "zone2_bike",
  name: "Zone 2 Bike",
  movement_pattern: "locomotion",
  muscle_groups: ["legs"],
  modality: "conditioning",
  equipment_required: ["assault_bike"],
  tags: { goal_tags: ["endurance"], stimulus: ["aerobic_zone2"], energy_fit: ["medium"] },
});

const zone2Stair = mkEx({
  id: "zone2_stair_climber",
  name: "Zone 2 Stair Climber",
  movement_pattern: "locomotion",
  muscle_groups: ["legs"],
  modality: "conditioning",
  equipment_required: ["stair_climber"],
  tags: { goal_tags: ["endurance"], stimulus: ["aerobic_zone2"], energy_fit: ["medium"] },
});

const mobilityAnkle = mkEx({
  id: "ankle_mob_test",
  name: "Ankle Mobility",
  modality: "mobility",
  movement_pattern: "locomotion",
  muscle_groups: ["legs"],
  equipment_required: ["bodyweight"],
  tags: { goal_tags: ["mobility"], energy_fit: ["low"] },
});

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "squat_rack",
      "bench",
      "dumbbells",
      "assault_bike",
      "stair_climber",
      "bodyweight",
    ],
    injuries_or_constraints: [],
    seed: 42,
    ...overrides,
  };
}

function mainIds(session: ReturnType<typeof generateWorkoutSession>): string[] {
  const main = session.blocks.filter((b) => b.block_type === "main_strength");
  return main.flatMap((b) => b.items.map((i) => i.exercise_id));
}

function main() {
  const catsRack = getHikingPatternCategoriesForExercise(rackPullLike);
  assert(catsRack.has("generic_heavy_pull_as_primary"), "rack pull test should map to deprioritized pull category");

  const catsStep = getHikingPatternCategoriesForExercise(stepUp);
  assert(
    catsStep.has("locomotion_step_up") || catsStep.has("unilateral_knee_dominant"),
    "step-up should map to primary hiking categories"
  );

  const mainPool = [rackPullLike, stepUp, backSquat, farmerCarry, zone2Bike, zone2Stair, mobilityAnkle];
  const gateR = gatePoolForHikingSlot(mainPool, "main_strength", { applyMainWorkExclusions: true });
  const gated = gateR.gated;
  assert(
    gated.every((e) => exerciseMatchesAnyHikingCategory(e, ["locomotion_step_up", "unilateral_knee_dominant"])),
    "gated main pool should only contain primary hiking patterns"
  );
  assert(!gated.some((e) => e.id === rackPullLike.id), "rack pull should not pass main-strength gate");

  const hikingInput = baseInput({
    sport_slugs: ["hiking_backpacking"],
    sport_weight: 0.55,
    primary_goal: "strength",
  });
  assert(hikingPatternTransferApplies(hikingInput), "hiking rules should apply for lower + hiking sport");

  const session = generateWorkoutSession(hikingInput, mainPool);
  const mains = mainIds(session);
  assert(
    mains.includes("stepup"),
    `expected step-up in main strength for hiking; got ${mains.join(",")}`
  );
  assert(!mains.includes("rack_pull_test"), "rack pull should not occupy primary hiking main slot");

  const dbg = session.debug?.sport_pattern_transfer;
  assert(dbg?.sport_slug === "hiking_backpacking", "debug should tag hiking sport");
  assert(dbg?.coverage_ok === true, `coverage should pass; violations=${JSON.stringify(dbg?.violations)}`);
  const stepDbg = dbg?.items.find((x) => x.exercise_id === "stepup");
  assert(stepDbg?.slot_rule_id === "hiking_main_strength", "step-up should be attributed to main slot rule");
  assert(stepDbg?.tier === "required" || stepDbg?.tier === "preferred", "step-up should be required or preferred tier");

  const noHike = generateWorkoutSession(baseInput({ seed: 42 }), mainPool);
  const mainsNo = mainIds(noHike);
  assert(
    mainsNo.includes("rack_pull_test") || mainsNo.includes("back_squat_test") || mainsNo.includes("stepup"),
    "without sport, selection should still produce a main lift"
  );

  const condSession = generateWorkoutSession(
    baseInput({
      sport_slugs: ["hiking_backpacking"],
      primary_goal: "hypertrophy",
      secondary_goals: ["endurance"],
      seed: 7,
    }),
    mainPool
  );
  const cond = condSession.blocks.find((b) => b.block_type === "conditioning");
  if (cond) {
    const cid = cond.items[0]?.exercise_id;
    assert(
      cid === "zone2_stair_climber" || cid === "zone2_bike",
      `hiking session should prefer hiking-relevant conditioning when available; got ${cid}`
    );
  }

  console.log("hikingBackpackingGeneration.test.ts: all assertions passed");
}

main();
