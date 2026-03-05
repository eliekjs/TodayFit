/**
 * Sports with 3–6 sub-focus options each. Sub-focuses represent the main
 * physical attributes to improve for that sport. Used by Sports Prep to let
 * users pick what to train for and to bias exercise selection via tag mapping.
 */

import type { SportWithSubFocuses } from "./types";

/** Sport slugs align with public.sports (20250301000007) where possible. */
export const SPORTS_WITH_SUB_FOCUSES: SportWithSubFocuses[] = [
  // --- Mountain / Snow ---
  {
    slug: "backcountry_skiing",
    name: "Backcountry Skiing",
    category: "Mountain/Snow",
    sub_focuses: [
      { slug: "uphill_endurance", name: "Uphill Endurance", priority_weight: 1 },
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 2 },
      { slug: "downhill_stability", name: "Downhill Stability", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "knee_resilience", name: "Knee Resilience", priority_weight: 5 },
    ],
  },
  {
    slug: "alpine_skiing",
    name: "Downhill Skiing",
    category: "Mountain/Snow",
    sub_focuses: [
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 1 },
      { slug: "eccentric_control", name: "Eccentric Control", priority_weight: 2 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 3 },
      { slug: "knee_resilience", name: "Knee Resilience", priority_weight: 4 },
      { slug: "ankle_stability", name: "Ankle Stability", priority_weight: 5 },
    ],
  },
  {
    slug: "snowboarding",
    name: "Snowboarding",
    category: "Mountain/Snow",
    sub_focuses: [
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 1 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 2 },
      { slug: "balance", name: "Balance", priority_weight: 3 },
      { slug: "lateral_stability", name: "Lateral Stability", priority_weight: 4 },
      { slug: "knee_resilience", name: "Knee Resilience", priority_weight: 5 },
    ],
  },

  // --- Climbing ---
  {
    slug: "rock_sport_lead",
    name: "Rock Climbing",
    category: "Climbing",
    sub_focuses: [
      { slug: "finger_strength", name: "Finger Strength", priority_weight: 1 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 2 },
      { slug: "lockoff_strength", name: "Lock-off Strength", priority_weight: 3 },
      { slug: "core_tension", name: "Core Tension", priority_weight: 4 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 5 },
      { slug: "power_dynamic", name: "Power / Dynamic Movement", priority_weight: 6 },
    ],
  },
  {
    slug: "rock_bouldering",
    name: "Bouldering",
    category: "Climbing",
    sub_focuses: [
      { slug: "finger_strength", name: "Finger Strength", priority_weight: 1 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 2 },
      { slug: "lockoff_strength", name: "Lock-off Strength", priority_weight: 3 },
      { slug: "core_tension", name: "Core Tension", priority_weight: 4 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 5 },
      { slug: "power_dynamic", name: "Power / Dynamic Movement", priority_weight: 6 },
    ],
  },

  // --- Endurance ---
  {
    slug: "road_running",
    name: "Road Running",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "threshold", name: "Threshold", priority_weight: 2 },
      { slug: "speed_endurance", name: "Speed Endurance", priority_weight: 3 },
      { slug: "running_economy", name: "Running Economy", priority_weight: 4 },
      { slug: "leg_resilience", name: "Leg Resilience", priority_weight: 5 },
    ],
  },
  {
    slug: "trail_running",
    name: "Trail Running",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "uphill_endurance", name: "Uphill Endurance", priority_weight: 2 },
      { slug: "downhill_control", name: "Downhill Control", priority_weight: 3 },
      { slug: "ankle_stability", name: "Ankle Stability", priority_weight: 4 },
      { slug: "terrain_adaptability", name: "Terrain Adaptability", priority_weight: 5 },
    ],
  },
  {
    slug: "marathon_running",
    name: "Marathon Running",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "threshold", name: "Threshold", priority_weight: 2 },
      { slug: "marathon_pace", name: "Marathon Pace", priority_weight: 3 },
      { slug: "durability", name: "Durability", priority_weight: 4 },
      { slug: "leg_resilience", name: "Leg Resilience", priority_weight: 5 },
    ],
  },
  {
    slug: "cycling_road",
    name: "Cycling",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "threshold", name: "Threshold", priority_weight: 2 },
      { slug: "vo2_intervals", name: "VO2 Intervals", priority_weight: 3 },
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 4 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 5 },
    ],
  },
  {
    slug: "triathlon",
    name: "Triathlon",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "threshold", name: "Threshold", priority_weight: 2 },
      { slug: "swim_specific", name: "Swim-Specific", priority_weight: 3 },
      { slug: "bike_run_durability", name: "Bike-Run Durability", priority_weight: 4 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 5 },
    ],
  },

  // --- Hybrid / Fitness ---
  {
    slug: "hyrox",
    name: "Hyrox",
    category: "Hybrid/Fitness",
    sub_focuses: [
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 1 },
      { slug: "running_endurance", name: "Running Endurance", priority_weight: 2 },
      { slug: "lower_body_power", name: "Lower Body Power", priority_weight: 3 },
      { slug: "grip_endurance", name: "Grip Endurance", priority_weight: 4 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 5 },
    ],
  },
  {
    slug: "crossfit",
    name: "CrossFit",
    category: "Hybrid/Fitness",
    sub_focuses: [
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 1 },
      { slug: "strength", name: "Strength", priority_weight: 2 },
      { slug: "power", name: "Power", priority_weight: 3 },
      { slug: "gymnastics_skill", name: "Gymnastics Skill", priority_weight: 4 },
      { slug: "engine", name: "Engine", priority_weight: 5 },
    ],
  },

  // --- Water ---
  {
    slug: "surfing",
    name: "Surfing",
    category: "Water",
    sub_focuses: [
      { slug: "paddle_endurance", name: "Paddle Endurance", priority_weight: 1 },
      { slug: "pop_up_power", name: "Pop-up Power", priority_weight: 2 },
      { slug: "core_rotation", name: "Core & Rotation", priority_weight: 3 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 4 },
      { slug: "balance", name: "Balance", priority_weight: 5 },
    ],
  },
  {
    slug: "sup",
    name: "Paddleboarding",
    category: "Water",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 2 },
      { slug: "balance", name: "Balance", priority_weight: 3 },
      { slug: "shoulder_endurance", name: "Shoulder Endurance", priority_weight: 4 },
    ],
  },
  {
    slug: "rowing_erg",
    name: "Rowing",
    category: "Water",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "threshold", name: "Threshold", priority_weight: 2 },
      { slug: "posterior_chain", name: "Posterior Chain", priority_weight: 3 },
      { slug: "core_bracing", name: "Core Bracing", priority_weight: 4 },
      { slug: "grip_endurance", name: "Grip Endurance", priority_weight: 5 },
    ],
  },

  // --- Field / Court ---
  {
    slug: "soccer",
    name: "Soccer",
    category: "Court/Field",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "speed", name: "Speed", priority_weight: 2 },
      { slug: "change_of_direction", name: "Change of Direction", priority_weight: 3 },
      { slug: "hamstring_resilience", name: "Hamstring Resilience", priority_weight: 4 },
      { slug: "leg_power", name: "Leg Power", priority_weight: 5 },
    ],
  },
  {
    slug: "tennis",
    name: "Tennis",
    category: "Court/Field",
    sub_focuses: [
      { slug: "lateral_speed", name: "Lateral Speed", priority_weight: 1 },
      { slug: "rotational_power", name: "Rotational Power", priority_weight: 2 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 3 },
      { slug: "core_rotation", name: "Core & Rotation", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
    ],
  },
  {
    slug: "basketball",
    name: "Basketball",
    category: "Court/Field",
    sub_focuses: [
      { slug: "vertical_jump", name: "Vertical Jump", priority_weight: 1 },
      { slug: "lateral_speed", name: "Lateral Speed", priority_weight: 2 },
      { slug: "change_of_direction", name: "Change of Direction", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "landing_mechanics", name: "Landing Mechanics", priority_weight: 5 },
    ],
  },

  // --- Strength / Power ---
  {
    slug: "olympic_weightlifting",
    name: "Olympic Weightlifting",
    category: "Strength/Power",
    sub_focuses: [
      { slug: "explosive_power", name: "Explosive Power", priority_weight: 1 },
      { slug: "overhead_stability", name: "Overhead Stability", priority_weight: 2 },
      { slug: "mobility", name: "Mobility (ankles, hips, t-spine)", priority_weight: 3 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 4 },
      { slug: "core_bracing", name: "Core Bracing", priority_weight: 5 },
    ],
  },
  {
    slug: "powerbuilding",
    name: "Powerbuilding",
    category: "Strength/Power",
    sub_focuses: [
      { slug: "max_strength", name: "Max Strength", priority_weight: 1 },
      { slug: "hypertrophy", name: "Hypertrophy", priority_weight: 2 },
      { slug: "squat_hinge", name: "Squat & Hinge", priority_weight: 3 },
      { slug: "press_pull", name: "Press & Pull", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
    ],
  },
];
