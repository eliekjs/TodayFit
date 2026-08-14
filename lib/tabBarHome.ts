/**
 * Visible tab roots. Flow screens (manual/*, sport-mode/*) live in the same Tabs
 * navigator, so tapping a tab must explicitly return to these hrefs.
 */
export const TAB_BAR_HOME_HREF = {
  library: "/library",
  index: "/",
  profiles: "/profiles",
} as const;

export type TabBarHomeHref = (typeof TAB_BAR_HOME_HREF)[keyof typeof TAB_BAR_HOME_HREF];

export function tabBarHomeHref(routeName: string): TabBarHomeHref {
  const base = String(routeName).split("/")[0];
  if (base === "library") return TAB_BAR_HOME_HREF.library;
  if (base === "profiles") return TAB_BAR_HOME_HREF.profiles;
  return TAB_BAR_HOME_HREF.index;
}

/** True when the current tab route is already that tab's home screen. */
export function isAlreadyOnTabHome(currentRouteName: string, href: TabBarHomeHref): boolean {
  const base = String(currentRouteName).split("/")[0];
  if (href === TAB_BAR_HOME_HREF.library) return base === "library";
  if (href === TAB_BAR_HOME_HREF.profiles) return base === "profiles";
  return base === "index";
}
