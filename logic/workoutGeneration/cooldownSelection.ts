/**
 * Phase 6: Ontology-aware cooldown mobility/stretch selection.
 * Uses exercise_role, mobility_targets, stretch_targets when present; falls back to modality.
 */

import { isExerciseAvailableForSession } from "../../lib/workoutRules";
import { isRecoveryCooldownEligible } from "./blockSelectionEligibility";
import { isMobilityOrStretchExercise } from "../workoutIntelligence/constraints/eligibilityHelpers";
import type { ExerciseWithQualities } from "../workoutIntelligence/types";
import type { Exercise } from "./types";

/** Roles that are appropriate for cooldown when we allow mobility (legacy). */
export const COOLDOWN_ELIGIBLE_ROLES = new Set([
  "cooldown",
  "stretch",
  "mobility",
  "breathing",
  "prep", // activation/prep can double as light cooldown in some flows
]);

/**
 * Cooldown block is stretching only: include only exercises that have stretch_targets
 * or explicit stretch/breathing role (breathing allowed for recovery emphasis).
 * Excludes mobility-only exercises from cooldown.
 */
export function isStretchOnlyEligible(exercise: Exercise): boolean {
  const role = exercise.exercise_role?.toLowerCase().replace(/\s/g, "_");
  if (role === "breathing") return true;
  if (role === "stretch") return true;
  const hasStretchTargets = (exercise.stretch_targets?.length ?? 0) > 0;
  if (hasStretchTargets) return true;
  return false;
}

/** True when Phase 8 / `isMobilityOrStretchExercise` counts this toward min cooldown mobility (stretch-preferred pool). */
export function exerciseCountsAsCooldownMobilityForValidator(exercise: Exercise): boolean {
  return isMobilityOrStretchExercise(exercise as unknown as ExerciseWithQualities);
}

/**
 * Activation-first prep drills (ontology: high warmup relevance, low cooldown relevance).
 * Keeps moves like wall slides / scapular prep in warmup rather than as a lone cooldown finisher.
 */
export function isWarmupPrimaryCooldownExcluded(exercise: Exercise): boolean {
  const w = exercise.warmup_relevance;
  const c = exercise.cooldown_relevance;
  return w === "high" && (c === "low" || c === "none" || c == null);
}

/** Roles that should NOT appear in main work (compound/accessory) blocks. */
export const MAIN_WORK_EXCLUDED_ROLES = new Set([
  "cooldown",
  "stretch",
  "mobility",
  "breathing",
]);

/** Mapping from main-work movement family to preferred mobility/stretch target slugs (ontology). */
export const FAMILY_TO_COOLDOWN_TARGETS: Record<string, string[]> = {
  upper_push: ["shoulders", "thoracic_spine", "pecs"],
  upper_pull: ["lats", "shoulders", "thoracic_spine"],
  lower_body: ["hamstrings", "hip_flexors", "glutes", "calves", "quadriceps"],
  core: ["thoracic_spine", "low_back", "hip_flexors"],
  mobility: [], // no specific preference
  conditioning: ["hamstrings", "hip_flexors", "thoracic_spine"], // general recovery
};

export interface CooldownSelectionOptions {
  /** Minimum number of mobility/stretch exercises to select (e.g. from required_finishers). */
  minMobilityCount: number;
  /** Preferred target slugs (e.g. from main work families) to prefer when present on exercises. */
  preferredTargets: string[];
  /** Exercise IDs already used in this session. */
  alreadyUsedIds: Set<string>;
  /** Seeded RNG for deterministic tie-breaking. */
  rng: () => number;
  /** Optional: max items to return (default minMobilityCount + 1 for breathing if needed). */
  maxItems?: number;
}

/**
 * Returns true if the exercise is eligible for cooldown (stretch/mobility/breathing recovery work).
 * Delegates to shared recovery gate — excludes strength/isolation/prehab (e.g. tibialis raise).
 */
