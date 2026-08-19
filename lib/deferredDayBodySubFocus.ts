/**
 * Sub-goals that duplicate the week “body focus this day” region chips
 * (Upper / Lower / Core / Full). Those stay off the first page so they
 * don’t fight the day template. Muscle-day physique picks remain selectable
 * as week sub-goals (up to MAX_TOTAL_SUB_GOALS).
 */

import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus/goalSubFocusOptions";
import { normalizeSubFocusPctRecord } from "./subFocusWeights";

/**
 * Region chips that also appear as day body focus (Upper / Lower / Core / Full).
 * Muscle-day physique picks (Chest, Back, …) stay selectable as week sub-goals.
 */
const REGION_BODY_DAY_SLUGS = new Set(["upper", "lower", "core", "full_body"]);

function slugForSubFocusDisplayName(goalLabel: string, displayName: string): string | null {
  return (
    GOAL_SUB_FOCUS_OPTIONS[goalLabel]?.subFocuses.find((f) => f.name === displayName)?.slug ??
    null
  );
}

/** True when this sub-goal duplicates Upper / Lower / Core / Full on the week planner. */
export function isDeferredDayBodySubFocus(goalLabel: string, displayName: string): boolean {
  const slug = slugForSubFocusDisplayName(goalLabel, displayName);
  if (!slug) return false;
  return REGION_BODY_DAY_SLUGS.has(slug);
}

export function filterDeferredDayBodySubFocusChoices(
  goalLabel: string,
  displayNames: readonly string[]
): string[] {
  return displayNames.filter((name) => !isDeferredDayBodySubFocus(goalLabel, name));
}

/** Visible sub-goal chips for selected goals (week hides region duplicates only). */
export function countVisibleGoalSubFocusPicks(
  subFocusByGoal: Record<string, string[]> | undefined | null,
  goalLabels: readonly string[],
  deferDayBody: boolean
): number {
  if (!subFocusByGoal) return 0;
  let n = 0;
  for (const goal of goalLabels) {
    const labels = subFocusByGoal[goal] ?? [];
    n += deferDayBody ? filterDeferredDayBodySubFocusChoices(goal, labels).length : labels.length;
  }
  return n;
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
