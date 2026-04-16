/**
 * Lists exercises that pass buildPowerBlock's powerPool filter (dailyGenerator.ts).
 * Run: npx tsx scripts/print-power-pool.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { getLegacyMovementPattern } from "../lib/ontology/legacyMapping";
import { MAIN_WORK_EXCLUDED_ROLES } from "../logic/workoutGeneration/cooldownSelection";
import type { Exercise } from "../logic/workoutGeneration/types";

function effectiveMainWorkPattern(e: Exercise): string {
  return getLegacyMovementPattern({
    movement_patterns: e.movement_patterns,
    movement_pattern: e.movement_pattern,
  });
}

function powerPoolMatch(e: Exercise, isLower: boolean): boolean {
  const hasPower = e.modality === "power" || (e.tags?.goal_tags ?? []).includes("power");
  const isExplosiveConditioning =
    e.modality === "conditioning" &&
    (e.tags?.goal_tags ?? []).includes("power") &&
    (e.tags?.stimulus ?? []).some((s) => String(s).toLowerCase().includes("plyometric"));
  if (!hasPower && !isExplosiveConditioning) return false;
  if (e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
    return false;
  if (e.fatigue_cost === "high") return false;
  if (isLower) {
    const lowerPatterns = new Set(["squat", "hinge", "locomotion"]);
    const pattern = effectiveMainWorkPattern(e);
    const muscles = new Set((e.muscle_groups ?? []).map((m) => m.toLowerCase()));
    const family = (e.primary_movement_family ?? "").toLowerCase().replace(/\s/g, "_");
    const isLowerBody =
      lowerPatterns.has(pattern) ||
      family === "lower_body" ||
      muscles.has("legs") ||
      muscles.has("quads") ||
      muscles.has("glutes") ||
      muscles.has("hamstrings");
    if (!isLowerBody) return false;
  }
  return true;
}

function reason(e: Exercise): string {
  const hasPower = e.modality === "power" || (e.tags?.goal_tags ?? []).includes("power");
  const isExplosiveConditioning =
    e.modality === "conditioning" &&
    (e.tags?.goal_tags ?? []).includes("power") &&
    (e.tags?.stimulus ?? []).some((s) => String(s).toLowerCase().includes("plyometric"));
  if (isExplosiveConditioning) return "conditioning+power+plyometric";
  if (e.modality === "power") return "modality=power";
  if ((e.tags?.goal_tags ?? []).includes("power")) return "goal_tags power";
  return "?";
}

const exercises = EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);

const all = exercises.filter((e) => powerPoolMatch(e, false)).sort((a, b) => a.id.localeCompare(b.id));
const lower = exercises.filter((e) => powerPoolMatch(e, true)).sort((a, b) => a.id.localeCompare(b.id));

console.log("=== Power & explosiveness — buildPowerBlock powerPool (static merged catalog) ===\n");
console.log(`Total exercises in catalog (after blocked filter): ${exercises.length}`);
console.log(`Passes power pool (any body region): ${all.length}`);
console.log(`Passes power pool + lower-body filter (focus lower or default): ${lower.length}\n`);

console.log("--- Lower-body power pool (typical “lower” session) ---\n");
for (const e of lower) {
  console.log(`${e.id}\t${e.name}\t[${reason(e)}] modality=${e.modality}`);
}

console.log("\n--- Full power pool (upper + lower + core that qualify) — extras vs lower-only ---\n");
const lowerIds = new Set(lower.map((e) => e.id));
for (const e of all) {
  if (!lowerIds.has(e.id)) {
    console.log(`${e.id}\t${e.name}\t[${reason(e)}] modality=${e.modality}`);
  }
}
