/**
 * Daily / weekly focus-distribution helpers: when to show the sticky toggle,
 * and whether generation may proceed.
 */

import type {
  GoalDistributionStyle,
  ManualPreferences,
  SessionFocusDistributionStyle,
} from "./types";
import {
  detectPreferenceConflicts,
  type ConflictContext,
  type PreferenceConflict,
} from "./preferenceConflictDetector";
import {
  isLowerBodySubFocusSlug,
  isUpperBodySubFocusSlug,
  resolveSubFocusSlugFromDisplayName,
} from "./subFocusBodyRegion";

/** Conflict ids that imply multi-region / body-part focus tension. */
const BODY_FOCUS_CONFLICT_PREFIXES = ["body_vs_subgoal", "sport_body_mismatch", "multi_region_subgoals"];

export function isBodyFocusPreferenceConflict(conflict: PreferenceConflict): boolean {
  return BODY_FOCUS_CONFLICT_PREFIXES.some(
    (prefix) => conflict.id === prefix || conflict.id.startsWith(`${prefix}_`)
  );
}

/** True when selected sub-goals include both upper- and lower-region slugs. */
export function subFocusSpansUpperAndLower(prefs: ManualPreferences): boolean {
  let hasUpper = false;
  let hasLower = false;
  for (const [goalLabel, displayNames] of Object.entries(prefs.subFocusByGoal ?? {})) {
    for (const name of displayNames) {
      const slug = resolveSubFocusSlugFromDisplayName(goalLabel, name);
      if (!slug) continue;
      if (isUpperBodySubFocusSlug(slug)) hasUpper = true;
      if (isLowerBodySubFocusSlug(slug)) hasLower = true;
      if (hasUpper && hasLower) return true;
    }
  }
  return false;
}

/**
 * Body-region conflicts that should surface the daily spread-vs-resolve toggle.
 * Includes detector conflicts plus spanning upper+lower sub-goals (even on Full).
 */
export function getDailyBodyFocusConflicts(
  prefs: ManualPreferences,
  context?: ConflictContext
): PreferenceConflict[] {
  return detectPreferenceConflicts(prefs, context).filter(isBodyFocusPreferenceConflict);
}

/** Whether the sticky daily distribution note should appear. */
export function shouldShowDailyFocusDistributionNote(
  prefs: ManualPreferences,
  context?: ConflictContext
): boolean {
  if (getDailyBodyFocusConflicts(prefs, context).length > 0) return true;
  return subFocusSpansUpperAndLower(prefs);
}

/**
 * Daily generate gate for focus distribution.
 * - No multi-region tension → ok
 * - Tension + no choice yet → block
 * - Tension + spread → ok (keep all picks)
 * - Tension + resolve → ok only when body-focus conflicts are cleared
 */
export function canProceedWithDailyFocusDistribution(
  prefs: ManualPreferences,
  context?: ConflictContext
): { ok: boolean; reason?: string } {
  if (!shouldShowDailyFocusDistributionNote(prefs, context)) {
    return { ok: true };
  }
  const style = prefs.sessionFocusDistribution;
  if (style !== "spread" && style !== "resolve") {
    return {
      ok: false,
      reason: "Choose whether to spread focus areas or resolve conflicts.",
    };
  }
  if (style === "spread") return { ok: true };
  const remaining = getDailyBodyFocusConflicts(prefs, context);
  if (remaining.length > 0) {
    return {
      ok: false,
      reason: "Resolve the focus-area conflicts, or switch to spread across the session.",
    };
  }
  return { ok: true };
}

/** Weekly: always require an explicit blend vs dedicate_days choice on session-focus setup. */
export function shouldShowWeeklyGoalDistributionNote(
  _primaryFocusCount?: number,
  _opts?: { hasSportGoals?: boolean }
): boolean {
  return true;
}

export function canProceedWithWeeklyGoalDistribution(
  style: GoalDistributionStyle | null | undefined,
  _primaryFocusCount?: number,
  _opts?: { hasSportGoals?: boolean }
): { ok: boolean; reason?: string } {
  if (style !== "blend" && style !== "dedicate_days") {
    return {
      ok: false,
      reason: "Choose mixed goals in each workout, or focus each day on specific goals.",
    };
  }
  return { ok: true };
}

/** Clear stale daily distribution choice when tension disappears. */
export function nextSessionFocusDistributionAfterPrefsChange(
  prefs: ManualPreferences,
  context?: ConflictContext
): SessionFocusDistributionStyle | undefined {
  if (!shouldShowDailyFocusDistributionNote(prefs, context)) return undefined;
  return prefs.sessionFocusDistribution;
}
