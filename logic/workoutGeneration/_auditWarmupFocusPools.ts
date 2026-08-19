/**
 * One-off audit: warmup pool depth + week-repeat variety by day focus.
 * Run: npx tsx logic/workoutGeneration/_auditWarmupFocusPools.ts
 */
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { SESSION_BODY_NATIVE_SPECS } from "../../lib/sessionBodyContract";
import { generateWorkoutSession } from "./dailyGenerator";
import { isWarmupEligibleEquipment } from "../../lib/workoutRules";
import { getPreferredWarmupTargetsFromFocus, exerciseWarmupTargetsOverlap } from "./ontologyScoring";
import { mobilityRecoveryPassesBodyFocus } from "./mobilityBodyFocusFamilies";
import { getWarmupActivationFamilyId } from "./warmupActivationFamilies";
import { resolveWorkoutConstraints } from "../workoutIntelligence/constraints/resolveWorkoutConstraints";
import type { FocusBodyPart } from "./types";

const pool = EXERCISES.map(exerciseDefinitionToGeneratorExercise);

const EQUIPMENT = ["barbell", "bench", "dumbbells", "bodyweight", "kettlebells", "bands"];

function warmupEligible() {
  return pool.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery") &&
      isWarmupEligibleEquipment(e.equipment_required ?? []) &&
      e.id !== "breathing_cooldown"
  );
}

function auditFocus(label: string, focus: FocusBodyPart[]) {
  const constraints = resolveWorkoutConstraints({
    primary_goal: "strength",
    secondary_goals: [],
    available_equipment: EQUIPMENT,
    duration_minutes: 45,
    energy_level: "medium",
    injuries_or_limitations: [],
    body_region_focus: focus.map((f) => f.toLowerCase().replace(/\s/g, "_")),
  });
  const allowed = constraints.allowed_movement_families ?? [];
  const eligible = warmupEligible().filter((e) => mobilityRecoveryPassesBodyFocus(e, allowed));
  const targets = getPreferredWarmupTargetsFromFocus(focus);
  const overlap = eligible.filter((e) => exerciseWarmupTargetsOverlap(e, targets));
  const families = new Set(
    overlap.map((e) => getWarmupActivationFamilyId(e.id) ?? `other:${e.id}`)
  );
  const namedFamilies = new Set(
    overlap.map((e) => getWarmupActivationFamilyId(e.id)).filter(Boolean)
  );
  console.log(
    `${label.padEnd(28)} gate=${String(eligible.length).padStart(3)} overlap=${String(overlap.length).padStart(3)} namedFam=${namedFamilies.size} targets=[${targets.join(",")}] allowed=[${allowed.join(",")}]`
  );
}

function gen(focus: FocusBodyPart[], seed: number, recent?: { exercise_ids: string[] }[]) {
  return generateWorkoutSession(
    {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      focus_body_parts: focus,
      available_equipment: EQUIPMENT,
      injuries_or_constraints: [],
      seed,
      recent_history: recent?.map((h) => ({
        exercise_ids: h.exercise_ids,
        muscle_groups: ["legs"],
        modality: "strength",
      })),
    },
    pool
  );
}

function warmupIds(session: ReturnType<typeof generateWorkoutSession>) {
  return (session.blocks.find((b) => b.block_type === "warmup")?.items ?? []).map((i) => i.exercise_id);
}

function fams(ids: string[]) {
  return ids.map((id) => getWarmupActivationFamilyId(id) ?? id);
}

function simulatePair(label: string, focus: FocusBodyPart[], seed: number) {
  const a = warmupIds(gen(focus, seed));
  const b = warmupIds(gen(focus, seed + 1, [{ exercise_ids: a }]));
  const sameIds = a.filter((id) => b.includes(id));
  const aF = new Set(fams(a));
  const bF = fams(b);
  const sameFam = bF.filter((f) => aF.has(f));
  console.log(
    `  ${label}: day1=${a.join("+") || "(empty)"} | day2=${b.join("+") || "(empty)"} sameIds=${sameIds.length} sameFam=${sameFam.length}`
  );
  return { sameIds: sameIds.length, sameFam: sameFam.length, empty: a.length === 0 || b.length === 0 };
}

console.log("=== pool depth by native day focus ===");
for (const spec of SESSION_BODY_NATIVE_SPECS) {
  auditFocus(`${spec.mode}:${spec.choiceId}`, spec.focusBodyParts);
}

const combos: [string, FocusBodyPart[]][] = [
  ["glutes+shoulders", [...new Set(["lower", "posterior", "glutes", "upper_push", "upper_pull", "shoulders"] as FocusBodyPart[])]],
  ["chest+arms", [...new Set(["upper_push", "chest", "upper_pull", "arms"] as FocusBodyPart[])]],
  ["chest+back", [...new Set(["upper_push", "chest", "upper_pull", "back"] as FocusBodyPart[])]],
  ["legs+core", ["lower", "legs", "core"]],
  ["lower+glutes", ["lower", "posterior", "glutes"]],
  ["push+shoulders", ["upper_push", "upper_pull", "shoulders"]],
];
console.log("=== combo focuses ===");
for (const [label, focus] of combos) auditFocus(label, focus);

console.log("=== two same-focus days (rolling warmup ids) ===");
let sticky = 0;
for (const spec of SESSION_BODY_NATIVE_SPECS) {
  const r = simulatePair(`${spec.mode}:${spec.choiceId}`, spec.focusBodyParts, 8100 + spec.focusBodyParts.join("").length);
  if (r.sameIds > 0 || r.sameFam > 0 || r.empty) sticky += 1;
}
for (const [label, focus] of combos) {
  const r = simulatePair(label, focus, 8200);
  if (r.sameIds > 0 || r.sameFam > 0 || r.empty) sticky += 1;
}

console.log("=== week: lower, upper, lower ===");
const d1 = warmupIds(gen(["lower"], 9001));
const d2 = warmupIds(gen(["upper_push", "upper_pull"], 9002, [{ exercise_ids: d1 }]));
const d3 = warmupIds(gen(["lower"], 9003, [{ exercise_ids: d1 }, { exercise_ids: d2 }]));
console.log({ day1_lower: d1, day2_upper: d2, day3_lower: d3, lowerOverlap: d1.filter((id) => d3.includes(id)) });

console.log("sticky pairs (same id/family or empty):", sticky);
