/**
 * Shared conditioning intent pool construction and anti-repeat selection.
 * Widens candidate pools beyond modality === "conditioning" and applies soft fallbacks
 * when direct sub-focus tag matches are sparse.
 */

import type { Exercise } from "./types";
import type { GenerateWorkoutInput } from "./types";
import {
  exerciseHasSubFocusSlug,
  filterPoolByOverlay,
} from "../../data/goalSubFocus/conditioningSubFocus";

/** When direct tag matches fall below this, merge signal-based fallbacks into the pool. */
export const CONDITIONING_INTENT_MIN_DIRECT_POOL = 12;

export type ConditioningPickContext = {
  /** Regeneration penalty ids from recent_history. */
  avoidIds?: Set<string>;
  /** Recent session exercise ids. */
  recentIds?: Set<string>;
  /** Already used in the current session. */
  sessionUsedIds?: Set<string>;
};

export function isConditioningWorkCandidate(exercise: Exercise): boolean {
  if (exercise.modality === "conditioning" || exercise.modality === "power") return true;
  return false;
}

function hasAnaerobicOrPlyoStimulus(exercise: Exercise): boolean {
  const stim = (exercise.tags?.stimulus ?? []).map((s) => s.toLowerCase().replace(/\s/g, "_"));
  return stim.some((s) => s === "anaerobic" || s === "plyometric");
}

function exerciseBlob(exercise: Exercise): string {
  return `${exercise.id ?? ""} ${exercise.name ?? ""}`.toLowerCase();
}

/**
 * Signal-based fallback when attribute_tags are missing. Mirrors enrichment intent slugs.
 */
export function exerciseMatchesConditioningIntentSignals(
  exercise: Exercise,
  intentSlug: string
): boolean {
  const norm = intentSlug.toLowerCase().replace(/\s/g, "_");
  const blob = exerciseBlob(exercise);
  const eq = (exercise.equipment_required ?? []).map((x) => x.toLowerCase().replace(/\s/g, "_"));
  const muscles = new Set((exercise.muscle_groups ?? []).map((m) => m.toLowerCase()));

  if (norm === "intervals_hiit" || norm === "intervals") {
    // Sprint/COD drills belong under `sprint`, not HIIT intervals (see conditioningIntentEnrichment).
    if (
      /\b(_start|starts|shuttle|\bskip\b|skips|sprint|carioca|shuffle|hurdle|butt_kick|high_knee|tempo_run|pro_shuttle)\b/.test(
        blob
      ) &&
      !/\b(burpee|battle_rope|mountain_climber|kb_swing|kettlebell_swing|assault|air_bike|tabata|emom|metcon)\b/.test(
        blob
      )
    ) {
      return false;
    }
    if (hasAnaerobicOrPlyoStimulus(exercise)) return true;
    if (exercise.modality === "power") return true;
    return /\b(sprint|shuttle|skip|burpee|hiit|tabata|emom|interval|mountain_climber|rope|metcon|assault|air_bike)\b/.test(
      blob
    );
  }
  if (norm === "sprint") {
    return (
      /\b(sprint|acceleration|shuttle|_start|starts|flying|build_up|resisted_sprint|wall_drill)\b/.test(
        blob
      ) || blob.includes("a_skip") || blob.includes("b_skip")
    );
  }
  if (norm === "hills") {
    if (/\b(incline|hill)\b/.test(blob) && /\b(press|bench|fly|curl|row|raise|pike|push_up|pushup)\b/.test(blob)) {
      return false;
    }
    if (/\b(step_up|stepup)\b/.test(blob) && /\b(sprint|sprinter|launch|toss|med_ball)\b/.test(blob)) {
      return false;
    }
    const uphillTreadmill =
      eq.includes("treadmill") &&
      (blob.includes("incline") || blob.includes("uphill") || blob.includes("hill"));
    if (
      /\b(hill|uphill|stair|sled|step_up|stepup)\b/.test(blob) ||
      eq.some((x) => ["stair_climber", "sled"].includes(x)) ||
      uphillTreadmill
    ) {
      return true;
    }
    return false;
  }
  if (norm === "threshold_tempo") {
    if (
      /\b(sprint|shuttle|_start|starts|skip|carioca|shuffle|wall_drill|bound_to_sprint|build_up_sprint|sprinter_step)\b/.test(
        blob
      )
    ) {
      return false;
    }
    return /\b(threshold|tempo_run|ftp|lactate|cruise|yasso|sweet_spot)\b/.test(blob);
  }
  if (norm === "lower_body_power_plyos" || norm === "vertical_jump") {
    const lower =
      muscles.has("legs") ||
      muscles.has("quads") ||
      muscles.has("glutes") ||
      muscles.has("hamstrings");
    const plyoCue = /\b(jump|hop|bound|plyo|box_jump|depth_jump|depth_drop|pogo|tuck_jump|squat_jump|hurdle_jump|skater_jump|trap_bar_jump)\b/.test(
      blob
    );
    const excludedBroadOrAccessory = /\b(broad_jump|broad_jumps|broad_to|woodchop|crossover_bounds|straight_leg_bounds|jump_cut|med_ball_broad)\b/.test(
      blob
    );
    const verticalNameCue =
      /\b(vertical|tuck_jump|squat_jump|depth_drop|box_jump|hurdle_jump|pogo|knee_jump|single_leg_vertical|low_squat_to_vertical|rebound_vertical|approach_.*jump)\b/.test(
        blob
      ) || blob.includes("vertical_jump");
    const verticalCue =
      norm === "vertical_jump" && plyoCue && !excludedBroadOrAccessory && verticalNameCue;
    if (verticalCue && lower) return true;
    if (norm === "lower_body_power_plyos" && plyoCue && lower) return true;
    return hasAnaerobicOrPlyoStimulus(exercise) && lower;
  }
  if (norm === "olympic_triple_extension") {
    return (
      /\b(power_clean|hang_clean|squat_clean|muscle_clean|power_snatch|hang_snatch|split_jerk|push_jerk|high_pull)\b/.test(
        blob
      ) ||
      ((blob.includes("clean") || blob.includes("snatch")) &&
        !blob.includes("curl") &&
        !blob.includes("hammer_curl"))
    );
  }
  if (norm === "upper_body_power") {
    return /\b(med_ball|medicine_ball|wall_ball|slam|ball_throw|plyo_push|explosive_push)\b/.test(
      blob
    );
  }
  if (norm === "zone2_aerobic_base" || norm === "zone2_long_steady") {
    return (
      blob.includes("zone2") ||
      blob.includes("zone_2") ||
      /\b(steady|easy_run|recovery_run|long_slow|lsd)\b/.test(blob)
    );
  }
  return false;
}

