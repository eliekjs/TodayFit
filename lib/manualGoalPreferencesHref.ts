/** Which manual Goal-Oriented Training preferences UI (filters) applies to the current flow. */
export type ManualGoalPreferencesScope = "day" | "week";

export function manualGoalPreferencesHref(scope: ManualGoalPreferencesScope): string {
  return scope === "week" ? "/manual/preferences?scope=week" : "/manual/preferences";
}
