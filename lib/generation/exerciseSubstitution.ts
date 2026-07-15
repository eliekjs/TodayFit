/**
 * Exercise substitution intelligence: find the best alternative exercises
 * for a given target (same movement pattern, muscle groups, progressions/regressions),
 * ranked by similarity and compatibility. Swaps must match intensity domain and modality
 * (e.g. no mobility stretches as substitutes for high-intensity conditioning).
 */

import { getSimilarExerciseClusterId } from "../workoutRules";

/** Minimal exercise shape for substitution (compatible with generator Exercise). */
export type ExerciseLike = {
  id: string;
  name: string;
  movement_pattern: string;
  muscle_groups: string[];
  equipment_required: string[];
  modality?: string;
  difficulty?: number;
  tags?: { contraindications?: string[]; joint_stress?: string[] };
  progressions?: string[];
  regressions?: string[];
  unilateral?: boolean;
  /** When set, used to filter candidates by energy (e.g. low energy → exclude high-only). */
  energy_fit?: ("low" | "medium" | "high")[];
  /** Curated same-slot substitute slugs (ontology C.17). */
  swap_candidates?: string[];
  /** Ontology primary movement family when present. */
  primary_movement_family?: string;
};

export type SubstituteReason =
  | "curated_swap"
  | "regression"
  | "progression"
  | "same_pattern_and_muscles"
  | "same_pattern"
  | "same_muscles"
  | "same_modality"
  | "same_family";

export type RankedSubstitute = {
  exercise: ExerciseLike;
  score: number;
  reason: SubstituteReason;
};

export type SubstitutionOptions = {
  /** Exclude these exercise IDs from results (e.g. already in workout). */
  excludeIds?: Set<string> | string[];
  /** Max number of substitutes to return. */
  maxResults?: number;
  /** Prefer regressions (easier) when true. */
  preferRegressions?: boolean;
  /** Prefer progressions (harder) when true. */
  preferProgressions?: boolean;
  /** Session energy level: candidates incompatible with this are excluded (e.g. low → no high-only). */
  energyLevel?: "low" | "medium" | "high";
  /**
   * When true, keep candidates in the same similarity cluster as the target
   * (e.g. deadlift family). Default false — used when packing a session to avoid near-dupes.
   * Swap UI should pass true so near-duplicates can surface as good substitutes.
   */
  allowSameCluster?: boolean;
};

/** Domain for modality: conditioning vs mobility/recovery vs strength/power. Used to avoid cross-domain swaps. */
function modalityDomain(modality: string | undefined): string {
  if (!modality) return "other";
  if (modality === "conditioning") return "conditioning";
  if (modality === "mobility" || modality === "recovery") return "mobility";
  return "strength";
}

function energyCompatible(
  candidateFit: ("low" | "medium" | "high")[] | undefined,
  sessionEnergy: "low" | "medium" | "high"
): boolean {
  const fit = candidateFit ?? ["low", "medium", "high"];
  return fit.includes(sessionEnergy);
}

function normSlug(id: string): string {
  return id.toLowerCase();
}

function equipmentOverlapCount(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const bSet = new Set(b.map((e) => e.toLowerCase()));
  let n = 0;
  for (const eq of a) {
    if (bSet.has(eq.toLowerCase())) n += 1;
  }
  return n;
}

/**
 * Score how well a candidate substitutes for the target (higher = better).
 * Uses movement pattern, muscle groups, progressions/regressions, curated swaps,
 * equipment overlap, and difficulty proximity.
 */
function substituteScore(
  target: ExerciseLike,
  candidate: ExerciseLike,
  reason: SubstituteReason
): number {
  let score = 0;
  const patternMatch =
    Boolean(target.movement_pattern) &&
    Boolean(candidate.movement_pattern) &&
    target.movement_pattern === candidate.movement_pattern;
  const musclesOverlap =
    target.muscle_groups.some((m) => candidate.muscle_groups.includes(m)) ||
    candidate.muscle_groups.some((m) => target.muscle_groups.includes(m));
  const musclesSame =
    target.muscle_groups.length > 0 &&
    target.muscle_groups.length === candidate.muscle_groups.length &&
    target.muscle_groups.every((m) => candidate.muscle_groups.includes(m));

  switch (reason) {
    case "curated_swap":
      score = 110;
      break;
    case "regression":
    case "progression":
      score = 100;
      break;
    case "same_pattern_and_muscles":
      score = 90;
      break;
    case "same_pattern":
      score = 70;
      break;
    case "same_family":
      score = 65;
      break;
    case "same_muscles":
      score = 60;
      break;
    case "same_modality":
      score = 40;
      break;
    default:
      score = 30;
  }

  if (reason === "same_pattern" && musclesOverlap && !musclesSame) score += 5;
  if (reason === "same_muscles" && patternMatch) score += 10;
  if (reason === "curated_swap" && patternMatch) score += 5;
  if (reason === "curated_swap" && musclesOverlap) score += 5;

  const familyMatch =
    Boolean(target.primary_movement_family) &&
    target.primary_movement_family === candidate.primary_movement_family;
  if (familyMatch && reason !== "same_family" && reason !== "curated_swap") score += 8;

  const eqOverlap = equipmentOverlapCount(target.equipment_required, candidate.equipment_required);
  if (eqOverlap > 0) score += Math.min(10, eqOverlap * 4);

  if (
    target.unilateral != null &&
    candidate.unilateral != null &&
    target.unilateral === candidate.unilateral
  ) {
    score += 3;
  }

  const targetDiff = target.difficulty ?? 3;
  const candDiff = candidate.difficulty ?? 3;
  const diffProximity = 5 - Math.min(5, Math.abs(targetDiff - candDiff));
  score += diffProximity;

  return score;
}

