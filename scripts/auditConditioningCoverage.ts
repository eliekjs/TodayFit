/**
 * Conditioning coverage audit for Sport Conditioning sub-focuses.
 *
 * Reports:
 * - Direct-match count per conditioning intent (zone2_aerobic_base, intervals_hiit, threshold_tempo, hills)
 * - Overlay-compatible count per overlay (upper, lower, core) within the conditioning pool
 * - Weak-coverage areas (intent or overlay with 0–1 exercises)
 *
 * Run: npx tsx scripts/auditConditioningCoverage.ts
 *
 * Uses STUB_EXERCISES by default. For DB-backed runs, wire in your exercise pool and ensure
 * exercises have tags.attribute_tags, muscle_groups, primary_movement_family.
 */

import { STUB_EXERCISES } from "../logic/workoutGeneration/exerciseStub";
import {
  exerciseHasSubFocusSlug,
  filterPoolByOverlay,
} from "../data/goalSubFocus/conditioningSubFocus";
import {
  CONDITIONING_GOLD_SET_IDS,
  CONDITIONING_INTENT_GOLD,
  CONDITIONING_OVERLAY_GOLD,
} from "../data/conditioningGoldSet";
import type { ExerciseForSubFocus } from "../data/goalSubFocus/conditioningSubFocus";

function toExerciseForSubFocus(ex: {
  id: string;
  tags?: { attribute_tags?: string[]; stimulus?: string[] };
  primary_movement_family?: string;
  muscle_groups?: string[];
}): ExerciseForSubFocus {
  return {
    id: ex.id,
    tags: ex.tags,
    primary_movement_family: ex.primary_movement_family,
    muscle_groups: ex.muscle_groups,
  };
}

function main() {
  const pool = STUB_EXERCISES.filter((e) => e.modality === "conditioning");
  const goldSet = new Set(CONDITIONING_GOLD_SET_IDS);
  const intentSlugs = [...CONDITIONING_INTENT_GOLD];
  const overlaySlugs = CONDITIONING_OVERLAY_GOLD.filter((o) => o !== "full_body"); // full_body = no filter

  console.log("=== Sport Conditioning coverage audit ===\n");
  console.log(`Conditioning pool size: ${pool.length}`);
  console.log(`Gold-set size: ${goldSet.size}`);
  const inPoolNotGold = pool.filter((e) => !goldSet.has(e.id));
  const inGoldNotPool = CONDITIONING_GOLD_SET_IDS.filter((id) => !pool.some((e) => e.id === id));
  if (inPoolNotGold.length) console.log(`  In pool, not in gold-set: ${inPoolNotGold.map((e) => e.id).join(", ")}`);
  if (inGoldNotPool.length) console.log(`  In gold-set, not in pool: ${inGoldNotPool.join(", ")}`);
  console.log("");

  // --- Direct-match per intent ---
  console.log("--- Direct-match (intent sub-focus) ---");
  const byIntent: Record<string, string[]> = {};
  for (const slug of intentSlugs) {
    const matching = pool.filter((e) => exerciseHasSubFocusSlug(toExerciseForSubFocus(e), slug));
    byIntent[slug] = matching.map((e) => e.id);
    const weak = matching.length <= 1 ? " [WEAK]" : "";
    console.log(`  ${slug}: ${matching.length} ${weak}`);
  }
  console.log("");

  // --- Overlay-compatible count ---
  console.log("--- Overlay-compatible (within conditioning pool) ---");
  for (const overlay of overlaySlugs) {
    const filtered = filterPoolByOverlay(pool.map(toExerciseForSubFocus), overlay);
    const count = filtered.length;
    const weak = count <= 1 ? " [WEAK]" : "";
    console.log(`  ${overlay}: ${count} ${weak}`);
  }
  console.log("");

  // --- Weak spots summary ---
  const weakIntents = intentSlugs.filter((slug) => {
    const matching = pool.filter((e) => exerciseHasSubFocusSlug(toExerciseForSubFocus(e), slug));
    return matching.length <= 1;
  });
  const weakOverlays = overlaySlugs.filter((ov) => {
    const filtered = filterPoolByOverlay(pool.map(toExerciseForSubFocus), ov);
    return filtered.length <= 1;
  });
  if (weakIntents.length || weakOverlays.length) {
    console.log("--- Weak-coverage areas ---");
    if (weakIntents.length) console.log(`  Intents with ≤1 direct match: ${weakIntents.join(", ")}`);
    if (weakOverlays.length) console.log(`  Overlays with ≤1 compatible: ${weakOverlays.join(", ")}`);
  } else {
    console.log("--- No weak-coverage areas (all intents and overlays have ≥2) ---");
  }

  // --- Per-intent exercise IDs (for docs) ---
  console.log("\n--- Direct-match exercise IDs by intent ---");
  for (const slug of intentSlugs) {
    console.log(`  ${slug}: ${(byIntent[slug] ?? []).join(", ") || "(none)"}`);
  }
}

main();
