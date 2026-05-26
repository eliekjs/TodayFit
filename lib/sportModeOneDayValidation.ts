export type OneDaySportModeCounts = {
  sportCount: number;
  goalCount: number;
  sportSubGoalCount: number;
};

/**
 * One-day Sport Mode needs enough intent to build a single session.
 * Valid combinations:
 * - 2 sports (no additional fitness goals)
 * - 1 sport + 1 fitness goal
 * - 1 sport + at least one sport sub-focus (no fitness goal required)
 */
export function isOneDaySportModeCombinationValid({
  sportCount,
  goalCount,
  sportSubGoalCount,
}: OneDaySportModeCounts): boolean {
  if (sportCount < 1) return false;
  if (sportCount === 2 && goalCount === 0) return true;
  if (sportCount === 1 && goalCount === 1) return true;
  if (sportCount === 1 && goalCount === 0 && sportSubGoalCount >= 1) return true;
  return false;
}

export const ONE_DAY_SPORT_MODE_COMBINATION_HINT =
  "Choose either 2 sports, 1 sport + 1 goal, or 1 sport with at least one sport sub-focus.";
