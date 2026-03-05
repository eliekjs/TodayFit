/**
 * Expanded exercise tag taxonomy for sport sub-focus matching.
 * Tags here should exist in public.exercise_tags (or be added via migration).
 * Includes movement patterns, strength qualities, athletic attributes,
 * joint/stability, and climbing-specific tags.
 */

import type { ExerciseTagTaxonomyEntry } from "./types";

/** Tags that may need to be added if not already in exercise_tags. */
export const SPORT_SUBFOCUS_EXERCISE_TAGS: ExerciseTagTaxonomyEntry[] = [
  // --- Movement patterns (align with existing where possible) ---
  { slug: "squat_pattern", tag_type: "movement_pattern", display_name: "Squat pattern", description: "Knee-dominant lower body" },
  { slug: "hinge_pattern", tag_type: "movement_pattern", display_name: "Hinge pattern", description: "Hip-dominant posterior chain" },
  { slug: "vertical_pull", tag_type: "movement_pattern", display_name: "Vertical pull" },
  { slug: "horizontal_pull", tag_type: "movement_pattern", display_name: "Horizontal pull" },
  { slug: "vertical_push", tag_type: "movement_pattern", display_name: "Vertical push" },
  { slug: "horizontal_push", tag_type: "movement_pattern", display_name: "Horizontal push" },
  { slug: "carry", tag_type: "movement_pattern", display_name: "Carry" },
  { slug: "rotation", tag_type: "movement_pattern", display_name: "Rotation" },
  { slug: "anti_rotation", tag_type: "movement_pattern", display_name: "Anti-rotation" },
  { slug: "anti_extension", tag_type: "movement_pattern", display_name: "Anti-extension" },
  { slug: "anti_lateral_flexion", tag_type: "movement_pattern", display_name: "Anti-lateral flexion" },

  // --- Strength qualities ---
  { slug: "max_strength", tag_type: "strength_quality", display_name: "Max strength" },
  { slug: "hypertrophy", tag_type: "strength_quality", display_name: "Hypertrophy" },
  { slug: "strength_endurance", tag_type: "strength_quality", display_name: "Strength endurance" },
  { slug: "isometric_strength", tag_type: "strength_quality", display_name: "Isometric strength" },
  { slug: "explosive_power", tag_type: "strength_quality", display_name: "Explosive power" },
  { slug: "reactive_power", tag_type: "strength_quality", display_name: "Reactive power" },
  { slug: "eccentric_strength", tag_type: "strength_quality", display_name: "Eccentric strength" },

  // --- Athletic attributes ---
  { slug: "speed", tag_type: "athletic_attribute", display_name: "Speed" },
  { slug: "agility", tag_type: "athletic_attribute", display_name: "Agility" },
  { slug: "balance", tag_type: "athletic_attribute", display_name: "Balance" },
  { slug: "coordination", tag_type: "athletic_attribute", display_name: "Coordination" },
  { slug: "work_capacity", tag_type: "athletic_attribute", display_name: "Work capacity" },
  { slug: "aerobic_base", tag_type: "athletic_attribute", display_name: "Aerobic base" },
  { slug: "anaerobic_capacity", tag_type: "athletic_attribute", display_name: "Anaerobic capacity" },

  // --- Joint / injury considerations ---
  { slug: "shoulder_stability", tag_type: "joint_stability", display_name: "Shoulder stability" },
  { slug: "scapular_control", tag_type: "joint_stability", display_name: "Scapular control" },
  { slug: "knee_stability", tag_type: "joint_stability", display_name: "Knee stability" },
  { slug: "ankle_stability", tag_type: "joint_stability", display_name: "Ankle stability" },
  { slug: "hip_stability", tag_type: "joint_stability", display_name: "Hip stability" },
  { slug: "core_bracing", tag_type: "joint_stability", display_name: "Core bracing" },
  { slug: "core_anti_extension", tag_type: "joint_stability", display_name: "Core anti-extension" },
  { slug: "core_anti_rotation", tag_type: "joint_stability", display_name: "Core anti-rotation" },

  // --- Climbing-specific ---
  { slug: "finger_strength", tag_type: "climbing", display_name: "Finger strength" },
  { slug: "grip_endurance", tag_type: "climbing", display_name: "Grip endurance" },
  { slug: "lockoff_strength", tag_type: "climbing", display_name: "Lock-off strength" },
  { slug: "pulling_strength", tag_type: "climbing", display_name: "Pulling strength" },
  { slug: "scapular_strength", tag_type: "climbing", display_name: "Scapular strength" },

  // --- Energy / cardio (for generator bias) ---
  { slug: "zone2_cardio", tag_type: "energy_system", display_name: "Zone 2 cardio" },
  { slug: "zone3_cardio", tag_type: "energy_system", display_name: "Zone 3 / tempo" },
  { slug: "lactate_threshold", tag_type: "energy_system", display_name: "Lactate threshold" },

  // --- General (often already exist) ---
  { slug: "single_leg_strength", tag_type: "general", display_name: "Single-leg strength" },
  { slug: "eccentric_quad_strength", tag_type: "general", display_name: "Eccentric quad strength" },
  { slug: "glute_strength", tag_type: "general", display_name: "Glute strength" },
  { slug: "sled_strength", tag_type: "general", display_name: "Sled / push" },
];

/** Slugs of tags that are new recommendations (add to exercise_tags if missing). */
export const NEW_TAGS_TO_ADD: string[] = [
  "zone2_cardio",
  "zone3_cardio",
  "lactate_threshold",
  "finger_strength",
  "grip_endurance",
  "lockoff_strength",
  "pulling_strength",
  "scapular_strength",
  "work_capacity",
  "core_bracing",
  "core_anti_extension",
  "eccentric_quad_strength",
  "single_leg_strength",
  "knee_stability",
  "ankle_stability",
  "sled_strength",
  "anti_lateral_flexion",
  "reactive_power",
  "eccentric_strength",
  "coordination",
];
