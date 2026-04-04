/**
 * Running family: road vs trail — contracts, debug slugs, slot rules, coverage/repair signals.
 * Run: npx tsx logic/workoutGeneration/runningFamilyDistinctness.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import {
  buildRoadRunningSessionIntentContract,
  buildTrailRunningSessionIntentContract,
  sessionIntentContractForSportSlug,
} from "./sessionIntentContract";

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function base(seed: number, sport: "road_running" | "trail_running"): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "dumbbells",
      "kettlebells",
      "bench",
      "squat_rack",
      "bodyweight",
      "treadmill",
      "stair_climber",
      "assault_bike",
      "rowing_machine",
      "cable_machine",
      "ski_erg",
    ],
    injuries_or_constraints: [],
    seed,
    sport_weight: 0.55,
    sport_slugs: [sport],
    session_intent_contract:
      sport === "road_running"
        ? buildRoadRunningSessionIntentContract()
        : buildTrailRunningSessionIntentContract(),
  };
}

function mainExerciseIds(session: ReturnType<typeof generateWorkoutSession>): string {
  return session.blocks
    .filter((b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy")
    .flatMap((b) => b.items.map((i) => i.exercise_id))
    .sort()
    .join(",");
}

function main() {
  const exercisePool = pool();
  assert(exercisePool.length > 500, "expect merged catalog");

  const roadC = sessionIntentContractForSportSlug("road_running");
  const trailC = sessionIntentContractForSportSlug("trail_running");
  assert(roadC != null, "road_running contract");
  assert(trailC != null, "trail_running contract");
  assert.strictEqual(roadC.requiredCoverage.eccentricDecelMain, false);
  assert.strictEqual(trailC.requiredCoverage.eccentricDecelMain, true);

  const seeds = [101, 102, 103, 104, 105];
  const samples: { sport: string; seed: number; mains: string; coverage_ok: boolean; slot_main: string }[] = [];

  for (const seed of seeds) {
    for (const sport of ["road_running", "trail_running"] as const) {
      const session = generateWorkoutSession(base(seed, sport), exercisePool);
      const dbg = session.debug?.sport_pattern_transfer;
      assert(dbg, `${sport} seed ${seed}: sport_pattern_transfer`);
      assert.strictEqual(dbg.sport_slug, sport);
      const sum = dbg.session_summary;
      assert(sum, `${sport} session_summary`);
      assert.strictEqual(sum.sport_slug, sport);

      const mainItems = (dbg.items ?? []).filter(
        (it) => it.block_type === "main_strength" || it.block_type === "main_hypertrophy"
      );
      assert(mainItems.length > 0, `${sport} seed ${seed}: main items in transfer debug`);
      const prefix = sport === "road_running" ? "road_" : "trail_";
      assert(
        mainItems.every((it) => it.slot_rule_id.startsWith(prefix)),
        `${sport} seed ${seed}: slot_rule_id prefix ${prefix}`
      );

      samples.push({
        sport,
        seed,
        mains: mainExerciseIds(session),
        coverage_ok: dbg.coverage_ok,
        slot_main: mainItems.map((i) => i.slot_rule_id).join(","),
      });
    }
  }

  const roadMains = new Set(samples.filter((s) => s.sport === "road_running").map((s) => s.mains));
  const trailMains = new Set(samples.filter((s) => s.sport === "trail_running").map((s) => s.mains));
  const overlap = [...roadMains].filter((m) => trailMains.has(m));
  assert(
    overlap.length < roadMains.size && overlap.length < trailMains.size,
    `expect some main-id-set diversity road vs trail; overlap count=${overlap.length} road=${roadMains.size} trail=${trailMains.size}`
  );

  console.log("runningFamilyDistinctness: ok");
  console.log("sample rows (road vs trail):");
  for (const s of samples.slice(0, 4)) {
    console.log(
      JSON.stringify({
        sport: s.sport,
        seed: s.seed,
        coverage_ok: s.coverage_ok,
        slot_main: s.slot_main,
        main_exercise_ids_sorted: s.mains.slice(0, 120) + (s.mains.length > 120 ? "…" : ""),
      })
    );
  }
}

main();
