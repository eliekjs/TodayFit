import type { Router } from "expo-router";

/** Which manual Goal-Oriented Training preferences UI (filters) applies to the current flow. */
export type ManualGoalPreferencesScope = "day" | "week";

export function manualGoalPreferencesHref(scope: ManualGoalPreferencesScope): string {
  return scope === "week" ? "/manual/preferences?scope=week" : "/manual/preferences";
}

/** Explicit navigation to filters — use instead of router.back() or dismissTo in tab flows. */
export function navigateToManualGoalPreferences(
  router: Pick<Router, "push" | "replace">,
  scope: ManualGoalPreferencesScope,
  options?: { replace?: boolean }
): void {
  const href = manualGoalPreferencesHref(scope) as never;
  if (options?.replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
}

/** Week builder — prefer replace when toggling setup ↔ review inside the same flow. */
export function navigateToManualWeek(
  router: Pick<Router, "push" | "replace">,
  options?: { replace?: boolean }
): void {
  const href = "/manual/week" as never;
  if (options?.replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
}
