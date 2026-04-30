/**
 * sessionIntentDirectLinkage.test.ts
 *
 * Asserts that goals, sub-goals, sports, and sport sub-focuses are traceable
 * through ranked_intent_entries → matched_intents on each exercise.
 *
 * Run: npx tsx logic/workoutGeneration/sessionIntentDirectLinkage.test.ts
 */

import assert from "node:assert/strict";
import { loadDotEnvFromRepoRoot } from "../../scripts/dotenvLocal";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../../lib/generator";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import type { ManualPreferences } from "../../lib/types";
import type { SportGoalContext } from "../../lib/dailyGeneratorAdapter";

const PREFS: ManualPreferences = {
  primaryFocus: ["Build Strength", "Sport Conditioning"],
  subFocusByGoal: {
    "Build Strength": ["Squat", "Deadlift / Hinge"],
    "Sport Conditioning": ["Threshold / Tempo", "Zone 2 / Aerobic base"],
  },
  targetBody: "Lower",
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  workoutStyle: [],
  goalMatchPrimaryPct: 60,
  goalMatchSecondaryPct: 40,
  goalMatchTertiaryPct: 0,
  workoutTier: "intermediate",
};

const SPORT_CTX: SportGoalContext = {
  sport_slugs: ["trail_running"],
  sport_sub_focus: {
    trail_running: ["uphill_endurance", "ankle_stability"],
  },
  sport_weight: 0.45,
};

const GYM = { id: "test", name: "Test Gym", equipment: ["bodyweight", "dumbbells", "barbell", "bench"] };

async function run() {
  loadDotEnvFromRepoRoot();

  const injurySlugs = injurySlugsFromManualPreferences(PREFS);
  const pool = await getExercisePoolForManualGeneration(injurySlugs);

  const resolvedInput = manualPreferencesToGenerateWorkoutInput(PREFS, GYM, 42, undefined, SPORT_CTX);

  // --- 1. Verify ranked_intent_entries is built ---
  const entries = resolvedInput.session_intent?.ranked_intent_entries ?? [];
  assert.ok(entries.length > 0, "ranked_intent_entries should be non-empty");

  const ranks = entries.map((e) => e.rank);
  assert.deepEqual(
    ranks,
    Array.from({ length: entries.length }, (_, i) => i + 1),
    "ranks should be sequential starting at 1"
  );

  const weightSum = entries.reduce((s, e) => s + e.weight, 0);
  assert.ok(
    Math.abs(weightSum - 1) < 0.01,
    `weights should sum to ~1 (got ${weightSum.toFixed(4)})`
  );

  const goalEntries = entries.filter((e) => e.kind === "goal");
  assert.ok(goalEntries.length >= 2, "should have at least 2 goal entries");
  assert.ok(goalEntries.some((e) => e.slug === "strength"), "should have a 'strength' goal entry");

  const sportEntries = entries.filter((e) => e.kind === "sport");
  assert.ok(sportEntries.length >= 1, "should have at least 1 sport entry");
  assert.ok(sportEntries.some((e) => e.slug === "trail_running"), "should have trail_running sport entry");

  const subFocusEntries = entries.filter((e) => e.kind === "goal_sub_focus");
  assert.ok(subFocusEntries.length >= 1, "should have at least 1 goal sub-focus entry");

  const sportSubFocusEntries = entries.filter((e) => e.kind === "sport_sub_focus");
  assert.ok(sportSubFocusEntries.length >= 1, "should have at least 1 sport sub-focus entry");

  console.log(
    `[ranked_intent_entries] ${entries.length} entries: ` +
      `${goalEntries.length} goal, ${subFocusEntries.length} goal_sub_focus, ` +
      `${sportEntries.length} sport, ${sportSubFocusEntries.length} sport_sub_focus`
  );

  // --- 2. Generate workout and check matched_intents ---
  const workout = await generateWorkoutAsync(PREFS, GYM, 42, undefined, SPORT_CTX, { exercisePool: pool });
  assert.ok(workout.blocks.length > 0, "workout should have blocks");

  const WARMUP_COOLDOWN = new Set(["warmup", "cooldown"]);
  const mainBlocks = workout.blocks.filter((b) => !WARMUP_COOLDOWN.has(b.block_type));
  assert.ok(mainBlocks.length > 0, "workout should have non-warmup/cooldown blocks");

  let totalMainExercises = 0;
  let exercisesWithDirectOrPartial = 0;
  const rank1Matches: string[] = [];
  const rank2Matches: string[] = [];

  for (const block of mainBlocks) {
    for (const item of block.items) {
      totalMainExercises++;
      const mi = item.session_intent_links?.matched_intents ?? [];
      const hasDirectOrPartial = mi.some(
        (m) => m.match_strength === "direct" || m.match_strength === "partial"
      );
      if (hasDirectOrPartial) exercisesWithDirectOrPartial++;
      if (mi.some((m) => m.rank === 1)) rank1Matches.push(item.exercise_name);
      if (mi.some((m) => m.rank === 2)) rank2Matches.push(item.exercise_name);
    }
  }

  const coverage = totalMainExercises > 0 ? exercisesWithDirectOrPartial / totalMainExercises : 0;
  console.log(
    `[matched_intents] ${exercisesWithDirectOrPartial}/${totalMainExercises} main exercises ` +
      `have direct/partial matches (${(coverage * 100).toFixed(0)}%)`
  );
  console.log(`  rank-1 matched: ${rank1Matches.join(", ") || "(none)"}`);
  console.log(`  rank-2 matched: ${rank2Matches.join(", ") || "(none)"}`);

  // Every main exercise should have at least one matched_intent entry (direct, partial, or inferred)
  for (const block of mainBlocks) {
    for (const item of block.items) {
      const mi = item.session_intent_links?.matched_intents;
      assert.ok(
        mi != null,
        `[${item.exercise_name}] matched_intents should be present on main exercises`
      );
    }
  }

  // At least 50% of main exercises should have a direct or partial match (not just inferred)
  assert.ok(
    coverage >= 0.5,
    `Expected ≥50% main exercises with direct/partial matched_intents; got ${(coverage * 100).toFixed(0)}%`
  );

  // Top-ranked entries (rank 1 and rank 2) should each have at least one exercise linked
  assert.ok(
    rank1Matches.length > 0,
    "At least one main exercise should have a matched_intent with rank=1"
  );
  assert.ok(
    rank2Matches.length > 0,
    "At least one main exercise should have a matched_intent with rank=2"
  );

  // --- 3. Print a sample exercise's matched_intents for the review output example ---
  const sampleItem = mainBlocks
    .flatMap((b) => b.items)
    .find((item) => (item.session_intent_links?.matched_intents?.length ?? 0) > 0);
  if (sampleItem) {
    console.log("\n[Example matched_intents output]");
    console.log(`Exercise: ${sampleItem.exercise_name}`);
    console.log(JSON.stringify(sampleItem.session_intent_links?.matched_intents, null, 2));
  }

  console.log("\nsessionIntentDirectLinkage.test.ts: all assertions passed ✓");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
