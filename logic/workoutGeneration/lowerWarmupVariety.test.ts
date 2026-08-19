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
  filterWarmupPoolForSessionAndHistory,
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

function testHistoryFilterDropsRecentFamilyAndExactId() {
  const candidates = [
    { id: "childs_pose" },
    { id: "frog_stretch" },
    { id: "dynamic_frog" },
    { id: "wall_slide" },
    { id: "lat_stretch_door" },
    { id: "facepull" },
    { id: "ankle_cars" },
    { id: "hip_90_90" },
    { id: "banded_hip_flexor_stretch" },
  ];
  const filtered = filterWarmupPoolForSessionAndHistory(
    candidates,
    [],
    ["childs_pose", "frog"]
  );
  assert.ok(!filtered.some((c) => c.id === "childs_pose"), "exact recent warmup id dropped");
  assert.ok(
    !filtered.some((c) => getWarmupActivationFamilyId(c.id) === "frog_adductor"),
    "recent frog family dropped on a later day"
  );
  assert.ok(filtered.some((c) => c.id === "wall_slide"));
  console.log("  OK: week history drops exact warmup ids and families");
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

function warmupIds(session: ReturnType<typeof generateWorkoutSession>): string[] {
  return (session.blocks.find((b) => b.block_type === "warmup")?.items ?? []).map((it) => it.exercise_id);
}

function genFocus(focus: string[], seed: number, recentWarmupIds?: string[]) {
  return generateWorkoutSession(
    {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      focus_body_parts: focus,
      available_equipment: ["barbell", "bench", "dumbbells", "bodyweight", "kettlebells", "bands"],
      injuries_or_constraints: [],
      seed,
      recent_history: recentWarmupIds?.length
        ? [{ exercise_ids: recentWarmupIds, muscle_groups: ["legs"], modality: "strength" }]
        : undefined,
    },
    pool
  );
}

function testRepeatedFocusDaysRotateWarmups() {
  const cases: Array<{ label: string; focus: string[] }> = [
    { label: "two lower strength days", focus: ["lower"] },
    { label: "two legs days", focus: ["lower", "legs"] },
    { label: "two pull days", focus: ["upper_pull"] },
    { label: "two chest+back combo days", focus: ["upper_push", "chest", "upper_pull", "back"] },
    { label: "two glutes+shoulders combo days", focus: ["lower", "posterior", "glutes", "upper_push", "upper_pull", "shoulders"] },
  ];
  for (const c of cases) {
    const day1 = warmupIds(genFocus(c.focus, 9400));
    const day2 = warmupIds(genFocus(c.focus, 9401, day1));
    assert.ok(day1.length > 0 && day2.length > 0, `${c.label}: both days need Activation`);
    const overlap = day1.filter((id) => day2.includes(id));
    assert.equal(overlap.length, 0, `${c.label}: exact warmup ids repeated (${overlap.join(", ")})`);
    const fam1 = new Set(day1.map((id) => getWarmupActivationFamilyId(id)).filter(Boolean));
    const famOverlap = day2
      .map((id) => getWarmupActivationFamilyId(id))
      .filter((f): f is string => Boolean(f) && fam1.has(f));
    assert.equal(famOverlap.length, 0, `${c.label}: warmup family repeated (${famOverlap.join(", ")})`);
    console.log(`  OK: ${c.label} (${day1.join("+")} → ${day2.join("+")})`);
  }
}

function testLowerUpperLowerWeekRotatesLowerWarmup() {
  const d1 = warmupIds(genFocus(["lower"], 9501));
  const d2 = warmupIds(genFocus(["upper_push", "upper_pull"], 9502, d1));
  const d3 = warmupIds(
    generateWorkoutSession(
      {
        duration_minutes: 45,
        primary_goal: "strength",
        energy_level: "medium",
        focus_body_parts: ["lower"],
        available_equipment: ["barbell", "bench", "dumbbells", "bodyweight", "kettlebells", "bands"],
        injuries_or_constraints: [],
        seed: 9503,
        recent_history: [
          { exercise_ids: d1, muscle_groups: ["legs"], modality: "strength" },
          { exercise_ids: d2, muscle_groups: ["chest"], modality: "strength" },
        ],
      },
      pool
    )
  );
  assert.ok(d1.length && d2.length && d3.length, "week days need Activation");
  assert.equal(d1.filter((id) => d3.includes(id)).length, 0, "second lower day reused first lower warmup ids");
  console.log(`  OK: lower/upper/lower week (${d1.join("+")} / ${d2.join("+")} / ${d3.join("+")})`);
}

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

function testWarmupAlwaysPresentAcrossGoalsSportsAndEquipment() {
  const cases: Array<{
    label: string;
    primary_goal: Parameters<typeof generateWorkoutSession>[0]["primary_goal"];
    focus_body_parts: string[];
    available_equipment: string[];
    duration_minutes?: number;
    sport_slugs?: string[];
    injuries_or_constraints?: string[];
    goal_sub_focus?: Record<string, string[]>;
  }> = [
    {
      label: "power upper, empty equipment list",
      primary_goal: "power",
      focus_body_parts: ["upper_push"],
      available_equipment: [],
    },
    {
      label: "endurance lower, machines only",
      primary_goal: "endurance",
      focus_body_parts: ["lower"],
      available_equipment: ["machines", "cable"],
    },
    {
      label: "calisthenics pull, 25 min",
      primary_goal: "calisthenics",
      focus_body_parts: ["upper_pull"],
      available_equipment: ["pull_up_bar"],
      duration_minutes: 25,
    },
    {
      label: "conditioning full body",
      primary_goal: "conditioning",
      focus_body_parts: ["full_body"],
      available_equipment: ["barbell", "dumbbells"],
    },
    {
      label: "athletic performance core",
      primary_goal: "athletic_performance",
      focus_body_parts: ["core"],
      available_equipment: ["dumbbells", "bench"],
    },
    {
      label: "rock climbing, no bodyweight listed",
      primary_goal: "strength",
      focus_body_parts: ["upper_pull"],
      available_equipment: ["pull_up_bar", "hangboard"],
      sport_slugs: ["rock_climbing"],
    },
    {
      label: "alpine skiing",
      primary_goal: "strength",
      focus_body_parts: ["lower"],
      available_equipment: ["barbell", "dumbbells"],
      sport_slugs: ["alpine_skiing"],
    },
    {
      label: "upper with shoulder constraint",
      primary_goal: "hypertrophy",
      focus_body_parts: ["upper_push", "shoulders"],
      available_equipment: ["dumbbells", "cable"],
      injuries_or_constraints: ["shoulder"],
    },
    {
      label: "joint health (activation-as-warmup)",
      primary_goal: "joint_health",
      focus_body_parts: ["full_body"],
      available_equipment: ["bands", "bodyweight"],
      goal_sub_focus: { joint_health: ["shoulder_health"] },
    },
  ];

  for (const c of cases) {
    const session = generateWorkoutSession(
      {
        duration_minutes: c.duration_minutes ?? 45,
        primary_goal: c.primary_goal,
        energy_level: "medium",
        focus_body_parts: c.focus_body_parts,
        available_equipment: c.available_equipment,
        injuries_or_constraints: c.injuries_or_constraints ?? [],
        sport_slugs: c.sport_slugs,
        goal_sub_focus: c.goal_sub_focus,
        seed: 9601,
      },
      pool
    );
    const warmup = session.blocks.find((b) => b.block_type === "warmup");
    assert.ok(
      warmup && warmup.items.length > 0,
      `${c.label} missing Activation (blocks: ${session.blocks.map((b) => `${b.block_type}:${b.items.length}`).join(", ")})`
    );
  }
  console.log("  OK: Activation present across goals, sports, equipment, and joint-health");
}

function run() {
  console.log("lowerWarmupVariety.test.ts");
  testMobilityRegionalFamiliesForLowerDrills();
  testWarmupFamilyCapExcludesSecondCossack();
  testHistoryFilterDropsRecentFamilyAndExactId();
  testLowerLegsWarmupVariesAcrossSeeds();
  testUpperWarmupAlsoVaries();
  testWarmupAlwaysPresentWithoutListedBodyweight();
  testWarmupAlwaysPresentAcrossGoalsSportsAndEquipment();
  testRepeatedFocusDaysRotateWarmups();
  testLowerUpperLowerWeekRotatesLowerWarmup();
  console.log("All passed.");
}

run();
