/**
 * Sub-goals that duplicate the week “body focus this day” step
 * (Region / Pattern / Muscle). Those picks belong on the next page, not
 * as first-page sub-focus chips — otherwise Chest vs Upper vs Legs fights
 * the day template the user is about to choose.
 */

import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus/goalSubFocusOptions";
import { normalizeSubFocusPctRecord } from "./subFocusWeights";

/** Muscle-day vocabulary used by Build Muscle / Body Recomp sub-goals. */
const PHYSIQUE_BODY_DAY_SLUGS = new Set([
  "chest",
  "back",
  "arms",
  "shoulders",
  "legs",
  "glutes",
  "core",
  "balanced",
]);

/**
 * Region chips that also appear as day body focus (Upper / Lower / Core / Full).
 * Applied on mixed goals (Athletic, Strength Full-body, etc.).
 */
const REGION_BODY_DAY_SLUGS = new Set(["upper", "lower", "core", "full_body"]);

const PHYSIQUE_PRIMARY_GOALS = new Set([
  "Build Muscle (Hypertrophy)",
  "Body Recomp (fat loss & muscle gain)",
  "Body Recomposition",
]);

function slugForSubFocusDisplayName(goalLabel: string, displayName: string): string | null {
  return (
    GOAL_SUB_FOCUS_OPTIONS[goalLabel]?.subFocuses.find((f) => f.name === displayName)?.slug ??
    null
  );
}

/** True when this sub-goal is a body-part / region pick the week planner will ask again. */
export function isDeferredDayBodySubFocus(goalLabel: string, displayName: string): boolean {
  const slug = slugForSubFocusDisplayName(goalLabel, displayName);
  if (!slug) return false;
  if (PHYSIQUE_PRIMARY_GOALS.has(goalLabel)) return PHYSIQUE_BODY_DAY_SLUGS.has(slug);
  return REGION_BODY_DAY_SLUGS.has(slug);
}

export function filterDeferredDayBodySubFocusChoices(
  goalLabel: string,
  displayNames: readonly string[]
): string[] {
  return displayNames.filter((name) => !isDeferredDayBodySubFocus(goalLabel, name));
}

export function goalHasDeferredDayBodySubFocuses(
  goalLabel: string,
  displayNames: readonly string[]
): boolean {
  return displayNames.some((name) => isDeferredDayBodySubFocus(goalLabel, name));
}

export type StripDeferredDayBodySubFocusResult = {
  subFocusByGoal: Record<string, string[]>;
  subFocusPctByGoal: Record<string, Record<string, number>>;
  changed: boolean;
};

/** Drop persisted body-part / region sub-goals so week setup does not inherit them. */
export function stripDeferredDayBodySubFocuses(
  subFocusByGoal: Record<string, string[]>,
  subFocusPctByGoal?: Record<string, Record<string, number>>
): StripDeferredDayBodySubFocusResult {
  const nextSub: Record<string, string[]> = {};
  const nextPct: Record<string, Record<string, number>> = {
    ...(subFocusPctByGoal ?? {}),
  };
  let changed = false;
  for (const [goalLabel, labels] of Object.entries(subFocusByGoal)) {
    if (!labels?.length) continue;
    const kept = filterDeferredDayBodySubFocusChoices(goalLabel, labels);
    if (kept.length !== labels.length) changed = true;
    if (kept.length > 0) {
      nextSub[goalLabel] = kept;
      const prevPct = nextPct[goalLabel];
      if (prevPct) nextPct[goalLabel] = normalizeSubFocusPctRecord(kept, prevPct);
    } else if (nextPct[goalLabel]) {
      delete nextPct[goalLabel];
    }
  }
  for (const goalLabel of Object.keys(nextPct)) {
    if (!nextSub[goalLabel]) {
      delete nextPct[goalLabel];
      changed = true;
    }
  }
  return { subFocusByGoal: nextSub, subFocusPctByGoal: nextPct, changed };
}
