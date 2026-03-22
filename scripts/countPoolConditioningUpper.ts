/**
 * One-off-style audit: count exercises in the filtered pool for Sport Conditioning + Upper body
 * (matches Manual flow: primary "Sport Conditioning", target Upper, no push/pull modifier).
 *
 * npx tsx scripts/countPoolConditioningUpper.ts
 */

import { EXERCISES } from "../data/exercises";
import { manualPreferencesToGenerateWorkoutInput } from "../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../lib/types";
import type { GymProfile } from "../data/gymProfiles";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import {
  filterByHardConstraints,
  filterByConstraintsForPool,
} from "../logic/workoutGeneration/dailyGenerator";
import { resolveWorkoutConstraints } from "../logic/workoutIntelligence/constraints/resolveWorkoutConstraints";
import type { GenerateWorkoutInput } from "../logic/workoutGeneration/types";

function allEquipmentFromCatalog(): string[] {
  const s = new Set<string>();
  for (const e of EXERCISES) {
    for (const x of e.equipment ?? []) {
      s.add(typeof x === "string" ? x.toLowerCase().replace(/\s/g, "_") : String(x).toLowerCase().replace(/\s/g, "_"));
    }
  }
  return [...s].sort();
}

function inputToSelectionInput(input: GenerateWorkoutInput) {
  return {
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals?.map((g) => g.toLowerCase().replace(/\s/g, "_")) ?? [],
    sports: input.sport_slugs,
    available_equipment: input.available_equipment,
    duration_minutes: input.duration_minutes,
    energy_level: input.energy_level,
    injuries_or_limitations: input.injuries_or_constraints ?? [],
    body_region_focus: input.focus_body_parts?.map((f) => f.toLowerCase().replace(/\s/g, "_")) ?? [],
  };
}

/** Mirrors dailyGenerator.getEffectiveFamiliesForExercise (not exported). */
function getEffectiveFamiliesForExercise(e: ReturnType<typeof exerciseDefinitionToGeneratorExercise>): string[] {
  const primary = e.primary_movement_family?.toLowerCase().replace(/\s/g, "_");
  if (primary) {
    const secondaries = (e.secondary_movement_families ?? []).map((s) => s.toLowerCase().replace(/\s/g, "_"));
    return [primary, ...secondaries].filter((x, i, a) => a.indexOf(x) === i);
  }
  const pattern = (e.movement_pattern ?? "").toLowerCase();
  const muscles = new Set((e.muscle_groups ?? []).map((m) => m.toLowerCase()));
  if (pattern === "push" || muscles.has("chest") || muscles.has("triceps") || muscles.has("push") || muscles.has("shoulders"))
    return ["upper_push"];
  if (pattern === "pull" || muscles.has("back") || muscles.has("biceps") || muscles.has("pull") || muscles.has("lats"))
    return ["upper_pull"];
  if (pattern === "squat" || pattern === "hinge" || pattern === "locomotion") {
    if (muscles.has("legs") || muscles.has("quads") || muscles.has("glutes") || muscles.has("hamstrings")) return ["lower_body"];
    if (muscles.has("core")) return ["core"];
    return ["lower_body"];
  }
  if (pattern === "carry") return muscles.has("core") && !muscles.has("legs") ? ["core"] : ["lower_body"];
  if (pattern === "rotate") return ["core"];
  return ["lower_body"];
}

function main() {
  const equipment = allEquipmentFromCatalog();
  const fullGym: GymProfile = {
    id: "audit_full",
    name: "Audit (all catalog equipment)",
    equipment,
  };

  const prefs: ManualPreferences = {
    primaryFocus: ["Sport Conditioning"],
    targetBody: "Upper",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    subFocusByGoal: {},
    workoutStyle: [],
  };

  const input = manualPreferencesToGenerateWorkoutInput(prefs, fullGym, 1);
  const constraints = resolveWorkoutConstraints(inputToSelectionInput(input));

  const byId = new Map<string, ReturnType<typeof exerciseDefinitionToGeneratorExercise>>();
  for (const d of EXERCISES) {
    byId.set(d.id, exerciseDefinitionToGeneratorExercise(d));
  }
  let pool = [...byId.values()];
  const afterHard = filterByHardConstraints(pool, input);
  const afterBody = filterByConstraintsForPool(afterHard, constraints);

  const upperFamilies = new Set(["upper_push", "upper_pull"]);
  let upperFamilyMatch = 0;
  let conditioningModality = 0;
  let mobilityModality = 0;
  let recoveryModality = 0;
  let bypassOnly = 0; // conditioning|mobility|recovery but no upper family match

  for (const e of afterBody) {
    const fams = getEffectiveFamiliesForExercise(e);
    const matchesUpper = fams.some((f) => upperFamilies.has(f));
    if (e.modality === "conditioning") conditioningModality += 1;
    if (e.modality === "mobility") mobilityModality += 1;
    if (e.modality === "recovery") recoveryModality += 1;
    const bypass =
      e.modality === "conditioning" || e.modality === "mobility" || e.modality === "recovery";
    if (bypass && !matchesUpper) bypassOnly += 1;
    if (matchesUpper) upperFamilyMatch += 1;
  }

  console.log(
    JSON.stringify(
      {
        scenario:
          'Primary "Sport Conditioning" (generator primary_goal: conditioning), target body Upper (no Push/Pull modifier → upper_push + upper_pull)',
        assumptions:
          "All equipment types that appear anywhere in static EXERCISES; no injuries; medium energy; matches filterByHardConstraints + filterByConstraintsForPool only (same as generateWorkoutSession step 2).",
        generator_input_focus_body_parts: input.focus_body_parts,
        allowed_movement_families: constraints.allowed_movement_families,
        note_body_filter:
          "Conditioning modality stays in the pool for cardio/HIIT blocks. Mobility/recovery must match upper_push/upper_pull or be core prep on upper-focused days.",
        counts: {
          static_exercises_mapped: pool.length,
          after_equipment_energy_blocked: afterHard.length,
          after_body_and_injury_constraints: afterBody.length,
        },
        breakdown_in_final_pool: {
          modality_conditioning: conditioningModality,
          modality_mobility: mobilityModality,
          modality_recovery: recoveryModality,
          effective_family_overlaps_upper_push_or_pull: upperFamilyMatch,
          in_pool_via_conditioning_mobility_recovery_bypass_without_upper_family: bypassOnly,
        },
      },
      null,
      2
    )
  );
}

main();
