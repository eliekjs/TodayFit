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
};

export type SubstituteReason =
  | "regression"
  | "progression"
  | "same_pattern_and_muscles"
  | "same_pattern"
  | "same_muscles"
  | "same_modality";

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

/**
 * Score how well a candidate substitutes for the target (higher = better).
 * Uses movement pattern, muscle groups, progressions/regressions, and difficulty proximity.
 */
function substituteScore(
  target: ExerciseLike,
  candidate: ExerciseLike,
  reason: SubstituteReason
): number {
  let score = 0;
  const patternMatch = target.movement_pattern === candidate.movement_pattern;
  const musclesOverlap =
    target.muscle_groups.some((m) => candidate.muscle_groups.includes(m)) ||
    candidate.muscle_groups.some((m) => target.muscle_groups.includes(m));
  const musclesSame =
    target.muscle_groups.length === candidate.muscle_groups.length &&
    target.muscle_groups.every((m) => candidate.muscle_groups.includes(m));

  switch (reason) {
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

  const targetId = target.id.toLowerCase();
  const targetCluster = getSimilarExerciseClusterId({ id: target.id });

  const candidates = candidatePool.filter((c) => {
    if (c.id === target.id || excludeIds.has(c.id)) return false;
    if (getSimilarExerciseClusterId({ id: c.id }) === targetCluster) return false;
    if (energyLevel && !energyCompatible(c.energy_fit, energyLevel)) return false;
    return true;
  });

  const targetDomain = modalityDomain(target.modality);
  const scored: RankedSubstitute[] = [];

  for (const c of candidates) {
    const cid = c.id.toLowerCase();
    let reason: SubstituteReason = "same_modality";

    const targetRegressions = (target.regressions ?? []).map((r) => r.toLowerCase());
    const targetProgressions = (target.progressions ?? []).map((p) => p.toLowerCase());
    const cRegressions = (c.regressions ?? []).map((r) => r.toLowerCase());
    const cProgressions = (c.progressions ?? []).map((p) => p.toLowerCase());
    if (targetRegressions.includes(cid) || cProgressions.includes(targetId)) {
      reason = "regression";
    } else if (targetProgressions.includes(cid) || cRegressions.includes(targetId)) {
      reason = "progression";
    } else if (target.movement_pattern === c.movement_pattern) {
      const sameMuscles =
        target.muscle_groups.length === c.muscle_groups.length &&
        target.muscle_groups.every((m) => c.muscle_groups.includes(m));
      reason = sameMuscles ? "same_pattern_and_muscles" : "same_pattern";
    } else if (target.muscle_groups.some((m) => c.muscle_groups.includes(m))) {
      reason = "same_muscles";
    } else if (target.modality && c.modality && target.modality === c.modality) {
      reason = "same_modality";
    } else {
      continue;
    }

    const cDomain = modalityDomain(c.modality);
    if (reason === "same_muscles" || reason === "same_modality") {
      if (targetDomain !== cDomain) continue;
    }

    if (preferRegressions && reason === "progression") continue;
    if (preferProgressions && reason === "regression") continue;
    const score = substituteScore(target, c, reason);
    scored.push({ exercise: c, score, reason });
  }

  scored.sort((a, b) => b.score - a.score);
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
