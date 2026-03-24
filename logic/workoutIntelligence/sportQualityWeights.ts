/**
 * Sport → training quality weights (0–1).
 * Used to build session target vector when user is training for a sport.
 * Slugs align with consolidated sports (see data/sportSubFocus/canonicalSportSlug for legacy mapping).
 */

import type { TrainingQualitySlug } from "./trainingQualities";
import { getCanonicalSportSlug } from "../../data/sportSubFocus";

export type SportSlug =
  | "rock_climbing"
  | "backcountry_skiing"
  | "alpine_skiing"
  | "snowboarding"
  | "surfing"
  | "kite_wind_surf"
  | "hyrox"
  | "road_running"
  | "american_football"
  | "trail_running"
  | "cycling"
  | "swimming_open_water"
  | "triathlon"
  | "xc_skiing"
  | "rowing_erg"
  | "track_sprinting"
  | "vertical_jump"
  | "olympic_weightlifting"
  | "crossfit"
  | "grappling"
  | "soccer"
  | "basketball"
  | "court_racquet"
  | "hockey"
  | "rugby"
  | "volleyball"
  | "lacrosse"
  | "boxing"
  | "muay_thai"
  | "golf"
  | "hiking_backpacking"
  | "mountaineering"
  | "ocr_spartan"
  | "tactical_fitness"
  | "general_strength"
  | "bodybuilding"
  | "strongman";

/** Weights per quality for each sport. Only non-zero entries; 0–1 scale. */
export const SPORT_QUALITY_WEIGHTS: Record<
  SportSlug,
  Partial<Record<TrainingQualitySlug, number>>
