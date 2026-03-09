/**
 * Phase 6: Ontology-aware cooldown mobility/stretch selection.
 * Uses exercise_role, mobility_targets, stretch_targets when present; falls back to modality.
 */

import type { Exercise } from "./types";

/** Roles that are appropriate for cooldown/mobility/stretch blocks. */
export const COOLDOWN_ELIGIBLE_ROLES = new Set([
  "cooldown",
  "stretch",
  "mobility",
  "breathing",
  "prep", // activation/prep can double as light cooldown in some flows
]);

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
 * Role priority for cooldown: explicit cooldown/stretch/mobility/breathing first.
 */
function cooldownRolePriority(exercise: Exercise): number {
  const role = exercise.exercise_role?.toLowerCase().replace(/\s/g, "_");
  if (!role) return 1; // legacy: modality only
  if (role === "cooldown" || role === "breathing") return 3;
  if (role === "stretch" || role === "mobility") return 2;
  if (role === "prep") return 0;
  return 1;
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

  const pool = exercises.filter((e) => {
    if (alreadyUsedIds.has(e.id)) return false;
    return isCooldownEligible(e);
  });

  if (pool.length === 0) return [];

  // Sort: prefer role match, then target match, then shuffle for variety (deterministic via rng)
  const scored = pool.map((e) => ({
    exercise: e,
    rolePriority: cooldownRolePriority(e),
    targetScore: scoreTargetMatch(e, preferredTargets),
    rnd: rng(),
  }));

  scored.sort((a, b) => {
    if (b.rolePriority !== a.rolePriority) return b.rolePriority - a.rolePriority;
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
