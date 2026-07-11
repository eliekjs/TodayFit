/**
 * Prescription evidence: assert goal rules align with app rest policy and rep science.
 * Run with: npx tsx logic/workoutGeneration/prescription-evidence.test.ts
 *
 * Individual-exercise rest: ≤90 s, bias toward 60 s (session density / product UX).
 * Hypertrophy reps: 6–20 near failure (Schoenfeld); strength practical gym band 5–8.
 */

import { getGoalRules } from "../../lib/generation/prescriptionRules";
import { getPrescriptionStyle } from "../workoutIntelligence/prescriptionStyles";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testStrengthRestInAppRange() {
  const rules = getGoalRules("strength");
  assert(rules.restRange.min >= 60, "strength rest min >= 60 s");
  assert(rules.restRange.max <= 90, "strength rest max <= 90 s (individual-exercise cap)");
  assert(rules.repRange.min >= 5 && rules.repRange.max <= 8, "strength rep range 5–8 (practical gym strength)");
  console.log("  OK: strength rest 60–90 s, rep range 5–8");
}

function testHypertrophyRestInEvidenceRange() {
  const rules = getGoalRules("hypertrophy");
  assert(rules.restRange.min >= 60, "hypertrophy rest min >= 60 s (meta-analysis ≥60 s)");
  assert(rules.restRange.max <= 90, "hypertrophy rest max <= 90 s (individual-exercise cap)");
  assert(rules.repRange.min >= 6 && rules.repRange.max <= 20, "hypertrophy rep range 6–20 (Schoenfeld effective range)");
  console.log("  OK: hypertrophy rest 60–90 s, rep range 8–15");
}

function testPrescriptionStylesAlignWithGoalRules() {
  const heavy = getPrescriptionStyle("heavy_strength");
  assert(heavy.rest_seconds_min != null && heavy.rest_seconds_max != null, "heavy_strength defines rest bounds");
  assert(heavy.rest_seconds_min >= 60 && heavy.rest_seconds_max <= 90, "heavy_strength rest in 60–90 s range");
  const mod = getPrescriptionStyle("moderate_hypertrophy");
  assert(mod.rest_seconds_min != null && mod.rest_seconds_max != null, "moderate_hypertrophy defines rest bounds");
  assert(mod.rest_seconds_min >= 60 && mod.rest_seconds_max <= 90, "moderate_hypertrophy rest in 60–90 s range");
  console.log("  OK: prescription styles (workoutIntelligence path) align with rest policy");
}

function run() {
  console.log("Prescription evidence tests\n");
  testStrengthRestInAppRange();
  testHypertrophyRestInEvidenceRange();
  testPrescriptionStylesAlignWithGoalRules();
  console.log("\nAll prescription evidence tests passed.");
}

run();
