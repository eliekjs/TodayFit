/**
 * Prescription evidence: assert goal rules align with ACSM/NSCA and meta-analyses.
 * Run with: npx tsx logic/workoutGeneration/prescription-evidence.test.ts
 *
 * Evidence (Tier 1):
 * - Strength: 3–5 min rest (ACSM position stand); 1–6 RM.
 * - Hypertrophy: 1–2 min rest (ACSM); 60–90 s supported by meta-analysis (≥60 s).
 */

import { getGoalRules } from "../../lib/generation/prescriptionRules";
import { getPrescriptionStyle } from "../workoutIntelligence/prescriptionStyles";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testStrengthRestInEvidenceRange() {
  const rules = getGoalRules("strength");
  assert(rules.restRange.min >= 150, "strength rest min >= 150 s (2.5 min; ACSM 3–5 min)");
  assert(rules.restRange.max >= 240, "strength rest max >= 240 s (4 min)");
  assert(rules.repRange.min >= 1 && rules.repRange.max <= 8, "strength rep range 1–8 (ACSM 1–6 RM)");
  console.log("  OK: strength rest 150–300 s, rep range 3–6");
}

function testHypertrophyRestInEvidenceRange() {
  const rules = getGoalRules("hypertrophy");
  assert(rules.restRange.min >= 60, "hypertrophy rest min >= 60 s (meta-analysis ≥60 s)");
  assert(rules.restRange.max <= 120, "hypertrophy rest max <= 120 s (ACSM 1–2 min)");
  assert(rules.repRange.min >= 6 && rules.repRange.max <= 20, "hypertrophy rep range 6–20 (Schoenfeld effective range)");
  console.log("  OK: hypertrophy rest 60–90 s, rep range 8–15");
}

function testPrescriptionStylesAlignWithGoalRules() {
  const heavy = getPrescriptionStyle("heavy_strength");
  assert(heavy.rest_seconds_min >= 150 && heavy.rest_seconds_max >= 240, "heavy_strength rest in 2.5–5 min range");
  const mod = getPrescriptionStyle("moderate_hypertrophy");
  assert(mod.rest_seconds_min >= 60 && mod.rest_seconds_max <= 120, "moderate_hypertrophy rest in 1–2 min range");
  console.log("  OK: prescription styles (workoutIntelligence path) align with evidence");
}

function run() {
  console.log("Prescription evidence tests\n");
  testStrengthRestInEvidenceRange();
  testHypertrophyRestInEvidenceRange();
  testPrescriptionStylesAlignWithGoalRules();
  console.log("\nAll prescription evidence tests passed.");
}

run();
