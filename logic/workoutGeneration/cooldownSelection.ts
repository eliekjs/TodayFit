/**
 * Phase 6: Ontology-aware cooldown mobility/stretch selection.
 * Uses exercise_role, mobility_targets, stretch_targets when present; falls back to modality.
 */

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
 * Returns true if the exercise is eligible for cooldown (ontology-first, then modality fallback).
 */
export function isCooldownEligible(exercise: Exercise): boolean {
  const role = exercise.exercise_role?.toLowerCase().replace(/\s/g, "_");
  if (role && COOLDOWN_ELIGIBLE_ROLES.has(role)) return true;
  const mod = (exercise.modality ?? "").toLowerCase();
  if (mod === "mobility" || mod === "recovery") return true;
  const hasTargets =
    (exercise.mobility_targets?.length ?? 0) > 0 || (exercise.stretch_targets?.length ?? 0) > 0;
  if (hasTargets) return true;
  const primary = exercise.primary_movement_family?.toLowerCase().replace(/\s/g, "_");
  return primary === "mobility";
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

  // Cooldown = stretching only: exclude mobility-only exercises (no stretch_targets and not stretch/breathing role).
  const pool = exercises.filter((e) => {
    if (alreadyUsedIds.has(e.id)) return false;
    if (!isCooldownEligible(e)) return false;
    return isStretchOnlyEligible(e);
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
