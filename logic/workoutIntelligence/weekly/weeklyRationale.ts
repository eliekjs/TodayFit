/**
 * Phase 6: Lightweight rationale generation for weekly plan explainability.
 * Per-session rationale + weekly summary.
 */

import type { SessionTypeSlug, StimulusProfileSlug } from "../types";
import type {
  WeeklyPlannedSession,
  WeeklyPlan,
  FatigueTier,
} from "./weeklyTypes";
import type { WeeklyPlanningInput } from "./weeklyTypes";

/** Generate a short rationale for one planned session. */
export function generateSessionRationale(
  session: Pick<
    WeeklyPlannedSession,
    "session_type" | "stimulus_profile" | "label" | "expected_fatigue" | "target_qualities"
  >,
  _input: WeeklyPlanningInput
): string {
  const { session_type, stimulus_profile, label, expected_fatigue } = session;
  const qualityNames = session.target_qualities
    ? Object.keys(session.target_qualities).slice(0, 3).join(", ").replace(/_/g, " ")
    : "";

  const templates: Record<string, string> = {
    pull_strength_sport_support_strength:
      "Primary pulling and grip support for climbing; maintains scapular and lock-off strength.",
    lower_hypertrophy_hypertrophy_accumulation:
      "Lower-body hypertrophy exposure for muscle retention and structural balance.",
    lower_power_power_speed:
      "Lower-body power and eccentric emphasis to support sport performance.",
    upper_hypertrophy_hypertrophy_accumulation:
      "Upper-body hypertrophy and antagonist balance to complement pulling demands.",
    full_body_strength_max_strength:
      "Primary lower-body and full-body strength exposure for sport prep and muscle retention.",
    aerobic_builder_aerobic_base:
      "Aerobic base work to support endurance and recovery between strength sessions.",
    conditioning_only_aerobic_base:
      "Conditioning support; low impact on next-day strength.",
    resilience_recovery_mobility_recovery:
      "Low-fatigue resilience session to maintain joint health and manage weekly fatigue.",
    core_and_mobility_resilience_stability:
      "Core and mobility focus for stability and recovery.",
    core_and_mobility_mobility_recovery:
      "Mobility and recovery to support the rest of the week.",
    mixed_sport_support_sport_support_strength:
      "Mixed sport-support work; pulling and grip in a moderate session.",
    push_strength_hypertrophy_accumulation:
      "Push emphasis for balance and hypertrophy.",
    push_strength_max_strength:
      "Push strength focus for structural balance.",
  };

  const key = `${session_type}_${stimulus_profile}`;
  if (templates[key]) return templates[key];

  if (expected_fatigue === "low")
    return `Low-fatigue ${label ?? session_type} session to support recovery and maintain consistency.`;
  if (qualityNames)
    return `${label ?? session_type} emphasizing ${qualityNames}.`;
  return `${label ?? session_type} (${stimulus_profile.replace(/_/g, " ")}).`;
}

/** Generate a short weekly summary. */
export function generateWeeklySummary(
  plan: Pick<WeeklyPlan, "primary_goal" | "sports" | "sessions">,
  input: WeeklyPlanningInput
): string {
  const { primary_goal, sports, sessions } = plan;
  const goalLabel = primary_goal.replace(/_/g, " ");
  const sportLabel =
    sports.length > 0 ? ` while supporting ${sports.map((s) => s.replace(/_/g, " ")).join(" and ")}` : "";
  const highCount = sessions.filter((s) => s.expected_fatigue === "high").length;
  const lowCount = sessions.filter((s) => s.expected_fatigue === "low").length;
  const fatigueNote =
    highCount >= 2
      ? ` High-demand sessions are spaced to manage fatigue.`
      : "";
  const recoveryNote =
    lowCount >= 1
      ? ` A lower-fatigue day helps maintain consistency and recovery.`
      : "";
  return `This week emphasizes ${goalLabel}${sportLabel}, with ${sessions.length} sessions.${fatigueNote}${recoveryNote}`;
}
