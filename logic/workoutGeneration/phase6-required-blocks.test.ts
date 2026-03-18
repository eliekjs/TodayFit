/**
 * Phase 6: Required block behavior and ontology-driven cooldown selection.
 * Run with: npx tsx logic/workoutGeneration/phase6-required-blocks.test.ts
 */

import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput, WorkoutSession } from "./types";
import type { Exercise } from "./types";
import {
  selectCooldownMobilityExercises,
  getPreferredCooldownTargetsFromFamilies,
  isCooldownEligible,
} from "./cooldownSelection";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// --- Mobility secondary goal creates cooldown mobility block ---
function testMobilitySecondaryGoalCreatesCooldownBlock() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    secondary_goals: ["mobility"],
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "bodyweight"],
    injuries_or_constraints: [],
    seed: 100,
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES);
  const last = session.blocks[session.blocks.length - 1];
  assert(last != null, "session has blocks");
  assert(last.block_type === "cooldown", "last block is cooldown");
  assert(
    (last.title ?? "").toLowerCase().includes("mobility") || (last.title ?? "").toLowerCase().includes("cooldown"),
    "cooldown block has mobility-related title when mobility is secondary goal"
  );
  assert(last.items.length >= 2, "cooldown has at least 2 items (required_finishers)");
  console.log("  OK: mobility secondary goal → cooldown block with visible title and ≥2 mobility items");
}

// --- No mobility secondary goal: cooldown has no required title (legacy behavior) ---
function testNoMobilityGoalLegacyCooldown() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "bodyweight"],
    injuries_or_constraints: [],
    seed: 101,
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES);
  const last = session.blocks[session.blocks.length - 1];
  assert(last?.block_type === "cooldown", "last block is cooldown");
  assert(last.items.length >= 2, "cooldown has at least 2 items");
  console.log("  OK: no mobility goal → cooldown still present with 2+ items");
}

// --- Upper push + mobility: preferred targets used when annotated options exist ---
function testUpperPushMobilityPreferTargets() {
  const shoulderMobility: Exercise = {
    id: "shoulder_stretch_anno",
    name: "Shoulder mobility",
    movement_pattern: "rotate",
    muscle_groups: ["core"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: ["mobility", "recovery"], energy_fit: ["low", "medium", "high"], joint_stress: [], stimulus: [] },
    mobility_targets: ["shoulders", "thoracic_spine"],
    stretch_targets: ["shoulders"],
  };
  const genericMobility: Exercise = {
    id: "generic_mob",
    name: "Generic mobility",
    movement_pattern: "rotate",
    muscle_groups: ["core"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: ["mobility"], energy_fit: ["low", "medium", "high"], joint_stress: [], stimulus: [] },
  };
  const preferred = getPreferredCooldownTargetsFromFamilies(["upper_push"]);
  assert(preferred.includes("shoulders") || preferred.includes("thoracic_spine"), "upper_push yields shoulder/thoracic targets");
  const chosen = selectCooldownMobilityExercises(
    [genericMobility, shoulderMobility],
    { minMobilityCount: 2, preferredTargets: preferred, alreadyUsedIds: new Set(), rng: () => 0.5 }
  );
  assert(chosen.length >= 1, "at least one chosen");
  const firstId = chosen[0]?.id;
  assert(
    firstId === "shoulder_stretch_anno",
    "exercise with matching mobility_targets preferred over generic when preferredTargets = upper_push"
  );
  console.log("  OK: upper_push + mobility prefers shoulder/thoracic when annotated");
}

// --- Lower body + mobility: lower-body-relevant cooldown targets ---
function testLowerBodyMobilityPreferTargets() {
  const hipHamstring: Exercise = {
    id: "hip_ham_anno",
    name: "Hip & hamstring",
    movement_pattern: "rotate",
    muscle_groups: ["legs", "core"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: ["mobility"], energy_fit: ["low", "medium", "high"], joint_stress: [], stimulus: [] },
    mobility_targets: ["hamstrings", "hip_flexors"],
    stretch_targets: ["glutes"],
  };
  const preferred = getPreferredCooldownTargetsFromFamilies(["lower_body"]);
  assert(
    preferred.some((t) => ["hamstrings", "hip_flexors", "glutes", "calves", "quadriceps"].includes(t)),
    "lower_body yields lower-body targets"
  );
  const chosen = selectCooldownMobilityExercises(
    [hipHamstring],
    { minMobilityCount: 1, preferredTargets: preferred, alreadyUsedIds: new Set(), rng: () => 0.5 }
  );
  assert(chosen.length === 1 && chosen[0].id === "hip_ham_anno", "lower-body-annotated exercise selected");
  console.log("  OK: lower_body + mobility prefers hips/hamstrings/glutes when annotated");
}

