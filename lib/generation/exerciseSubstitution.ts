/**
 * Exercise substitution intelligence: find the best alternative exercises
 * for a given target (same movement pattern, muscle groups, progressions/regressions),
 * ranked by similarity and compatibility.
 */

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
};

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
 * be filtered by equipment and injuries (e.g. from filterByHardConstraints).
 * Does not include the target in results.
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

  const targetId = target.id.toLowerCase();
  const candidates = candidatePool.filter(
    (c) => c.id !== target.id && !excludeIds.has(c.id)
  );

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