> = {
  rock_climbing: {
    pulling_strength: 0.88,
    grip_strength: 0.9,
    lockoff_strength: 0.85,
    scapular_stability: 0.8,
    core_tension: 0.72,
    forearm_endurance: 0.65,
    power: 0.5,
    tendon_resilience: 0.5,
    aerobic_base: 0.35,
    anaerobic_capacity: 0.35,
    trunk_endurance: 0.35,
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
  snowboarding: {
    eccentric_strength: 0.8,
    unilateral_strength: 0.7,
    hip_stability: 0.7,
    balance: 0.75,
    core_tension: 0.5,
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
  kite_wind_surf: {
    balance: 0.85,
    core_tension: 0.75,
    grip_strength: 0.7,
    work_capacity: 0.6,
    unilateral_strength: 0.55,
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
    aerobic_base: 0.95,
    aerobic_power: 0.48,
    posterior_chain_endurance: 0.48,
    tendon_resilience: 0.58,
    trunk_endurance: 0.42,
    recovery: 0.35,
  },
  american_football: {
    max_strength: 0.85,
    work_capacity: 0.82,
    anaerobic_capacity: 0.72,
    rate_of_force_development: 0.7,
    unilateral_strength: 0.55,
    hip_stability: 0.55,
    posterior_chain_endurance: 0.6,
    grip_strength: 0.55,
    trunk_endurance: 0.55,
  },
  cycling: {
    aerobic_base: 0.88,
    aerobic_power: 0.52,
    posterior_chain_endurance: 0.6,
    trunk_endurance: 0.5,
    core_tension: 0.55,
    unilateral_strength: 0.45,
    max_strength: 0.38,
    balance: 0.35,
    recovery: 0.3,
  },
  swimming_open_water: {
    pulling_strength: 0.85,
    scapular_stability: 0.85,
    core_tension: 0.7,
    trunk_endurance: 0.5,
    aerobic_base: 0.5,
    pushing_strength: 0.35,
    power: 0.3,
    recovery: 0.3,
  },
  triathlon: {
    aerobic_base: 0.9,
    aerobic_power: 0.5,
    pulling_strength: 0.6,
    scapular_stability: 0.6,
    core_tension: 0.7,
    trunk_endurance: 0.6,
    posterior_chain_endurance: 0.5,
    unilateral_strength: 0.4,
    recovery: 0.35,
  },
  xc_skiing: {
    aerobic_base: 0.9,
    aerobic_power: 0.5,
    pulling_strength: 0.65,
    core_tension: 0.7,
    trunk_endurance: 0.65,
    posterior_chain_endurance: 0.55,
    unilateral_strength: 0.5,
    max_strength: 0.4,
    recovery: 0.3,
  },
  trail_running: {
    aerobic_base: 0.75,
    unilateral_strength: 0.6,
    balance: 0.6,
    eccentric_strength: 0.5,
    hip_stability: 0.5,
  },
  hiking_backpacking: {
    aerobic_base: 0.85,
    unilateral_strength: 0.6,
    posterior_chain_endurance: 0.5,
    trunk_endurance: 0.5,
    core_tension: 0.45,
    balance: 0.45,
    max_strength: 0.35,
    recovery: 0.3,
  },
  mountaineering: {
    aerobic_base: 0.85,
    unilateral_strength: 0.65,
    posterior_chain_endurance: 0.5,
    trunk_endurance: 0.55,
    core_tension: 0.5,
    balance: 0.45,
    max_strength: 0.4,
    recovery: 0.3,
  },
  ocr_spartan: {
    aerobic_base: 0.75,
    aerobic_power: 0.7,
    work_capacity: 0.85,
    grip_strength: 0.7,
    posterior_chain_endurance: 0.5,
    trunk_endurance: 0.5,
    pulling_strength: 0.45,
    max_strength: 0.35,
    recovery: 0.3,
  },
  tactical_fitness: {
    aerobic_base: 0.75,
    aerobic_power: 0.7,
    work_capacity: 0.85,
    pushing_strength: 0.5,
    pulling_strength: 0.5,
    posterior_chain_endurance: 0.45,
    trunk_endurance: 0.5,
    core_tension: 0.5,
    recovery: 0.35,
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
  general_strength: {
    max_strength: 0.95,
    pushing_strength: 0.7,
    pulling_strength: 0.6,
    posterior_chain_endurance: 0.4,
    core_tension: 0.5,
    recovery: 0.35,
  },
  bodybuilding: {
    hypertrophy: 0.95,
    pushing_strength: 0.6,
    pulling_strength: 0.6,
    core_tension: 0.4,
    recovery: 0.4,
  },
  track_sprinting: {
    power: 0.9,
    rate_of_force_development: 0.85,
    tendon_resilience: 0.6,
    max_strength: 0.5,
    unilateral_strength: 0.45,
  },
  strongman: {
    max_strength: 0.9,
    power: 0.7,
    grip_strength: 0.75,
    posterior_chain_endurance: 0.5,
    work_capacity: 0.7,
    core_tension: 0.6,
  },
  grappling: {
    grip_strength: 0.8,
    hip_stability: 0.75,
    core_tension: 0.6,
    mobility: 0.5,
    work_capacity: 0.7,
    anaerobic_capacity: 0.6,
    pulling_strength: 0.65,
    power: 0.65,
    rate_of_force_development: 0.6,
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
  court_racquet: {
    rotational_power: 0.78,
    rotational_control: 0.7,
    scapular_stability: 0.64,
    work_capacity: 0.55,
    unilateral_strength: 0.45,
    balance: 0.4,
  },
  hockey: {
    power: 0.8,
    work_capacity: 0.7,
    unilateral_strength: 0.6,
    core_tension: 0.55,
    scapular_stability: 0.4,
  },
  rugby: {
    max_strength: 0.85,
    work_capacity: 0.8,
    posterior_chain_endurance: 0.6,
    trunk_endurance: 0.6,
    power: 0.6,
    grip_strength: 0.5,
    pushing_strength: 0.5,
    pulling_strength: 0.5,
    rate_of_force_development: 0.65,
    unilateral_strength: 0.55,
  },
  volleyball: {
    power: 0.75,
    rate_of_force_development: 0.65,
    scapular_stability: 0.6,
    balance: 0.5,
    unilateral_strength: 0.45,
    core_tension: 0.4,
    work_capacity: 0.35,
  },
  lacrosse: {
    rotational_power: 0.75,
    rotational_control: 0.65,
    rate_of_force_development: 0.65,
    scapular_stability: 0.6,
    work_capacity: 0.55,
    unilateral_strength: 0.5,
  },
  boxing: {
    rotational_power: 0.8,
    power: 0.75,
    work_capacity: 0.75,
    rate_of_force_development: 0.65,
    scapular_stability: 0.6,
    core_tension: 0.55,
  },
  muay_thai: {
    rotational_power: 0.8,
    hip_stability: 0.75,
    power: 0.7,
    work_capacity: 0.8,
    rate_of_force_development: 0.65,
    core_tension: 0.6,
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
  const canonical = getCanonicalSportSlug(sportSlug);
  const normalized = canonical.toLowerCase().replace(/\s/g, "_") as SportSlug;
  return SPORT_QUALITY_WEIGHTS[normalized] ?? {};
}
