import type { Router } from "expo-router";

/** Which manual Goal-Oriented Training preferences UI (filters) applies to the current flow. */
export type ManualGoalPreferencesScope = "day" | "week";

export function manualGoalPreferencesHref(scope: ManualGoalPreferencesScope): string {
  return scope === "week" ? "/manual/preferences?scope=week" : "/manual/preferences";
}

/** Explicit navigation to filters — use instead of router.back() or dismissTo in tab flows. */
export function navigateToManualGoalPreferences(
  router: Pick<Router, "push">,
  scope: ManualGoalPreferencesScope
): void {
  router.push(manualGoalPreferencesHref(scope) as never);
}
