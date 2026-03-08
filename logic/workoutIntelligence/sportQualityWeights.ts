/**
 * Sport → training quality weights (0–1).
 * Used to build session target vector when user is training for a sport.
 * Slugs should align with public.sports / sport_tag_profile where applicable.
 */

import type { TrainingQualitySlug } from "./trainingQualities";

export type SportSlug =
  | "rock_bouldering"
  | "rock_sport_lead"
  | "rock_trad"
  | "backcountry_skiing"
  | "alpine_skiing"
  | "surfing"
  | "hyrox"
  | "road_running"
  | "trail_running"
  | "rowing_erg"
  | "vertical_jump"
  | "olympic_weightlifting"
  | "crossfit"
  | "bjj"
  | "soccer"
  | "basketball"
  | "tennis"
  | "golf";

/** Weights per quality for each sport. Only non-zero entries; 0–1 scale. */
export const SPORT_QUALITY_WEIGHTS: Record<
  SportSlug,
  Partial<Record<TrainingQualitySlug, number>>
> = {
  rock_bouldering: {
    pulling_strength: 0.9,
    grip_strength: 0.9,
    lockoff_strength: 0.85,
    scapular_stability: 0.8,
    core_tension: 0.75,
    forearm_endurance: 0.5,
    power: 0.5,
    tendon_resilience: 0.5,
  },
  rock_sport_lead: {
    pulling_strength: 0.85,
    grip_strength: 0.9,
    forearm_endurance: 0.8,
    scapular_stability: 0.8,
    core_tension: 0.7,
    aerobic_base: 0.35,
    anaerobic_capacity: 0.4,
  },
  rock_trad: {
    pulling_strength: 0.8,
    grip_strength: 0.85,
    forearm_endurance: 0.75,
    scapular_stability: 0.75,
    aerobic_base: 0.4,
    trunk_endurance: 0.4,
  },
  backcountry_skiing: {
    aerobic_base: 0.85,
    eccentric_strength: 0.8,
    unilateral_strength: 0.8,
    hip_stability: 0.75,
    trunk_endurance: 0.7,
    quad_hypertrophy: 0.5,
    posterior_chain_endurance: 0.5,
  },
  alpine_skiing: {
    eccentric_strength: 0.85,
    unilateral_strength: 0.75,
    hip_stability: 0.75,
    quad_hypertrophy: 0.6,
    trunk_anti_rotation: 0.5,
    balance: 0.5,
  },
  surfing: {
    paddling_endurance: 0.85,
    thoracic_mobility: 0.75,
    pop_up_power: 0.8,
    balance: 0.8,
    rotational_control: 0.6,
    core_tension: 0.6,
    pushing_strength: 0.4,
  },
  hyrox: {
    aerobic_power: 0.85,
    lactate_tolerance: 0.8,
    work_capacity: 0.9,
    trunk_endurance: 0.7,
    posterior_chain_endurance: 0.6,
    pushing_strength: 0.4,
    pulling_strength: 0.4,
  },
  road_running: {
    aerobic_base: 0.9,
    aerobic_power: 0.5,
    posterior_chain_endurance: 0.4,
    tendon_resilience: 0.5,
    recovery: 0.35,
  },
  trail_running: {
    aerobic_base: 0.75,
    unilateral_strength: 0.6,
    balance: 0.6,
    eccentric_strength: 0.5,
    hip_stability: 0.5,
  },
  rowing_erg: {
    aerobic_base: 0.7,
    aerobic_power: 0.5,
    posterior_chain_endurance: 0.7,
    trunk_endurance: 0.6,
    pulling_strength: 0.5,
  },
  vertical_jump: {
    power: 0.9,
    rate_of_force_development: 0.85,
    tendon_resilience: 0.6,
    unilateral_strength: 0.5,
    balance: 0.4,
  },
  olympic_weightlifting: {
    power: 0.9,
    rate_of_force_development: 0.9,
    max_strength: 0.7,
    mobility: 0.5,
    thoracic_mobility: 0.5,
  },
  crossfit: {
    work_capacity: 0.85,
    max_strength: 0.6,
    power: 0.6,
    aerobic_power: 0.5,
    pulling_strength: 0.5,
    pushing_strength: 0.5,
  },
  bjj: {
    grip_strength: 0.7,
    hip_stability: 0.7,
    core_tension: 0.65,
    mobility: 0.5,
    work_capacity: 0.5,
    anaerobic_capacity: 0.5,
  },
  soccer: {
    aerobic_base: 0.7,
    anaerobic_capacity: 0.65,
    unilateral_strength: 0.5,
    hip_stability: 0.5,
    rate_of_force_development: 0.4,
  },
  basketball: {
    power: 0.7,
    rate_of_force_development: 0.6,
    balance: 0.5,
    unilateral_strength: 0.4,
    aerobic_base: 0.35,
  },
  tennis: {
    rotational_power: 0.8,
    rotational_control: 0.7,
    scapular_stability: 0.6,
    work_capacity: 0.5,
    unilateral_strength: 0.4,
  },
  golf: {
    rotational_power: 0.85,
    rotational_control: 0.8,
    thoracic_mobility: 0.7,
    hip_stability: 0.5,
    mobility: 0.5,
  },
};

export function getSportQualityWeights(sportSlug: string): Partial<Record<TrainingQualitySlug, number>> {
  const normalized = sportSlug.toLowerCase().replace(/\s/g, "_") as SportSlug;
  return SPORT_QUALITY_WEIGHTS[normalized] ?? {};
}
