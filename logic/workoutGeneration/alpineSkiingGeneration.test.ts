/**
 * Alpine skiing sport-pattern: categories, gating, quality, coverage, distinction from hiking/trail.
 * Run: npx tsx logic/workoutGeneration/alpineSkiingGeneration.test.ts
 */

import assert from "assert";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import {
  getAlpineSkiingPatternCategoriesForExercise,
  exerciseMatchesAnyAlpineSkiingCategory,
  isAlpineSkiingConditioningExercise,
} from "./sportPatternTransfer/alpineSkiingExerciseCategories";
import {
  gatePoolForAlpineSkiingSlot,
  alpineSkiingPatternTransferApplies,
} from "./sportPatternTransfer/alpineSkiingSession";
import { evaluateAlpineMinimumCoverage } from "./sportPatternTransfer/alpineSkiingRules";
import { buildSportCoverageContext, collectBlocksExerciseIdsByType } from "./sportPattern/framework";
import { computeAlpineSkiingWithinPoolQualityScore } from "./sportPatternTransfer/alpineSkiingQualityScoring";
import { getHikingPatternCategoriesForExercise } from "./sportPatternTransfer/hikingExerciseCategories";
import { getTrailRunningPatternCategoriesForExercise } from "./sportPatternTransfer/trailRunningExerciseCategories";
import type { WorkoutBlock } from "../../lib/types";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";

function mkEx(
  partial: Omit<Exercise, "id" | "name" | "movement_pattern" | "muscle_groups" | "modality" | "equipment_required" | "difficulty" | "time_cost" | "tags"> &
    Pick<Exercise, "id" | "name"> &
    Partial<Exercise>
): Exercise {
  return {
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["dumbbells"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
    ...partial,
  };
}

const tempoSquat = mkEx({
  id: "tempo_squat_alpine_test",
  name: "Tempo Back Squat",
  exercise_role: "main_compound",
  tags: { goal_tags: ["strength"], energy_fit: ["medium"], stimulus: ["eccentric"] },
});

const eccentricHandstand = mkEx({
  id: "ff_bodyweight_wall_eccentric_straddle_press_handstand",
  name: "Bodyweight Wall Eccentric Straddle Press Handstand",
  movement_pattern: "push",
  muscle_groups: ["shoulders", "triceps"],
  exercise_role: "main_compound",
  tags: { goal_tags: ["strength"], energy_fit: ["high"], stimulus: ["eccentric"] },
});

const lateralLunge = mkEx({
  id: "lateral_lunge_alpine_test",
  name: "Lateral Lunge",
  exercise_role: "accessory",
});

const farmerCarry = mkEx({
  id: "farmer_carry_alpine_test",
  name: "Farmer Carry",
  movement_pattern: "carry",
  muscle_groups: ["legs", "core"],
});

const zone2Stair = mkEx({
  id: "zone2_stair_alpine_test",
  name: "Zone 2 Stair",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["stair_climber"],
  tags: { goal_tags: ["endurance"], stimulus: ["aerobic_zone2"], energy_fit: ["medium"] },
});

const hiitBike = mkEx({
  id: "hiit_bike_alpine_test",
  name: "Assault Bike Intervals",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["assault_bike"],
  tags: { goal_tags: ["conditioning"], energy_fit: ["high"] },
});

const tempoRun = mkEx({
  id: "tempo_run_alpine_test",
  name: "Tempo Run",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["treadmill"],
  tags: { goal_tags: ["endurance"], energy_fit: ["medium"] },
});

const wallSit = mkEx({
  id: "wall_sit_alpine_test",
  name: "Wall Sit",
  exercise_role: "accessory",
  tags: { goal_tags: ["strength"], energy_fit: ["medium"], stimulus: ["isometric"] },
});

const strictBackSquat = mkEx({
  id: "back_squat_alpine_test",
  name: "Back Squat",
  exercise_role: "main_compound",
  movement_pattern: "squat",
  tags: { goal_tags: ["strength"], energy_fit: ["high"] },
});

/** Matches alpine prefer (hip_knee_control) but not strict main gate — exercises progressive tier 2. */
const bulgarianSplit = mkEx({
  id: "bulgarian_split_alpine_test",
  name: "Bulgarian Split Squat",
  exercise_role: "main_compound",
  movement_pattern: "squat",
  tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
});

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "high",
    available_equipment: ["barbell", "dumbbells", "treadmill", "stair_climber", "assault_bike", "bench", "bodyweight"],
    injuries_or_constraints: [],
    seed: 42,
    sport_weight: 0.55,
    ...overrides,
  };
}

