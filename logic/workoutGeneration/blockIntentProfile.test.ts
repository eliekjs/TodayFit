import { buildBlockIntentProfile, blockFormatForCardioHint } from "./blockIntentProfile";
import type { GenerateWorkoutInput } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function baseInput(overrides: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: ["bodyweight", "dumbbells", "bench", "treadmill"],
    injuries_or_constraints: [],
    seed: 77,
    ...overrides,
  };
}

function testRecoveryPrimaryDisablesConditioningByDefault() {
  const profile = buildBlockIntentProfile(
    baseInput({
      primary_goal: "recovery",
      secondary_goals: ["mobility"],
      style_prefs: { conditioning_minutes: 15 },
    })
  );
  assert(profile.allowConditioningBlock === false, "recovery primary without cardio secondary disables conditioning");
  assert(profile.conditioningRequired === false, "recovery + mobility does not require conditioning");
  assert(profile.cardioDominant === false, "recovery + mobility is not cardio dominant");
  console.log("  OK: recovery/mobility defaults to no conditioning block");
}

function testEnduranceThresholdUsesIntervalsHint() {
  const profile = buildBlockIntentProfile(
    baseInput({
      primary_goal: "endurance",
      goal_sub_focus: { endurance: ["threshold_tempo"] },
    })
  );
  assert(profile.cardioDominant === true, "endurance is cardio dominant");
  assert(profile.conditioningRequired === true, "endurance requires conditioning structure");
  assert(profile.sessionCardioShare >= 0.7, "endurance has high cardio share");
  assert(profile.cardioFormatHint === "intervals", "threshold_tempo maps to intervals format hint");
  assert(profile.warmupPreferredTargets.length > 0, "cardio-dominant profile emits warmup targets");
  assert(profile.cooldownPreferredTargets.length > 0, "cardio-dominant profile emits cooldown targets");
  console.log("  OK: endurance threshold resolves interval hint and target preferences");
}

function testDurabilityUsesCircuitHint() {
  const profile = buildBlockIntentProfile(
    baseInput({
      primary_goal: "conditioning",
      goal_sub_focus: { conditioning: ["durability"] },
    })
  );
  assert(profile.cardioFormatHint === "circuit", "durability maps to circuit hint");
  assert(blockFormatForCardioHint(profile.cardioFormatHint) === "circuit", "circuit hint maps to circuit block format");
  console.log("  OK: durability maps to circuit format hint");
}

function testStrengthWithCardioSecondaryRequiresConditioning() {
  const profile = buildBlockIntentProfile(
    baseInput({
      primary_goal: "strength",
      secondary_goals: ["endurance"],
      goal_sub_focus: { endurance: ["zone2_aerobic_base"] },
    })
  );
  assert(profile.allowConditioningBlock === true, "strength + endurance allows conditioning");
  assert(profile.conditioningRequired === true, "strength + endurance requires conditioning");
  assert(profile.cardioDominant === true, "cardio secondary can make session cardio dominant");
  assert(profile.targetCardioExerciseShare >= 0.3, "cardio secondary elevates cardio exercise share");
  console.log("  OK: strength + endurance resolves required conditioning policy");
}

function testWeeklyAndSessionCardioOverridesBlendIntoShare() {
  const profile = buildBlockIntentProfile(
    baseInput({
      primary_goal: "hypertrophy",
      weekly_cardio_emphasis: 0.8,
      session_cardio_target_share: 0.6,
    })
  );
  assert(profile.sessionCardioShare >= 0.5, "weekly/session cardio overrides increase cardio share");
  assert(profile.targetCardioExerciseShare >= 0.3, "weekly/session cardio overrides increase cardio exercise share");
  console.log("  OK: weekly/session cardio overrides are blended into policy shares");
}

function testWarmupCooldownTargetsUseSportAndIntentSpecificity() {
  const profile = buildBlockIntentProfile(
    baseInput({
      primary_goal: "conditioning",
      sport_slugs: ["road_running"],
      goal_sub_focus: { conditioning: ["hills"] },
    })
  );
  assert(profile.warmupPreferredTargets.includes("ankles"), "running + hills warmup includes ankle prep");
  assert(profile.cooldownPreferredTargets.includes("adductors"), "running + hills cooldown includes adductors");
  console.log("  OK: warmup/cooldown targets include sport + intent-specific mappings");
}

function main() {
  console.log("Block intent profile tests...");
  testRecoveryPrimaryDisablesConditioningByDefault();
  testEnduranceThresholdUsesIntervalsHint();
  testDurabilityUsesCircuitHint();
  testStrengthWithCardioSecondaryRequiresConditioning();
  testWeeklyAndSessionCardioOverridesBlendIntoShare();
  testWarmupCooldownTargetsUseSportAndIntentSpecificity();
  console.log("All block intent profile tests passed.");
}

main();
