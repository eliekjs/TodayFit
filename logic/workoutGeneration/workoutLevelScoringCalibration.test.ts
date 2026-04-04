/**
 * Regression checks for tier + creative scoring calibration (lib/workoutLevel.ts + scoreExercise).
 * Run: npx tsx logic/workoutGeneration/workoutLevelScoringCalibration.test.ts
 */

import assert from "assert";
import { scoreExercise } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import {
  attachWorkoutLevelScoringContext,
  computeCreativeSelectionBonusBreakdown,
  computeWorkoutLevelPreferenceScoreBreakdown,
  buildWorkoutLevelScoringContext,
} from "../../lib/workoutLevel";

function ex(p: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    movement_pattern: p.movement_pattern ?? "squat",
    muscle_groups: p.muscle_groups ?? ["legs"],
    modality: p.modality ?? "strength",
    equipment_required: p.equipment_required ?? ["bodyweight"],
    difficulty: p.difficulty ?? 3,
    time_cost: p.time_cost ?? "medium",
    tags: p.tags ?? { goal_tags: ["strength"] },
    ...p,
  };
}

const baseInput: GenerateWorkoutInput = {
  duration_minutes: 45,
  primary_goal: "strength",
  energy_level: "medium",
  available_equipment: ["bodyweight", "leg_press", "dumbbells"],
  injuries_or_constraints: [],
};

