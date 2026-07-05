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

/**
 * Shared caps for total (sport + goal) priority picks and total sub-focus picks across
 * Sport Mode's one-day vs week scopes. Single source of truth — used both by the live
 * setup screen (`app/(tabs)/sport-mode/index.tsx`) and by saved-preset scope validation
 * (`lib/workoutPresetValidation.ts`) so the two never drift apart.
 */
export const MAX_TOTAL_PRIORITY_PICKS_DAY = 2;
export const MAX_TOTAL_PRIORITY_PICKS_WEEK = 3;
export const MAX_TOTAL_SUB_GOALS_DAY = 3;
export const MAX_TOTAL_SUB_GOALS_WEEK = 5;

/** Minimal shape needed to validate a sport-mode form against a day/week scope. */
export type SportFormScopeCounts = {
  rankedSportSlugs: (string | null)[];
  rankedGoals: (string | null)[];
  subFocusBySport: Record<string, string[]>;
};

export type SportFormScopeIssue = {
  id: string;
  message: string;
};

/**
 * Checks whether a sport-mode form's selections (sports, goals, sub-focuses) fit within
 * the given scope's limits. One-day sessions allow far fewer total picks than a week plan,
 * so a form saved/edited in week mode can become invalid when applied to a single day.
 * Week scope never has fewer allowances than day scope, so this only ever reports issues
 * for `scope === "day"`.
 */
export function validateSportFormForScope(
  form: SportFormScopeCounts,
  scope: "day" | "week"
): SportFormScopeIssue[] {
  const sportCount = form.rankedSportSlugs.filter((s): s is string => s != null).length;
  const goalCount = form.rankedGoals.filter((g): g is string => g != null).length;
  const sportSubGoalCount = Object.values(form.subFocusBySport).reduce<number>(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  if (scope !== "day") return [];

  const issues: SportFormScopeIssue[] = [];

  if (!isOneDaySportModeCombinationValid({ sportCount, goalCount, sportSubGoalCount })) {
    issues.push({
      id: "combination",
      message: `This preset has ${sportCount} sport(s) and ${goalCount} goal(s) selected. One-day sessions need ${ONE_DAY_SPORT_MODE_COMBINATION_HINT.replace(/^Choose /, "").replace(/\.$/, "")}.`,
    });
  }

  const totalPriorityPicks = sportCount + goalCount;
  if (totalPriorityPicks > MAX_TOTAL_PRIORITY_PICKS_DAY) {
    issues.push({
      id: "priority_cap",
      message: `This preset has ${totalPriorityPicks} sports + goals selected, but one-day sessions allow up to ${MAX_TOTAL_PRIORITY_PICKS_DAY} total.`,
    });
  }

  if (sportSubGoalCount > MAX_TOTAL_SUB_GOALS_DAY) {
    issues.push({
      id: "sub_goal_cap",
      message: `This preset has ${sportSubGoalCount} sport sub-focus picks, but one-day sessions allow up to ${MAX_TOTAL_SUB_GOALS_DAY} total.`,
    });
  }

  return issues;
}
