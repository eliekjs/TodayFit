/**
 * Shared selection caps for Goal Mode and Sport Mode.
 *
 * Both modes allow the same number of ranked fitness goals and total sub-goals.
 * Caps are biased toward Sport Mode's former week allowances (the higher of the
 * historical Goal vs Sport limits) so multi-sport / multi-goal setups stay expressible.
 *
 * Sport Mode still has a separate sports+goals *priority* budget for day vs week
 * (see `lib/sportModeOneDayValidation.ts`); that does not reduce these per-mode
 * goal / sub-goal ceilings when sports are not consuming the priority slots.
 */

/** Max ranked fitness goals (Goal Mode primaryFocus / Sport Mode rankedGoals). */
export const MAX_RANKED_GOALS = 3;

/** Max sub-goals (or sport sub-focuses) selectable under a single parent goal/sport. */
export const MAX_SUB_GOALS_PER_PARENT = 3;

/**
 * Max total sub-goals across all ranked goals (Goal Mode) or across goals + sports
 * (Sport Mode). Shared day/week — matches the former Sport Mode week ceiling.
 */
export const MAX_TOTAL_SUB_GOALS = 5;

/** Count selected sub-goal / sub-focus chips across one or more parent maps. */
export function countTotalSubGoalPicks(
  ...maps: Array<Record<string, string[]> | undefined | null>
): number {
  let n = 0;
  for (const map of maps) {
    if (!map) continue;
    for (const arr of Object.values(map)) {
      if (Array.isArray(arr)) n += arr.length;
    }
  }
  return n;
}
