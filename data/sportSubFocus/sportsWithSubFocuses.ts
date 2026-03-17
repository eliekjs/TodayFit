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
  {
    slug: "xc_skiing",
    name: "Cross-Country Skiing (Nordic)",
    category: "Mountain/Snow",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "double_pole_upper", name: "Double Pole / Upper", priority_weight: 2 },
      { slug: "leg_drive", name: "Leg Drive", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "durability", name: "Durability", priority_weight: 5 },
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
  {
    slug: "rock_trad",
    name: "Trad Climbing",
    category: "Climbing",
    sub_focuses: [
      { slug: "finger_strength", name: "Finger Strength", priority_weight: 1 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 2 },
      { slug: "lockoff_strength", name: "Lock-off Strength", priority_weight: 3 },
      { slug: "core_tension", name: "Core Tension", priority_weight: 4 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 5 },
      { slug: "trunk_endurance", name: "Trunk Endurance", priority_weight: 6 },
    ],
  },
  {
    slug: "ice_climbing",
    name: "Ice Climbing",
    category: "Climbing",
    sub_focuses: [
      { slug: "grip_endurance", name: "Grip & Forearm Endurance", priority_weight: 1 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 2 },
      { slug: "shoulder_stability", name: "Shoulder & Overhead", priority_weight: 3 },
      { slug: "core_tension", name: "Core Tension", priority_weight: 4 },
      { slug: "lockoff_strength", name: "Lock-off Strength", priority_weight: 5 },
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
    slug: "ultra_running",
    name: "Ultra Running",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "durability", name: "Durability", priority_weight: 2 },
      { slug: "leg_resilience", name: "Leg Resilience", priority_weight: 3 },
      { slug: "uphill_endurance", name: "Uphill Endurance", priority_weight: 4 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 5 },
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
    slug: "cycling_mtb",
    name: "Cycling (Mountain)",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "threshold", name: "Threshold", priority_weight: 2 },
      { slug: "power_endurance", name: "Power Endurance", priority_weight: 3 },
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
  {
    slug: "rucking",
    name: "Rucking",
    category: "Endurance",
    sub_focuses: [
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 1 },
      { slug: "load_carriage_durability", name: "Load Carriage & Durability", priority_weight: 2 },
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "ankle_stability", name: "Ankle Stability", priority_weight: 5 },
    ],
  },
  {
    slug: "ocr_spartan",
    name: "Spartan / OCR",
    category: "Endurance",
    sub_focuses: [
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 1 },
      { slug: "running_endurance", name: "Running Endurance", priority_weight: 2 },
      { slug: "grip_endurance", name: "Grip Endurance", priority_weight: 3 },
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 4 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 5 },
    ],
  },
  {
    slug: "tactical_fitness",
    name: "Tactical Fitness",
    category: "Endurance",
    sub_focuses: [
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 1 },
      { slug: "running_endurance", name: "Running Endurance", priority_weight: 2 },
      { slug: "strength_endurance", name: "Strength Endurance", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "durability", name: "Durability", priority_weight: 5 },
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
  {
    slug: "general_strength",
    name: "Powerlifting",
    category: "Strength/Power",
    sub_focuses: [
      { slug: "squat_strength", name: "Squat", priority_weight: 1 },
      { slug: "bench_strength", name: "Bench", priority_weight: 2 },
      { slug: "deadlift_strength", name: "Deadlift", priority_weight: 3 },
      { slug: "accessory_strength", name: "Accessory", priority_weight: 4 },
      { slug: "core_bracing", name: "Core & Bracing", priority_weight: 5 },
    ],
  },
  {
    slug: "bodybuilding",
    name: "Bodybuilding",
    category: "Strength/Power",
    sub_focuses: [
      { slug: "push_hypertrophy", name: "Push (Chest / Shoulders / Triceps)", priority_weight: 1 },
      { slug: "pull_hypertrophy", name: "Pull (Back / Biceps)", priority_weight: 2 },
      { slug: "legs_hypertrophy", name: "Legs", priority_weight: 3 },
      { slug: "arms_shoulders", name: "Arms & Shoulders", priority_weight: 4 },
      { slug: "core_physique", name: "Core & Physique", priority_weight: 5 },
    ],
  },
  {
    slug: "track_sprinting",
    name: "Track Sprinting",
    category: "Strength/Power",
    sub_focuses: [
      { slug: "acceleration_power", name: "Acceleration", priority_weight: 1 },
      { slug: "max_velocity", name: "Max Velocity", priority_weight: 2 },
      { slug: "plyometric_power", name: "Plyometrics", priority_weight: 3 },
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 4 },
      { slug: "hamstring_tendon_resilience", name: "Hamstring & Tendon Resilience", priority_weight: 5 },
    ],
  },
  {
    slug: "track_field",
    name: "Track & Field",
    category: "Strength/Power",
    sub_focuses: [
      { slug: "acceleration_power", name: "Acceleration", priority_weight: 1 },
      { slug: "max_velocity", name: "Max Velocity", priority_weight: 2 },
      { slug: "plyometric_power", name: "Plyometrics", priority_weight: 3 },
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 4 },
      { slug: "hamstring_tendon_resilience", name: "Hamstring & Tendon Resilience", priority_weight: 5 },
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
    slug: "kite_wind_surf",
    name: "Kitesurfing / Windsurfing",
    category: "Water",
    sub_focuses: [
      { slug: "balance", name: "Balance", priority_weight: 1 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 2 },
      { slug: "grip_endurance", name: "Grip Endurance", priority_weight: 3 },
      { slug: "leg_strength", name: "Leg Strength", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
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
  {
    slug: "swimming_open_water",
    name: "Swimming",
    category: "Water",
    sub_focuses: [
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 1 },
      { slug: "shoulder_scapular", name: "Shoulder & Scapular", priority_weight: 2 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 3 },
      { slug: "aerobic_base", name: "Aerobic Base", priority_weight: 4 },
      { slug: "leg_turn_power", name: "Leg / Turn Power", priority_weight: 5 },
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
    slug: "rugby",
    name: "Rugby",
    category: "Court/Field",
    sub_focuses: [
      { slug: "max_strength", name: "Max Strength", priority_weight: 1 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 2 },
      { slug: "posterior_chain", name: "Posterior Chain", priority_weight: 3 },
      { slug: "grip_endurance", name: "Grip & Durability", priority_weight: 4 },
      { slug: "speed_power", name: "Speed & Power", priority_weight: 5 },
    ],
  },
  {
    slug: "lacrosse",
    name: "Lacrosse",
    category: "Court/Field",
    sub_focuses: [
      { slug: "speed", name: "Speed", priority_weight: 1 },
      { slug: "change_of_direction", name: "Change of Direction", priority_weight: 2 },
      { slug: "rotational_power", name: "Rotational Power", priority_weight: 3 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
    ],
  },
  {
    slug: "boxing",
    name: "Boxing",
    category: "Combat/Grappling",
    sub_focuses: [
      { slug: "rotational_power", name: "Rotational Power", priority_weight: 1 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 2 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 3 },
      { slug: "leg_power", name: "Leg Power & Footwork", priority_weight: 4 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 5 },
    ],
  },
  {
    slug: "bjj",
    name: "Brazilian Jiu-Jitsu",
    category: "Combat/Grappling",
    sub_focuses: [
      { slug: "grip_endurance", name: "Grip & Endurance", priority_weight: 1 },
      { slug: "hip_stability", name: "Hip Stability & Mobility", priority_weight: 2 },
      { slug: "core_tension", name: "Core Tension", priority_weight: 3 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
    ],
  },
  {
    slug: "judo",
    name: "Judo",
    category: "Combat/Grappling",
    sub_focuses: [
      { slug: "grip_endurance", name: "Grip & Endurance", priority_weight: 1 },
      { slug: "hip_stability", name: "Hip Stability & Power", priority_weight: 2 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 3 },
      { slug: "explosive_power", name: "Explosive Power (throws)", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
    ],
  },
  {
    slug: "mma",
    name: "MMA",
    category: "Combat/Grappling",
    sub_focuses: [
      { slug: "grip_endurance", name: "Grip & Endurance", priority_weight: 1 },
      { slug: "hip_stability", name: "Hip Stability & Power", priority_weight: 2 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 3 },
      { slug: "explosive_power", name: "Explosive Power", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
    ],
  },
  {
    slug: "muay_thai",
    name: "Muay Thai",
    category: "Combat/Grappling",
    sub_focuses: [
      { slug: "rotational_power", name: "Rotational Power", priority_weight: 1 },
      { slug: "hip_stability", name: "Hip Stability & Kicks", priority_weight: 2 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "leg_power", name: "Leg Power", priority_weight: 5 },
    ],
  },
  {
    slug: "wrestling",
    name: "Wrestling",
    category: "Combat/Grappling",
    sub_focuses: [
      { slug: "grip_endurance", name: "Grip & Endurance", priority_weight: 1 },
      { slug: "hip_stability", name: "Hip Stability & Power", priority_weight: 2 },
      { slug: "pull_strength", name: "Pull Strength", priority_weight: 3 },
      { slug: "explosive_power", name: "Explosive Power", priority_weight: 4 },
      { slug: "work_capacity", name: "Work Capacity", priority_weight: 5 },
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
    slug: "pickleball",
    name: "Pickleball",
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
    slug: "badminton",
    name: "Badminton",
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
    slug: "squash",
    name: "Squash",
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
    slug: "hockey",
    name: "Hockey",
    category: "Court/Field",
    sub_focuses: [
      { slug: "speed", name: "Speed", priority_weight: 1 },
      { slug: "change_of_direction", name: "Change of Direction", priority_weight: 2 },
      { slug: "leg_power", name: "Leg Power", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
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
  {
    slug: "volleyball_indoor",
    name: "Volleyball (Indoor)",
    category: "Court/Field",
    sub_focuses: [
      { slug: "vertical_jump", name: "Vertical Jump", priority_weight: 1 },
      { slug: "landing_mechanics", name: "Landing Mechanics", priority_weight: 2 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "knee_resilience", name: "Knee Resilience", priority_weight: 5 },
    ],
  },
  {
    slug: "volleyball_beach",
    name: "Beach Volleyball",
    category: "Court/Field",
    sub_focuses: [
      { slug: "vertical_jump", name: "Vertical Jump", priority_weight: 1 },
      { slug: "landing_mechanics", name: "Landing Mechanics", priority_weight: 2 },
      { slug: "shoulder_stability", name: "Shoulder Stability", priority_weight: 3 },
      { slug: "core_stability", name: "Core Stability", priority_weight: 4 },
      { slug: "knee_resilience", name: "Knee Resilience", priority_weight: 5 },
    ],
  },

  // --- Vertical Jump / Dunk (standalone sport) ---
  {
    slug: "vertical_jump",
    name: "Vertical Jump / Dunk",
    category: "Strength/Power",
    sub_focuses: [
      { slug: "vertical_jump", name: "Explosive jump & plyometrics", priority_weight: 1 },
      { slug: "strength_foundation", name: "Strength foundation", priority_weight: 2 },
      { slug: "reactive_landing", name: "Reactive & landing", priority_weight: 3 },
    ],
  },

  // --- Golf ---
  {
    slug: "golf",
    name: "Golf",
    category: "Court/Field",
    sub_focuses: [
      { slug: "rotational_power", name: "Rotational power", priority_weight: 1 },
      { slug: "core_rotation", name: "Core & rotation", priority_weight: 2 },
      { slug: "thoracic_mobility", name: "Thoracic mobility", priority_weight: 3 },
      { slug: "hip_mobility_stability", name: "Hip mobility & stability", priority_weight: 4 },
      { slug: "core_stability", name: "Core stability", priority_weight: 5 },
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
