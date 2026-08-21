/**
 * Sub-goals that duplicate the week “body focus this day” chips.
 * Region overlays (Upper / Lower / Core / Full) are always deferred on the
 * first week page. For Build Muscle / Body Recomp, muscle-day body parts
 * (Chest, Back, …) are deferred too — those are chosen per training day.
 * Non–body-part intents (e.g. Hypertrophy “Balanced”, lift qualities) stay selectable.
 * Body Recomp has no Balanced sub-goal; body focus on the next page covers distribution.
 */

import { GOAL_SUB_FOCUS_OPTIONS } from "../data/goalSubFocus/goalSubFocusOptions";
import { normalizeSubFocusPctRecord } from "./subFocusWeights";
import { WEEKLY_BODY_FOCUS_MODE_UNLOCK_GOALS } from "./weekDaySessionFocus";

/**
 * Region chips that also appear as day body focus (Upper / Lower / Core / Full).
 */
const REGION_BODY_DAY_SLUGS = new Set(["upper", "lower", "core", "full_body"]);

/**
 * Muscle-day physique picks chosen on the week planner for Build Muscle /
 * Body Recomp. Hypertrophy still offers “Balanced” as a week-level intent
 * (not deferred). Body Recomp no longer lists Balanced in the catalog.
 */
const MUSCLE_DAY_BODY_SLUGS = new Set([
  "glutes",
  "back",
  "chest",
  "arms",
  "shoulders",
  "legs",
  "core",
]);

const PHYSIQUE_MUSCLE_DAY_GOALS = new Set<string>(WEEKLY_BODY_FOCUS_MODE_UNLOCK_GOALS);

function slugForSubFocusDisplayName(goalLabel: string, displayName: string): string | null {
  return (
    GOAL_SUB_FOCUS_OPTIONS[goalLabel]?.subFocuses.find((f) => f.name === displayName)?.slug ??
    null
  );
}

/** True when this sub-goal duplicates a body focus chip on the week planner. */
export function isDeferredDayBodySubFocus(goalLabel: string, displayName: string): boolean {
  const slug = slugForSubFocusDisplayName(goalLabel, displayName);
  if (!slug) return false;
  if (REGION_BODY_DAY_SLUGS.has(slug)) return true;
  if (PHYSIQUE_MUSCLE_DAY_GOALS.has(goalLabel) && MUSCLE_DAY_BODY_SLUGS.has(slug)) return true;
  return false;
}

export function filterDeferredDayBodySubFocusChoices(
  goalLabel: string,
  displayNames: readonly string[]
): string[] {
  return displayNames.filter((name) => !isDeferredDayBodySubFocus(goalLabel, name));
}

/** Visible sub-goal chips for selected goals (week hides day-body duplicates). */
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
    const catalogNames = new Set(
      (GOAL_SUB_FOCUS_OPTIONS[goalLabel]?.subFocuses ?? []).map((f) => f.name)
    );
    // Also drop removed catalog labels (e.g. legacy Body Recomp “Balanced”).
    const kept = filterDeferredDayBodySubFocusChoices(goalLabel, labels).filter((name) =>
      catalogNames.size === 0 ? true : catalogNames.has(name)
    );
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
