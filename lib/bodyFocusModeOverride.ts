/**
 * Detect when a per-day body pick would override user choices.
 *
 * Prompt timing — wait until the user is done choosing how body focus works:
 * - Do NOT prompt on Region/Pattern/Muscle switches. The new vocabulary reseeds
 *   (or remaps) day chips; mixed sub-goals often land on other days after that.
 * - Do NOT interrupt on body-chip taps either. Chips sit in the same setup step
 *   as the mode control; the user may still pick Full, Legs, or another day.
 * - DO reveal inline banners + generate gates once they try to generate with a
 *   leftover mismatch (or, on one-day, after they opt into Focus & resolve and
 *   then generate).
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

export type BodyFocusPromptTrigger = "mode_change" | "body_pick" | "generate";

/** Sub-goal vs body prompts belong at generate, not while body focus is still being chosen. */
export function shouldPromptSubFocusConflictForTrigger(
  trigger: BodyFocusPromptTrigger
): boolean {
  return trigger === "generate";
}

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
  alignedNames: string[];
  dayRegion: DayBodyRegion;
  dayBodyLabel: string;
  /** True when selected sub-goals include both upper and lower (keep both via Full body). */
  spansBothRegions: boolean;
  message: string;
};

function formatNameList(names: string[]): string {
  return names.join(", ");
}

/** Copy for mixed vs one-sided body vs sub-goal tension. Prefers Full body to keep mixed picks. */
export function bodyVsSubFocusConflictMessage(opts: {
  dayBodyLabel: string;
  opposingNames: string[];
  alignedNames: string[];
  opposingRegion: "upper-body" | "lower-body";
}): string {
  const opposingList = formatNameList(opts.opposingNames);
  if (opts.alignedNames.length > 0) {
    const alignedList = formatNameList(opts.alignedNames);
    return `Your sub-goals mix ${alignedList} with ${opposingList}, but this session is ${opts.dayBodyLabel}. Use Full body to keep both, or drop the ${opts.opposingRegion} picks so they match ${opts.dayBodyLabel}.`;
  }
  return `Your sub-goals (${opposingList}) are ${opts.opposingRegion}, but this session is ${opts.dayBodyLabel}. Use Full body to keep those sub-goals, or drop them so the session stays ${opts.dayBodyLabel}.`;
}

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
  const alignedNames: string[] = [];
  for (const [goalLabel, displayNames] of Object.entries(subFocusByGoal)) {
    for (const name of displayNames) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug) continue;
      const region = getSubFocusBodyRegion(slug);
      if (!region) continue;
      if (subFocusRegionConflictsWithDay(region, dayRegion)) {
        conflictingNames.push(name);
      } else if (region === "upper" || region === "lower") {
        alignedNames.push(name);
      }
    }
  }
  if (conflictingNames.length === 0) return null;

  const uniqueConflicting = [...new Set(conflictingNames)];
  const uniqueAligned = [...new Set(alignedNames)];
  const dayBodyLabel = bodyChoiceDisplayLabel(bodyChoiceId);
  const opposing = dayRegion === "upper" ? "lower-body" : "upper-body";
  return {
    displayNames: uniqueConflicting,
    alignedNames: uniqueAligned,
    dayRegion,
    dayBodyLabel,
    spansBothRegions: uniqueAligned.length > 0,
    message: bodyVsSubFocusConflictMessage({
      dayBodyLabel,
      opposingNames: uniqueConflicting,
      alignedNames: uniqueAligned,
      opposingRegion: opposing,
    }),
  };
}

/**
 * Map region-style resolution body ids (upper/lower/full) into the active
 * week body-focus vocabulary so "Switch to Lower" lands on Legs in muscle/pattern mode.
 * Full body stays Full in every vocabulary (leftover-day filler).
 */
export function mapBodyResolutionToMode(
  bodyId: DayBodyFocusChoiceId,
  mode: WeeklyBodyFocusMode
): DayBodyFocusChoiceId {
  if (bodyId === "full" || bodyId === "core") return bodyId;
  if (mode === "region") return bodyId;
  if (mode === "pattern") {
    switch (bodyId) {
      case "upper":
        return "push";
      case "lower":
      case "glutes":
        return "legs";
      case "quad":
      case "posterior":
        return bodyId;
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
  switch (bodyId) {
    case "upper":
    case "push":
      return "chest";
    case "pull":
      return "back";
    case "lower":
    case "legs":
    case "quad":
      return "legs";
    case "posterior":
      return "glutes";
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
    // Always write the key so switching Region ← Muscle clears leftover chest/back tags.
    specificBodyFocus: bias.specificBodyFocus,
  };
}