// --- Cooldown = stretching only: mobility-only (no stretch_targets) is excluded ---
function testCooldownStretchOnly() {
  const legacyMobility: Exercise = {
    id: "legacy_mob",
    name: "Legacy mobility",
    movement_pattern: "rotate",
    muscle_groups: ["core"],
    modality: "mobility",
    equipment_required: ["bodyweight"],
    difficulty: 1,
    time_cost: "low",
    tags: { goal_tags: ["mobility"], energy_fit: ["low", "medium", "high"], joint_stress: [], stimulus: [] },
  };
  assert(isCooldownEligible(legacyMobility), "legacy modality mobility is cooldown-eligible (equipment/role)");
  const chosen = selectCooldownMobilityExercises(
    [legacyMobility],
    { minMobilityCount: 1, preferredTargets: [], alreadyUsedIds: new Set(), rng: () => 0.5 }
  );
  assert(chosen.length === 0, "cooldown is stretch-only: mobility-only exercise (no stretch_targets) is excluded");
  const withStretch: Exercise = { ...legacyMobility, id: "stretch_anno", stretch_targets: ["hamstrings"] };
  const chosen2 = selectCooldownMobilityExercises(
    [withStretch],
    { minMobilityCount: 1, preferredTargets: [], alreadyUsedIds: new Set(), rng: () => 0.5 }
  );
  assert(chosen2.length === 1 && chosen2[0].id === "stretch_anno", "exercise with stretch_targets is selected for cooldown");
  console.log("  OK: cooldown is stretching only; mobility-only excluded");
}

// --- exercise_role: cooldown/stretch roles excluded from main work pool ---
function testExerciseRoleExcludedFromMainWork() {
  const poolWithCooldownRole: Exercise[] = [
    ...STUB_EXERCISES.filter((e) => e.id !== "breathing_cooldown"),
    {
      id: "strength_looking_cooldown",
      name: "Fake strength",
      movement_pattern: "push",
      muscle_groups: ["chest"],
      modality: "strength",
      equipment_required: ["barbell", "bench"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["strength"], energy_fit: ["medium", "high"], joint_stress: [], stimulus: [] },
      exercise_role: "cooldown",
    } as Exercise,
  ];
  const session = generateWorkoutSession(
    {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "high",
      available_equipment: ["barbell", "bench", "dumbbells", "bodyweight"],
      injuries_or_constraints: [],
      seed: 200,
    },
    poolWithCooldownRole
  );
  const mainBlocks = session.blocks.filter(
    (b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy"
  );
  const mainExerciseIds = new Set(mainBlocks.flatMap((b) => b.items.map((i) => i.exercise_id)));
  assert(
    !mainExerciseIds.has("strength_looking_cooldown"),
    "exercise with exercise_role cooldown must not appear in main work blocks"
  );
  console.log("  OK: exercise_role cooldown excluded from main work selection");
}

// --- 45 min conditioning / HIIT: at least 6 main-work exercises (not only 2 + warmups) ---
function test45MinConditioningHasSixExercises() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "conditioning",
    energy_level: "medium",
    available_equipment: ["barbell", "bench", "dumbbells", "bodyweight", "kettlebell"],
    injuries_or_constraints: [],
    seed: 300,
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES);
  const mainBlocks = session.blocks.filter(
    (b) => b.block_type === "conditioning" || b.block_type === "main_strength" || b.block_type === "main_hypertrophy"
  );
  const mainExerciseCount = mainBlocks.reduce((n, b) => n + b.items.length, 0);
  assert(mainExerciseCount >= 6, `45 min conditioning should have at least 6 main exercises, got ${mainExerciseCount}`);
  console.log("  OK: 45 min conditioning has at least 6 main-work exercises");
}

function main() {
  console.log("Phase 6 required-block and cooldown selection tests...");
  testMobilitySecondaryGoalCreatesCooldownBlock();
  testNoMobilityGoalLegacyCooldown();
  testUpperPushMobilityPreferTargets();
  testLowerBodyMobilityPreferTargets();
  testCooldownStretchOnly();
  testExerciseRoleExcludedFromMainWork();
  test45MinConditioningHasSixExercises();
  console.log("All Phase 6 tests passed.");
}

main();
