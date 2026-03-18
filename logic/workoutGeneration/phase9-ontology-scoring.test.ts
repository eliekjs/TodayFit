/**
 * Phase 9: Ontology-aware scoring and ranking tests.
 * Run with: npx tsx logic/workoutGeneration/phase9-ontology-scoring.test.ts
 */

import type { Exercise } from "./types";
import {
  scoreRoleFit,
  scoreFatigueBalance,
  scoreMainLiftAnchor,
  computeOntologyScoreComponents,
  getEffectiveFatigueRegions,
} from "./ontologyScoring";
import { scoreExercise } from "./dailyGenerator";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// --- Fixtures ---
const MAIN_COMPOUND: Exercise = {
  id: "bench",
  name: "Bench Press",
  movement_pattern: "push",
  muscle_groups: ["chest", "triceps"],
  modality: "strength",
  equipment_required: ["barbell"],
  difficulty: 2,
  time_cost: "medium",
  tags: { goal_tags: ["strength"] },
  primary_movement_family: "upper_push",
  exercise_role: "main_compound",
  fatigue_regions: ["pecs", "triceps"],
};

const ISOLATION: Exercise = {
  id: "tricep_pushdown",
  name: "Tricep Pushdown",
  movement_pattern: "push",
  muscle_groups: ["triceps"],
  modality: "strength",
  equipment_required: ["cable_machine"],
  difficulty: 1,
  time_cost: "low",
  tags: { goal_tags: ["hypertrophy"] },
  primary_movement_family: "upper_push",
  exercise_role: "isolation",
  fatigue_regions: ["triceps"],
};

const UNANNOTATED_STRENGTH: Exercise = {
  id: "ohp",
  name: "Overhead Press",
  movement_pattern: "push",
  muscle_groups: ["shoulders", "triceps"],
  modality: "strength",
  equipment_required: ["barbell"],
  difficulty: 2,
  time_cost: "medium",
  tags: { goal_tags: ["strength"] },
};

const WARMUP_PREP: Exercise = {
  id: "band_pull_apart",
  name: "Band Pull-Apart",
  movement_pattern: "pull",
  muscle_groups: ["upper_back"],
  modality: "mobility",
  equipment_required: ["bands"],
  difficulty: 1,
  time_cost: "low",
  tags: {},
  exercise_role: "prep",
  mobility_targets: ["shoulders", "thoracic_spine"],
};

const COOLDOWN_STRETCH: Exercise = {
  id: "hamstring_stretch",
  name: "Hamstring Stretch",
  movement_pattern: "rotate",
  muscle_groups: ["hamstrings"],
  modality: "mobility",
  equipment_required: ["bodyweight"],
  difficulty: 1,
  time_cost: "low",
  tags: {},
  exercise_role: "stretch",
  stretch_targets: ["hamstrings"],
};

const COOLDOWN_GENERIC: Exercise = {
  id: "generic_mobility",
  name: "Generic Mobility",
  movement_pattern: "rotate",
  muscle_groups: ["core"],
  modality: "mobility",
  equipment_required: ["bodyweight"],
  difficulty: 1,
  time_cost: "low",
  tags: {},
};

const input = {
  primary_goal: "strength",
  focus_body_parts: ["upper_push"],
  available_equipment: ["barbell", "cable_machine", "bands", "bodyweight"],
  duration_minutes: 45,
  energy_level: "medium" as const,
  injuries_or_constraints: [],
  seed: 42,
};

