/**
 * Recovery targeting regression:
 * recovery sessions should prioritize cooldown/stretch targets for the selected focus body part.
 */

import assert from "node:assert/strict";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import {
  exerciseWarmupTargetsOverlap,
  getPreferredWarmupTargetsFromFocus,
} from "./ontologyScoring";
import { exerciseMatchesGoalSubFocusSlugUnified } from "./subFocusSlugMatch";

function makeRecoveryExercise(
  id: string,
  movementFamily: "upper_push" | "core",
  targets: string[]
): Exercise {
  return {
    id,
    name: id.replace(/_/g, " "),
    movement_pattern: "rotate",
    muscle_groups: movementFamily === "upper_push" ? ["push"] : ["core"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: ["recovery"], energy_fit: ["low", "medium", "high"], joint_stress: [], stimulus: [] },
    primary_movement_family: movementFamily,
    exercise_role: "stretch",
    mobility_targets: targets,
    stretch_targets: targets,
    cooldown_relevance: "high",
    warmup_relevance: "medium",
  } as Exercise;
}

function testRecoveryFocusTargetsPreferredAreas() {
  const shoulderTargets = ["shoulders", "thoracic_spine"];
  const coreTargets = ["low_back", "hip_flexors"];

  const exercises: Exercise[] = [
    makeRecoveryExercise("shoulder_opener_1", "upper_push", shoulderTargets),
    makeRecoveryExercise("shoulder_opener_2", "upper_push", shoulderTargets),
    makeRecoveryExercise("shoulder_opener_3", "upper_push", shoulderTargets),
    makeRecoveryExercise("shoulder_opener_4", "upper_push", shoulderTargets),
    makeRecoveryExercise("shoulder_opener_5", "upper_push", shoulderTargets),
    makeRecoveryExercise("core_release_1", "core", coreTargets),
    makeRecoveryExercise("core_release_2", "core", coreTargets),
    makeRecoveryExercise("core_release_3", "core", coreTargets),
    makeRecoveryExercise("core_release_4", "core", coreTargets),
    makeRecoveryExercise("core_release_5", "core", coreTargets),
  ];

  const input: GenerateWorkoutInput = {
    duration_minutes: 30,
    primary_goal: "recovery",
    focus_body_parts: ["upper_push"],
    available_equipment: ["bodyweight"],
    injuries_or_constraints: [],
    energy_level: "low",
    seed: 2201,
  };

  const session = generateWorkoutSession(input, exercises);
  const recoveryBlock = session.blocks.find((b) => b.block_type === "cooldown");
  assert.ok(recoveryBlock, "recovery session should include cooldown/recovery block");

  const preferredTargets = getPreferredWarmupTargetsFromFocus(["upper_push"]);
  const matched = (recoveryBlock?.items ?? []).filter((it) => {
    const ex = exercises.find((e) => e.id === it.exercise_id);
    return ex ? exerciseWarmupTargetsOverlap(ex, preferredTargets) : false;
  }).length;

  assert.ok(
    matched >= 4,
    `expected at least 4 target-matched recovery items for upper_push focus, got ${matched}`
  );
}

function testRecoveryRegionalSubGoalOverridesBroadBodyFocus() {
  /** Hip-opening stretches (substring "hip" in targets satisfies resilience/hips anatomy match). */
  const hipStretch = makeRecoveryExercise("hip_recovery_1", "lower_body", ["hip_flexors", "glutes"]);
  const hipStretch2 = makeRecoveryExercise("hip_recovery_2", "lower_body", ["hip_flexors"]);
  /** Shoulder-only — should drop out when user picks Recovery → Hips sub-goal. */
  const shoulderStretch = makeRecoveryExercise("shoulder_noise_1", "upper_push", ["shoulders", "pecs"]);

  const exercises: Exercise[] = [
    hipStretch,
    hipStretch2,
    shoulderStretch,
    makeRecoveryExercise("hip_recovery_3", "lower_body", ["hip_flexors", "hamstrings"]),
    makeRecoveryExercise("hip_recovery_4", "lower_body", ["glutes"]),
    makeRecoveryExercise("hip_recovery_5", "lower_body", ["hamstrings", "glutes"]),
  ];

  const input: GenerateWorkoutInput = {
    duration_minutes: 30,
    primary_goal: "recovery",
    focus_body_parts: ["upper_push"],
    goal_sub_focus: { resilience: ["hips"] },
    available_equipment: ["bodyweight"],
    injuries_or_constraints: [],
    energy_level: "low",
    seed: 33102,
  };

  const session = generateWorkoutSession(input, exercises);
  const recoveryBlock = session.blocks.find((b) => b.block_type === "cooldown");
  assert.ok(recoveryBlock?.items?.length, "recovery block has items");

  for (const it of recoveryBlock!.items) {
    const ex = exercises.find((e) => e.id === it.exercise_id);
    assert.ok(ex, `unknown exercise ${it.exercise_id}`);
    assert.ok(
      exerciseMatchesGoalSubFocusSlugUnified(ex, "resilience", "hips"),
      `expected hips sub-focus match for ${it.exercise_id}, got unrelated stretch`
    );
  }
}

function run() {
  testRecoveryFocusTargetsPreferredAreas();
  testRecoveryRegionalSubGoalOverridesBroadBodyFocus();
  console.log("recoveryBodyFocusTargeting.test.ts: all passed");
}

run();