export function exerciseMatchesAnyConditioningIntent(
  exercise: Exercise,
  intentSlugs: string[]
): boolean {
  return intentSlugs.some(
    (s) => exerciseHasSubFocusSlug(exercise, s) || exerciseMatchesConditioningIntentSignals(exercise, s)
  );
}

export type BuildConditioningIntentPoolOptions = {
  intentSlugs: string[];
  used: Set<string>;
  overlayFilter?: string;
  /** Minimum direct tag matches before merging signal fallbacks (default 12). */
  minDirectPool?: number;
};

/**
 * Build a conditioning intent pool with widened modality gate and soft tag fallback.
 */
export function buildConditioningIntentPool(
  exercises: Exercise[],
  options: BuildConditioningIntentPoolOptions
): Exercise[] {
  const { intentSlugs, used, overlayFilter, minDirectPool = CONDITIONING_INTENT_MIN_DIRECT_POOL } =
    options;

  let pool = exercises.filter((e) => {
    if (used.has(e.id)) return false;
    if (e.modality === "conditioning" || e.modality === "power") return true;
    if (intentSlugs.length > 0 && intentSlugs.some((s) => exerciseHasSubFocusSlug(e, s))) {
      return true;
    }
    return false;
  });

  if (overlayFilter && overlayFilter !== "full_body") {
    pool = filterPoolByOverlay(pool, overlayFilter);
  }

  if (!intentSlugs.length) return pool;

  const directMatches = pool.filter((e) =>
    intentSlugs.some((s) => exerciseHasSubFocusSlug(e, s))
  );

  if (directMatches.length >= minDirectPool) {
    return directMatches;
  }

  const signalMatches = pool.filter(
    (e) =>
      !directMatches.some((d) => d.id === e.id) &&
      intentSlugs.some((s) => exerciseMatchesConditioningIntentSignals(e, s))
  );

  const merged = [...directMatches, ...signalMatches];
  if (merged.length > 0) return merged;

  // Last resort: keep widened pool rather than returning empty.
  return pool;
}

/** Collect ids to de-prioritize on regenerate / recent history. */
export function conditioningPickAvoidIds(input: GenerateWorkoutInput): Set<string> {
  const out = new Set<string>();
  for (const h of input.recent_history ?? []) {
    if (h.modality === "regeneration_penalty") {
      for (const id of h.exercise_ids) out.add(id);
    }
  }
  return out;
}

function pickWeightForExercise(exercise: Exercise, ctx?: ConditioningPickContext): number {
  let w = 1;
  if (!ctx) return w;
  if (ctx.sessionUsedIds?.has(exercise.id)) return 0;
  if (ctx.avoidIds?.has(exercise.id)) w *= 0.12;
  else if (ctx.recentIds?.has(exercise.id)) w *= 0.35;
  return w;
}

function weightedRandomPick<T extends { id: string }>(
  items: T[],
  weights: number[],
  rng: () => number
): T | undefined {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || !items.length) return undefined;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Pick conditioning exercise: prefer direct sub-focus slug match, then anti-repeat weighted random. */
export function pickConditioningExerciseWithVariety(
  pool: Exercise[],
  preferredModalities: string[] | undefined,
  rng: () => number,
  preferredSubFocusSlugs?: string[],
  pickContext?: ConditioningPickContext
): Exercise | undefined {
  if (!pool.length) return undefined;

  let candidatePool = pool.filter((e) => pickWeightForExercise(e, pickContext) > 0);
  if (!candidatePool.length) candidatePool = pool;

  if (preferredSubFocusSlugs?.length) {
    const directMatch = candidatePool.filter((e) =>
      preferredSubFocusSlugs.some((slug) => exerciseHasSubFocusSlug(e, slug))
    );
    if (directMatch.length > 0) {
      candidatePool = directMatch;
    }
  }

  if (preferredModalities?.length) {
    const normalized = preferredModalities.map((m) => m.toLowerCase().replace(/\s/g, "_"));
    const preferred = candidatePool.filter((e) => {
      const id = e.id.toLowerCase();
      const name = e.name.toLowerCase();
      return normalized.some((n) => id.includes(n) || name.includes(n));
    });
    if (preferred.length) {
      candidatePool = preferred;
    }
  }

  const weights = candidatePool.map((e) => pickWeightForExercise(e, pickContext));
  return weightedRandomPick(candidatePool, weights, rng);
}