function runTests() {
  console.log("Phase 9: Ontology-aware scoring tests\n");

  // 1. Main strength blocks prefer compound roles over isolation
  const mainCompoundRole = scoreRoleFit(
    { ...MAIN_COMPOUND } as import("./ontologyScoring").ExerciseForScoring,
    "main_strength"
  );
  const isolationRole = scoreRoleFit(
    { ...ISOLATION } as import("./ontologyScoring").ExerciseForScoring,
    "main_strength"
  );
  assert(mainCompoundRole.score > isolationRole.score, "main_strength should prefer main_compound over isolation");
  console.log("  OK: main strength blocks prefer compound roles over isolation");

  // 2. Upper_push sessions rank presses above small triceps isolations for main anchors
  const anchorCompound = scoreMainLiftAnchor(
    { ...MAIN_COMPOUND } as import("./ontologyScoring").ExerciseForScoring,
    "main_strength",
    ["upper_push"],
    "strength"
  );
  const anchorIsolation = scoreMainLiftAnchor(
    { ...ISOLATION } as import("./ontologyScoring").ExerciseForScoring,
    "main_strength",
    ["upper_push"],
    "strength"
  );
  assert(anchorCompound.score > anchorIsolation.score, "upper_push main should rank press above isolation as anchor");
  console.log("  OK: upper_push sessions rank presses above triceps isolation for main anchors");

  // 3. fatigue_regions influence later exercise ranking (bonus for fresh region, penalty for overlap)
  const sessionFatigue = new Map<string, number>([["pecs", 2], ["triceps", 1]]);
  const freshRegion = scoreFatigueBalance(
    { id: "row", fatigue_regions: ["lats"], pairing_category: "back" } as import("./ontologyScoring").ExerciseForScoring,
    sessionFatigue
  );
  const overlapRegion = scoreFatigueBalance(
    { ...ISOLATION } as import("./ontologyScoring").ExerciseForScoring,
    sessionFatigue
  );
  assert(freshRegion.score > overlapRegion.score, "fatigue_regions should favor fresh regions over already-taxed");
  console.log("  OK: fatigue_regions influence later exercise ranking");

  // 4. Warmup prefers prep/mobility_prep roles when annotated
  const warmupPrep = scoreRoleFit(
    { ...WARMUP_PREP } as import("./ontologyScoring").ExerciseForScoring,
    "warmup"
  );
  const warmupGeneric = scoreRoleFit(
    { ...COOLDOWN_GENERIC } as import("./ontologyScoring").ExerciseForScoring,
    "warmup"
  );
  assert(warmupPrep.score > warmupGeneric.score, "warmup should prefer prep role over unannotated");
  console.log("  OK: warmup prefers prep/mobility_prep roles when annotated");

  // 5. Cooldown prefers cooldown/stretch/breathing roles
  const cooldownStretch = scoreRoleFit(
    { ...COOLDOWN_STRETCH } as import("./ontologyScoring").ExerciseForScoring,
    "cooldown"
  );
  const cooldownGenericRole = scoreRoleFit(
    { ...COOLDOWN_GENERIC } as import("./ontologyScoring").ExerciseForScoring,
    "cooldown"
  );
  assert(cooldownStretch.score >= cooldownGenericRole.score, "cooldown should prefer stretch role");
  console.log("  OK: cooldown prefers cooldown/stretch/breathing roles");

  // 6. Unannotated exercises still score through fallback (scoreExercise and ontology components)
  const unannotatedResult = scoreExercise(
    UNANNOTATED_STRENGTH,
    input,
    new Set(),
    new Map(),
    undefined,
    { blockType: "main_strength" }
  );
  assert(unannotatedResult.score !== undefined && !Number.isNaN(unannotatedResult.score), "unannotated exercise must still receive a score");
  const unannotatedOntology = computeOntologyScoreComponents(UNANNOTATED_STRENGTH, {
    blockType: "main_strength",
    focusBodyParts: ["upper_push"],
  });
  assert(typeof unannotatedOntology.total === "number", "unannotated exercise must get ontology total (fallback)");
  console.log("  OK: unannotated exercises still score through fallback logic");

  // 7. getEffectiveFatigueRegions: ontology first, then fallback
  const withOntology = getEffectiveFatigueRegions({
    id: "x",
    fatigue_regions: ["quads", "glutes"],
  } as import("./ontologyScoring").ExerciseForScoring);
  const fallback = getEffectiveFatigueRegions({
    id: "y",
    muscle_groups: ["chest", "triceps"],
    movement_pattern: "push",
  } as import("./ontologyScoring").ExerciseForScoring);
  assert(withOntology.includes("quads") && withOntology.includes("glutes"), "ontology fatigue_regions used when present");
  assert(fallback.length > 0, "fallback derives regions from muscles/pattern");
  console.log("  OK: getEffectiveFatigueRegions ontology and fallback");

  console.log("\nAll Phase 9 scoring tests passed.");
}

runTests();