export function isCooldownEligible(exercise: Exercise): boolean {
  return isRecoveryCooldownEligible(exercise);
}

/**
 * Recovery-only eligibility: keep exercises purely passive/gentle.
 *
 * Hard excludes:
 *  - Any strength/power/conditioning/hypertrophy modality, regardless of tags.
 *  - High-impact exercises (plyometric, jumping, throwing).
 *  - High difficulty (≥ 4) exercises.
 *  - Exercises with no positive gentle signal (see below) unless modality is
 *    already "mobility" or "recovery" and they cleared the above gates.
 *
 * Positive signals (at least one required when modality is NOT already mobility/recovery):
 *  - exercise_role is stretch / cooldown / mobility / breathing
 *  - has mobility_targets or stretch_targets
 *  - name/id contains a rolling/foam-roll keyword
 *
 * Note: cooldown_relevance is intentionally NOT required — most exercises in
 * the DB do not have it populated yet.
 */
export function isGentleRecoveryExercise(exercise: Exercise): boolean {
  const modality = (exercise.modality ?? "").toLowerCase();

  // Hard exclude demanding modalities even if also tagged "recovery"
  if (
    modality === "strength" ||
    modality === "hypertrophy" ||
    modality === "power" ||
    modality === "conditioning"
  ) {
    return false;
  }

  // High impact = plyometric, throwing, sprinting — not recovery-appropriate
  if ((exercise.impact_level ?? "none") === "high") return false;

  // High difficulty — not appropriate for a passive recovery day
  if (exercise.difficulty >= 4) return false;

  // Positive recovery signals
  const role = exercise.exercise_role?.toLowerCase().replace(/\s/g, "_");
  const hasRecoveryRole =
    role === "stretch" || role === "cooldown" || role === "mobility" || role === "breathing";
  const hasTargets =
    (exercise.mobility_targets?.length ?? 0) > 0 || (exercise.stretch_targets?.length ?? 0) > 0;
  const idOrName = `${exercise.id} ${exercise.name}`.toLowerCase();
  const rollingSignal =
    idOrName.includes("foam_roll") ||
    idOrName.includes("foam roll") ||
    idOrName.includes("rolling") ||
    idOrName.includes("roller");

  // Mobility/recovery modality that cleared the hard gates above is accepted;
  // otherwise we require at least one explicit gentle signal.
  const safeModality = modality === "mobility" || modality === "recovery";
  return safeModality || hasRecoveryRole || hasTargets || rollingSignal;
}

/**
 * Recovery-primary sessions are cooldown-first: gentle stretches and breathing, not activation drills
 * or loaded mobility (e.g. cossack, cuban rotation patterns). Stricter than {@link isGentleRecoveryExercise}.
 */
export function isRecoveryPrimaryFriendlyExercise(exercise: Exercise): boolean {
  if (!isGentleRecoveryExercise(exercise)) return false;
  if (isWarmupPrimaryCooldownExcluded(exercise)) return false;

  const id = exercise.id.toLowerCase();
  const name = (exercise.name ?? "").toLowerCase();
  const haystack = `${id} ${name}`;

  if (/\bcossack\b/.test(haystack)) return false;
  if (/\bcuban\b/.test(haystack)) return false;
  if (/\binchworm\b/.test(haystack) || /\binch_worm\b/.test(id)) return false;
  if (/\bstraight_leg_raise\b/.test(id) || name.includes("straight leg raise")) return false;

  return true;
}

/**
 * Score for how well an exercise matches preferred cooldown targets (0 = no match, higher = better).
 */
