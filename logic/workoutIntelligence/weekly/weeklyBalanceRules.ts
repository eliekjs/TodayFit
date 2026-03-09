/**
 * Phase 12: Weekly balance rules (push/pull/lower/core, stress distribution, recovery minimums).
 * Tunable; mostly soft constraints. Used by allocation and ordering.
 */

import type {
  WeeklyPlannedSession,
  WeeklyPlannerConfig,
  StructuralLoadCategory,
  FatigueTier,
} from "./weeklyTypes";

/** Body-region emphasis from session type (for balance checks). */
const SESSION_TYPE_TO_BODY_REGIONS: Partial<Record<string, string[]>> = {
  push_strength: ["upper_push"],
  upper_hypertrophy: ["upper_push", "upper_pull"],
  pull_strength: ["upper_pull"],
  lower_hypertrophy: ["lower"],
  lower_power: ["lower"],
  full_body_strength: ["upper_push", "upper_pull", "lower", "core"],
  mixed_sport_support: ["upper_pull", "lower", "core"],
  resilience_recovery: ["core"],
  core_and_mobility: ["core"],
  conditioning_only: [],
  aerobic_builder: [],
};

/**
 * Count sessions per body region from the planned sessions (for balance reporting).
 */
export function bodyRegionExposureFromPlan(
  sessions: WeeklyPlannedSession[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    const regions = SESSION_TYPE_TO_BODY_REGIONS[s.session_type] ?? [];
    for (const r of regions) {
      out[r] = (out[r] ?? 0) + 1;
    }
  }
  return out;
}

/**
 * Soft check: push/pull balance (prefer at least one of each if upper is emphasized).
 */
export function pushPullBalanceOk(
  sessions: WeeklyPlannedSession[],
  _config: WeeklyPlannerConfig
): { ok: boolean; note?: string } {
  const exposure = bodyRegionExposureFromPlan(sessions);
  const push = exposure["upper_push"] ?? 0;
  const pull = exposure["upper_pull"] ?? 0;
  if (push >= 2 && pull === 0) return { ok: false, note: "Consider adding a pull session for balance." };
  if (pull >= 2 && push === 0) return { ok: false, note: "Consider adding a push session for balance." };
  return { ok: true };
}

/**
 * Stress distribution (high/moderate/low) from planned sessions.
 */
export function stressDistribution(
  sessions: { expected_fatigue: FatigueTier }[]
): { high: number; moderate: number; low: number } {
  let high = 0, moderate = 0, low = 0;
  for (const s of sessions) {
    if (s.expected_fatigue === "high") high++;
    else if (s.expected_fatigue === "moderate") moderate++;
    else low++;
  }
  return { high, moderate, low };
}

/**
 * Minimum recovery/mobility sessions per week (soft: suggest if below).
 */
export function recoveryMinimumOk(
  sessions: WeeklyPlannedSession[],
  config: WeeklyPlannerConfig
): { ok: boolean; note?: string } {
  const minRecovery = config.min_recovery_or_mobility_sessions ?? 0;
  if (minRecovery <= 0) return { ok: true };
  const recoveryTypes = new Set(["resilience_recovery", "core_and_mobility", "aerobic_builder"]);
  const count = sessions.filter((s) => recoveryTypes.has(s.session_type)).length;
  if (count < minRecovery) {
    return { ok: false, note: `Consider at least ${minRecovery} recovery/mobility session(s) this week.` };
  }
  return { ok: true };
}

/**
 * Grip-fatigue distribution: count grip-intensive sessions and spacing (for climbing/pulling).
 */
export function gripDistribution(
  sessions: WeeklyPlannedSession[]
): { grip_intensive_count: number; consecutive_grip_days: number } {
  let count = 0;
  const sorted = [...sessions].sort((a, b) => a.day_index - b.day_index);
  let maxConsecutive = 0, run = 0;
  for (let i = 0; i < sorted.length; i++) {
    const hints = sorted[i].load_hints ?? [];
    const isGrip = hints.includes("grip_intensive");
    if (isGrip) {
      count++;
      if (i > 0 && sorted[i].day_index === sorted[i - 1].day_index + 1) run++;
      else run = 1;
      if (run > maxConsecutive) maxConsecutive = run;
    } else run = 0;
  }
  return { grip_intensive_count: count, consecutive_grip_days: maxConsecutive };
}

/**
 * Lower-body stress spacing: min days between high lower-body sessions (already in load balancing; expose for debug).
 */
export function lowerBodySpacingOk(
  sessions: WeeklyPlannedSession[],
  config: WeeklyPlannerConfig
): { ok: boolean; note?: string } {
  const minDays = config.min_days_between_high_lower ?? 1;
  const sorted = [...sessions].sort((a, b) => a.day_index - b.day_index);
  const highLowerTypes = new Set(["lower_hypertrophy", "lower_power", "full_body_strength"]);
  const highLowerDays = sorted
    .filter((s) => highLowerTypes.has(s.session_type) && s.expected_fatigue === "high")
    .map((s) => s.day_index);
  for (let i = 1; i < highLowerDays.length; i++) {
    if (highLowerDays[i]! - highLowerDays[i - 1]! <= minDays) {
      return { ok: false, note: `High lower-body sessions should be at least ${minDays} day(s) apart.` };
    }
  }
  return { ok: true };
}
