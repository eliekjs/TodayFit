/**
 * Phase 6: Convert weekly demand profile + days available into a list of session intents.
 * Each intent specifies session_type, stimulus_profile, priority, target qualities, duration, fatigue tier.
 */

import type { TrainingQualitySlug } from "../trainingQualities";
import type { SessionTypeSlug, StimulusProfileSlug } from "../types";
import type {
  WeeklyPlanningInput,
  WeeklyDemandProfile,
  WeeklySessionIntent,
  FatigueTier,
  StructuralLoadCategory,
} from "./weeklyTypes";
import {
  hasClimbingDemand,
  hasLowerEccentricDemand,
  isPrimaryHypertrophy,
} from "./weeklyDemandResolution";
import { getStimulusProfile } from "../stimulusProfiles";

/** Map stimulus profile slug to expected fatigue tier. */
function stimulusToFatigueTier(slug: StimulusProfileSlug): FatigueTier {
  const p = getStimulusProfile(slug);
  return p.expected_fatigue as FatigueTier;
}

/** Load hints for a session type + stimulus (for structural balancing). */
function loadHintsForSession(
  sessionType: SessionTypeSlug,
  stimulus: StimulusProfileSlug
): StructuralLoadCategory[] {
  const hints: StructuralLoadCategory[] = [];
  if (
    sessionType === "pull_strength" ||
    sessionType === "mixed_sport_support"
  ) {
    hints.push("grip_intensive", "shoulder_load");
  }
  if (
    sessionType === "lower_hypertrophy" ||
    sessionType === "lower_power" ||
    sessionType === "full_body_strength"
  ) {
    hints.push("lumbar_load", "knee_dominant_high", "heavy_compound");
  }
  if (sessionType === "lower_power") hints.push("plyometric_impact");
  if (sessionType === "push_strength" || sessionType === "upper_hypertrophy") {
    hints.push("shoulder_load");
  }
  return hints;
}

/** Default duration for a session type (can be overridden by day). */
const DEFAULT_DURATION_BY_FOCUS: Record<string, number> = {
  strength: 50,
  hypertrophy: 55,
  power: 40,
  conditioning: 45,
  resilience: 35,
  aerobic: 45,
};

/**
 * Allocate weekly session intents from demand profile and input.
 * Uses demand profile to decide session mix; applies variation seed for light rotation.
 */
export function allocateWeeklySessions(
  input: WeeklyPlanningInput,
  demand: WeeklyDemandProfile
): WeeklySessionIntent[] {
  const days = input.days_available_per_week;
  const defaultDuration = input.default_session_duration;
  const isHypertrophy = isPrimaryHypertrophy(input);
  const climbing = hasClimbingDemand(demand);
  const lowerEccentric = hasLowerEccentricDemand(demand);
  const weekHash = hashForVariation(input.variation_seed ?? 0);

  if (climbing && isHypertrophy && days >= 5) {
    return allocateClimbingHypertrophy5(
      demand,
      defaultDuration,
      days,
      weekHash
    );
  }
  if (climbing && isHypertrophy && days === 4) {
    return allocateClimbingHypertrophy4(
      demand,
      defaultDuration,
      weekHash
    );
  }
  if (lowerEccentric && isHypertrophy && days >= 4) {
    return allocateSkiHypertrophy4(
      demand,
      defaultDuration,
      days,
      weekHash
    );
  }
  if (isHypertrophy && days >= 4) {
    return allocateGeneralHypertrophy(
      demand,
      defaultDuration,
      days,
      weekHash
    );
  }
  // Fallback: balanced mix by days
  return allocateBalancedFallback(demand, defaultDuration, days, weekHash);
}