function testBeginnerPenalizesHighDemandVsEasy() {
  const hard = ex({
    id: "uni_hard",
    name: "Unilateral Hard",
    difficulty: 4,
    unilateral: true,
    stability_demand: "high",
    grip_demand: "high",
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const easy = ex({
    id: "uni_easy",
    name: "Easy Bilateral",
    difficulty: 2,
    unilateral: false,
    stability_demand: "low",
    grip_demand: "low",
    workout_level_tags: ["beginner", "intermediate"],
  });
  const ctx = buildWorkoutLevelScoringContext([]);
  const bHard = computeWorkoutLevelPreferenceScoreBreakdown(hard, "beginner", ctx);
  const bEasy = computeWorkoutLevelPreferenceScoreBreakdown(easy, "beginner", ctx);
  assert.ok(bEasy.total > bHard.total, "beginner should prefer easier/lower-demand movement");
  console.log("  OK: beginner tier score favors low-demand / low difficulty");
}

function testAdvancedPrefersDemandAndProgression() {
  const adv = ex({
    id: "adv_move",
    name: "Advanced move",
    difficulty: 5,
    unilateral: true,
    stability_demand: "high",
    workout_level_tags: ["advanced"],
    progressions: ["later"],
  });
  const plain = ex({
    id: "plain",
    name: "Plain",
    difficulty: 3,
    workout_level_tags: ["beginner", "intermediate"],
  });
  const pool = [
    { id: "adv_move", regressions: [] as string[], progressions: ["later"] },
    { id: "later", regressions: ["adv_move"], progressions: [] },
  ];
  const ctx = buildWorkoutLevelScoringContext(pool);
  const sAdv = computeWorkoutLevelPreferenceScoreBreakdown(adv, "advanced", ctx);
  const sPlain = computeWorkoutLevelPreferenceScoreBreakdown(plain, "advanced", ctx);
  assert.ok(sAdv.total > sPlain.total, "advanced tier should rank demanding + progression-linked move higher");
  console.log("  OK: advanced tier score favors complexity + in-pool progression");
}

function testCreativeBonusStaysBelowPrimaryGoalWeight() {
  const creative = ex({
    id: "creative_x",
    name: "Creative x",
    creative_variation: true,
    movement_pattern: "carry",
    modality: "skill",
    tags: {
      goal_tags: ["strength", "power", "hypertrophy", "conditioning"],
      attribute_tags: ["creative", "complex_variation"],
    },
    workout_level_tags: ["beginner", "intermediate", "advanced"],
  });
  const br = computeCreativeSelectionBonusBreakdown(creative, "strength", true);
  assert.ok(br.total < 3, `creative stack should stay under primary goal weight (~3); got ${br.total}`);
  console.log(`  OK: creative bonus total capped below goal weight (${br.total.toFixed(2)} < 3)`);
}

function testScoreExerciseOrderingBeginnerVsAdvanced() {
  const goblet = ex({
    id: "goblet_squat",
    name: "Goblet Squat",
    difficulty: 2,
    workout_level_tags: ["beginner", "intermediate"],
    equipment_required: ["dumbbells"],
  });
  const pistol = ex({
    id: "pistol_squat",
    name: "Pistol Squat",
    difficulty: 5,
    unilateral: true,
    stability_demand: "high",
    workout_level_tags: ["advanced"],
    equipment_required: ["bodyweight"],
  });
  const pool = [goblet, pistol];
  const inputB: GenerateWorkoutInput = {
    ...baseInput,
    style_prefs: { user_level: "beginner" },
  };
  const inputA: GenerateWorkoutInput = {
    ...baseInput,
    style_prefs: { user_level: "advanced" },
  };
  attachWorkoutLevelScoringContext(inputB, pool);
  attachWorkoutLevelScoringContext(inputA, pool);
  const sb = scoreExercise(goblet, inputB, new Set(), new Map(), undefined, {
    blockType: "main_strength",
  });
  const sp = scoreExercise(pistol, inputB, new Set(), new Map(), undefined, {
    blockType: "main_strength",
  });
  assert.ok(sb.score > sp.score, "beginner session should score goblet above pistol");

  const sbA = scoreExercise(goblet, inputA, new Set(), new Map(), undefined, {
    blockType: "main_strength",
  });
  const spA = scoreExercise(pistol, inputA, new Set(), new Map(), undefined, {
    blockType: "main_strength",
  });
  assert.ok(spA.score > sbA.score, "advanced session should score pistol above goblet");
  console.log("  OK: scoreExercise ordering inverts beginner vs advanced for goblet vs pistol");
}

function testEnvTierPreferenceScale() {
  const easy = ex({
    id: "easy_env",
    name: "Easy",
    difficulty: 2,
    stability_demand: "low",
    workout_level_tags: ["beginner", "intermediate"],
  });
  const ctx = buildWorkoutLevelScoringContext([]);
  const saved = process.env.WORKOUT_LEVEL_TIER_PREF_SCALE;
  try {
    delete process.env.WORKOUT_LEVEL_TIER_PREF_SCALE;
    const base = computeWorkoutLevelPreferenceScoreBreakdown(easy, "beginner", ctx).total;
    process.env.WORKOUT_LEVEL_TIER_PREF_SCALE = "1.3";
    const scaled = computeWorkoutLevelPreferenceScoreBreakdown(easy, "beginner", ctx).total;
    assert.ok(Math.abs(scaled / base - 1.3) < 1e-6 || base === 0, "tier env scale should multiply breakdown");
  } finally {
    if (saved === undefined) delete process.env.WORKOUT_LEVEL_TIER_PREF_SCALE;
    else process.env.WORKOUT_LEVEL_TIER_PREF_SCALE = saved;
  }
  console.log("  OK: WORKOUT_LEVEL_TIER_PREF_SCALE scales tier breakdown");
}

function testEnvCreativeBonusScale() {
  const creative = ex({
    id: "c_env",
    name: "Creative env",
    creative_variation: true,
    movement_pattern: "squat",
    tags: { goal_tags: ["strength"] },
  });
  const saved = process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE;
  try {
    delete process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE;
    const base = computeCreativeSelectionBonusBreakdown(creative, "strength", true).total;
    process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE = "1.2";
    const scaled = computeCreativeSelectionBonusBreakdown(creative, "strength", true).total;
    assert.ok(Math.abs(scaled / base - 1.2) < 1e-6 || base === 0, "creative env scale should multiply breakdown");
  } finally {
    if (saved === undefined) delete process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE;
    else process.env.WORKOUT_LEVEL_CREATIVE_BONUS_SCALE = saved;
  }
  console.log("  OK: WORKOUT_LEVEL_CREATIVE_BONUS_SCALE scales creative breakdown");
}

function run() {
  console.log("workoutLevelScoringCalibration.test.ts\n");
  testBeginnerPenalizesHighDemandVsEasy();
  testAdvancedPrefersDemandAndProgression();
  testCreativeBonusStaysBelowPrimaryGoalWeight();
  testScoreExerciseOrderingBeginnerVsAdvanced();
  testEnvTierPreferenceScale();
  testEnvCreativeBonusScale();
  console.log("\nAll passed.");
}

run();
