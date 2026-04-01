/**
 * Aggregated session-level metrics for sport-pattern debug and cross-sport comparison.
 * Sport-specific category sets come from sportPatternTransfer mappers; overlap families are text-based.
 */

import type { WorkoutBlock } from "../../../lib/types";
import type { Exercise } from "../types";
import { getAlpineSkiingPatternCategoriesForExercise } from "../sportPatternTransfer/alpineSkiingExerciseCategories";
import { getHikingPatternCategoriesForExercise } from "../sportPatternTransfer/hikingExerciseCategories";
import { getTrailRunningPatternCategoriesForExercise } from "../sportPatternTransfer/trailRunningExerciseCategories";
import { isSignatureAlpineMovement } from "../sportPatternTransfer/alpineSkiingQualityScoring";
import { isSignatureHikingMovement } from "../sportPatternTransfer/hikingQualityScoring";
import { isSignatureTrailMovement } from "../sportPatternTransfer/trailRunningQualityScoring";

const MAIN_BLOCK_PREFIXES = ["main_", "secondary_main_", "power"];

function isMainBlock(bt: string): boolean {
  const b = bt.toLowerCase();
  return MAIN_BLOCK_PREFIXES.some((p) => b.startsWith(p)) || b === "power";
}

function isAccessoryBlock(bt: string): boolean {
  return bt.toLowerCase().includes("accessory");
}

function isConditioningBlock(bt: string): boolean {
  return bt.toLowerCase() === "conditioning";
}

function textBlob(ex: Exercise): string {
  return `${ex.id.toLowerCase()} ${(ex.name ?? "").toLowerCase()}`;
}

/** Session-wide movement-identity buckets comparable across hiking vs trail. */
export type OverlapFamilyCounts = {
  lunge_split_family: number;
  step_stair_family: number;
  carry_family: number;
  calf_ankle_family: number;
  conditioning_treadmill_run: number;
  conditioning_stair_incline: number;
  conditioning_bike_row_ski: number;
};

function bumpOverlapFamilies(ex: Exercise, into: OverlapFamilyCounts): void {
  const t = textBlob(ex);
  if (/\b(lunge|split_squat|bulgarian|rfe|ffe|rear_foot_elevated)\b/i.test(t) && !/\bstep_up|stepup|box_step\b/i.test(t)) {
    into.lunge_split_family += 1;
  }
  if (/\bstep[\s_-]?up|stepup|box_step|bench_step|stair|incline.*walk|hill_walk\b/i.test(t)) {
    into.step_stair_family += 1;
  }
  if (/\bcarry|farmer|suitcase|ruck|yoke|sandbag.*carry\b/i.test(t)) {
    into.carry_family += 1;
  }
  if (/\bcalf|soleus|tibialis|ankle|shin_raise|dorsiflex\b/i.test(t)) {
    into.calf_ankle_family += 1;
  }
  if (ex.modality === "conditioning") {
    if (/\btreadmill|tempo_run|fartlek|stride|running|jog\b/i.test(t)) {
      into.conditioning_treadmill_run += 1;
    } else if (/\bstair|incline|hill|hiking\b/i.test(t)) {
      into.conditioning_stair_incline += 1;
    } else if (/\bbike|row|ski|assault|erg|cycle|swim\b/i.test(t)) {
      into.conditioning_bike_row_ski += 1;
    }
  }
}

function emptyOverlap(): OverlapFamilyCounts {
  return {
    lunge_split_family: 0,
    step_stair_family: 0,
    carry_family: 0,
    calf_ankle_family: 0,
    conditioning_treadmill_run: 0,
    conditioning_stair_incline: 0,
    conditioning_bike_row_ski: 0,
  };
}

function mergeRecord(into: Record<string, number>, key: string, n = 1): void {
  into[key] = (into[key] ?? 0) + n;
}

export type SportPatternSessionSummary = {
  sport_slug: "hiking_backpacking" | "trail_running" | "alpine_skiing";
  /** Top-N category slugs for main-work blocks (frequency). */
  main_category_hits: Record<string, number>;
  accessory_category_hits: Record<string, number>;
  conditioning_exercise_ids: string[];
  signature_pattern_selections: number;
  /** Gate-valid but not flagged signature by within-pool heuristics. */
  non_signature_selections: number;
  overlap_families: OverlapFamilyCounts;
  /** Items with tier required|preferred from sport_pattern_transfer items (if computed elsewhere). */
  notes?: string;
};

