/**
 * Phase 3: Stimulus profile system.
 * Classifies session by intended adaptation (what type of training effect), not just body part or sport.
 * Used to select session template and block structure before filling with exercises.
 */

import type { StimulusProfile, StimulusProfileSlug } from "./types";
import type { BlockType } from "./types";

/** All stimulus profile definitions: adaptation target, fatigue, style, block sequence. */
export const STIMULUS_PROFILES: Record<StimulusProfileSlug, StimulusProfile> = {
  max_strength: {
    slug: "max_strength",
    name: "Max strength",
    adaptation_target: "Peak force; neural and structural strength",
    expected_fatigue: "high",
    exercise_style: "Low exercise count, compound priority, high neural demand",
    prescription_style_primary: "heavy_strength",
    appropriate_block_sequence: ["warmup", "prep", "main_strength", "accessory", "core", "cooldown"],
    format_hints: { main_strength: "straight_sets", accessory: "straight_sets" },
  },
  hypertrophy_accumulation: {
    slug: "hypertrophy_accumulation",
    name: "Hypertrophy accumulation",
    adaptation_target: "Muscle size; metabolic and mechanical load",
    expected_fatigue: "high",
    exercise_style: "Moderate-to-high volume, more accessory density, supersets often appropriate",
    prescription_style_primary: "moderate_hypertrophy",
    appropriate_block_sequence: ["warmup", "main_hypertrophy", "accessory", "core", "cooldown"],
    format_hints: { main_hypertrophy: "superset", accessory: "superset" },
  },
  power_speed: {
    slug: "power_speed",
    name: "Power / speed",
    adaptation_target: "Rate of force development; explosiveness",
    expected_fatigue: "low",
    exercise_style: "Low fatigue tolerance, low reps, explosive intent, high quality only",
    prescription_style_primary: "explosive_power",
    appropriate_block_sequence: ["warmup", "prep", "power", "accessory", "cooldown"],
    format_hints: { power: "straight_sets" },
  },
  muscular_endurance: {
    slug: "muscular_endurance",
    name: "Muscular endurance",
    adaptation_target: "Sustained force; rep capacity",
    expected_fatigue: "moderate",
    exercise_style: "Higher reps, shorter rest, density focus",
    prescription_style_primary: "density_accessory",
    appropriate_block_sequence: ["warmup", "main_hypertrophy", "accessory", "cooldown"],
  },
  aerobic_base: {
    slug: "aerobic_base",
    name: "Aerobic base",
    adaptation_target: "Zone 2; aerobic capacity",
    expected_fatigue: "moderate",
    exercise_style: "Sustained low-intensity; steady state or easy intervals",
    prescription_style_primary: "aerobic_steady",
    appropriate_block_sequence: ["prep", "conditioning", "mobility", "cooldown"],
  },
  anaerobic_conditioning: {
    slug: "anaerobic_conditioning",
    name: "Anaerobic conditioning",
    adaptation_target: "Lactate tolerance; work capacity",
    expected_fatigue: "high",
    exercise_style: "Intervals; high intensity, structured rest",
    prescription_style_primary: "anaerobic_intervals",
    appropriate_block_sequence: ["prep", "conditioning", "cooldown"],
  },
  sport_support_strength: {
    slug: "sport_support_strength",
    name: "Sport support strength",
    adaptation_target: "Sport-specific strength and stability",
    expected_fatigue: "moderate",
    exercise_style: "Mixed: compound + accessory; avoid excessive fatigue for sport",
    prescription_style_primary: "moderate_hypertrophy",
    appropriate_block_sequence: ["warmup", "main_strength", "accessory", "conditioning", "cooldown"],
    format_hints: { main_strength: "straight_sets", accessory: "circuit" },
  },
  resilience_stability: {
    slug: "resilience_stability",
    name: "Resilience / stability",
    adaptation_target: "Joint stability; injury resilience; work capacity without overload",
    expected_fatigue: "low",
    exercise_style: "Controlled; stability and accessory; avoid heavy neural load",
    prescription_style_primary: "controlled_resilience",
    appropriate_block_sequence: ["prep", "accessory", "core", "mobility", "cooldown"],
  },
  mobility_recovery: {
    slug: "mobility_recovery",
    name: "Mobility / recovery",
    adaptation_target: "Range of motion; restoration",
    expected_fatigue: "low",
    exercise_style: "Low intensity; mobility and light movement",
    prescription_style_primary: "mobility_flow",
    appropriate_block_sequence: ["prep", "mobility", "recovery", "cooldown"],
  },
  mixed_performance: {
    slug: "mixed_performance",
    name: "Mixed performance",
    adaptation_target: "Multiple qualities in one session; general fitness",
    expected_fatigue: "moderate",
    exercise_style: "Strength + conditioning or mixed blocks; balanced",
    prescription_style_primary: "moderate_hypertrophy",
    appropriate_block_sequence: ["warmup", "main_strength", "conditioning", "core", "cooldown"],
  },
};

export const STIMULUS_PROFILE_SLUGS: StimulusProfileSlug[] = Object.keys(
  STIMULUS_PROFILES
) as StimulusProfileSlug[];

export function getStimulusProfile(slug: StimulusProfileSlug): StimulusProfile {
  const p = STIMULUS_PROFILES[slug];
  if (!p) throw new Error(`Unknown stimulus profile: ${slug}`);
  return p;
}

/** Block sequence for a stimulus profile (ordered list of block types). */
export function getBlockSequenceForStimulus(slug: StimulusProfileSlug): BlockType[] {
  return getStimulusProfile(slug).appropriate_block_sequence;
}