function main() {
  // 1) Category mapping
  const ts = getAlpineSkiingPatternCategoriesForExercise(tempoSquat);
  assert(ts.has("eccentric_braking_control"), "tempo squat tags eccentric braking");
  const hs = getAlpineSkiingPatternCategoriesForExercise(eccentricHandstand);
  assert(!hs.has("eccentric_braking_control"), "upper-body eccentric handstand should not map to alpine braking control");

  const ll = getAlpineSkiingPatternCategoriesForExercise(lateralLunge);
  assert(ll.has("lateral_frontal_plane_stability"), "lateral lunge tags lateral stability");

  const fc = getAlpineSkiingPatternCategoriesForExercise(farmerCarry);
  assert(fc.has("locomotion_hiking_trail_identity"), "farmer carry tagged as hiking/trail locomotion for deprioritization");

  assert(isAlpineSkiingConditioningExercise(hiitBike), "HIIT bike is alpine-relevant conditioning");
  assert(!isAlpineSkiingConditioningExercise(tempoRun), "pure tempo run should not be preferred alpine conditioning");

  const strictSqCats = getAlpineSkiingPatternCategoriesForExercise(strictBackSquat);
  assert(strictSqCats.has("low_transfer_sagittal_only"), "plain bilateral squat is marked low-transfer sagittal");

  // 2) Slot gating behavior
  const gateOk = gatePoolForAlpineSkiingSlot([tempoSquat, strictBackSquat, lateralLunge, farmerCarry], "main_strength", {
    applyMainWorkExclusions: true,
  });
  assert(gateOk.hasMatches && gateOk.poolForSelection.some((e) => e.id === tempoSquat.id), "alpine gate keeps tempo squat");
  assert(gateOk.selectionTier === "strict_gate" && gateOk.poolMode === "gated", "strict tier metadata");
  assert(
    !gateOk.poolForSelection.some((e) => e.id === farmerCarry.id),
    "alpine main gate excludes locomotion/carry identity candidates"
  );

  const gatePreferOnly = gatePoolForAlpineSkiingSlot([strictBackSquat, bulgarianSplit], "main_strength", {
    applyMainWorkExclusions: true,
  });
  assert(
    gatePreferOnly.selectionTier === "sport_preferred" &&
      gatePreferOnly.poolMode === "sport_preferred_pool" &&
      gatePreferOnly.poolForSelection.length === 1 &&
      gatePreferOnly.poolForSelection[0].id === bulgarianSplit.id,
    "when strict gate is empty, alpine uses prefer-tier pool before full pool"
  );
  assert(gatePreferOnly.usedFullPoolFallback === false, "prefer tier is not generic full-pool degraded mode");

  const alpineInput = baseInput({ sport_slugs: ["alpine_skiing"], sport_weight: 0.55 });
  assert(alpineSkiingPatternTransferApplies(alpineInput), "alpine rules apply");

  const pool = [tempoSquat, lateralLunge, wallSit, strictBackSquat, farmerCarry, zone2Stair, hiitBike, tempoRun];
  const session = generateWorkoutSession(alpineInput, pool);
  assert(session.blocks.some((b) => b.block_type === "main_strength"), "session has main strength");

  const dbg = session.debug?.sport_pattern_transfer;
  assert(dbg?.sport_slug === "alpine_skiing", "debug sport_slug alpine_skiing");
  const firstDbg = dbg?.items.find((x) => x.block_type === "main_strength");
  assert(firstDbg?.slot_rule_id?.startsWith("alpine_"), "debug slot rule alpine");
  assert(typeof firstDbg?.within_pool_quality?.within_pool_priority_total === "number", "alpine within-pool debug included");
  assert(typeof firstDbg?.within_pool_quality?.emphasis_bucket === "number", "emphasis bucket exposed in debug");

  // 3) Within-pool prioritization (control/lateral over locomotion or plain sagittal)
  const emptyMap = new Map<string, number>();
  const qTempo = computeAlpineSkiingWithinPoolQualityScore(tempoSquat, {
    sessionAlpineCategoryCounts: emptyMap,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  const qFarmer = computeAlpineSkiingWithinPoolQualityScore(farmerCarry, {
    sessionAlpineCategoryCounts: emptyMap,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  const qPlainSquat = computeAlpineSkiingWithinPoolQualityScore(strictBackSquat, {
    sessionAlpineCategoryCounts: emptyMap,
    emphasisBucket: 0,
    blockType: "main_strength",
  });
  assert(qTempo.total > qFarmer.total, "alpine within-pool should favor tempo squat over farmer carry on main");
  assert(qTempo.total > qPlainSquat.total, "alpine should favor eccentric/control squat over plain sagittal squat");

  // 4) Coverage validation (positive + negative)
  const blocks = session.blocks;
  const byId = new Map(pool.map((e) => [e.id, e]));
  const ctx = buildSportCoverageContext(alpineInput, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  const cov = evaluateAlpineMinimumCoverage(ctx, byType, byId);
  assert(cov.ok, `generated alpine session should meet coverage, got violations=${JSON.stringify(cov.violations)}`);

  const invalidCoverageBlocks: WorkoutBlock[] = [
    {
      block_type: "main_strength",
      format: "straight_sets",
      title: "Main",
      reasoning: "test",
      items: [
        {
          exercise_id: strictBackSquat.id,
          exercise_name: strictBackSquat.name,
          sets: 3,
          reps: "6-8",
          rest_seconds: 120,
          reasoning_tags: ["test"],
          unilateral: false,
        },
      ],
      estimated_minutes: 10,
    },
    {
      block_type: "conditioning",
      format: "intervals",
      title: "Conditioning",
      reasoning: "test",
      items: [
        {
          exercise_id: tempoRun.id,
          exercise_name: tempoRun.name,
          sets: 4,
          time_seconds: 120,
          rest_seconds: 60,
          reasoning_tags: ["test"],
          unilateral: false,
        },
      ],
      estimated_minutes: 10,
    },
  ];
  const invalidCtx = buildSportCoverageContext(alpineInput, invalidCoverageBlocks);
  const invalidByType = collectBlocksExerciseIdsByType(invalidCoverageBlocks);
  const invalidCov = evaluateAlpineMinimumCoverage(invalidCtx, invalidByType, byId);
  assert(!invalidCov.ok, "intentionally weak alpine session should fail coverage checks");
  assert(
    invalidCov.violations.some((v) => v.ruleId === "alpine_lateral_or_trunk_stability"),
    "coverage should require lateral/trunk stability"
  );
  assert(
    invalidCov.violations.some((v) => v.ruleId === "alpine_lower_body_tension_endurance"),
    "coverage should require lower-body tension/endurance support"
  );

  const alpCats = getAlpineSkiingPatternCategoriesForExercise(tempoSquat);
  assert(alpCats.has("eccentric_braking_control"), "alpine marks eccentric on tempo squat");
  assert(
    exerciseMatchesAnyAlpineSkiingCategory(lateralLunge, ["lateral_frontal_plane_stability"]),
    "category matcher lateral"
  );

  const alpLat = getAlpineSkiingPatternCategoriesForExercise(lateralLunge);
  const hikeLat = getHikingPatternCategoriesForExercise(lateralLunge);
  const trailLat = getTrailRunningPatternCategoriesForExercise(lateralLunge);
  assert(alpLat.has("lateral_frontal_plane_stability"), "alpine lateral lunge");
  assert(!trailLat.has("running_conditioning"), "lateral lunge is not running conditioning");
  assert(hikeLat.has("unilateral_knee_dominant"), "hiking still maps lunge");

  // 5) Output quality + cross-sport category-level distinction
  const alpineSummary = session.debug?.sport_pattern_transfer?.session_summary;
  assert(alpineSummary?.sport_slug === "alpine_skiing", "alpine session includes summary");
  const mainCats = alpineSummary?.main_category_hits ?? {};
  const eccentricMainHits = (mainCats.eccentric_braking_control ?? 0) + (mainCats.sustained_tension_lower_body ?? 0);
  assert(eccentricMainHits >= 1, "alpine main work contains eccentric/tension identity");
  assert(
    (mainCats.locomotion_hiking_trail_identity ?? 0) === 0,
    "alpine main work should not default to locomotion-dominant identity"
  );

  // 6) Seed-sweep behavior checks on real pool
  const realPool = EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
  const seeds = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23];
  let alpineMainWithEccOrDecel = 0;
  let alpineMainTotal = 0;
  let alpineMainLocomotion = 0;
  let alpineCondRun = 0;
  let alpineCondStair = 0;
  let hikingCondStair = 0;
  let trailCondRun = 0;
  let alpineEccTension = 0;

  for (const seed of seeds) {
    const mk = (sport: string) =>
      generateWorkoutSession(
        {
          ...baseInput({
            duration_minutes: 45,
            primary_goal: "strength",
            energy_level: "high",
            sport_slugs: [sport],
            seed,
          }),
        },
        realPool
      );
    const alpine = mk("alpine_skiing");
    const hiking = mk("hiking_backpacking");
    const trail = mk("trail_running");

    const ad = alpine.debug?.sport_pattern_transfer;
    const hd = hiking.debug?.sport_pattern_transfer;
    const td = trail.debug?.sport_pattern_transfer;
    assert(ad?.sport_slug === "alpine_skiing");
    assert(hd?.sport_slug === "hiking_backpacking");
    assert(td?.sport_slug === "trail_running");

    for (const it of ad.items) {
      if (it.block_type === "main_strength" || it.block_type === "main_hypertrophy") {
        alpineMainTotal += 1;
        const cats = new Set(it.categories_matched);
        if (cats.has("locomotion_hiking_trail_identity")) alpineMainLocomotion += 1;
        if (cats.has("eccentric_braking_control") || cats.has("landing_deceleration_support")) {
          alpineMainWithEccOrDecel += 1;
        }
      }
    }
    const hasMainEccOrDecel = ad.items.some(
      (it) =>
        (it.block_type === "main_strength" || it.block_type === "main_hypertrophy") &&
        (it.categories_matched.includes("eccentric_braking_control") ||
          it.categories_matched.includes("landing_deceleration_support"))
    );
    assert(hasMainEccOrDecel, `seed ${seed}: alpine main should contain eccentric/deceleration identity`);

    const as = ad.session_summary!;
    const hs = hd.session_summary!;
    const ts = td.session_summary!;

    alpineCondRun += as.overlap_families.conditioning_treadmill_run;
    alpineCondStair += as.overlap_families.conditioning_stair_incline;
    hikingCondStair += hs.overlap_families.conditioning_stair_incline;
    trailCondRun += ts.overlap_families.conditioning_treadmill_run;

    alpineEccTension +=
      (as.main_category_hits.eccentric_braking_control ?? 0) +
      (as.main_category_hits.sustained_tension_lower_body ?? 0);
  }

  assert(alpineMainWithEccOrDecel >= seeds.length, "alpine should maintain repeated ecc/decel presence in main selection");
  const locomotionLeakRate = alpineMainTotal > 0 ? alpineMainLocomotion / alpineMainTotal : 0;
  assert(locomotionLeakRate <= 0.15, `alpine locomotion leakage should stay low, got=${locomotionLeakRate.toFixed(3)}`);
  assert(alpineCondStair < hikingCondStair, "alpine conditioning should stay less stair/incline-driven than hiking");
  assert(alpineCondRun <= trailCondRun, "alpine conditioning should not be more run-driven than trail");
  assert(alpineEccTension > 0, "alpine should maintain eccentric/tension identity presence across seeds");

  console.log("alpineSkiingGeneration.test.ts: all assertions passed");
}

main();
