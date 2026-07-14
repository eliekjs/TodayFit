/**
 * Reproduce known deep-loop issues (leg_press_in_athletic_block, zone2_on_power_day)
 * across P01/P02 seeds using the static catalog (no lib/generator / RN).
 *
 * Run: npx vitest run logic/workoutGeneration/personaDeepLoopRepro.test.ts
 */

import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../data/exercisesMerged";
import { getDefaultEquipmentForTemplate } from "../../data/gymProfiles";
import {
  exerciseDefinitionToGeneratorExercise,
  manualPreferencesToGenerateWorkoutInput,
} from "../../lib/dailyGeneratorAdapter";
import {
  collectActiveSubFocusSlugs,
  inputPrefersExplosiveConditioningOverSteadyState,
  sessionBlocksLegPressInAthleticWorkingBlocks,
} from "../../data/sportSubFocus/subFocusIntentRegistry";
import { generateWorkoutSession } from "./dailyGenerator";
import { getPersonaById, gymForPersona } from "./personaSimulationFixtures";
import { hardBanLegPressFamily } from "./sportProfileBanPredicates";

const catalog = EXERCISES.map(exerciseDefinitionToGeneratorExercise);
const byId = new Map(catalog.map((e) => [e.id, e]));

const ZONEISH =
  /zone\s*2|aerobic base|tempo run|tempo jog|cruise interval|long run|steady.?state|incline treadmill|treadmill run\b/i;
const ZONEISH_EXCLUDE = /sprint|interval|hiit|rsa|shuttle|agility|repeat/i;

function isLegPressName(id: string, name: string): boolean {
  return /leg_press/i.test(id) || /leg press/i.test(name);
}

function scanPersona(personaId: string, seeds: number[]) {
  const fixture = getPersonaById(personaId);
  if (!fixture) throw new Error(`missing ${personaId}`);
  const gym = gymForPersona(fixture);
  const findings: Array<{
    seed: number;
    legPress: string[];
    zoneish: string[];
    conditioning: string[];
    blocksLegPress: boolean;
    prefersExplosive: boolean;
    subs: string[];
  }> = [];

  for (const seed of seeds) {
    const input = manualPreferencesToGenerateWorkoutInput(
      fixture.manualPreferences,
      gym,
      seed,
      undefined,
      fixture.sportGoalContext
    );
    const session = generateWorkoutSession(input, catalog);
    const items = session.blocks.flatMap((b) =>
      (b.items ?? []).map((it) => ({
        ...it,
        block_type: b.block_type,
      }))
    );
    const legPress = items
      .filter(
        (it) =>
          (it.block_type === "power" ||
            it.block_type === "main_strength" ||
            it.block_type === "main_hypertrophy") &&
          (isLegPressName(it.exercise_id, it.exercise_name ?? "") ||
            (() => {
              const ex = byId.get(it.exercise_id);
              return ex ? hardBanLegPressFamily(ex) : false;
            })())
      )
      .map((it) => `${it.block_type}:${it.exercise_name}`);
    const conditioning = items
      .filter((it) => it.block_type === "conditioning")
      .map((it) => it.exercise_name ?? it.exercise_id);
    const zoneish = conditioning.filter((n) => ZONEISH.test(n) && !ZONEISH_EXCLUDE.test(n));
    findings.push({
      seed,
      legPress,
      zoneish,
      conditioning,
      blocksLegPress: sessionBlocksLegPressInAthleticWorkingBlocks(input),
      prefersExplosive: inputPrefersExplosiveConditioningOverSteadyState(input),
      subs: collectActiveSubFocusSlugs(input),
    });
  }
  return findings;
}

describe("persona deep-loop repro (P01/P02)", () => {
  const seeds = [
    88042, 99002, 100001, 200002, 300003, 400004, 500005, 1783392257,
    // Pressure sample from deepPressure-style offsets
    ...Array.from({ length: 24 }, (_, i) => 700000 + i * 7919),
  ];

  it("reports P01 zone2 / P02 leg_press incidence for diagnosis", () => {
    const p01 = scanPersona("P01", seeds);
    const p02 = scanPersona("P02", seeds);

    const p01Zone = p01.filter((f) => f.zoneish.length > 0);
    const p02Leg = p02.filter((f) => f.legPress.length > 0);

    // Always log for ship progress; assertions enforce policy after fixes land.
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          p01_zoneish_seeds: p01Zone.map((f) => ({
            seed: f.seed,
            zoneish: f.zoneish,
            conditioning: f.conditioning,
            prefersExplosive: f.prefersExplosive,
            subs: f.subs,
          })),
          p02_leg_press_seeds: p02Leg.map((f) => ({
            seed: f.seed,
            legPress: f.legPress,
            blocksLegPress: f.blocksLegPress,
            subs: f.subs,
          })),
          p01_any_zoneish: p01Zone.length,
          p02_any_leg_press: p02Leg.length,
        },
        null,
        2
      )
    );

    for (const f of p01) {
      expect(f.prefersExplosive, `P01 seed ${f.seed} should prefer explosive conditioning`).toBe(
        true
      );
    }
    for (const f of p02) {
      expect(f.blocksLegPress, `P02 seed ${f.seed} should block leg press`).toBe(true);
    }

    expect(
      p01Zone,
      `P01 zone2_on_power_day still recurring: ${JSON.stringify(p01Zone)}`
    ).toEqual([]);
    expect(
      p02Leg,
      `P02 leg_press_in_athletic_block still recurring: ${JSON.stringify(p02Leg)}`
    ).toEqual([]);
  }, 120_000);
});