function summarizeCategoriesForBlocks(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  getCats: (ex: Exercise) => Set<string>,
  predicate: (bt: string) => boolean
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    if (!predicate(b.block_type)) continue;
    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      for (const c of getCats(ex)) mergeRecord(out, c, 1);
    }
  }
  return out;
}

export function summarizeHikingSportPatternSession(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): SportPatternSessionSummary {
  const main_category_hits = summarizeCategoriesForBlocks(
    blocks,
    exerciseById,
    getHikingPatternCategoriesForExercise,
    isMainBlock
  );
  const accessory_category_hits = summarizeCategoriesForBlocks(
    blocks,
    exerciseById,
    getHikingPatternCategoriesForExercise,
    isAccessoryBlock
  );
  const conditioning_exercise_ids: string[] = [];
  let signature_pattern_selections = 0;
  let non_signature_selections = 0;
  const overlap_families = emptyOverlap();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      if (isConditioningBlock(b.block_type)) conditioning_exercise_ids.push(ex.id);
      bumpOverlapFamilies(ex, overlap_families);
      const sig = isSignatureHikingMovement(ex);
      if (sig) signature_pattern_selections += 1;
      else non_signature_selections += 1;
    }
  }

  return {
    sport_slug: "hiking_backpacking",
    main_category_hits,
    accessory_category_hits,
    conditioning_exercise_ids,
    signature_pattern_selections,
    non_signature_selections,
    overlap_families,
  };
}

export function summarizeTrailRunningSportPatternSession(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): SportPatternSessionSummary {
  const main_category_hits = summarizeCategoriesForBlocks(
    blocks,
    exerciseById,
    getTrailRunningPatternCategoriesForExercise,
    isMainBlock
  );
  const accessory_category_hits = summarizeCategoriesForBlocks(
    blocks,
    exerciseById,
    getTrailRunningPatternCategoriesForExercise,
    isAccessoryBlock
  );
  const conditioning_exercise_ids: string[] = [];
  let signature_pattern_selections = 0;
  let non_signature_selections = 0;
  const overlap_families = emptyOverlap();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      if (isConditioningBlock(b.block_type)) conditioning_exercise_ids.push(ex.id);
      bumpOverlapFamilies(ex, overlap_families);
      const sig = isSignatureTrailMovement(ex);
      if (sig) signature_pattern_selections += 1;
      else non_signature_selections += 1;
    }
  }

  return {
    sport_slug: "trail_running",
    main_category_hits,
    accessory_category_hits,
    conditioning_exercise_ids,
    signature_pattern_selections,
    non_signature_selections,
    overlap_families,
  };
}

export function summarizeAlpineSkiingSportPatternSession(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): SportPatternSessionSummary {
  const main_category_hits = summarizeCategoriesForBlocks(
    blocks,
    exerciseById,
    getAlpineSkiingPatternCategoriesForExercise,
    isMainBlock
  );
  const accessory_category_hits = summarizeCategoriesForBlocks(
    blocks,
    exerciseById,
    getAlpineSkiingPatternCategoriesForExercise,
    isAccessoryBlock
  );
  const conditioning_exercise_ids: string[] = [];
  let signature_pattern_selections = 0;
  let non_signature_selections = 0;
  const overlap_families = emptyOverlap();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      if (isConditioningBlock(b.block_type)) conditioning_exercise_ids.push(ex.id);
      bumpOverlapFamilies(ex, overlap_families);
      const sig = isSignatureAlpineMovement(ex);
      if (sig) signature_pattern_selections += 1;
      else non_signature_selections += 1;
    }
  }

  return {
    sport_slug: "alpine_skiing",
    main_category_hits,
    accessory_category_hits,
    conditioning_exercise_ids,
    signature_pattern_selections,
    non_signature_selections,
    overlap_families,
  };
}

/** Top keys by count for compact debug. */
export function topCategoryEntries(rec: Record<string, number>, limit = 8): { category: string; count: number }[] {
  return Object.entries(rec)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([category, count]) => ({ category, count }));
}
