/**
 * Phase 3: Session type layer.
 * Session type = general identity of the session (what is being trained).
 * Stimulus profile = intended training effect (how / what adaptation).
 * Relationship: one session type can pair with one or more stimulus profiles.
 */

import type { SessionType, SessionTypeSlug } from "./types";
import type { StimulusProfileSlug } from "./types";

export const SESSION_TYPES: Record<SessionTypeSlug, SessionType> = {
  full_body_strength: {
    slug: "full_body_strength",
    name: "Full body strength",
    default_stimulus_profile: "max_strength",
    valid_stimulus_profiles: ["max_strength", "hypertrophy_accumulation", "mixed_performance"],
  },
  upper_hypertrophy: {
    slug: "upper_hypertrophy",
    name: "Upper hypertrophy",
    default_stimulus_profile: "hypertrophy_accumulation",
    valid_stimulus_profiles: ["hypertrophy_accumulation", "muscular_endurance"],
  },
  lower_hypertrophy: {
    slug: "lower_hypertrophy",
    name: "Lower hypertrophy",
    default_stimulus_profile: "hypertrophy_accumulation",
    valid_stimulus_profiles: ["hypertrophy_accumulation", "muscular_endurance"],
  },
  pull_strength: {
    slug: "pull_strength",
    name: "Pull strength",
    default_stimulus_profile: "max_strength",
    valid_stimulus_profiles: ["max_strength", "hypertrophy_accumulation", "sport_support_strength"],
  },
  push_strength: {
    slug: "push_strength",
    name: "Push strength",
    default_stimulus_profile: "max_strength",
    valid_stimulus_profiles: ["max_strength", "hypertrophy_accumulation", "sport_support_strength"],
  },
  lower_power: {
    slug: "lower_power",
    name: "Lower power",
    default_stimulus_profile: "power_speed",
    valid_stimulus_profiles: ["power_speed"],
  },
  mixed_sport_support: {
    slug: "mixed_sport_support",
    name: "Mixed sport support",
    default_stimulus_profile: "sport_support_strength",
    valid_stimulus_profiles: ["sport_support_strength", "mixed_performance", "resilience_stability"],
  },
  conditioning_only: {
    slug: "conditioning_only",
    name: "Conditioning only",
    default_stimulus_profile: "aerobic_base",
    valid_stimulus_profiles: ["aerobic_base", "anaerobic_conditioning", "mixed_performance"],
  },
  resilience_recovery: {
    slug: "resilience_recovery",
    name: "Resilience / recovery",
    default_stimulus_profile: "mobility_recovery",
    valid_stimulus_profiles: ["resilience_stability", "mobility_recovery"],
  },
  core_and_mobility: {
    slug: "core_and_mobility",
    name: "Core and mobility",
    default_stimulus_profile: "mobility_recovery",
    valid_stimulus_profiles: ["mobility_recovery", "resilience_stability"],
  },
  aerobic_builder: {
    slug: "aerobic_builder",
    name: "Aerobic builder",
    default_stimulus_profile: "aerobic_base",
    valid_stimulus_profiles: ["aerobic_base", "anaerobic_conditioning"],
  },
};

export const SESSION_TYPE_SLUGS: SessionTypeSlug[] = Object.keys(
  SESSION_TYPES
) as SessionTypeSlug[];

export function getSessionType(slug: SessionTypeSlug): SessionType {
  const t = SESSION_TYPES[slug];
  if (!t) throw new Error(`Unknown session type: ${slug}`);
  return t;
}

/** Resolve stimulus profile for a session type (use default or validate override). */
export function resolveStimulusForSessionType(
  sessionType: SessionTypeSlug,
  stimulusOverride?: StimulusProfileSlug
): StimulusProfileSlug {
  const st = getSessionType(sessionType);
  if (stimulusOverride && st.valid_stimulus_profiles?.includes(stimulusOverride)) {
    return stimulusOverride;
  }
  return st.default_stimulus_profile;
}
