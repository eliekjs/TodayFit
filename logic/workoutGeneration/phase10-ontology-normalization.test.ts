/**
 * Phase 10: Ontology normalization, grip fatigue, unilateral/variety, and audit tests.
 * Run with: npx tsx logic/workoutGeneration/phase10-ontology-normalization.test.ts
 */

import type { Exercise } from "./types";
import {
  getCanonicalExerciseRole,
  getCanonicalMovementFamilies,
  getCanonicalMovementPatterns,
  getCanonicalFatigueRegions,
  getCanonicalJointStressTags,
  hasGripFatigueDemand,
  isCanonicalCompound,
  isCanonicalIsolation,
  isCanonicalUnilateral,
} from "./ontologyNormalization";
import { getEffectiveFatigueRegions } from "./ontologyScoring";
import { auditExerciseLibrary, formatAuditReport } from "./libraryAudit";
import { scoreUnilateralVariety, scoreMovementPatternRedundancy } from "./ontologyScoring";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// --- Normalization: canonical from ontology + legacy ---
function testCanonicalRole() {
  const withRole = { id: "a", exercise_role: "main_compound" };
  assert(getCanonicalExerciseRole(withRole) === "main_compound", "ontology role used");
  const noRole = { id: "b", movement_pattern: "push", muscle_groups: ["chest"] };
  assert(getCanonicalExerciseRole(noRole) === undefined, "no role when absent");
}

function testCanonicalMovementFamilies() {
  const withFamily = { id: "a", primary_movement_family: "upper_push" };
  assert(getCanonicalMovementFamilies(withFamily).primary === "upper_push", "ontology primary family");
  const legacyPush = { id: "b", movement_pattern: "push", muscle_groups: ["chest", "triceps"] };
  assert(getCanonicalMovementFamilies(legacyPush).primary === "upper_push", "legacy push -> upper_push");
  const legacyPull = { id: "c", movement_pattern: "pull", muscle_groups: ["lats"] };
  assert(getCanonicalMovementFamilies(legacyPull).primary === "upper_pull", "legacy pull -> upper_pull");
}

function testCanonicalMovementPatterns() {
  const withPatterns = { id: "a", movement_patterns: ["horizontal_push", "vertical_push"] };
  const p = getCanonicalMovementPatterns(withPatterns);
  assert(p.includes("horizontal_push") && p.includes("vertical_push"), "ontology patterns");
  const legacyPush = { id: "b", movement_pattern: "push" };
  const lp = getCanonicalMovementPatterns(legacyPush);
  assert(lp.length >= 1 && (lp.includes("horizontal_push") || lp.includes("vertical_push") || lp.includes("push")), "legacy push -> patterns");
}

function testCanonicalFatigueRegions() {
  const withRegions = { id: "a", fatigue_regions: ["quads", "glutes"] };
  assert(
    getCanonicalFatigueRegions(withRegions).includes("quads") && getCanonicalFatigueRegions(withRegions).includes("glutes"),
    "ontology fatigue_regions"
  );
  const legacy = { id: "b", muscle_groups: ["chest", "triceps"], movement_pattern: "push" };
  const r = getCanonicalFatigueRegions(legacy);
  assert(r.includes("pecs") || r.includes("triceps"), "legacy muscles -> fatigue regions");
}

function testGripFatigueDemand() {
  const gripPairing = { id: "a", pairing_category: "grip" };
  assert(hasGripFatigueDemand(gripPairing), "pairing_category grip -> hasGripFatigueDemand");
  const gripStress = { id: "b", joint_stress_tags: ["grip_hanging"] };
  assert(hasGripFatigueDemand(gripStress), "joint_stress grip_hanging -> hasGripFatigueDemand");
  const noGrip = { id: "c", muscle_groups: ["quads"], movement_pattern: "squat" };
  assert(!hasGripFatigueDemand(noGrip), "squat without grip -> no demand");
}

function testGripInEffectiveFatigueRegions() {
  const pullup = {
    id: "pullup",
    fatigue_regions: ["lats", "biceps"],
    pairing_category: "back",
    movement_pattern: "pull",
    muscle_groups: ["lats", "biceps"],
    tags: { joint_stress: ["grip_hanging"] },
  };
  const regions = getEffectiveFatigueRegions(pullup);
  assert(regions.includes("grip"), "pull-up with grip_hanging should include grip fatigue region");
}

function testCanonicalJointStress() {
  const withTags = { id: "a", joint_stress_tags: ["knee_flexion", "lumbar_shear"] };
  const t = getCanonicalJointStressTags(withTags);
  assert(t.includes("knee_flexion") && t.includes("lumbar_shear"), "ontology joint_stress_tags");
  const legacy = { id: "b", tags: { joint_stress: ["shoulder_overhead"] } };
  assert(getCanonicalJointStressTags(legacy).includes("shoulder_overhead"), "legacy tags.joint_stress");
}

function testCompoundIsolation() {
  const compound = { id: "a", exercise_role: "main_compound" };
  assert(isCanonicalCompound(compound), "main_compound is compound");
  const isolation = { id: "b", exercise_role: "isolation" };
  assert(isCanonicalIsolation(isolation), "isolation role is isolation");
  const legacySquat = { id: "c", movement_pattern: "squat", muscle_groups: ["legs"] };
  assert(isCanonicalCompound(legacySquat), "legacy squat is compound");
}