/** Climbing + hypertrophy, 5 days: pull/sport, lower hyp or power, upper hyp, aerobic or conditioning, resilience. */
function allocateClimbingHypertrophy5(
  demand: WeeklyDemandProfile,
  defaultDuration: number,
  days: number,
  weekHash: number
): WeeklySessionIntent[] {
  const intents: WeeklySessionIntent[] = [];
  const pick = (a: { type: SessionTypeSlug; stimulus: StimulusProfileSlug }[], i: number) =>
    a[i % a.length];

  // 1. Pull strength / sport support (climbing-specific)
  intents.push({
    session_type: "pull_strength",
    stimulus_profile: "sport_support_strength",
    priority: 1,
    target_qualities: {
      pulling_strength: 0.9,
      grip_strength: 0.85,
      scapular_stability: 0.7,
      lockoff_strength: 0.6,
    },
    suggested_duration_minutes: defaultDuration,
    suggested_fatigue_tier: stimulusToFatigueTier("sport_support_strength"),
    label: "Pull / sport support",
    load_hints: loadHintsForSession("pull_strength", "sport_support_strength"),
  });

  // 2. Lower hypertrophy or lower power (rotate by week)
  const lowerOptions = [
    { type: "lower_hypertrophy" as SessionTypeSlug, stimulus: "hypertrophy_accumulation" as StimulusProfileSlug },
    { type: "lower_power" as SessionTypeSlug, stimulus: "power_speed" as StimulusProfileSlug },
  ];
  const lowerChoice = pick(lowerOptions, weekHash);
  intents.push({
    session_type: lowerChoice.type,
    stimulus_profile: lowerChoice.stimulus,
    priority: 2,
    target_qualities:
      lowerChoice.type === "lower_hypertrophy"
        ? { hypertrophy: 0.85, quad_hypertrophy: 0.6 }
        : { power: 0.8, rate_of_force_development: 0.7 },
    suggested_duration_minutes: defaultDuration,
    suggested_fatigue_tier: stimulusToFatigueTier(lowerChoice.stimulus),
    label: lowerChoice.type === "lower_hypertrophy" ? "Lower hypertrophy" : "Lower power",
    load_hints: loadHintsForSession(lowerChoice.type, lowerChoice.stimulus),
  });

  // 3. Upper hypertrophy / antagonist balance
  intents.push({
    session_type: "upper_hypertrophy",
    stimulus_profile: "hypertrophy_accumulation",
    priority: 3,
    target_qualities: {
      hypertrophy: 0.85,
      pushing_strength: 0.6,
      pulling_strength: 0.4,
    },
    suggested_duration_minutes: defaultDuration,
    suggested_fatigue_tier: "high",
    label: "Upper hypertrophy / balance",
    load_hints: loadHintsForSession("upper_hypertrophy", "hypertrophy_accumulation"),
  });

  // 4. Aerobic or conditioning (rotate)
  const cardioOptions = [
    { type: "aerobic_builder" as SessionTypeSlug, stimulus: "aerobic_base" as StimulusProfileSlug },
    { type: "conditioning_only" as SessionTypeSlug, stimulus: "aerobic_base" as StimulusProfileSlug },
  ];
  const cardioChoice = pick(cardioOptions, weekHash + 1);
  intents.push({
    session_type: cardioChoice.type,
    stimulus_profile: cardioChoice.stimulus,
    priority: 4,
    target_qualities: { aerobic_base: 0.8 },
    suggested_duration_minutes: Math.min(defaultDuration, 50),
    suggested_fatigue_tier: "moderate",
    label: "Aerobic / conditioning",
    load_hints: [],
  });

  // 5. Resilience / mobility or mixed support (bridge)
  const bridgeOptions = [
    { type: "resilience_recovery" as SessionTypeSlug, stimulus: "mobility_recovery" as StimulusProfileSlug },
    { type: "core_and_mobility" as SessionTypeSlug, stimulus: "resilience_stability" as StimulusProfileSlug },
  ];
  const bridgeChoice = pick(bridgeOptions, weekHash + 2);
  intents.push({
    session_type: bridgeChoice.type,
    stimulus_profile: bridgeChoice.stimulus,
    priority: 5,
    target_qualities: { mobility: 0.7, joint_stability: 0.6, recovery: 0.5 },
    suggested_duration_minutes: Math.min(defaultDuration, 40),
    suggested_fatigue_tier: "low",
    label: "Resilience / mobility",
    load_hints: [],
  });

  return intents.slice(0, days);
}

