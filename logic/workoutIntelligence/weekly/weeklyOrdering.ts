/**
 * Phase 6: Order session intents across the week.
 * Assigns each intent to a day_index respecting preferred days, energy, duration, and load rules.
 */

import type { EnergyLevel } from "../types";
import type {
  WeeklyPlanningInput,
  WeeklySessionIntent,
  WeeklyPlannedSession,
  DownstreamGenerationInput,
  WeeklyLoadState,
} from "./weeklyTypes";
import type { WeeklyPlannerConfig } from "./weeklyTypes";
import {
  createEmptyLoadState,
  applySessionToLoadState,
  wouldViolateLoadRule,
  satisfiesStimulusDistribution,
} from "./weeklyLoadBalancing";

export interface OrderingContext {
  input: WeeklyPlanningInput;
  intents: WeeklySessionIntent[];
  config: WeeklyPlannerConfig;
}

/** Score a (dayIndex, intent) placement: higher = better. */
function placementScore(
  dayIndex: number,
  intent: WeeklySessionIntent,
  input: WeeklyPlanningInput,
  loadState: WeeklyLoadState,
  config: WeeklyPlannerConfig
): number {
  const preferred = input.preferred_training_days ?? [];
  const energyByDay = input.energy_profile_by_day ?? {};
  const durationByDay = input.session_duration_by_day ?? {};
  const energy = energyByDay[dayIndex] ?? "medium";
  const duration = durationByDay[dayIndex] ?? input.default_session_duration;

  let score = 0;
  if (preferred.length && preferred.includes(dayIndex)) score += 20;
  if (energy === "high" && intent.suggested_fatigue_tier === "high") score += 15;
  if (energy === "high" && intent.priority <= 2) score += 10;
  if (energy === "low" && intent.suggested_fatigue_tier === "low") score += 12;
  if (energy === "low" && intent.suggested_fatigue_tier === "high") score -= 10;
  if (Math.abs(duration - intent.suggested_duration_minutes) <= 15) score += 5;
  const violation = wouldViolateLoadRule(loadState, dayIndex, intent, config);
  if (violation.violate) score -= 100;
  return score;
}

/**
 * Order intents into planned sessions with day indices.
 * Uses a greedy approach: for each intent (by priority), pick the best remaining day that doesn't violate rules.
 */
export function orderSessionsAcrossWeek(
  input: WeeklyPlanningInput,
  intents: WeeklySessionIntent[],
  config: WeeklyPlannerConfig
): Omit<WeeklyPlannedSession, "rationale" | "downstream_generation_input">[] {
  const daysAvailable = input.days_available_per_week;
  const preferred = input.preferred_training_days ?? [];
  const dayCandidates =
    preferred.length > 0
      ? preferred.filter((d) => d >= 0 && d < daysAvailable)
      : Array.from({ length: daysAvailable }, (_, i) => i);

  if (dayCandidates.length === 0) {
    for (let i = 0; i < daysAvailable; i++) dayCandidates.push(i);
  }

  const usedDays = new Set<number>();
  let loadState = createEmptyLoadState();
  const ordered: (WeeklySessionIntent & { day_index: number })[] = [];

  // Sort intents by priority (1 first), then by fatigue (high first so we place them on good days)
  const sortedIntents = [...intents].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const tierOrder = { high: 0, moderate: 1, low: 2 };
    return tierOrder[a.suggested_fatigue_tier] - tierOrder[b.suggested_fatigue_tier];
  });

  for (const intent of sortedIntents) {
    const availableDays = dayCandidates.filter((d) => !usedDays.has(d));
    if (availableDays.length === 0) break;

    let bestDay = availableDays[0];
    let bestScore = -Infinity;
    for (const d of availableDays) {
      const score = placementScore(d, intent, input, loadState, config);
      if (score > bestScore) {
        bestScore = score;
        bestDay = d;
      }
    }
    if (bestScore < -50) {
      // All placements violate; pick first available to avoid infinite loop
      bestDay = availableDays[0];
    }
    usedDays.add(bestDay);
    ordered.push({ ...intent, day_index: bestDay });
    loadState = applySessionToLoadState(loadState, bestDay, intent);
  }

  const withDay = ordered.map((o) => ({
    day_index: o.day_index,
    label: o.label ?? `${o.session_type} / ${o.stimulus_profile}`,
    session_type: o.session_type,
    stimulus_profile: o.stimulus_profile,
    priority: o.priority,
    target_qualities: o.target_qualities,
    planned_duration_minutes:
      input.session_duration_by_day?.[o.day_index] ?? o.suggested_duration_minutes,
    expected_fatigue: o.suggested_fatigue_tier,
    load_hints: o.load_hints,
  }));

  const distributionCheck = satisfiesStimulusDistribution(
    withDay.map((s) => ({ day_index: s.day_index, suggested_fatigue_tier: s.expected_fatigue })),
    config
  );
  if (!distributionCheck.ok && withDay.length >= 2) {
    // Simple swap: try to separate two consecutive high-fatigue days
    const sortedByDay = [...withDay].sort((a, b) => a.day_index - b.day_index);
    for (let i = 0; i < sortedByDay.length - 1; i++) {
      if (
        sortedByDay[i].expected_fatigue === "high" &&
        sortedByDay[i + 1].expected_fatigue === "high" &&
        sortedByDay[i + 1].day_index === sortedByDay[i].day_index + 1
      ) {
        const lowDay = sortedByDay.find((s) => s.expected_fatigue === "low");
        if (lowDay) {
          const swapIdx = withDay.findIndex(
            (s) => s.day_index === lowDay.day_index && s.priority === lowDay.priority
          );
          const highIdx = withDay.findIndex(
            (s) => s.day_index === sortedByDay[i + 1].day_index
          );
          if (swapIdx >= 0 && highIdx >= 0) {
            const d1 = withDay[swapIdx].day_index;
            withDay[swapIdx].day_index = withDay[highIdx].day_index;
            withDay[highIdx].day_index = d1;
          }
        }
        break;
      }
    }
  }

  return withDay;
}

/**
 * Build downstream generation input for one planned session.
 */
export function buildDownstreamInput(
  input: WeeklyPlanningInput,
  planned: Omit<WeeklyPlannedSession, "rationale" | "downstream_generation_input"> & {
    planned_duration_minutes: number;
    load_hints?: import("./weeklyTypes").StructuralLoadCategory[];
  }
): DownstreamGenerationInput {
  const equipment =
    input.equipment_by_day?.[planned.day_index] ?? input.available_equipment;
  const energy: EnergyLevel =
    input.energy_profile_by_day?.[planned.day_index] ?? "medium";
  return {
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals,
    tertiary_goals: input.tertiary_goals,
    sports: input.sports,
    preferred_session_type: planned.session_type,
    preferred_stimulus_profile: planned.stimulus_profile,
    target_training_qualities:
      Object.keys(planned.target_qualities).length > 0
        ? planned.target_qualities
        : undefined,
    available_equipment: equipment,
    duration_minutes: planned.planned_duration_minutes,
    energy_level: energy,
    injuries_or_limitations: input.injuries_or_limitations,
  };
}
