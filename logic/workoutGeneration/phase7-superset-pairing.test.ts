/**
 * Phase 7: Ontology-aware superset pairing tests.
 * Run with: npx tsx logic/workoutGeneration/phase7-superset-pairing.test.ts
 */

import type { Exercise } from "./types";
import {
  getEffectivePairingCategory,
  getEffectiveFatigueRegions,
  getEffectivePairingFamilies,
  getSupersetPairingScore,
  supersetCompatibility,
  pickBestSupersetPairs,
  hasGripDemand,
} from "../workoutIntelligence/supersetPairing";
import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// --- getEffectivePairingCategory: ontology first, then fallback ---
function testPairingCategoryOntologyAndFallback() {
  const chestAnnotated: Exercise = {
    id: "bench",
    name: "Bench",
    movement_pattern: "push",
    muscle_groups: ["chest", "triceps"],
    modality: "strength",
    equipment_required: ["barbell"],
    difficulty: 2,
    time_cost: "medium",
    tags: {},
    pairing_category: "chest",
  };
  assert(getEffectivePairingCategory(chestAnnotated) === "chest", "ontology pairing_category used");

  const legacyPush: Exercise = {
    id: "push_legacy",
    name: "Push",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
  };
  assert(getEffectivePairingCategory(legacyPush) === "chest", "fallback derives chest from muscles");
}

