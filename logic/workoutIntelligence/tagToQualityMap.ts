/**
 * Maps existing exercise tags (goal_tags, stimulus, sport_tags, etc.) to training qualities.
 * Used when an exercise has no rows in exercise_training_quality (e.g. stub data, or new
 * exercises not yet backfilled): derive training_quality_weights from tags. Primary source
 * for capability is the DB table; this is the fallback. One place to extend when adding tags.
 */

import type { TrainingQualitySlug } from "./trainingQualities";

/** Tag slug (from exercise tags) → training quality slug → weight (0–1). */
export const TAG_TO_QUALITY: Record<string, Partial<Record<TrainingQualitySlug, number>>> = {
  strength: { max_strength: 0.9, hypertrophy: 0.3 },
  hypertrophy: { hypertrophy: 0.95, max_strength: 0.35 },
  power: { power: 0.9, rate_of_force_development: 0.7 },
  endurance: { aerobic_base: 0.7, anaerobic_capacity: 0.5, muscular_endurance: 0.5 },
  conditioning: { work_capacity: 0.8, anaerobic_capacity: 0.6 },
  mobility: { mobility: 0.9, thoracic_mobility: 0.5, joint_stability: 0.4 },
  recovery: { recovery: 0.95, mobility: 0.4 },
  athleticism: { power: 0.5, rate_of_force_development: 0.5, balance: 0.4, coordination: 0.3 },
  calisthenics: { pushing_strength: 0.5, pulling_strength: 0.5, core_tension: 0.5 },
  eccentric: { eccentric_strength: 0.8 },
  isometric: { core_tension: 0.5, grip_strength: 0.4, joint_stability: 0.4 },
  plyometric: { power: 0.8, rate_of_force_development: 0.7, plyometric_ability: 0.9 },
  grip: { grip_strength: 0.85, forearm_endurance: 0.4 },
  scapular_control: { scapular_stability: 0.9 },
  trunk_anti_rotation: { trunk_anti_rotation: 0.9 },
  anti_flexion: { trunk_anti_flexion: 0.9 },
  aerobic_zone2: { aerobic_base: 0.85 },
  anaerobic: { anaerobic_capacity: 0.7 },
  energy_high: { anaerobic_capacity: 0.75, work_capacity: 0.55 },
  // Movement patterns (from generator)
  squat: { unilateral_strength: 0.3, quad_hypertrophy: 0.5 },
  hinge: { eccentric_strength: 0.5, posterior_chain_endurance: 0.3 },
  push: { pushing_strength: 0.85 },
  pull: { pulling_strength: 0.9, lat_hypertrophy: 0.5 },
  carry: { core_tension: 0.5, work_capacity: 0.3 },
  rotate: { rotational_power: 0.6, rotational_control: 0.5 },
  locomotion: { aerobic_base: 0.4, work_capacity: 0.4 },
  // Sport sub-focus tags (from data/sportSubFocus/subFocusTagMap) → training qualities
  zone2_cardio: { aerobic_base: 0.9 },
  aerobic_base: { aerobic_base: 0.9 },
  single_leg_strength: { unilateral_strength: 0.9, quad_hypertrophy: 0.4 },
  uphill_conditioning: { aerobic_base: 0.7, work_capacity: 0.6 },
  eccentric_quad_strength: { eccentric_strength: 0.85, quad_hypertrophy: 0.5 },
  glute_strength: { posterior_chain_endurance: 0.7, unilateral_strength: 0.3 },
  squat_pattern: { unilateral_strength: 0.3, quad_hypertrophy: 0.5 },
  hinge_pattern: { eccentric_strength: 0.5, posterior_chain_endurance: 0.3 },
  knee_stability: { joint_stability: 0.9, balance: 0.3 },
  core_anti_rotation: { trunk_anti_rotation: 0.95 },
  core_anti_extension: { trunk_anti_flexion: 0.9 },
  core_stability: { core_tension: 0.7, joint_stability: 0.6 },
  trunk_endurance: { trunk_endurance: 0.95 },
  posterior_chain: { posterior_chain_endurance: 0.85 },
  strength_endurance: { muscular_endurance: 0.85 },
  ankle_stability: { joint_stability: 0.8, balance: 0.5 },
  finger_strength: { grip_strength: 0.95, forearm_endurance: 0.4 },
  isometric_strength: { core_tension: 0.5, grip_strength: 0.5, joint_stability: 0.4 },
  vertical_pull: { pulling_strength: 0.9, lat_hypertrophy: 0.5 },
  shoulder_stability: { scapular_stability: 0.9, joint_stability: 0.6 },
  scapular_strength: { scapular_stability: 0.95 },
  explosive_power: { power: 0.9, rate_of_force_development: 0.85 },
  lats: { lat_hypertrophy: 0.8, pulling_strength: 0.6 },
  back: { pulling_strength: 0.7, lat_hypertrophy: 0.5 },
  lockoff_strength: { lockoff_strength: 0.95, core_tension: 0.5, grip_strength: 0.5 },
};

/** Build quality weight map from a list of tag slugs (e.g. from exercise tags). */
export function qualitiesFromTags(tagSlugs: string[]): Partial<Record<TrainingQualitySlug, number>> {
  const out: Partial<Record<TrainingQualitySlug, number>> = {};
  for (const tag of tagSlugs) {
    const normalized = tag.toLowerCase().replace(/\s/g, "_");
    const map = TAG_TO_QUALITY[normalized];
    if (!map) continue;
    for (const [q, w] of Object.entries(map)) {
      if (typeof w === "number")
        out[q as TrainingQualitySlug] = Math.max(out[q as TrainingQualitySlug] ?? 0, w);
    }
  }
  return out;
}
