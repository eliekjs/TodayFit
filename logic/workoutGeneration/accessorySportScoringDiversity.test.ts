import assert from "node:assert/strict";
import { scoreExercise, buildSupersetIntentPreferenceScores } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import type { TrainingHistoryContext } from "./historyTypes";

function makeInput(): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    secondary_goals: [],
    focus_body_parts: ["upper_pull"],
    available_equipment: ["dumbbells", "cable_machine", "bands", "bench"],
    injuries_or_constraints: [],
    energy_level: "medium",
    sport_slugs: ["lacrosse"],
    sport_weight: 0.6,
    seed: 12345,
  };
}

function makeExercise(id: string, name: string, pairing: string): Exercise {
  return {
    id,
    name,
    movement_pattern: "pull",
    muscle_groups: ["upper_back", "shoulders"],
    modality: "strength",
    equipment_required: ["bands"],
    difficulty: 1,
    time_cost: "low",
    pairing_category: pairing,
    exercise_role: "accessory",
    tags: {
      goal_tags: ["strength"],
      sport_tags: ["lacrosse"],
      stimulus: ["scapular_control"],
      attribute_tags: ["shoulder_stability"],
      energy_fit: ["low", "medium", "high"],
      joint_stress: [],
      contraindications: [],
    },
    primary_movement_family: "upper_pull",
  } as Exercise;
}

function testAccessorySportTagBonusScaledDownVsMain() {
  const input = makeInput();
  const ex = makeExercise("ytw_like", "Y T W Raise", "scapular_stability");

  const main = scoreExercise(ex, input, new Set<string>(), new Map<string, number>(), undefined, {
    blockType: "main_strength",
    include_scoring_breakdown: true,
  });
  const accessory = scoreExercise(ex, input, new Set<string>(), new Map<string, number>(), undefined, {
    blockType: "accessory",
    include_scoring_breakdown: true,
  });

  const mainSport = main.breakdown?.sport_tag_match ?? 0;
  const accessorySport = accessory.breakdown?.sport_tag_match ?? 0;
  assert(mainSport > 0, "main sport-tag bonus should be positive");
  assert(accessorySport > 0, "accessory sport-tag bonus should still exist");
  assert(accessorySport < mainSport, "accessory sport-tag bonus should be scaled down");
}

function testAccessoryPairPreferenceUsesHistoryPenalty() {
  const input = makeInput();
  const overused = makeExercise("face_pull_like", "Face Pull", "scapular_stability");
  const fresh = makeExercise("row_variation_like", "Chest Supported Row", "upper_back");
  const recentIds = new Set<string>([overused.id]);
  const historyContext: TrainingHistoryContext = {
    recently_used_exercise_ids: [overused.id],
    exposure: {
      by_exercise: {
        [overused.id]: 4,
      },
    },
  };

  const prefs = buildSupersetIntentPreferenceScores([overused, fresh], input, {
    blockType: "accessory",
    historyContext,
    recentIds,
  });

  const overusedScore = prefs.get(overused.id) ?? 0;
  const freshScore = prefs.get(fresh.id) ?? 0;
  assert(freshScore > overusedScore, "history-aware accessory scoring should down-rank overused exercise");
}

function run() {
  testAccessorySportTagBonusScaledDownVsMain();
  testAccessoryPairPreferenceUsesHistoryPenalty();
  console.log("accessorySportScoringDiversity.test.ts: all passed");
}

run();
