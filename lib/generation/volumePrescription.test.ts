/**
 * Volume prescription helpers — goal profiles + energy scaling.
 * Run: npx tsx lib/generation/volumePrescription.test.ts
 */

import {
  getGoalRules,
  resolveVolumePrescription,
  scaleRepsByEnergy,
  selectRepsFromRange,
  resolveSetsFromRange,
} from "./prescriptionRules";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testStrengthDefaultsAwayFromFive() {
  const rules = getGoalRules("strength");
  const { reps } = resolveVolumePrescription(rules.repRange, rules.setRange, "medium", "mid");
  assert(reps >= 6, `strength medium reps should be ≥6, got ${reps}`);
  console.log(`  OK: strength medium → ${reps} reps`);
}

function testStrengthHighEnergy() {
  const rules = getGoalRules("strength");
  const { reps, baseSets } = resolveVolumePrescription(rules.repRange, rules.setRange, "high", "mid");
  assert(reps >= 6 && reps <= 8, `strength high reps in 6–8, got ${reps}`);
  assert(baseSets >= 5, `strength high sets should be ≥5, got ${baseSets}`);
  console.log(`  OK: strength high → ${reps} reps × ${baseSets} sets`);
}

function testHypertrophyBiasesUpperBand() {
  const rules = getGoalRules("hypertrophy");
  const { reps } = resolveVolumePrescription(rules.repRange, rules.setRange, "medium", "max");
  assert(reps >= 12, `hypertrophy max-selection reps should be ≥12, got ${reps}`);
  console.log(`  OK: hypertrophy medium → ${reps} reps`);
}

function testHypertrophyHighEnergyVolume() {
  const rules = getGoalRules("hypertrophy");
  const { reps, baseSets } = resolveVolumePrescription(rules.repRange, rules.setRange, "high", "max");
  assert(reps >= 12, `hypertrophy high reps should be ≥12, got ${reps}`);
  assert(baseSets >= 4, `hypertrophy high sets should be ≥4, got ${baseSets}`);
  console.log(`  OK: hypertrophy high → ${reps} reps × ${baseSets} sets`);
}

function testBodyRecompHighReps() {
  const rules = getGoalRules("body_recomp");
  const { reps } = resolveVolumePrescription(rules.repRange, rules.setRange, "medium", "max");
  assert(reps >= 12, `body recomp reps should be ≥12, got ${reps}`);
  console.log(`  OK: body recomp → ${reps} reps`);
}

function testEnergyRepShift() {
  const range = { min: 8, max: 15 };
  const base = selectRepsFromRange(range, "max");
  const low = scaleRepsByEnergy(base, "low", range);
  const high = scaleRepsByEnergy(base, "high", range);
  assert(low < high, `low energy (${low}) should be below high (${high})`);
  console.log(`  OK: energy rep shift ${low} < ${high} (base ${base})`);
}

function testEnergySetShift() {
  const range = { min: 3, max: 4 };
  assert(resolveSetsFromRange(range, "low") === 3, "low sets = min");
  assert(resolveSetsFromRange(range, "medium") === 4, "medium sets = mid");
  assert(resolveSetsFromRange(range, "high") === 5, "high sets = max + 1");
  console.log("  OK: energy set shift 3 / 4 / 5");
}

function testUserVolumePreferenceStacksWithEnergy() {
  const rules = getGoalRules("hypertrophy");
  const standard = resolveVolumePrescription(rules.repRange, rules.setRange, "medium", "max", "standard");
  const high = resolveVolumePrescription(rules.repRange, rules.setRange, "medium", "max", "high_volume");
  const low = resolveVolumePrescription(rules.repRange, rules.setRange, "medium", "max", "conservative");
  assert(high.baseSets > standard.baseSets, `high volume sets (${high.baseSets}) > standard (${standard.baseSets})`);
  assert(low.baseSets < standard.baseSets, `conservative sets (${low.baseSets}) < standard (${standard.baseSets})`);
  assert(high.reps >= standard.reps, `high volume reps (${high.reps}) ≥ standard (${standard.reps})`);
  assert(low.reps <= standard.reps, `conservative reps (${low.reps}) ≤ standard (${standard.reps})`);
  console.log(
    `  OK: volume dial medium energy → conservative ${low.reps}×${low.baseSets}, standard ${standard.reps}×${standard.baseSets}, high ${high.reps}×${high.baseSets}`
  );
}

function testPowerLocksRepsUnderHighVolume() {
  const powerRange = { min: 3, max: 5 };
  const setRange = { min: 3, max: 4 };
  const standard = resolveVolumePrescription(powerRange, setRange, "medium", "min", "standard", {
    lockReps: true,
  });
  const high = resolveVolumePrescription(powerRange, setRange, "medium", "min", "high_volume", {
    lockReps: true,
  });
  assert(high.reps === standard.reps, `power high volume should lock reps (${high.reps} vs ${standard.reps})`);
  assert(high.baseSets > standard.baseSets, "power high volume still adds a set");
  console.log(`  OK: power lockReps keeps ${standard.reps} reps, sets ${standard.baseSets} → ${high.baseSets}`);
}

function run() {
  console.log("Volume prescription tests\n");
  testStrengthDefaultsAwayFromFive();
  testStrengthHighEnergy();
  testHypertrophyBiasesUpperBand();
  testHypertrophyHighEnergyVolume();
  testBodyRecompHighReps();
  testEnergyRepShift();
  testEnergySetShift();
  testUserVolumePreferenceStacksWithEnergy();
  testPowerLocksRepsUnderHighVolume();
  console.log("\nAll volume prescription tests passed.");
}

run();