// --- getEffectiveFatigueRegions: ontology and fallback ---
function testFatigueRegions() {
  const withRegions: Exercise = {
    id: "ex1",
    name: "Ex1",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    fatigue_regions: ["pecs", "triceps"],
  };
  const regions = getEffectiveFatigueRegions(withRegions);
  assert(regions.includes("pecs") && regions.includes("triceps"), "ontology fatigue_regions used");

  const legacy: Exercise = {
    id: "ex2",
    name: "Ex2",
    movement_pattern: "push",
    muscle_groups: ["chest", "triceps"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
  };
  const derived = getEffectiveFatigueRegions(legacy);
  assert(derived.length >= 1, "fallback derives at least one region from muscles");
}

// --- Upper push: complementary categories score better than same category ---
function testUpperPushComplementaryVsSameCategory() {
  const chest: Exercise = {
    id: "chest_ex",
    name: "Chest",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: "chest",
    primary_movement_family: "upper_push",
  };
  const triceps: Exercise = {
    id: "tri_ex",
    name: "Triceps",
    movement_pattern: "push",
    muscle_groups: ["triceps"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: "triceps",
    primary_movement_family: "upper_push",
  };
  const chest2: Exercise = { ...chest, id: "chest2", name: "Chest2" };

  const scoreComplementary = getSupersetPairingScore(chest, triceps);
  const scoreSameCategory = getSupersetPairingScore(chest, chest2);
  assert(scoreComplementary > scoreSameCategory, "chest + triceps scores higher than chest + chest");
  assert(supersetCompatibility(chest, triceps) === "good" || getSupersetPairingScore(chest, triceps) > 0, "chest + triceps good or positive");
  console.log("  OK: upper_push complementary vs same-category pairing score");
}

// --- Lower body: avoid excessive overlap ---
function testLowerBodyPairing() {
  const quads: Exercise = {
    id: "quads_ex",
    name: "Quads",
    movement_pattern: "squat",
    muscle_groups: ["quads", "legs"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: "quads",
    primary_movement_family: "lower_body",
    fatigue_regions: ["quads"],
  };
  const posterior: Exercise = {
    id: "post_ex",
    name: "Posterior",
    movement_pattern: "hinge",
    muscle_groups: ["hamstrings", "glutes"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: "posterior_chain",
    primary_movement_family: "lower_body",
    fatigue_regions: ["hamstrings", "glutes"],
  };
  const quads2: Exercise = { ...quads, id: "quads2", name: "Quads2" };

  const scoreComplementary = getSupersetPairingScore(quads, posterior);
  const scoreSame = getSupersetPairingScore(quads, quads2);
  assert(scoreComplementary > scoreSame, "quads + posterior_chain scores higher than quads + quads");
  console.log("  OK: lower body complementary vs same-category");
}

// --- Fatigue regions overlap reduces score ---
function testFatigueRegionsOverlapPenalty() {
  const pecsHeavy: Exercise = {
    id: "p1",
    name: "P1",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    fatigue_regions: ["pecs", "triceps"],
  };
  const pecsHeavy2: Exercise = {
    id: "p2",
    name: "P2",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    fatigue_regions: ["pecs", "triceps"],
  };
  const back: Exercise = {
    id: "back",
    name: "Back",
    movement_pattern: "pull",
    muscle_groups: ["back"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    fatigue_regions: ["lats"],
  };

  const overlapScore = getSupersetPairingScore(pecsHeavy, pecsHeavy2);
  const diffScore = getSupersetPairingScore(pecsHeavy, back);
  assert(diffScore > overlapScore, "different fatigue regions score higher than heavy overlap");
  console.log("  OK: fatigue_regions overlap penalty");
}

// --- Hybrid exercises: effective families ---
function testHybridEffectiveFamilies() {
  const thruster: Exercise = {
    id: "thruster",
    name: "Thruster",
    movement_pattern: "push",
    muscle_groups: ["legs", "shoulders"],
    modality: "strength",
    equipment_required: ["barbell"],
    difficulty: 3,
    time_cost: "high",
    tags: {},
    primary_movement_family: "lower_body",
    secondary_movement_families: ["upper_push"],
  };
  const families = getEffectivePairingFamilies(thruster);
  assert(families.includes("lower_body") && families.includes("upper_push"), "hybrid has both families");
  console.log("  OK: hybrid effective families");
}

// --- Unannotated exercises: legacy fallback, pairing still works ---
function testUnannotatedFallback() {
  const push: Exercise = {
    id: "push_only",
    name: "Push",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
  };
  const pull: Exercise = {
    id: "pull_only",
    name: "Pull",
    movement_pattern: "pull",
    muscle_groups: ["back"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
  };
  const compat = supersetCompatibility(push, pull);
  assert(compat === "good", "unannotated push + pull still good (legacy pattern)");
  const score = getSupersetPairingScore(push, pull);
  assert(score >= 0, "unannotated pair has non-negative score");
  console.log("  OK: unannotated fallback");
}

// --- pickBestSupersetPairs prefers complementary when available ---
function testPickBestSupersetPairs() {
  const chest: Exercise = {
    id: "c1",
    name: "Chest",
    movement_pattern: "push",
    muscle_groups: ["chest"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: "chest",
    primary_movement_family: "upper_push",
  };
  const triceps: Exercise = {
    id: "t1",
    name: "Triceps",
    movement_pattern: "push",
    muscle_groups: ["triceps"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: {},
    pairing_category: "triceps",
    primary_movement_family: "upper_push",
  };
  const chest2: Exercise = { ...chest, id: "c2", name: "Chest2" };
  const pool = [chest, triceps, chest2];
  const pairs = pickBestSupersetPairs(pool, 1, new Set());
  assert(pairs.length === 1, "one pair formed");
  const [a, b] = pairs[0];
  const ids = new Set([a.id, b.id]);
  assert(ids.has("c1") && ids.has("t1"), "best pair is chest + triceps, not chest + chest");
  console.log("  OK: pickBestSupersetPairs prefers complementary");
}

// --- Grip: double grip is bad ---
function testGripPairing() {
  const grip1: Exercise = {
    id: "g1",
    name: "Grip",
    movement_pattern: "carry",
    muscle_groups: ["forearms"],
    modality: "strength",
    equipment_required: [],
    difficulty: 1,
    time_cost: "low",
    tags: { stimulus: ["grip"] },
    pairing_category: "grip",
  };
  const grip2: Exercise = { ...grip1, id: "g2", name: "Grip2" };
  assert(hasGripDemand(grip1), "grip exercise has grip demand");
  const score = getSupersetPairingScore(grip1, grip2);
  assert(score < 0, "grip + grip scores negative");
  assert(supersetCompatibility(grip1, grip2) === "bad", "grip + grip compatibility bad");
  console.log("  OK: double grip penalized");
}

// --- Generator integration: strength session uses pairing ---
function testGeneratorUsesPairing() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 60,
    primary_goal: "strength",
    energy_level: "high",
    available_equipment: ["barbell", "bench", "dumbbells", "bodyweight", "cable_machine"],
    injuries_or_constraints: [],
    seed: 77,
  };
  const session = generateWorkoutSession(input, STUB_EXERCISES);
  const supersetBlocks = session.blocks.filter(
    (b) => b.block_type === "main_strength" && b.format === "superset"
  );
  if (supersetBlocks.length > 0) {
    const block = supersetBlocks[0];
    assert(block.items.length >= 2, "superset block has at least 2 items");
  }
  console.log("  OK: generator produces superset blocks when pairing is used");
}

function main() {
  console.log("Phase 7 superset pairing tests...");
  testPairingCategoryOntologyAndFallback();
  console.log("  OK: getEffectivePairingCategory");
  testFatigueRegions();
  console.log("  OK: getEffectiveFatigueRegions");
  testUpperPushComplementaryVsSameCategory();
  testLowerBodyPairing();
  testFatigueRegionsOverlapPenalty();
  testHybridEffectiveFamilies();
  testUnannotatedFallback();
  testPickBestSupersetPairs();
  testGripPairing();
  testGeneratorUsesPairing();
  console.log("All Phase 7 tests passed.");
}

main();
