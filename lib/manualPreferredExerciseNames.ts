import type { ManualPreferences } from "./types";
import { isDbConfigured } from "./db";
import { getPreferredExerciseNamesForSportAndGoals } from "./db/starterExerciseRepository";
import { PRIMARY_FOCUS_TO_GOAL_SLUG } from "./preferencesConstants";

export type ManualPreferencesPreferredNamesInput = Pick<
  ManualPreferences,
  "primaryFocus" | "goalMatchPrimaryPct" | "goalMatchSecondaryPct" | "goalMatchTertiaryPct"
>;

/**
 * When Supabase is configured and the user has primary focus goals, returns
 * ranked exercise names to bias manual generation; otherwise undefined.
 */
export async function preferredExerciseNamesForManualPreferences(
  prefs: ManualPreferencesPreferredNamesInput
): Promise<string[] | undefined> {
  if (!isDbConfigured() || prefs.primaryFocus.length === 0) return undefined;
  try {
    const goalSlugs = prefs.primaryFocus
      .map((f) => PRIMARY_FOCUS_TO_GOAL_SLUG[f])
      .filter(Boolean);
    const goalWeightsPct = [
      prefs.goalMatchPrimaryPct ?? 50,
      prefs.goalMatchSecondaryPct ?? 30,
      prefs.goalMatchTertiaryPct ?? 20,
    ];
    return await getPreferredExerciseNamesForSportAndGoals(
      null,
      goalSlugs,
      goalWeightsPct.slice(0, goalSlugs.length)
    );
  } catch {
    return undefined;
  }
}