function testUnilateral() {
  const uni = { id: "a", unilateral: true };
  assert(isCanonicalUnilateral(uni), "unilateral true");
  const bi = { id: "b", unilateral: false };
  assert(!isCanonicalUnilateral(bi), "unilateral false");
  assert(!isCanonicalUnilateral({ id: "c" }), "absent unilateral is false");
}

// --- Unilateral variety scoring ---
function testUnilateralVarietyScoring() {
  const unilateralLower = {
    id: "split_squat",
    movement_pattern: "squat",
    muscle_groups: ["quads"],
    unilateral: true,
    primary_movement_family: "lower_body",
  };
  const withBilateral = scoreUnilateralVariety(unilateralLower as import("./ontologyScoring").ExerciseForScoring, true);
  const withoutBilateral = scoreUnilateralVariety(unilateralLower as import("./ontologyScoring").ExerciseForScoring, false);
  assert(withBilateral.score > 0, "unilateral variety bonus when session has bilateral lower");
  assert(withoutBilateral.score === 0, "no bonus when session has no bilateral lower");
}

// --- Movement pattern redundancy ---
function testMovementPatternRedundancy() {
  const ex = {
    id: "bench",
    movement_pattern: "push",
    muscle_groups: ["chest"],
  } as import("./ontologyScoring").ExerciseForScoring;
  const countsHigh = new Map<string, number>([["push", 3]]);
  const countsLow = new Map<string, number>([["push", 1]]);
  const high = scoreMovementPatternRedundancy(ex, countsHigh, 2);
  const low = scoreMovementPatternRedundancy(ex, countsLow, 2);
  assert(high.score < 0, "penalty when pattern count >= cap");
  assert(low.score === 0, "no penalty when under cap");
}

// --- Audit utility ---
function testAuditUtility() {
  const exercises: Exercise[] = [
    {
      id: "full_ontology",
      name: "Full",
      movement_pattern: "squat",
      muscle_groups: ["quads"],
      modality: "strength",
      equipment_required: [],
      difficulty: 1,
      time_cost: "medium",
      tags: {},
      primary_movement_family: "lower_body",
      exercise_role: "main_compound",
      movement_patterns: ["squat"],
      fatigue_regions: ["quads"],
      pairing_category: "quads",
      joint_stress_tags: ["knee_flexion"],
    } as Exercise,
    {
      id: "legacy_only",
      name: "Legacy",
      movement_pattern: "push",
      muscle_groups: ["chest"],
      modality: "strength",
      equipment_required: [],
      difficulty: 1,
      time_cost: "low",
      tags: {},
    } as Exercise,
  ];
  const report = auditExerciseLibrary(exercises);
  assert(report.total_exercises === 2, "audit total count");
  assert(report.findings.length >= 1, "audit finds missing/weak fields");
  const formatted = formatAuditReport(report);
  assert(formatted.includes("Library audit") && formatted.includes("legacy_only"), "formatted report contains expected content");
}

// --- Unannotated fallback ---
function testUnannotatedFallback() {
  const unannotated = {
    id: "no_ontology",
    movement_pattern: "hinge" as const,
    muscle_groups: ["hamstrings", "glutes"],
    pairing_category: undefined,
    fatigue_regions: undefined,
    primary_movement_family: undefined,
  };
  const regions = getCanonicalFatigueRegions(unannotated);
  assert(regions.length > 0, "unannotated still gets derived fatigue regions");
  const { primary } = getCanonicalMovementFamilies(unannotated);
  assert(primary === "lower_body", "unannotated hinge -> lower_body");
}

function runTests() {
  console.log("Phase 10: Ontology normalization and audit tests\n");

  testCanonicalRole();
  console.log("  OK: getCanonicalExerciseRole");

  testCanonicalMovementFamilies();
  console.log("  OK: getCanonicalMovementFamilies");

  testCanonicalMovementPatterns();
  console.log("  OK: getCanonicalMovementPatterns");

  testCanonicalFatigueRegions();
  console.log("  OK: getCanonicalFatigueRegions");

  testGripFatigueDemand();
  console.log("  OK: hasGripFatigueDemand");

  testGripInEffectiveFatigueRegions();
  console.log("  OK: grip in getEffectiveFatigueRegions");

  testCanonicalJointStress();
  console.log("  OK: getCanonicalJointStressTags");

  testCompoundIsolation();
  console.log("  OK: isCanonicalCompound / isCanonicalIsolation");

  testUnilateral();
  console.log("  OK: isCanonicalUnilateral");

  testUnilateralVarietyScoring();
  console.log("  OK: scoreUnilateralVariety");

  testMovementPatternRedundancy();
  console.log("  OK: scoreMovementPatternRedundancy");

  testAuditUtility();
  console.log("  OK: auditExerciseLibrary and formatAuditReport");

  testUnannotatedFallback();
  console.log("  OK: unannotated fallback");

  console.log("\nAll Phase 10 tests passed.");
}

runTests();
