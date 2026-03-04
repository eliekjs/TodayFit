/**
 * Movement-pattern balancing engine for workout generation.
 * Ensures sessions include multiple movement categories (e.g. push + pull + hinge)
 * and avoids overloading a single pattern (e.g. push-push-push).
 */

import {
  BALANCE_CATEGORY_PATTERNS,
  MIN_MOVEMENT_CATEGORIES,
  MAX_SAME_PATTERN_PER_SESSION,
} from "../workoutRules";

export type BalanceState = {
  /** Patterns that have at least one exercise in the session. */
  present: string[];
  /** Category patterns (squat/hinge/push/pull) not yet represented. */
  missingCategories: string[];
  /** Patterns at or over the per-session cap. */
  atCap: string[];
  /** Number of balance categories currently represented. */
  categoryCount: number;
  /** Count per pattern (only for category patterns). */
  countsByCategory: Record<string, number>;
};

/**
 * Compute current balance state from movement pattern counts.
 * Used to decide which patterns to prefer in the next selection.
 */
export function getBalanceState(
  movementCounts: Map<string, number>,
  categoryPatterns: string[] = [...BALANCE_CATEGORY_PATTERNS]
): BalanceState {
  const present: string[] = [];
  const missingCategories: string[] = [];
  const countsByCategory: Record<string, number> = {};

  for (const p of categoryPatterns) {
    const c = movementCounts.get(p) ?? 0;
    countsByCategory[p] = c;
    if (c > 0) present.push(p);
    else missingCategories.push(p);
  }

  const atCap = present.filter(
    (p) => (movementCounts.get(p) ?? 0) >= MAX_SAME_PATTERN_PER_SESSION
  );

  return {
    present,
    missingCategories,
    atCap,
    categoryCount: present.length,
    countsByCategory,
  };
}

/**
 * Patterns we should prefer when selecting the next exercise:
 * missing categories first, then underrepresented (low count) categories.
 * Returns patterns in priority order (add one of these to improve balance).
 */
export function getPatternsToPrefer(
  movementCounts: Map<string, number>,
  targetMinCategories: number = MIN_MOVEMENT_CATEGORIES,
  categoryPatterns: string[] = [...BALANCE_CATEGORY_PATTERNS]
): string[] {
  const state = getBalanceState(movementCounts, categoryPatterns);

  // First: fill missing categories until we hit target
  if (state.categoryCount < targetMinCategories && state.missingCategories.length > 0) {
    return state.missingCategories;
  }

  // Then: prefer patterns that are underrepresented (count below cap)
  const underRepresented = categoryPatterns.filter((p) => {
    const c = movementCounts.get(p) ?? 0;
    return c < MAX_SAME_PATTERN_PER_SESSION;
  });

  return underRepresented;
}

/**
 * Bonus score for choosing an exercise with this movement pattern
 * given current counts. Use in exercise scoring to favor balance.
 * - Strong bonus for adding a missing category when below target.
 * - Moderate bonus for adding to an underrepresented category.
 * - Zero if pattern is already at cap.
 */
export function balanceBonusForExercise(
  exercisePattern: string,
  movementCounts: Map<string, number>,
  targetMinCategories: number = MIN_MOVEMENT_CATEGORIES,
  categoryPatterns: string[] = [...BALANCE_CATEGORY_PATTERNS]
): number {
  if (!categoryPatterns.includes(exercisePattern)) {
    // Non-category pattern (e.g. carry, rotate): small bonus if we have room
    const c = movementCounts.get(exercisePattern) ?? 0;
    return c < MAX_SAME_PATTERN_PER_SESSION ? 0.25 : 0;
  }

  const state = getBalanceState(movementCounts, categoryPatterns);
  const currentCount = movementCounts.get(exercisePattern) ?? 0;

  if (currentCount >= MAX_SAME_PATTERN_PER_SESSION) return 0;

  const isMissing = state.missingCategories.includes(exercisePattern);

  if (state.categoryCount < targetMinCategories && isMissing) {
    return 2.0; // Strong: adding a new category to reach minimum
  }

  if (isMissing) {
    return 1.0; // Still good: adding a category we don't have
  }

  return 0.5; // Underrepresented but already present
}

/**
 * Balance score for the current session (0 = very imbalanced, 1 = well balanced).
 * Useful for analytics or to reject sessions that are too skewed.
 */
export function balanceScore(
  movementCounts: Map<string, number>,
  categoryPatterns: string[] = [...BALANCE_CATEGORY_PATTERNS]
): number {
  const state = getBalanceState(movementCounts, categoryPatterns);

  const categoryScore =
    state.categoryCount >= MIN_MOVEMENT_CATEGORIES
      ? 1
      : state.categoryCount / MIN_MOVEMENT_CATEGORIES;

  const maxCount = Math.max(0, ...Object.values(state.countsByCategory));
  const capPenalty =
    maxCount > MAX_SAME_PATTERN_PER_SESSION
      ? 0.5
      : maxCount === MAX_SAME_PATTERN_PER_SESSION
        ? 0.9
        : 1;

  return (categoryScore * 0.7 + capPenalty * 0.3);
}

/**
 * Select exercises from a scored list while enforcing balance when possible.
 * Picks up to `count` exercises, preferring ones that improve category balance
 * when we're below targetMinCategories, then filling by score.
 * Does not mutate movementCounts; returns chosen exercises and updated counts.
 */
export function selectWithBalance<T>(
  items: { item: T; pattern: string; score: number }[],
  count: number,
  targetMinCategories: number = MIN_MOVEMENT_CATEGORIES,
  categoryPatterns: string[] = [...BALANCE_CATEGORY_PATTERNS],
  initialCounts: Map<string, number> = new Map()
): { chosen: T[]; finalCounts: Map<string, number> } {
  const counts = new Map(initialCounts);
  const chosen: T[] = [];
  const used = new Set<T>();

  const byPattern = (p: string) => items.filter((x) => x.pattern === p && !used.has(x.item));
  const state = () => getBalanceState(counts, categoryPatterns);

  // Phase 1: fill missing categories up to target (pick best-scoring per pattern)
  while (state().categoryCount < targetMinCategories && state().missingCategories.length > 0) {
    const toAdd = state().missingCategories[0];
    const candidates = byPattern(toAdd).sort((a, b) => b.score - a.score);
    const pick = candidates[0];
    if (!pick) break;
    chosen.push(pick.item);
    used.add(pick.item);
    counts.set(toAdd, (counts.get(toAdd) ?? 0) + 1);
  }

  // Phase 2: fill remaining slots by score, respecting pattern cap
  const remaining = items.filter((x) => !used.has(x.item));
  remaining.sort((a, b) => b.score - a.score);

  for (const { item, pattern, score } of remaining) {
    if (chosen.length >= count) break;
    const next = (counts.get(pattern) ?? 0) + 1;
    if (next > MAX_SAME_PATTERN_PER_SESSION) continue;
    chosen.push(item);
    used.add(item);
    counts.set(pattern, next);
  }

  return { chosen, finalCounts: counts };
}