function scoreTargetMatch(exercise: Exercise, preferredTargets: string[]): number {
  if (preferredTargets.length === 0) return 0;
  const mobility = new Set((exercise.mobility_targets ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
  const stretch = new Set((exercise.stretch_targets ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
  const all = new Set([...mobility, ...stretch]);
  let score = 0;
  for (const target of preferredTargets) {
    const t = target.toLowerCase().replace(/\s/g, "_");
    if (all.has(t)) score += 2; // strong match
  }
  return score;
}

/**
 * Role priority for cooldown (stretching only): stretch first, then cooldown, then breathing; mobility/prep not in pool.
 */
function cooldownRolePriority(exercise: Exercise): number {
  const role = exercise.exercise_role?.toLowerCase().replace(/\s/g, "_");
  if (!role) return 1; // has stretch_targets, no role
  if (role === "stretch") return 3;
  if (role === "cooldown") return 2; // legacy role for stretches
  if (role === "breathing") return 2;
  return 1;
}

/** Cooldown relevance from ontology (high=2, medium=1, low/none=0). Used in tie-break after role and target match. */
function cooldownRelevanceScore(exercise: Exercise): number {
  const rel = exercise.cooldown_relevance;
  if (rel === "high") return 2;
  if (rel === "medium") return 1;
  return 0;
}

/**
 * Select exercises for a cooldown block using ontology when present and preferred targets from main work.
 * Deterministic when rng is seeded; fallback to modality-based selection when ontology is absent.
 */
export function selectCooldownMobilityExercises(
  exercises: Exercise[],
  options: CooldownSelectionOptions
): Exercise[] {
  const {
    minMobilityCount,
    preferredTargets,
    alreadyUsedIds,
    rng,
    maxItems = Math.max(minMobilityCount + 1, 4),
  } = options;

  // Pool must satisfy Phase 8 mobility/stretch counting (includes stretch + mobility/recovery modalities).
  const pool = exercises.filter((e) => {
    if (!isExerciseAvailableForSession(e.id, alreadyUsedIds)) return false;
    if (!isRecoveryCooldownEligible(e)) return false;
    return exerciseCountsAsCooldownMobilityForValidator(e);
  });

  if (pool.length === 0) return [];

  // Sort: prefer role match, then cooldown_relevance (ontology), then target match, then shuffle (deterministic via rng)
  const scored = pool.map((e) => ({
    exercise: e,
    rolePriority: cooldownRolePriority(e),
    relevanceScore: cooldownRelevanceScore(e),
    targetScore: scoreTargetMatch(e, preferredTargets),
    rnd: rng(),
  }));

  scored.sort((a, b) => {
    if (b.rolePriority !== a.rolePriority) return b.rolePriority - a.rolePriority;
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    if (b.targetScore !== a.targetScore) return b.targetScore - a.targetScore;
    return a.rnd - b.rnd;
  });

  const need = Math.min(maxItems, Math.max(minMobilityCount, scored.length));
  return scored.slice(0, need).map((x) => x.exercise);
}

/**
 * Derive preferred cooldown targets from the main-work blocks' movement families.
 * Uses primary_movement_family of exercises in main blocks; falls back to empty if none.
 */
export function getPreferredCooldownTargetsFromFamilies(mainWorkFamilies: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const fam of mainWorkFamilies) {
    const key = fam.toLowerCase().replace(/\s/g, "_");
    const targets = FAMILY_TO_COOLDOWN_TARGETS[key];
    if (targets) {
      for (const t of targets) {
        if (!seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      }
    }
  }
  return out;
}

/** Body-focus slugs → general stretch targets when targeted pool is empty. */
export const BODY_FOCUS_TO_COOLDOWN_TARGETS: Record<string, string[]> = {
  lower: ["hamstrings", "hip_flexors", "glutes", "calves", "quadriceps"],
  lower_body: ["hamstrings", "hip_flexors", "glutes", "calves", "quadriceps"],
  upper: ["shoulders", "thoracic_spine", "pecs", "lats"],
  upper_body: ["shoulders", "thoracic_spine", "pecs", "lats"],
  upper_push: ["shoulders", "thoracic_spine", "pecs"],
  upper_pull: ["lats", "shoulders", "thoracic_spine"],
  push: ["shoulders", "thoracic_spine", "pecs"],
  pull: ["lats", "shoulders", "thoracic_spine"],
  full: ["hamstrings", "hip_flexors", "thoracic_spine", "shoulders", "glutes"],
  full_body: ["hamstrings", "hip_flexors", "thoracic_spine", "shoulders", "glutes"],
  core: ["thoracic_spine", "low_back", "hip_flexors"],
};

export function getGeneralCooldownFallbackTargets(focusBodyParts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of focusBodyParts) {
    const key = part.toLowerCase().replace(/\s/g, "_");
    const targets = BODY_FOCUS_TO_COOLDOWN_TARGETS[key];
    if (!targets) continue;
    for (const t of targets) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  if (out.length > 0) return out;
  return ["hamstrings", "hip_flexors", "thoracic_spine", "shoulders"];
}

export interface CooldownPoolOptions {
  alreadyUsedIds: Set<string>;
  recoveryEmphasis?: boolean;
}

/** Build strict cooldown stretch pool from a candidate exercise list. */
export function buildCooldownStretchPool(
  exercises: Exercise[],
  options: CooldownPoolOptions
): Exercise[] {
  const { alreadyUsedIds, recoveryEmphasis = false } = options;
  return exercises.filter(
    (e) =>
      isExerciseAvailableForSession(e.id, alreadyUsedIds) &&
      isRecoveryCooldownEligible(e) &&
      exerciseCountsAsCooldownMobilityForValidator(e) &&
      (!recoveryEmphasis || isGentleRecoveryExercise(e)) &&
      !isWarmupPrimaryCooldownExcluded(e)
  );
}

/**
 * Select cooldown stretches with tiered fallback: targeted pool first, then general guarantee pool.
 * Still rejects strength/isolation/prehab via {@link isRecoveryCooldownEligible}.
 */
export function selectCooldownExercisesWithFallback(
  primaryPool: Exercise[],
  fallbackPool: Exercise[],
  options: CooldownSelectionOptions
): Exercise[] {
  const { minMobilityCount, maxItems = Math.max(minMobilityCount + 1, 4) } = options;
  const need = Math.max(minMobilityCount, 1);

  let chosen = selectCooldownMobilityExercises(primaryPool, options);
  if (chosen.length >= need) return chosen.slice(0, maxItems);

  const usedInSelection = new Set([...options.alreadyUsedIds, ...chosen.map((e) => e.id)]);
  const relaxedTargets = getGeneralCooldownFallbackTargets([]);
  const fallbackCandidates = buildCooldownStretchPool(fallbackPool, {
    alreadyUsedIds: usedInSelection,
    recoveryEmphasis: false,
  }).filter((e) => !primaryPool.some((p) => p.id === e.id));

  if (fallbackCandidates.length > 0) {
    const fallbackChosen = selectCooldownMobilityExercises(fallbackCandidates, {
      ...options,
      alreadyUsedIds: usedInSelection,
      preferredTargets:
        options.preferredTargets.length > 0 ? options.preferredTargets : relaxedTargets,
      minMobilityCount: Math.max(0, need - chosen.length),
      maxItems: Math.max(0, maxItems - chosen.length),
    });
    chosen = [...chosen, ...fallbackChosen];
  }

  if (chosen.length >= need) return chosen.slice(0, maxItems);

  const stillNeed = need - chosen.length;
  const usedAll = new Set([...usedInSelection, ...chosen.map((e) => e.id)]);
  const remainder = [...primaryPool, ...fallbackCandidates].filter((e) => !usedAll.has(e.id));
  const extra = selectCooldownMobilityExercises(remainder, {
    ...options,
    alreadyUsedIds: usedAll,
    preferredTargets: relaxedTargets,
    minMobilityCount: stillNeed,
    maxItems: stillNeed,
  });
  return [...chosen, ...extra].slice(0, maxItems);
}