/** Climbing + hypertrophy, 4 days: fewer sessions, still pull + upper + lower + bridge/cardio. */
function allocateClimbingHypertrophy4(
  demand: WeeklyDemandProfile,
  defaultDuration: number,
  weekHash: number
): WeeklySessionIntent[] {
  return [
    {
      session_type: "pull_strength",
      stimulus_profile: "sport_support_strength",
      priority: 1,
      target_qualities: {
        pulling_strength: 0.9,
        grip_strength: 0.85,
        scapular_stability: 0.7,
      },
      suggested_duration_minutes: defaultDuration,
      suggested_fatigue_tier: "moderate",
      label: "Pull / sport support",
      load_hints: loadHintsForSession("pull_strength", "sport_support_strength"),
    },
    {
      session_type: "lower_hypertrophy",
      stimulus_profile: "hypertrophy_accumulation",
      priority: 2,
      target_qualities: { hypertrophy: 0.85, quad_hypertrophy: 0.6 },
      suggested_duration_minutes: defaultDuration,
      suggested_fatigue_tier: "high",
      label: "Lower hypertrophy",
      load_hints: loadHintsForSession("lower_hypertrophy", "hypertrophy_accumulation"),
    },
    {
      session_type: "upper_hypertrophy",
      stimulus_profile: "hypertrophy_accumulation",
      priority: 3,
      target_qualities: { hypertrophy: 0.85, pushing_strength: 0.6 },
      suggested_duration_minutes: defaultDuration,
      suggested_fatigue_tier: "high",
      label: "Upper hypertrophy",
      load_hints: loadHintsForSession("upper_hypertrophy", "hypertrophy_accumulation"),
    },
    {
      session_type: weekHash % 2 === 0 ? "aerobic_builder" : "resilience_recovery",
      stimulus_profile: weekHash % 2 === 0 ? "aerobic_base" : "mobility_recovery",
      priority: 4,
      target_qualities:
        weekHash % 2 === 0
          ? { aerobic_base: 0.8 }
          : { mobility: 0.7, recovery: 0.5 },
      suggested_duration_minutes: Math.min(defaultDuration, 45),
      suggested_fatigue_tier: "low",
      label: weekHash % 2 === 0 ? "Aerobic" : "Resilience / recovery",
      load_hints: [],
    },
  ];
}

/** Ski + hypertrophy, 4 days: lower strength, lower power/eccentric, upper hypertrophy, aerobic. */
function allocateSkiHypertrophy4(
  demand: WeeklyDemandProfile,
  defaultDuration: number,
  days: number,
  weekHash: number
): WeeklySessionIntent[] {
  const intents: WeeklySessionIntent[] = [
    {
      session_type: "full_body_strength",
      stimulus_profile: "max_strength",
      priority: 1,
      target_qualities: {
        max_strength: 0.7,
        eccentric_strength: 0.7,
        unilateral_strength: 0.6,
        hip_stability: 0.6,
      },
      suggested_duration_minutes: defaultDuration,
      suggested_fatigue_tier: "high",
      label: "Lower-body strength (ski support)",
      load_hints: loadHintsForSession("full_body_strength", "max_strength"),
    },
    {
      session_type: "lower_power",
      stimulus_profile: "power_speed",
      priority: 2,
      target_qualities: {
        power: 0.8,
        eccentric_strength: 0.6,
        unilateral_strength: 0.5,
      },
      suggested_duration_minutes: Math.min(defaultDuration, 45),
      suggested_fatigue_tier: "low",
      label: "Lower power / eccentric",
      load_hints: loadHintsForSession("lower_power", "power_speed"),
    },
    {
      session_type: "upper_hypertrophy",
      stimulus_profile: "hypertrophy_accumulation",
      priority: 3,
      target_qualities: { hypertrophy: 0.85, pushing_strength: 0.5 },
      suggested_duration_minutes: defaultDuration,
      suggested_fatigue_tier: "high",
      label: "Upper hypertrophy / balance",
      load_hints: loadHintsForSession("upper_hypertrophy", "hypertrophy_accumulation"),
    },
    {
      session_type: "aerobic_builder",
      stimulus_profile: "aerobic_base",
      priority: 4,
      target_qualities: { aerobic_base: 0.8, posterior_chain_endurance: 0.5 },
      suggested_duration_minutes: Math.min(defaultDuration, 50),
      suggested_fatigue_tier: "moderate",
      label: "Aerobic base",
      load_hints: [],
    },
  ];
  return intents.slice(0, days);
}

