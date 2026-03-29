/**
 * Exercise frequency test: generate many workouts and report which exercises
 * show up most often. Run with: npx tsx scripts/exerciseFrequencyTest.ts
 *
 * Uses the manual generator (lib/generator) with static EXERCISES so results
 * are reproducible without DB. Varies seed and preference presets to simulate
 * real usage; then rebalancing (e.g. top-k superset pairing) should reduce
 * dominance of a few exercises.
 */

import { generateWorkout } from "../lib/generator";
import type { ManualPreferences } from "../lib/types";
import { EXERCISES } from "../data/exercisesMerged";

const DEFAULT_PREFS: ManualPreferences = {
  primaryFocus: ["Strength"],
  targetBody: "Full body",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "Medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
};

const PRESETS: { name: string; prefs: Partial<ManualPreferences> }[] = [
  { name: "Strength 45", prefs: { primaryFocus: ["Strength"], durationMinutes: 45 } },
  { name: "Strength 60", prefs: { primaryFocus: ["Strength"], durationMinutes: 60 } },
  { name: "Hypertrophy 45", prefs: { primaryFocus: ["Hypertrophy"], durationMinutes: 45 } },
  { name: "Body Recomp 45", prefs: { primaryFocus: ["Body Recomposition"], durationMinutes: 45 } },
  { name: "Lower body", prefs: { primaryFocus: ["Strength"], targetBody: "Lower body", durationMinutes: 45 } },
  { name: "Upper body", prefs: { primaryFocus: ["Strength"], targetBody: "Upper body", durationMinutes: 45 } },
  { name: "Short 25", prefs: { primaryFocus: ["Strength"], durationMinutes: 25 } },
];

function main() {
  const totalRuns = 200;
  const countByExerciseId = new Map<string, number>();

  for (const preset of PRESETS) {
    const prefs: ManualPreferences = { ...DEFAULT_PREFS, ...preset.prefs };
    const runsPerPreset = Math.ceil(totalRuns / PRESETS.length);
    for (let i = 0; i < runsPerPreset; i++) {
      const workout = generateWorkout(prefs, EXERCISES, undefined, `${preset.name}-${i}`);
      for (const block of workout.blocks) {
        for (const item of block.items) {
          const id = item.exercise_id;
          countByExerciseId.set(id, (countByExerciseId.get(id) ?? 0) + 1);
        }
      }
    }
  }

  const totalPicks = [...countByExerciseId.values()].reduce((a, b) => a + b, 0);
  const entries = [...countByExerciseId.entries()].sort((a, b) => b[1] - a[1]);
  const counts = entries.map(([, c]) => c);
  const median = counts.length ? (counts[Math.floor(counts.length / 2)] ?? 0) : 0;
  const mean = totalPicks / (counts.length || 1);

  console.log("\n--- Exercise frequency (manual generator, static EXERCISES) ---");
  console.log(`Total workouts simulated: ${totalRuns}, total exercise picks: ${totalPicks}`);
  console.log(`Unique exercises ever picked: ${entries.length} / ${EXERCISES.length}`);
  console.log(`Median picks per exercise: ${median}, mean: ${mean.toFixed(1)}\n`);

  console.log("Exercise ID                          Count    % of picks   vs median");
  console.log("-".repeat(70));

  const report: { id: string; name: string; count: number; pct: number; ratio: number }[] = [];
  for (const [id, count] of entries) {
    const pct = (100 * count) / totalPicks;
    const ratio = median > 0 ? count / median : 0;
    const name = EXERCISES.find((e) => e.id === id)?.name ?? id;
    report.push({ id, name, count, pct, ratio });
    const flag = ratio > 1.8 ? "  ← HIGH" : "";
    console.log(`${id.padEnd(35)} ${String(count).padStart(5)}   ${pct.toFixed(2).padStart(6)}%     ${ratio.toFixed(2)}x${flag}`);
  }

  const high = report.filter((r) => r.ratio > 1.8);
  const neverPicked = EXERCISES.filter((e) => !countByExerciseId.has(e.id)).map((e) => e.id);

  if (high.length) {
    console.log("\n--- Exercises weighted too high ( > 1.8x median ) ---");
    high.forEach((r) => console.log(`  ${r.id} (${r.name}): ${r.count} picks, ${r.ratio.toFixed(2)}x median`));
  }
  if (neverPicked.length) {
    console.log("\n--- Never picked in this sample ---");
    console.log(neverPicked.join(", "));
  }

  console.log("\nDone. Rebalancing (e.g. top-k superset pairing + varied seeds) should reduce the HIGH list.\n");
}

main();