/**
 * Find ranked substitute exercises for a target. Candidate pool should already
 * be filtered by equipment and injuries. Swaps are constrained to same intensity
 * domain and modality type (no mobility stretches for conditioning, no high-only
 * exercises when energy is low). Does not include the target in results.
 */
export function getSubstitutes(
  target: ExerciseLike,
  candidatePool: ExerciseLike[],
  options: SubstitutionOptions = {}
): RankedSubstitute[] {
  const excludeIds = options.excludeIds instanceof Set
    ? options.excludeIds
    : new Set(options.excludeIds ?? []);
  const maxResults = options.maxResults ?? 10;
  const preferRegressions = options.preferRegressions ?? false;
  const preferProgressions = options.preferProgressions ?? false;
  const energyLevel = options.energyLevel;
  const allowSameCluster = options.allowSameCluster === true;

  const targetId = normSlug(target.id);
  const targetCluster = getSimilarExerciseClusterId({ id: target.id });
  const curated = new Set((target.swap_candidates ?? []).map(normSlug));

  const candidates = candidatePool.filter((c) => {
    if (c.id === target.id || excludeIds.has(c.id)) return false;
    if (!allowSameCluster && getSimilarExerciseClusterId({ id: c.id }) === targetCluster) {
      return false;
    }
    if (energyLevel && !energyCompatible(c.energy_fit, energyLevel)) return false;
    return true;
  });

  const targetDomain = modalityDomain(target.modality);
  const scored: RankedSubstitute[] = [];

  for (const c of candidates) {
    const cid = normSlug(c.id);
    let reason: SubstituteReason | null = null;

    const targetRegressions = (target.regressions ?? []).map(normSlug);
    const targetProgressions = (target.progressions ?? []).map(normSlug);
    const cRegressions = (c.regressions ?? []).map(normSlug);
    const cProgressions = (c.progressions ?? []).map(normSlug);

    if (curated.has(cid)) {
      reason = "curated_swap";
    } else if (targetRegressions.includes(cid) || cProgressions.includes(targetId)) {
      reason = "regression";
    } else if (targetProgressions.includes(cid) || cRegressions.includes(targetId)) {
      reason = "progression";
    } else if (
      target.movement_pattern &&
      c.movement_pattern &&
      target.movement_pattern === c.movement_pattern
    ) {
      const sameMuscles =
        target.muscle_groups.length > 0 &&
        target.muscle_groups.length === c.muscle_groups.length &&
        target.muscle_groups.every((m) => c.muscle_groups.includes(m));
      reason = sameMuscles ? "same_pattern_and_muscles" : "same_pattern";
    } else if (
      target.primary_movement_family &&
      c.primary_movement_family &&
      target.primary_movement_family === c.primary_movement_family
    ) {
      reason = "same_family";
    } else if (target.muscle_groups.some((m) => c.muscle_groups.includes(m))) {
      reason = "same_muscles";
    } else if (target.modality && c.modality && target.modality === c.modality) {
      reason = "same_modality";
    } else {
      continue;
    }

    const cDomain = modalityDomain(c.modality);
    if (reason === "same_muscles" || reason === "same_modality" || reason === "same_family") {
      if (targetDomain !== cDomain) continue;
    }

    if (preferRegressions && reason === "progression") continue;
    if (preferProgressions && reason === "regression") continue;
    const score = substituteScore(target, c, reason);
    scored.push({ exercise: c, score, reason });
  }

  scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
  return scored.slice(0, maxResults);
}

/**
 * Pick a single best substitute (e.g. for "swap this exercise").
 * Returns undefined if no valid substitute.
 */
export function getBestSubstitute(
  target: ExerciseLike,
  candidatePool: ExerciseLike[],
  options: SubstitutionOptions = {}
): RankedSubstitute | undefined {
  const subs = getSubstitutes(target, candidatePool, { ...options, maxResults: 1 });
  return subs[0];
}
