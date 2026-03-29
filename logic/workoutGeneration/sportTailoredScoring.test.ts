/**
 * Sport-tailored scoring: training-quality alignment, sport_tags boost, sport_weight, session_target_qualities.
 * Run: npx tsx logic/workoutGeneration/sportTailoredScoring.test.ts
 */

import { scoreExercise, buildSessionTargetVectorFromInput } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";

const recentIds = new Set<string>();
const movementCounts = new Map<string, number>();

function mkInput(overrides: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: ["barbell", "dumbbells", "bench", "squat_rack"],
    injuries_or_constraints: [],
    seed: 1,
    ...overrides,
  };
}

const baseLegSquat: Omit<Exercise, "id" | "tags"> & { tags: Exercise["tags"] } = {
  name: "Test Squat",
  movement_pattern: "squat",
  muscle_groups: ["legs", "core"],
  modality: "strength",
  equipment_required: ["barbell", "squat_rack"],
  difficulty: 3,
  time_cost: "medium",
  tags: {
    goal_tags: ["strength", "hypertrophy"],
    energy_fit: ["low", "medium", "high"],
    stimulus: ["eccentric"],
    attribute_tags: ["squat", "full_body"],
  },
  primary_movement_family: "lower_body",
  exercise_role: "main_compound",
  movement_patterns: ["squat"],
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  // 1) Sport-tagged exercise outscores identical untagged when sport is selected
  const genericSquat: Exercise = { ...baseLegSquat, id: "test_squat_generic" };
  const sportTaggedSquat: Exercise = {
    ...baseLegSquat,
    id: "test_squat_ski",
    tags: {
      ...baseLegSquat.tags,
      sport_tags: ["backcountry_skiing"],
    },
  };
  const inputSki = mkInput({
    sport_slugs: ["backcountry_skiing"],
    sport_weight: 0.6,
  });
  const stvSki = buildSessionTargetVectorFromInput(inputSki);
  const gScore = scoreExercise(genericSquat, inputSki, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvSki,
  }).score;
  const sScore = scoreExercise(sportTaggedSquat, inputSki, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvSki,
  }).score;
  assert(sScore > gScore, `sport-tagged squat should score higher (got ${sScore} vs ${gScore})`);

  // 2) Higher sport_weight increases relative value of sport alignment (pull-up vs lat pulldown for climbing)
  const pullup: Exercise = {
    id: "pullup",
    name: "Pull-up",
    movement_pattern: "pull",
    muscle_groups: ["pull"],
    modality: "strength",
    equipment_required: ["pullup_bar"],
    difficulty: 3,
    time_cost: "low",
    tags: {
      goal_tags: ["strength"],
      energy_fit: ["medium", "high"],
      joint_stress: ["shoulder_extension", "grip_hanging"],
      stimulus: ["grip", "scapular_control"],
      attribute_tags: ["pull"],
      sport_tags: ["rock_climbing"],
    },
    primary_movement_family: "upper_pull",
    exercise_role: "main_compound",
    movement_patterns: ["vertical_pull"],
  };
  const latPd: Exercise = {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    movement_pattern: "pull",
    muscle_groups: ["pull"],
    modality: "hypertrophy",
    equipment_required: ["cable_machine", "lat_pulldown"],
    difficulty: 1,
    time_cost: "medium",
    tags: {
      goal_tags: ["hypertrophy", "strength"],
      energy_fit: ["low", "medium", "high"],
      stimulus: ["scapular_control"],
      attribute_tags: ["pull"],
    },
    primary_movement_family: "upper_pull",
    exercise_role: "accessory",
    movement_patterns: ["vertical_pull"],
  };

  const inputClimbLow = mkInput({
    primary_goal: "athletic_performance",
    focus_body_parts: ["upper_pull"],
    sport_slugs: ["rock_climbing"],
    sport_weight: 0.2,
  });
  const inputClimbHigh = mkInput({
    primary_goal: "athletic_performance",
    focus_body_parts: ["upper_pull"],
    sport_slugs: ["rock_climbing"],
    sport_weight: 0.95,
  });
  const stvLow = buildSessionTargetVectorFromInput(inputClimbLow);
  const stvHigh = buildSessionTargetVectorFromInput(inputClimbHigh);
  const pullLow = scoreExercise(pullup, inputClimbLow, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvLow,
  }).score;
  const latLow = scoreExercise(latPd, inputClimbLow, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvLow,
  }).score;
  const pullHigh = scoreExercise(pullup, inputClimbHigh, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvHigh,
  }).score;
  const latHigh = scoreExercise(latPd, inputClimbHigh, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvHigh,
  }).score;
  const gapLow = pullLow - latLow;
  const gapHigh = pullHigh - latHigh;
  assert(pullLow > latLow, "pull-up should beat lat pulldown for climbing at low sport_weight");
  assert(pullHigh > latHigh, "pull-up should beat lat pulldown for climbing at high sport_weight");
  assert(gapHigh >= gapLow - 0.01, `higher sport_weight should not shrink pull-up advantage (gaps ${gapLow} -> ${gapHigh})`);

  // 3) session_target_qualities biases toward matching movement (push session)
  const bench: Exercise = {
    id: "bench_press_barbell",
    name: "Bench Press",
    movement_pattern: "push",
    muscle_groups: ["push"],
    modality: "strength",
    equipment_required: ["barbell", "bench", "squat_rack"],
    difficulty: 3,
    time_cost: "high",
    tags: {
      goal_tags: ["strength", "hypertrophy"],
      energy_fit: ["medium", "high"],
      stimulus: ["eccentric"],
      attribute_tags: ["chest"],
    },
    primary_movement_family: "upper_push",
    exercise_role: "main_compound",
    movement_patterns: ["horizontal_push"],
  };
  const inputPushSession = mkInput({
    primary_goal: "strength",
    focus_body_parts: ["upper_push"],
    session_target_qualities: { pushing_strength: 0.9, hypertrophy: 0.5 },
  });
  const stvPush = buildSessionTargetVectorFromInput(inputPushSession);
  const inputPullOnly = { ...inputPushSession, focus_body_parts: ["upper_pull"] as const };
  const stvPullFocus = buildSessionTargetVectorFromInput(inputPullOnly);

  const benchPushFocus = scoreExercise(bench, inputPushSession, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvPush,
    blockType: "main_strength",
  }).score;
  const benchPullFocus = scoreExercise(bench, inputPullOnly, recentIds, movementCounts, undefined, {
    sessionTargetVector: stvPullFocus,
    blockType: "main_strength",
  }).score;
  assert(
    benchPushFocus > benchPullFocus,
    `session qualities + upper_push should score bench higher than wrong body focus (${benchPushFocus} vs ${benchPullFocus})`
  );

  console.log("sportTailoredScoring.test.ts: all assertions passed.");
}

main();
