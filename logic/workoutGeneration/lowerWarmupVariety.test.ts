/**
 * Lower/legs Activation variety: body-focus must admit regional mobility, and
 * warmup family caps must prevent Cossack + Tibialis monopolizing every seed.
 *
 * Run: npx tsx logic/workoutGeneration/lowerWarmupVariety.test.ts
 */

import assert from "node:assert/strict";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { generateWorkoutSession } from "./dailyGenerator";
import {
  deriveMobilityRegionalFamilies,
  mobilityRecoveryPassesBodyFocus,
} from "./mobilityBodyFocusFamilies";
import {
  filterByUnusedWarmupActivationFamilies,
  getWarmupActivationFamilyId,
} from "./warmupActivationFamilies";

const pool = EXERCISES.map(exerciseDefinitionToGeneratorExercise);

function testMobilityRegionalFamiliesForLowerDrills() {
  const cossack = pool.find((e) => e.id === "cossack_squat");
  const tib = pool.find((e) => e.id === "tibialis_raise");
  assert.ok(cossack && tib);
  assert.ok(deriveMobilityRegionalFamilies(cossack!).includes("lower_body"));
  assert.ok(deriveMobilityRegionalFamilies(tib!).includes("lower_body"));
  assert.equal(mobilityRecoveryPassesBodyFocus(cossack!, ["lower_body"]), true);
  assert.equal(mobilityRecoveryPassesBodyFocus(tib!, ["lower_body"]), true);
  // Lower-claiming drills must not sneak onto upper-only days via core.
  assert.equal(mobilityRecoveryPassesBodyFocus(cossack!, ["upper_push"]), false);
  console.log("  OK: regional families gate lower activation correctly");
}

function testWarmupFamilyCapExcludesSecondCossack() {
  const candidates = [
    { id: "cossack_squat" },
    { id: "ff_bodyweight_alternating_cossack_squat" },
    { id: "tibialis_raise" },
    { id: "ankle_cars" },
  ];
  const filtered = filterByUnusedWarmupActivationFamilies(candidates, ["cossack_squat"]);
  assert.ok(!filtered.some((c) => getWarmupActivationFamilyId(c.id) === "cossack_lateral_squat"));
  assert.ok(filtered.some((c) => c.id === "tibialis_raise"));
  console.log("  OK: warmup family cap drops second cossack variant");
}

function testLowerLegsWarmupVariesAcrossSeeds() {
  const base = {
    duration_minutes: 45,
    primary_goal: "strength" as const,
    energy_level: "medium" as const,
    focus_body_parts: ["lower", "legs"],
    available_equipment: [
      "barbell",
      "bench",
      "dumbbells",
      "bodyweight",
      "kettlebells",
      "bands",
    ],
    injuries_or_constraints: [] as string[],
  };

  const combos = new Set<string>();
  const idCounts = new Map<string, number>();
  let empty = 0;
  for (let i = 0; i < 20; i++) {
    const session = generateWorkoutSession({ ...base, seed: 9100 + i }, pool);
    const warmup = session.blocks.find((b) => b.block_type === "warmup");
    const ids = (warmup?.items ?? []).map((it) => it.exercise_id);
    if (ids.length === 0) empty += 1;
    assert.ok((warmup?.title ?? "").includes("Activation"), "expected Activation title");
    combos.add([...ids].sort().join("|"));
    for (const id of ids) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }

  assert.equal(empty, 0, "lower/legs days must get a non-empty Activation block");
  assert.ok(
    combos.size >= 4,
    `expected ≥4 distinct warmup combos across seeds, got ${combos.size}: ${[...combos].join(" ; ")}`
  );

  const cossackHits = idCounts.get("cossack_squat") ?? 0;
  const tibHits = idCounts.get("tibialis_raise") ?? 0;
  assert.ok(
    cossackHits < 18,
    `cossack_squat appeared in ${cossackHits}/20 sessions — still too sticky`
  );
  assert.ok(
    tibHits < 18,
    `tibialis_raise appeared in ${tibHits}/20 sessions — still too sticky`
  );
  console.log(
    `  OK: lower/legs warmup variety (${combos.size} combos; cossack=${cossackHits}, tibialis=${tibHits})`
  );
}

function testUpperWarmupAlsoVaries() {
  const combos = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const session = generateWorkoutSession(
      {
        duration_minutes: 45,
        primary_goal: "strength",
        energy_level: "medium",
        focus_body_parts: ["upper_push"],
        available_equipment: ["barbell", "dumbbells", "bodyweight", "bands"],
        injuries_or_constraints: [],
        seed: 9200 + i,
      },
      pool
    );
    const warmup = session.blocks.find((b) => b.block_type === "warmup");
    assert.ok(warmup && warmup.items.length > 0, "upper day should have activation");
    combos.add(warmup!.items.map((it) => it.exercise_id).sort().join("|"));
  }
  assert.ok(combos.size >= 2, `expected upper warmup variety, got ${combos.size}`);
  console.log(`  OK: upper_push warmup variety (${combos.size} combos)`);
}

/** Gym profiles often omit bodyweight; Activation must still appear (upper and lower). */
function testWarmupAlwaysPresentWithoutListedBodyweight() {
  const cases: Array<{ focus: string[]; label: string }> = [
    { focus: ["upper_push"], label: "upper_push" },
    { focus: ["upper"], label: "upper" },
    { focus: ["lower", "legs"], label: "lower/legs" },
    { focus: ["chest"], label: "chest" },
  ];
  for (const c of cases) {
    for (let i = 0; i < 4; i++) {
      const session = generateWorkoutSession(
        {
          duration_minutes: 45,
          primary_goal: "hypertrophy",
          energy_level: "medium",
          focus_body_parts: c.focus,
          available_equipment: ["barbell", "dumbbells", "bench", "cable"],
          injuries_or_constraints: [],
          seed: 9300 + i,
        },
        pool
      );
      const warmup = session.blocks.find((b) => b.block_type === "warmup");
      assert.ok(
        warmup && warmup.items.length > 0,
        `${c.label} without listed bodyweight must still get Activation (seed ${9300 + i})`
      );
    }
  }
  console.log("  OK: Activation present when gym list omits bodyweight (upper + lower)");
}

function run() {
  console.log("lowerWarmupVariety.test.ts");
  testMobilityRegionalFamiliesForLowerDrills();
  testWarmupFamilyCapExcludesSecondCossack();
  testLowerLegsWarmupVariesAcrossSeeds();
  testUpperWarmupAlsoVaries();
  testWarmupAlwaysPresentWithoutListedBodyweight();
  console.log("All passed.");
}

run();
