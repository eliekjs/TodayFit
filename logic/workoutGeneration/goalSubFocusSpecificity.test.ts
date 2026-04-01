/**
 * Ranked goal sub-focus (conditioning/endurance intents) should drive target vectors,
 * scoring, conditioning slug matching, and cardio finishers.
 *
 * Run: npx tsx logic/workoutGeneration/goalSubFocusSpecificity.test.ts
 */

import { exerciseHasSubFocusSlug } from "../../data/goalSubFocus/conditioningSubFocus";
import { mergeTargetVector } from "../workoutIntelligence/targetVector";
import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testEnduranceIntervalsSlugMatchesPlyometricStimulus() {
  assert(
    exerciseHasSubFocusSlug({ id: "x", tags: { stimulus: ["plyometric"] } }, "intervals"),
    "endurance `intervals` should match plyometric stimulus like intervals_hiit"
  );
  assert(
    exerciseHasSubFocusSlug({ id: "zone2_flat", name: "Zone 2 Treadmill", equipment_required: ["treadmill"] }, "hills") === false,
    "flat treadmill should not match hills without incline/uphill cue"
  );
  assert(
    exerciseHasSubFocusSlug(
      { id: "treadmill_incline_walk", name: "Incline Treadmill Walk", equipment_required: ["treadmill"] },
      "hills"
    ),
    "incline treadmill id should match hills via heuristic"
  );
}

function testMergeTargetVectorIncludesGoalSubFocusQualities() {
  const v = mergeTargetVector({
    primary_goal: "strength",
    goal_sub_focus: { endurance: ["hills", "intervals"] },
    goal_sub_focus_weights: { endurance: [0.6, 0.4] },
  });
  assert(v.size > 0, "expected non-empty target vector");
  let sum = 0;
  v.forEach((w) => (sum += w));
  assert(sum > 0, "expected positive quality mass");
}

function testStrengthFinisherWhenRankedEnduranceHillsEvenAtMediumEnergy() {
  const base: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "bench",
      "dumbbells",
      "squat_rack",
      "bodyweight",
      "treadmill",
      "stair_climber",
      "sled",
    ],
    injuries_or_constraints: [],
    seed: 771_001,
    goal_sub_focus: { endurance: ["hills"] },
    goal_sub_focus_weights: { endurance: [1] },
    style_prefs: { user_level: "intermediate" },
  };
  const session = generateWorkoutSession(base, STUB_EXERCISES);
  const conditioningBlocks = session.blocks.filter((b) => b.block_type === "conditioning");
  assert(conditioningBlocks.length > 0, "expected a conditioning finisher");
  const finisherId = conditioningBlocks[conditioningBlocks.length - 1]?.items[0]?.exercise_id;
  const hillLike = new Set([
    "treadmill_incline_walk",
    "stair_climber_repeats",
    "sled_push",
    "walking_lunge",
  ]);
  assert(finisherId != null && hillLike.has(finisherId), `expected hill-biased finisher, got ${finisherId}`);
}

function main() {
  testEnduranceIntervalsSlugMatchesPlyometricStimulus();
  testMergeTargetVectorIncludesGoalSubFocusQualities();
  testStrengthFinisherWhenRankedEnduranceHillsEvenAtMediumEnergy();
  console.log("goalSubFocusSpecificity tests passed.");
}

main();
