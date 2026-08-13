/**
 * Detect when switching weekly body-focus modes (or a per-day body pick)
 * would override user choices — used to drive confirm dialogs.
 */

import type { ManualPreferences, WeeklyBodyFocusMode } from "./types";
import {
  dayBodyFocusToRegion,
  getSubFocusBodyRegion,
  resolveSubFocusSlugFromDisplayName,
  subFocusRegionConflictsWithDay,
  type DayBodyRegion,
} from "./subFocusBodyRegion";
import type { DayBodyFocusChoiceId } from "./weekDaySessionFocus";
import { BODY_CHOICE_COPY, dayBodyFocusChoiceToBias } from "./weekDaySessionFocus";

export const WEEKLY_BODY_FOCUS_MODE_LABELS: Record<WeeklyBodyFocusMode, string> = {
  region: "Region",
  pattern: "Pattern",
  muscle: "Muscle",
};

export function bodyChoiceDisplayLabel(id: DayBodyFocusChoiceId): string {
  return BODY_CHOICE_COPY[id]?.label ?? id;
}

/** True when reseeding would change any existing per-day body pick. */
export function modeChangeWouldOverrideDayBodyPicks(
  currentIds: readonly DayBodyFocusChoiceId[],
  proposedIds: readonly DayBodyFocusChoiceId[]
): boolean {
  if (currentIds.length === 0) return false;
  if (currentIds.length !== proposedIds.length) return true;
  return currentIds.some((id, i) => id !== proposedIds[i]);
}

export type SubFocusConflictSummary = {
  displayNames: string[];
  dayRegion: DayBodyRegion;
  dayBodyLabel: string;
  message: string;
};

/** Sub-goals that conflict with a proposed day body choice (region-level). */
export function summarizeBodyChoiceVsSubFocusConflict(
  bodyChoiceId: DayBodyFocusChoiceId,
  prefs: ManualPreferences,
  /** Optional per-day override already applied */
  subFocusByGoalOverride?: Record<string, string[]>
): SubFocusConflictSummary | null {
  const dayRegion = dayBodyFocusToRegion(bodyChoiceId);
  if (dayRegion === "full" || dayRegion === "core") return null;

  const subFocusByGoal = {
    ...(prefs.subFocusByGoal ?? {}),
    ...(subFocusByGoalOverride ?? {}),
  };
  const conflictingNames: string[] = [];
  for (const [goalLabel, displayNames] of Object.entries(subFocusByGoal)) {
    for (const name of displayNames) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug) continue;
      const region = getSubFocusBodyRegion(slug);
      if (!region) continue;
      if (subFocusRegionConflictsWithDay(region, dayRegion)) {
        conflictingNames.push(name);
      }
    }
  }
  if (conflictingNames.length === 0) return null;

  const unique = [...new Set(conflictingNames)];
  const dayBodyLabel = bodyChoiceDisplayLabel(bodyChoiceId);
  const opposing = dayRegion === "upper" ? "lower-body" : "upper-body";
  return {
    displayNames: unique,
    dayRegion,
    dayBodyLabel,
    message: `Your sub-goals (${unique.slice(0, 3).join(", ")}${
      unique.length > 3 ? "…" : ""
    }) are ${opposing}, but this day would be ${dayBodyLabel}. Override those sub-goals for this day so they match ${dayBodyLabel}, or cancel and keep your current picks.`,
  };
}

/**
 * Map region-style resolution body ids (upper/lower/full) into the active
 * week body-focus vocabulary so "Switch to Lower" lands on Legs in muscle/pattern mode.
 */
export function mapBodyResolutionToMode(
  bodyId: DayBodyFocusChoiceId,
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId {
  if (mode === "region") return bodyId;
  if (mode === "pattern") {
    switch (bodyId) {
      case "upper":
        return "push";
      case "lower":
      case "glutes":
        return "legs";
      case "full":
        return "push";
      case "chest":
      case "shoulders":
      case "arms":
        return "push";
      case "back":
        return "pull";
      default:
        return bodyId;
    }
  }
  // muscle
  switch (bodyId) {
    case "upper":
    case "push":
      return "chest";
    case "pull":
      return "back";
    case "lower":
    case "legs":
      return "legs";
    case "full":
      return "chest";
    default:
      return bodyId;
  }
}

/**
 * Build a per-day sub-focus override that keeps only picks aligned with the body day.
 * Returns null when nothing to clear or no sub-focuses selected.
 */
export function buildSubFocusOverrideAligningToBody(
  bodyChoiceId: DayBodyFocusChoiceId,
  prefs: ManualPreferences,
  existingOverride?: Record<string, string[]>
): Record<string, string[]> | null {
  const dayRegion = dayBodyFocusToRegion(bodyChoiceId);
  if (dayRegion === "full" || dayRegion === "core") return null;

  const base = {
    ...(prefs.subFocusByGoal ?? {}),
    ...(existingOverride ?? {}),
  };
  const next: Record<string, string[]> = {};
  let changed = false;
  for (const [goalLabel, displayNames] of Object.entries(base)) {
    const kept = displayNames.filter((name) => {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug) return true;
      const region = getSubFocusBodyRegion(slug);
      if (!region) return true;
      return !subFocusRegionConflictsWithDay(region, dayRegion);
    });
    next[goalLabel] = kept;
    if (kept.length !== displayNames.length) changed = true;
  }
  if (!changed) return null;
  return next;
}

/** Human blurb when switching week body-focus mode. */
export function modeChangeOverrideMessage(
  fromMode: WeeklyBodyFocusMode,
  toMode: WeeklyBodyFocusMode,
  proposedIds: readonly DayBodyFocusChoiceId[]
): string {
  const from = WEEKLY_BODY_FOCUS_MODE_LABELS[fromMode];
  const to = WEEKLY_BODY_FOCUS_MODE_LABELS[toMode];
  const preview = proposedIds
    .slice(0, 5)
    .map((id) => bodyChoiceDisplayLabel(id))
    .join(" · ");
  const more = proposedIds.length > 5 ? "…" : "";
  return `Switching from ${from} to ${to} rebuilds each day’s body focus (${preview}${more}). Override your current day picks with the ${to} template?`;
}

/** Apply a day body choice onto one-session ManualPreferences (day flow). */
export function applyDayBodyChoiceToManualPreferences(
  prefs: ManualPreferences,
  choiceId: DayBodyFocusChoiceId
): Partial<ManualPreferences> {
  const bias = dayBodyFocusChoiceToBias(choiceId);
  return {
    targetBody: bias.targetBody,
    targetModifier: bias.targetModifier,
    specificBodyFocus: bias.specificBodyFocus,
  };
}
