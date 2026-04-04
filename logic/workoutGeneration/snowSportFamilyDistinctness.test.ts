/**
 * Snow family: alpine vs snowboard vs backcountry vs XC — contracts, debug slugs, slot rules, category emphasis.
 * Run: npx tsx logic/workoutGeneration/snowSportFamilyDistinctness.test.ts
 */

import assert from "assert";
import { EXERCISES } from "../../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../../lib/workoutRules";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import type { SnowSportKind } from "./sportPatternTransfer/snowSportFamily/snowSportTypes";
import { sessionIntentContractForSportSlug } from "./sessionIntentContract";

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function base(seed: number, sport: SnowSportKind): GenerateWorkoutInput {
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
    session_intent_contract: sessionIntentContractForSportSlug(sport),
  };
}

function mainSlotPrefix(kind: SnowSportKind): string {
  if (kind === "alpine_skiing") return "alpine_main";
  if (kind === "snowboarding") return "snowboard_main";
  if (kind === "backcountry_skiing") return "backcountry_main";
  return "xc_main";
}

function mainExerciseSignature(session: ReturnType<typeof generateWorkoutSession>): string {
  const blocks = session.blocks.filter(
    (b) => b.block_type === "main_strength" || b.block_type === "main_hypertrophy"
  );
  return blocks
    .flatMap((b) => b.items.map((i) => i.exercise_id))
    .sort()
    .join(",");
}

function main() {
  const exercisePool = pool();
  assert(exercisePool.length > 500, "expect merged catalog");

  const kinds: SnowSportKind[] = ["alpine_skiing", "snowboarding", "backcountry_skiing", "xc_skiing"];
  for (const k of kinds) {
    assert(sessionIntentContractForSportSlug(k) != null, `contract for ${k}`);
  }

  const seeds = [42, 43, 44, 45, 46];
  let xcNordicMain = 0;
  let alpineNordicMain = 0;
  let bcHikeMain = 0;
  let alpineHikeMain = 0;

  for (const seed of seeds) {
    for (const k of kinds) {
      const session = generateWorkoutSession(base(seed, k), exercisePool);
      const dbg = session.debug?.sport_pattern_transfer;
      assert(dbg, `debug for ${k} seed ${seed}`);
      assert.strictEqual(dbg.sport_slug, k);
      const sum = dbg.session_summary;
      assert(sum, `session_summary for ${k}`);
      assert.strictEqual(sum.sport_slug, k);

      const mainItems = (dbg.items ?? []).filter(
        (it) => it.block_type === "main_strength" || it.block_type === "main_hypertrophy"
      );
      assert(mainItems.length > 0, `${k} seed ${seed}: expect main items in transfer debug`);
      const prefix = mainSlotPrefix(k);
      assert(
        mainItems.every((it) => it.slot_rule_id.startsWith(prefix)),
        `${k} seed ${seed}: main slot_rule_id should start with ${prefix}, got ${mainItems.map((i) => i.slot_rule_id).join(",")}`
      );

      if (k === "xc_skiing") {
        xcNordicMain += sum.main_category_hits.nordic_poling_pull_endurance ?? 0;
      }
      if (k === "alpine_skiing") {
        alpineNordicMain += sum.main_category_hits.nordic_poling_pull_endurance ?? 0;
      }
      if (k === "backcountry_skiing") {
        bcHikeMain += sum.main_category_hits.locomotion_hiking_trail_identity ?? 0;
      }
      if (k === "alpine_skiing") {
        alpineHikeMain += sum.main_category_hits.locomotion_hiking_trail_identity ?? 0;
      }
    }
  }

  assert(
    xcNordicMain >= alpineNordicMain,
    `XC should not have less nordic_poling_pull_endurance in main hits than alpine over sample (xc=${xcNordicMain} alpine=${alpineNordicMain})`
  );
  assert(
    bcHikeMain >= alpineHikeMain,
    `Backcountry should surface at least as much hike/locomotion identity in main as alpine (bc=${bcHikeMain} alpine=${alpineHikeMain})`
  );

  const sigs = kinds.map((k) => mainExerciseSignature(generateWorkoutSession(base(99, k), exercisePool)));
  const uniqueSigs = new Set(sigs);
  assert(
    uniqueSigs.size >= 2,
    `expect at least two distinct main-lineups across snow kinds at seed 99; got ${uniqueSigs.size}`
  );

  console.log("snowSportFamilyDistinctness.test.ts: ok");
}

main();
