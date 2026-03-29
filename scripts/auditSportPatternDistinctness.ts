/**
 * Cross-sport distinctness audit: hiking_backpacking vs trail_running on the same scenarios.
 * Run: npx tsx scripts/auditSportPatternDistinctness.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "../logic/workoutGeneration/types";
import { topCategoryEntries } from "../logic/workoutGeneration/sportPattern/sportPatternSessionAudit";

const BROAD_EQUIPMENT = [
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
  "pull_up_bar",
] as const;

type Scenario = {
  id: string;
  input: GenerateWorkoutInput;
};

function baseInput(partial: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "medium",
    available_equipment: [...BROAD_EQUIPMENT],
    injuries_or_constraints: [],
    seed: 0,
    sport_weight: 0.55,
    ...partial,
  };
}

function buildScenarios(): Scenario[] {
  const out: Scenario[] = [];
  const durations = [30, 45, 60] as const;
  const goals = ["strength", "hypertrophy"] as const;
  const energies = ["low", "medium", "high"] as const;
  const seeds = [11, 23, 42, 77, 101];

  for (const duration_minutes of durations) {
    for (const primary_goal of goals) {
      for (const energy_level of energies) {
        for (const seed of seeds) {
          const id = `d${duration_minutes}_g${primary_goal}_e${energy_level}_s${seed}`;
          out.push({
            id,
            input: baseInput({ duration_minutes, primary_goal, energy_level, seed }),
          });
        }
      }
    }
  }
  return out;
}

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

type Agg = {
  hiking: {
    mainTop: Record<string, number>;
    accTop: Record<string, number>;
    condIds: Record<string, number>;
    overlapSum: Record<string, number>;
    sigSum: number;
    n: number;
  };
  trail: {
    mainTop: Record<string, number>;
    accTop: Record<string, number>;
    condIds: Record<string, number>;
    overlapSum: Record<string, number>;
    sigSum: number;
    n: number;
  };
};

function emptyAgg(): Agg {
  const z = (): Record<string, number> => ({});
  return {
    hiking: { mainTop: z(), accTop: z(), condIds: z(), overlapSum: z(), sigSum: 0, n: 0 },
    trail: { mainTop: z(), accTop: z(), condIds: z(), overlapSum: z(), sigSum: 0, n: 0 },
  };
}

function mergeCounts(into: Record<string, number>, from: Record<string, number>): void {
  for (const [k, v] of Object.entries(from)) {
    into[k] = (into[k] ?? 0) + v;
  }
}

function main() {
  const scenarios = buildScenarios();
  const exercisePool = pool();
  const agg = emptyAgg();

  for (const sc of scenarios) {
    for (const sport of ["hiking_backpacking", "trail_running"] as const) {
      const input: GenerateWorkoutInput = {
        ...sc.input,
        sport_slugs: [sport],
      };
      const session = generateWorkoutSession(input, exercisePool);
      const sum = session.debug?.sport_pattern_transfer?.session_summary;
      if (!sum) continue;
      const side = sport === "hiking_backpacking" ? agg.hiking : agg.trail;
      side.n += 1;
      mergeCounts(side.mainTop, sum.main_category_hits);
      mergeCounts(side.accTop, sum.accessory_category_hits);
      for (const id of sum.conditioning_exercise_ids) {
        side.condIds[id] = (side.condIds[id] ?? 0) + 1;
      }
      mergeCounts(side.overlapSum, sum.overlap_families as unknown as Record<string, number>);
      side.sigSum += sum.signature_pattern_selections;
    }
  }

  const printTop = (label: string, rec: Record<string, number>, limit = 12) => {
    console.log(`\n--- ${label} (top ${limit}) ---`);
    const entries = Object.entries(rec)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    for (const [k, v] of entries) console.log(`  ${k}: ${v}`);
  };

  console.log("Sport pattern distinctness audit");
  console.log(`Scenarios: ${scenarios.length} × 2 sports = ${scenarios.length * 2} sessions`);
  console.log(`Exercise pool: ${exercisePool.length} (blocked ids excluded)`);

  printTop("Hiking — main_category (aggregate)", agg.hiking.mainTop);
  printTop("Trail — main_category (aggregate)", agg.trail.mainTop);
  printTop("Hiking — accessory_category (aggregate)", agg.hiking.accTop);
  printTop("Trail — accessory_category (aggregate)", agg.trail.accTop);
  printTop("Hiking — conditioning exercise ids", agg.hiking.condIds, 15);
  printTop("Trail — conditioning exercise ids", agg.trail.condIds, 15);

  console.log("\n--- Overlap families (sum of counts per session exercise; higher = more use) ---");
  const keys = Object.keys(agg.hiking.overlapSum);
  for (const k of keys) {
    const h = agg.hiking.overlapSum[k] ?? 0;
    const t = agg.trail.overlapSum[k] ?? 0;
    console.log(`  ${k}: hiking=${h} trail=${t} (Δ trail−hike = ${t - h})`);
  }

  const n = agg.hiking.n;
  console.log("\n--- Signature selections (mean per session) ---");
  console.log(`  hiking: ${(agg.hiking.sigSum / n).toFixed(2)}`);
  console.log(`  trail:  ${(agg.trail.sigSum / n).toFixed(2)}`);

  // Example single scenario side-by-side
  const sample = scenarios.find((s) => s.id === "d45_gstrength_ehigh_s42");
  if (sample) {
    console.log("\n--- Sample side-by-side: d45 strength high energy seed 42 ---");
    for (const sport of ["hiking_backpacking", "trail_running"] as const) {
      const session = generateWorkoutSession(
        { ...sample.input, sport_slugs: [sport] },
        exercisePool
      );
      const sum = session.debug?.sport_pattern_transfer?.session_summary;
      if (!sum) continue;
      console.log(`\n[${sport}]`);
      console.log("  main top:", topCategoryEntries(sum.main_category_hits, 8));
      console.log("  acc top:", topCategoryEntries(sum.accessory_category_hits, 6));
      console.log("  conditioning ids:", sum.conditioning_exercise_ids);
      console.log("  overlap:", sum.overlap_families);
    }
  }

  console.log("\nDone.");
}

main();
