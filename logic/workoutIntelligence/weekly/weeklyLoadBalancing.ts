/**
 * Phase 6: MVP weekly structural load balancing.
 * Tracks simple exposure categories (grip, shoulder, lumbar, knee-dominant, heavy compound, plyometric)
 * and provides rules to avoid bad weekly patterns.
 */

import type {
  WeeklySessionIntent,
  WeeklyLoadState,
  StructuralLoadCategory,
  FatigueTier,
} from "./weeklyTypes";
import type { WeeklyPlannerConfig } from "./weeklyTypes";

/** Create empty weekly load state. */
export function createEmptyLoadState(): WeeklyLoadState {
  return {
    exposure: {},
    last_high_day: {},
  };
}

/** Update load state after placing a session on dayIndex. */
export function applySessionToLoadState(
  state: WeeklyLoadState,
  dayIndex: number,
  intent: WeeklySessionIntent
): WeeklyLoadState {
  const exposure = { ...state.exposure };
  const last_high_day = { ...state.last_high_day };
  const hints = intent.load_hints ?? [];
  const isHighFatigue = intent.suggested_fatigue_tier === "high";

  for (const cat of hints) {
    exposure[cat] = (exposure[cat] ?? 0) + 1;
    if (isHighFatigue) last_high_day[cat] = dayIndex;
  }
  return { exposure, last_high_day };
}

/** Check if placing this intent on dayIndex would violate load-balancing rules. */
export function wouldViolateLoadRule(
  state: WeeklyLoadState,
  dayIndex: number,
  intent: WeeklySessionIntent,
  config: WeeklyPlannerConfig
): { violate: boolean; reason?: string } {
  const hints = intent.load_hints ?? [];
  const last = state.last_high_day ?? {};

  // Rule: avoid stacking grip-intensive sessions on consecutive days
  if (hints.includes("grip_intensive")) {
    const lastGrip = last["grip_intensive"];
    if (lastGrip !== undefined && dayIndex <= lastGrip + 1) {
      return {
        violate: (config.max_grip_sessions_consecutive ?? 0) === 0,
        reason: "Grip-intensive session too close to previous grip-heavy day.",
      };
    }
  }

  // Rule: avoid stacking high lower-body (lumbar + knee + heavy compound) on consecutive days
  const highLower =
    hints.includes("lumbar_load") ||
    hints.includes("knee_dominant_high") ||
    hints.includes("heavy_compound");
  if (highLower && intent.suggested_fatigue_tier === "high") {
    const minDays = config.min_days_between_high_lower ?? 1;
    for (const cat of ["lumbar_load", "knee_dominant_high", "heavy_compound"] as const) {
      const lastDay = last[cat];
      if (lastDay !== undefined && dayIndex <= lastDay + minDays) {
        return {
          violate: true,
          reason: `High lower-body session too close to previous high lower-body day (min ${minDays} day(s) apart).`,
        };
      }
    }
  }

  return { violate: false };
}

/** Stimulus distribution rule: avoid too many high-fatigue sessions back-to-back. */
export function countConsecutiveHighFatigue(
  orderedIntents: { day_index: number; suggested_fatigue_tier: FatigueTier }[]
): number {
  let maxRun = 0;
  let run = 0;
  const sorted = [...orderedIntents].sort((a, b) => a.day_index - b.day_index);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].suggested_fatigue_tier === "high") {
      if (i > 0 && sorted[i].day_index === sorted[i - 1].day_index + 1) run += 1;
      else run = 1;
      if (run > maxRun) maxRun = run;
    } else run = 0;
  }
  return maxRun;
}

/** Check if ordering has more than max_high_fatigue_sessions and no two high-fatigue days are back-to-back. */
export function satisfiesStimulusDistribution(
  orderedIntents: { day_index: number; suggested_fatigue_tier: FatigueTier }[],
  config: WeeklyPlannerConfig
): { ok: boolean; reason?: string } {
  const maxHigh = config.max_high_fatigue_sessions ?? 3;
  const highCount = orderedIntents.filter((s) => s.suggested_fatigue_tier === "high").length;
  if (highCount > maxHigh) {
    return { ok: false, reason: `Too many high-fatigue sessions (${highCount} > ${maxHigh}).` };
  }
  const consecutiveHigh = countConsecutiveHighFatigue(orderedIntents);
  if (consecutiveHigh >= 2) {
    return { ok: false, reason: "High-fatigue sessions should not be back-to-back." };
  }
  return { ok: true };
}
