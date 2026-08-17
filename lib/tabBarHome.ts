/**
 * Visible tab roots. Flow screens (manual/*, sport-mode/*) live in the same Tabs
 * navigator, so tapping a tab must explicitly return to these hrefs.
 */
export const TAB_BAR_HOME_HREF = {
  index: "/",
  workout: "/workout",
  library: "/library",
  profiles: "/profiles",
} as const;

export type TabBarHomeHref = (typeof TAB_BAR_HOME_HREF)[keyof typeof TAB_BAR_HOME_HREF];

export function tabBarHomeHref(routeName: string): TabBarHomeHref {
  const base = String(routeName).split("/")[0];
  if (base === "workout") return TAB_BAR_HOME_HREF.workout;
  if (base === "library") return TAB_BAR_HOME_HREF.library;
  if (base === "profiles") return TAB_BAR_HOME_HREF.profiles;
  return TAB_BAR_HOME_HREF.index;
}

/** True when the current tab route is already that tab's home screen. */
export function isAlreadyOnTabHome(currentRouteName: string, href: TabBarHomeHref): boolean {
  const base = String(currentRouteName).split("/")[0];
  if (href === TAB_BAR_HOME_HREF.workout) return base === "workout";
  if (href === TAB_BAR_HOME_HREF.library) return base === "library";
  if (href === TAB_BAR_HOME_HREF.profiles) return base === "profiles";
  return base === "index";
}

export const EXECUTE_ROUTE = "/manual/execute";

/**
 * Workout tab press target. A session already underway resumes straight into the
 * exercise list, so re-tapping the tab returns to where the user left off.
 */
export function workoutTabTargetHref(args: { hasActiveExecution: boolean }): string {
  return args.hasActiveExecution ? EXECUTE_ROUTE : TAB_BAR_HOME_HREF.workout;
}

/** Lets the tab bar skip a navigation that would not move the user. */
export function isAlreadyAtTabTarget(currentRouteName: string, target: string): boolean {
  if (target === EXECUTE_ROUTE) return String(currentRouteName) === "manual/execute";
  return isAlreadyOnTabHome(currentRouteName, target as TabBarHomeHref);
}
