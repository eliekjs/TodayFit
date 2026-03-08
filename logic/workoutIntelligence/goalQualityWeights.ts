/**
 * Goal → training quality weights (0–1).
 * Used to build session target vector from user's primary/secondary/tertiary goals.
 * Goals can be general (hypertrophy, strength) or sport slugs (climbing, skiing).
 */

import type { TrainingQualitySlug } from "./trainingQualities";

export type GoalSlug =
  | "strength"
  | "power"
  | "hypertrophy"
  | "body_recomp"
  | "endurance"
  | "conditioning"
  | "mobility"
  | "recovery"
  | "athletic_performance"
  | "calisthenics"
  | "physique"
  | "resilience"
  | "climbing"
  | "ski"
  | "running";

/** Weights per quality for each goal. Only non-zero entries; 0–1 scale. */
export const GOAL_QUALITY_WEIGHTS: Record<
  GoalSlug,
  Partial<Record<TrainingQualitySlug, number>>
> = {
  strength: {
    max_strength: 0.95,
    hypertrophy: 0.25,
    pulling_strength: 0.6,
    pushing_strength: 0.6,
    unilateral_strength: 0.4,
    eccentric_strength: 0.35,
    core_tension: 0.4,
    hip_stability: 0.35,
  },
  power: {
    power: 0.95,
    rate_of_force_development: 0.85,
    max_strength: 0.5,
    tendon_resilience: 0.4,
    balance: 0.3,
  },
  hypertrophy: {
    hypertrophy: 0.9,
    max_strength: 0.4,
    pulling_strength: 0.55,
    pushing_strength: 0.55,
    unilateral_strength: 0.4,
    eccentric_strength: 0.5,
    core_tension: 0.35,
    lat_hypertrophy: 0.5,
    quad_hypertrophy: 0.5,
  },
  body_recomp: {
    hypertrophy: 0.7,
    aerobic_base: 0.5,
    max_strength: 0.35,
    pulling_strength: 0.45,
    pushing_strength: 0.45,
    work_capacity: 0.4,
  },
  endurance: {
    aerobic_base: 0.9,
    anaerobic_capacity: 0.4,
    posterior_chain_endurance: 0.4,
    trunk_endurance: 0.35,
    recovery: 0.3,
  },
  conditioning: {
    work_capacity: 0.85,
    anaerobic_capacity: 0.7,
    aerobic_power: 0.5,
    lactate_tolerance: 0.5,
  },
  mobility: {
    mobility: 0.95,
    thoracic_mobility: 0.7,
    hip_stability: 0.5,
    recovery: 0.5,
  },
  recovery: {
    recovery: 0.95,
    mobility: 0.6,
    thoracic_mobility: 0.4,
  },
  athletic_performance: {
    power: 0.7,
    rate_of_force_development: 0.6,
    max_strength: 0.5,
    balance: 0.4,
    unilateral_strength: 0.4,
  },
  calisthenics: {
    pushing_strength: 0.6,
    pulling_strength: 0.6,
    core_tension: 0.6,
    hypertrophy: 0.4,
    balance: 0.35,
  },
  physique: {
    hypertrophy: 0.85,
    max_strength: 0.35,
    pulling_strength: 0.5,
    pushing_strength: 0.5,
    aerobic_base: 0.25,
  },
  resilience: {
    scapular_stability: 0.6,
    core_tension: 0.6,
    trunk_anti_rotation: 0.6,
    mobility: 0.5,
    recovery: 0.5,
    hip_stability: 0.5,
  },
  // Sport-as-goal aliases (when user picks "Climbing" as secondary goal)
  climbing: {
    pulling_strength: 0.9,
    grip_strength: 0.85,
    lockoff_strength: 0.8,
    scapular_stability: 0.8,
    core_tension: 0.7,
    forearm_endurance: 0.5,
  },
  ski: {
    aerobic_base: 0.6,
    eccentric_strength: 0.8,
    unilateral_strength: 0.75,
    hip_stability: 0.75,
    trunk_endurance: 0.6,
  },
  running: {
    aerobic_base: 0.9,
    posterior_chain_endurance: 0.4,
    tendon_resilience: 0.5,
  },
};

export function getGoalQualityWeights(goalSlug: string): Partial<Record<TrainingQualitySlug, number>> {
  const normalized = goalSlug.toLowerCase().replace(/\s/g, "_") as GoalSlug;
  return GOAL_QUALITY_WEIGHTS[normalized] ?? {};
}