/** General hypertrophy + athleticism, 4–5 days: stimulus-based, not rigid bro split. */
function allocateGeneralHypertrophy(
  demand: WeeklyDemandProfile,
  defaultDuration: number,
  days: number,
  weekHash: number
): WeeklySessionIntent[] {
  const intents: WeeklySessionIntent[] = [];
  // Upper, lower, full or push/pull, conditioning or resilience
  intents.push({
    session_type: "upper_hypertrophy",
    stimulus_profile: "hypertrophy_accumulation",
    priority: 1,
    target_qualities: { hypertrophy: 0.9, pushing_strength: 0.6, pulling_strength: 0.6 },
    suggested_duration_minutes: defaultDuration,
    suggested_fatigue_tier: "high",
    label: "Upper hypertrophy",
    load_hints: loadHintsForSession("upper_hypertrophy", "hypertrophy_accumulation"),
  });
  intents.push({
    session_type: "lower_hypertrophy",
    stimulus_profile: "hypertrophy_accumulation",
    priority: 2,
    target_qualities: { hypertrophy: 0.9, quad_hypertrophy: 0.6 },
    suggested_duration_minutes: defaultDuration,
    suggested_fatigue_tier: "high",
    label: "Lower hypertrophy",
    load_hints: loadHintsForSession("lower_hypertrophy", "hypertrophy_accumulation"),
  });
  if (days >= 3) {
    const thirdOptions = [
      { type: "full_body_strength" as SessionTypeSlug, stimulus: "hypertrophy_accumulation" as StimulusProfileSlug },
      { type: "push_strength" as SessionTypeSlug, stimulus: "hypertrophy_accumulation" as StimulusProfileSlug },
      { type: "pull_strength" as SessionTypeSlug, stimulus: "hypertrophy_accumulation" as StimulusProfileSlug },
    ];
    const third = thirdOptions[weekHash % thirdOptions.length];
    intents.push({
      session_type: third.type,
      stimulus_profile: third.stimulus,
      priority: 3,
      target_qualities: { hypertrophy: 0.85, max_strength: 0.5 },
      suggested_duration_minutes: defaultDuration,
      suggested_fatigue_tier: "high",
      label: third.type === "full_body_strength" ? "Full body" : third.type === "push_strength" ? "Push" : "Pull",
      load_hints: loadHintsForSession(third.type, third.stimulus),
    });
  }
  if (days >= 4) {
    intents.push({
      session_type: weekHash % 2 === 0 ? "aerobic_builder" : "resilience_recovery",
      stimulus_profile: weekHash % 2 === 0 ? "aerobic_base" : "mobility_recovery",
      priority: 4,
      target_qualities:
        weekHash % 2 === 0 ? { aerobic_base: 0.8 } : { mobility: 0.7, recovery: 0.5 },
      suggested_duration_minutes: Math.min(defaultDuration, 45),
      suggested_fatigue_tier: "low",
      label: weekHash % 2 === 0 ? "Aerobic" : "Resilience",
      load_hints: [],
    });
  }
  if (days >= 5) {
    intents.push({
      session_type: "core_and_mobility",
      stimulus_profile: "resilience_stability",
      priority: 5,
      target_qualities: { core_tension: 0.7, mobility: 0.6 },
      suggested_duration_minutes: Math.min(defaultDuration, 35),
      suggested_fatigue_tier: "low",
      label: "Core / mobility",
      load_hints: [],
    });
  }
  return intents.slice(0, days);
}

/** Fallback: balanced mix by number of days. */
function allocateBalancedFallback(
  demand: WeeklyDemandProfile,
  defaultDuration: number,
  days: number,
  weekHash: number
): WeeklySessionIntent[] {
  const templates: { type: SessionTypeSlug; stimulus: StimulusProfileSlug; label: string }[] = [
    { type: "full_body_strength", stimulus: "max_strength", label: "Full body strength" },
    { type: "upper_hypertrophy", stimulus: "hypertrophy_accumulation", label: "Upper hypertrophy" },
    { type: "lower_hypertrophy", stimulus: "hypertrophy_accumulation", label: "Lower hypertrophy" },
    { type: "aerobic_builder", stimulus: "aerobic_base", label: "Aerobic" },
    { type: "resilience_recovery", stimulus: "mobility_recovery", label: "Resilience" },
  ];
  return templates.slice(0, days).map((t, i) => ({
    session_type: t.type,
    stimulus_profile: t.stimulus,
    priority: i + 1,
    target_qualities: {},
    suggested_duration_minutes: defaultDuration,
    suggested_fatigue_tier: stimulusToFatigueTier(t.stimulus),
    label: t.label,
    load_hints: loadHintsForSession(t.type, t.stimulus),
  }));
}

function hashForVariation(seed: string | number): number {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
