/**
 * Mapping: sport sub-focus → exercise tags (with optional weight for scoring).
 * Composite key: "sport_slug:sub_focus_slug". Used by the workout generator to
 * increase probability of exercises with matching tags.
 */

import type { SubFocusTagMap } from "./types";

function key(sport: string, subFocus: string): string {
  return `${sport}:${subFocus}`;
}

/** Sub-focus → exercise tag slugs (and optional weight, default 1). */
export const SUB_FOCUS_TAG_MAP: SubFocusTagMap = {
  // --- Backcountry Skiing ---
  [key("backcountry_skiing", "uphill_endurance")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "uphill_conditioning", weight: 1 },
  ],
  [key("backcountry_skiing", "leg_strength")]: [
    { tag_slug: "single_leg_strength", weight: 1.2 },
    { tag_slug: "eccentric_quad_strength", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "hinge_pattern", weight: 1 },
  ],
  [key("backcountry_skiing", "downhill_stability")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1.2 },
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "balance", weight: 1 },
  ],
  [key("backcountry_skiing", "core_stability")]: [
    { tag_slug: "core_anti_rotation", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("backcountry_skiing", "knee_resilience")]: [
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "eccentric_quad_strength", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],

  // --- Alpine (Downhill) Skiing ---
  [key("alpine_skiing", "leg_strength")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("alpine_skiing", "eccentric_control")]: [
    { tag_slug: "eccentric_strength", weight: 1.2 },
    { tag_slug: "eccentric_quad_strength", weight: 1 },
  ],
  [key("alpine_skiing", "core_stability")]: [
    { tag_slug: "core_anti_rotation", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("alpine_skiing", "knee_resilience")]: [
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "eccentric_quad_strength", weight: 1 },
  ],
  [key("alpine_skiing", "ankle_stability")]: [
    { tag_slug: "ankle_stability", weight: 1.2 },
    { tag_slug: "balance", weight: 1 },
  ],

  // --- Snowboarding ---
  [key("snowboarding", "leg_strength")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1 },
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("snowboarding", "core_stability")]: [
    { tag_slug: "core_anti_rotation", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("snowboarding", "balance")]: [
    { tag_slug: "balance", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("snowboarding", "lateral_stability")]: [
    { tag_slug: "core_anti_rotation", weight: 1.2 },
    { tag_slug: "hip_stability", weight: 1 },
  ],
  [key("snowboarding", "knee_resilience")]: [
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "eccentric_quad_strength", weight: 1 },
  ],

  // --- Cross-Country Skiing (Nordic) ---
  [key("xc_skiing", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("xc_skiing", "double_pole_upper")]: [
    { tag_slug: "pulling_strength", weight: 1.3 },
    { tag_slug: "trunk_endurance", weight: 1.1 },
    { tag_slug: "core_anti_extension", weight: 1.1 },
    { tag_slug: "lats", weight: 1 },
    { tag_slug: "back", weight: 0.9 },
  ],
  [key("xc_skiing", "leg_drive")]: [
    { tag_slug: "single_leg_strength", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1.1 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "hinge_pattern", weight: 1 },
  ],
  [key("xc_skiing", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("xc_skiing", "durability")]: [
    { tag_slug: "strength_endurance", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
  ],

  // --- Rock Climbing (bouldering, sport/lead, trad combined) ---
  [key("rock_climbing", "strength_power")]: [
    { tag_slug: "finger_strength", weight: 1.2 },
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "lockoff_strength", weight: 1.1 },
    { tag_slug: "explosive_power", weight: 1.1 },
    { tag_slug: "power", weight: 1 },
  ],
  [key("rock_climbing", "endurance_stamina")]: [
    { tag_slug: "grip_endurance", weight: 1.2 },
    { tag_slug: "forearm_endurance", weight: 1.1 },
    { tag_slug: "trunk_endurance", weight: 1.1 },
    { tag_slug: "strength_endurance", weight: 1 },
    { tag_slug: "aerobic_base", weight: 0.85 },
  ],
  [key("rock_climbing", "finger_strength")]: [
    { tag_slug: "finger_strength", weight: 1.3 },
    { tag_slug: "grip", weight: 1 },
    { tag_slug: "isometric_strength", weight: 0.9 },
  ],
  [key("rock_climbing", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "vertical_pull", weight: 1 },
    { tag_slug: "lats", weight: 1 },
    { tag_slug: "back", weight: 1 },
  ],
  [key("rock_climbing", "lockoff_strength")]: [
    { tag_slug: "lockoff_strength", weight: 1.3 },
    { tag_slug: "isometric_strength", weight: 1 },
    { tag_slug: "pulling_strength", weight: 1 },
  ],
  [key("rock_climbing", "core_tension")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("rock_climbing", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
    { tag_slug: "scapular_strength", weight: 1 },
  ],
  [key("rock_climbing", "power_dynamic")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "plyometric", weight: 1 },
  ],
  [key("rock_climbing", "trunk_endurance")]: [
    { tag_slug: "core_stability", weight: 1.1 },
    { tag_slug: "strength_endurance", weight: 1.1 },
    { tag_slug: "aerobic_base", weight: 0.9 },
  ],

  // --- Ice Climbing ---
  [key("ice_climbing", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.3 },
    { tag_slug: "grip", weight: 1.2 },
    { tag_slug: "isometric_strength", weight: 0.9 },
  ],
  [key("ice_climbing", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "vertical_pull", weight: 1 },
    { tag_slug: "lats", weight: 1 },
  ],
  [key("ice_climbing", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
    { tag_slug: "vertical_push", weight: 0.9 },
  ],
  [key("ice_climbing", "core_tension")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("ice_climbing", "lockoff_strength")]: [
    { tag_slug: "lockoff_strength", weight: 1.2 },
    { tag_slug: "isometric_strength", weight: 1 },
  ],

  // --- Road Running ---
  [key("road_running", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1.2 },
    { tag_slug: "low_impact", weight: 0.8 },
  ],
  [key("road_running", "threshold")]: [
    { tag_slug: "lactate_threshold", weight: 1.2 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("road_running", "speed_endurance")]: [
    { tag_slug: "anaerobic_capacity", weight: 1.2 },
    { tag_slug: "speed", weight: 1 },
  ],
  [key("road_running", "running_economy")]: [
    { tag_slug: "single_leg_strength", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.1 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "hinge_pattern", weight: 1 },
    { tag_slug: "posterior_chain", weight: 0.9 },
  ],
  [key("road_running", "leg_resilience")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1.2 },
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "calves", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 0.9 },
    { tag_slug: "ankle_stability", weight: 0.9 },
  ],
  [key("road_running", "marathon_pace")]: [
    { tag_slug: "zone3_cardio", weight: 1 },
    { tag_slug: "aerobic_base", weight: 1 },
    { tag_slug: "strength_endurance", weight: 0.95 },
  ],
  [key("road_running", "durability")]: [
    { tag_slug: "strength_endurance", weight: 1.1 },
    { tag_slug: "core_stability", weight: 1 },
    { tag_slug: "posterior_chain", weight: 0.95 },
  ],

  // --- Trail Running ---
  [key("trail_running", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("trail_running", "uphill_endurance")]: [
    { tag_slug: "single_leg_strength", weight: 1.3 },
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "zone2_cardio", weight: 0.9 },
    { tag_slug: "posterior_chain", weight: 0.9 },
  ],
  [key("trail_running", "downhill_control")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1.3 },
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "balance", weight: 0.9 },
  ],
  [key("trail_running", "ankle_stability")]: [
    { tag_slug: "ankle_stability", weight: 1.3 },
    { tag_slug: "balance", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "calves", weight: 0.9 },
  ],
  [key("trail_running", "terrain_adaptability")]: [
    { tag_slug: "single_leg_strength", weight: 1.2 },
    { tag_slug: "balance", weight: 1.2 },
    { tag_slug: "ankle_stability", weight: 1.1 },
    { tag_slug: "glute_strength", weight: 0.9 },
  ],

  // --- Ultra Running ---
  [key("ultra_running", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.3 },
    { tag_slug: "aerobic_base", weight: 1.2 },
  ],
  [key("ultra_running", "durability")]: [
    { tag_slug: "strength_endurance", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1 },
    { tag_slug: "core_stability", weight: 1.1 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("ultra_running", "leg_resilience")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1.2 },
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "calves", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("ultra_running", "uphill_endurance")]: [
    { tag_slug: "single_leg_strength", weight: 1.3 },
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "posterior_chain", weight: 0.9 },
  ],
  [key("ultra_running", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],

  // --- Cycling (road + mountain combined) ---
  [key("cycling", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("cycling", "threshold")]: [
    { tag_slug: "lactate_threshold", weight: 1.2 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("cycling", "vo2_intervals")]: [
    { tag_slug: "anaerobic_capacity", weight: 1.2 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("cycling", "power_endurance")]: [
    { tag_slug: "strength_endurance", weight: 1.2 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("cycling", "leg_strength")]: [
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "quads", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1.1 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 1.1 },
    { tag_slug: "posterior_chain", weight: 0.9 },
  ],
  [key("cycling", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],

  // --- Triathlon ---
  [key("triathlon", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("triathlon", "threshold")]: [
    { tag_slug: "lactate_threshold", weight: 1.2 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("triathlon", "swim_specific")]: [
    { tag_slug: "scapular_control", weight: 1.3 },
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "pulling_strength", weight: 1.1 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("triathlon", "bike_run_durability")]: [
    { tag_slug: "strength_endurance", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.1 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "hinge_pattern", weight: 0.9 },
    { tag_slug: "squat_pattern", weight: 0.9 },
  ],
  [key("triathlon", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],

  // --- Rucking ---
  [key("rucking", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("rucking", "load_carriage_durability")]: [
    { tag_slug: "strength_endurance", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1.1 },
    { tag_slug: "core_stability", weight: 1 },
    { tag_slug: "carry", weight: 1.2 },
  ],
  [key("rucking", "leg_strength")]: [
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "quads", weight: 1.2 },
    { tag_slug: "squat_pattern", weight: 1.1 },
    { tag_slug: "single_leg_strength", weight: 1.1 },
    { tag_slug: "hinge_pattern", weight: 1 },
    { tag_slug: "posterior_chain", weight: 0.9 },
  ],
  [key("rucking", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("rucking", "ankle_stability")]: [
    { tag_slug: "ankle_stability", weight: 1.3 },
    { tag_slug: "balance", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "calves", weight: 0.9 },
  ],

  // --- Spartan / OCR ---
  [key("ocr_spartan", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.3 },
    { tag_slug: "lactate_threshold", weight: 1 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("ocr_spartan", "running_endurance")]: [
    { tag_slug: "zone2_cardio", weight: 1 },
    { tag_slug: "zone3_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("ocr_spartan", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.3 },
    { tag_slug: "grip", weight: 1.2 },
    { tag_slug: "carry", weight: 1 },
  ],
  [key("ocr_spartan", "leg_strength")]: [
    { tag_slug: "glute_strength", weight: 1.2 },
    { tag_slug: "squat_pattern", weight: 1.1 },
    { tag_slug: "lunge_pattern", weight: 1.1 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "posterior_chain", weight: 0.9 },
  ],
  [key("ocr_spartan", "core_stability")]: [
    { tag_slug: "core_bracing", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],

  // --- Swimming (lap / open water) ---
  [key("swimming_open_water", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.3 },
    { tag_slug: "vertical_pull", weight: 1.2 },
    { tag_slug: "horizontal_pull", weight: 1.1 },
    { tag_slug: "lats", weight: 1 },
    { tag_slug: "back", weight: 0.9 },
  ],
  [key("swimming_open_water", "shoulder_scapular")]: [
    { tag_slug: "scapular_control", weight: 1.3 },
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 0.9 },
  ],
  [key("swimming_open_water", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("swimming_open_water", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("swimming_open_water", "leg_turn_power")]: [
    { tag_slug: "explosive_power", weight: 1.1 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "quads", weight: 1 },
    { tag_slug: "glute_strength", weight: 0.9 },
  ],

  // --- Hyrox ---
  [key("hyrox", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.3 },
    { tag_slug: "lactate_threshold", weight: 1 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("hyrox", "running_endurance")]: [
    { tag_slug: "zone2_cardio", weight: 1 },
    { tag_slug: "zone3_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("hyrox", "lower_body_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "lunge_pattern", weight: 1 },
  ],
  [key("hyrox", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.3 },
    { tag_slug: "grip", weight: 1 },
  ],
  [key("hyrox", "core_stability")]: [
    { tag_slug: "core_bracing", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
    { tag_slug: "sled_strength", weight: 1 },
  ],
  // Legacy sub-focus slugs (stored profiles / deprecated sports → hyrox); same tags as former tactical + strongman picks.
  [key("hyrox", "strength_endurance")]: [
    { tag_slug: "strength_endurance", weight: 1.2 },
    { tag_slug: "pushing_strength", weight: 1 },
    { tag_slug: "pulling_strength", weight: 1 },
    { tag_slug: "carry", weight: 1 },
  ],
  [key("hyrox", "durability")]: [
    { tag_slug: "strength_endurance", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
    { tag_slug: "carry", weight: 1 },
  ],
  [key("hyrox", "carries_load")]: [
    { tag_slug: "work_capacity", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "core_bracing", weight: 1 },
  ],
  [key("hyrox", "overhead_pressing")]: [
    { tag_slug: "max_strength", weight: 1.2 },
    { tag_slug: "vertical_push", weight: 1.2 },
    { tag_slug: "pushing_strength", weight: 1 },
  ],
  [key("hyrox", "posterior_chain_strength")]: [
    { tag_slug: "max_strength", weight: 1.3 },
    { tag_slug: "hinge_pattern", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1 },
  ],
  [key("hyrox", "grip_trunk")]: [
    { tag_slug: "grip_strength", weight: 1.3 },
    { tag_slug: "core_bracing", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],

  // --- CrossFit ---
  [key("crossfit", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.3 },
    { tag_slug: "conditioning", weight: 1 },
  ],
  [key("crossfit", "strength")]: [
    { tag_slug: "max_strength", weight: 1.2 },
    { tag_slug: "compound", weight: 1 },
    { tag_slug: "squat_pattern", weight: 1 },
    { tag_slug: "hinge_pattern", weight: 1 },
  ],
  [key("crossfit", "power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "plyometric", weight: 1 },
  ],
  [key("crossfit", "gymnastics_skill")]: [
    { tag_slug: "bodyweight", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
    { tag_slug: "scapular_control", weight: 1 },
  ],
  [key("crossfit", "engine")]: [
    { tag_slug: "aerobic_base", weight: 1 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],

  // --- Bodybuilding ---
  [key("bodybuilding", "push_hypertrophy")]: [
    { tag_slug: "hypertrophy", weight: 1.3 },
    { tag_slug: "horizontal_push", weight: 1.2 },
    { tag_slug: "vertical_push", weight: 1 },
    { tag_slug: "pushing_strength", weight: 1 },
  ],
  [key("bodybuilding", "pull_hypertrophy")]: [
    { tag_slug: "hypertrophy", weight: 1.3 },
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "vertical_pull", weight: 1.2 },
    { tag_slug: "horizontal_pull", weight: 1 },
  ],
  [key("bodybuilding", "legs_hypertrophy")]: [
    { tag_slug: "hypertrophy", weight: 1.3 },
    { tag_slug: "squat_pattern", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1.1 },
    { tag_slug: "quads", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1.1 },
  ],
  [key("bodybuilding", "arms_shoulders")]: [
    { tag_slug: "hypertrophy", weight: 1.2 },
    { tag_slug: "vertical_push", weight: 1 },
    { tag_slug: "horizontal_push", weight: 1 },
    { tag_slug: "pulling_strength", weight: 1 },
  ],
  [key("bodybuilding", "core_physique")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "hypertrophy", weight: 1 },
  ],

  // --- Track Sprinting ---
  [key("track_sprinting", "acceleration_power")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.2 },
    { tag_slug: "squat_pattern", weight: 1 },
  ],
  [key("track_sprinting", "max_velocity")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1.1 },
    { tag_slug: "tendon_resilience", weight: 1 },
  ],
  [key("track_sprinting", "plyometric_power")]: [
    { tag_slug: "plyometric", weight: 1.3 },
    { tag_slug: "explosive_power", weight: 1.2 },
  ],
  [key("track_sprinting", "leg_strength")]: [
    { tag_slug: "max_strength", weight: 1.2 },
    { tag_slug: "squat_pattern", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1.1 },
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "posterior_chain", weight: 1 },
  ],
  [key("track_sprinting", "hamstring_tendon_resilience")]: [
    { tag_slug: "tendon_resilience", weight: 1.3 },
    { tag_slug: "eccentric_strength", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1 },
    { tag_slug: "posterior_chain", weight: 1 },
  ],

  // --- Surfing ---
  [key("surfing", "paddle_endurance")]: [
    { tag_slug: "scapular_control", weight: 1 },
    { tag_slug: "shoulder_stability", weight: 1 },
    { tag_slug: "strength_endurance", weight: 1 },
  ],
  [key("surfing", "pop_up_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("surfing", "core_rotation")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("surfing", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1 },
  ],
  [key("surfing", "balance")]: [
    { tag_slug: "balance", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],

  // --- Kitesurfing / Windsurfing ---
  // Upper body is rig-dominant (pulling, scapular control, shoulder stability) alongside trunk stiffness.
  [key("kite_wind_surf", "balance")]: [
    { tag_slug: "balance", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "scapular_control", weight: 0.95 },
    { tag_slug: "horizontal_pull", weight: 0.85 },
  ],
  [key("kite_wind_surf", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
    { tag_slug: "core_bracing", weight: 0.9 },
    { tag_slug: "scapular_control", weight: 1.1 },
    { tag_slug: "shoulder_stability", weight: 1.05 },
    { tag_slug: "horizontal_pull", weight: 1 },
    { tag_slug: "vertical_pull", weight: 1 },
    { tag_slug: "pulling_strength", weight: 1 },
  ],
  [key("kite_wind_surf", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.2 },
    { tag_slug: "grip", weight: 1.2 },
    { tag_slug: "carry", weight: 0.9 },
    { tag_slug: "horizontal_pull", weight: 0.9 },
    { tag_slug: "scapular_control", weight: 0.85 },
  ],
  [key("kite_wind_surf", "leg_strength")]: [
    { tag_slug: "squat_pattern", weight: 1.1 },
    { tag_slug: "single_leg_strength", weight: 1.1 },
    { tag_slug: "lunge_pattern", weight: 1 },
  ],
  [key("kite_wind_surf", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.2 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
    { tag_slug: "strength_endurance", weight: 0.95 },
    { tag_slug: "scapular_control", weight: 0.85 },
  ],

  // --- Paddleboarding ---
  [key("sup", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("sup", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("sup", "balance")]: [
    { tag_slug: "balance", weight: 1.2 },
  ],
  [key("sup", "shoulder_endurance")]: [
    { tag_slug: "scapular_control", weight: 1 },
    { tag_slug: "strength_endurance", weight: 1 },
  ],

  // --- Rowing ---
  [key("rowing_erg", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("rowing_erg", "threshold")]: [
    { tag_slug: "lactate_threshold", weight: 1 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("rowing_erg", "posterior_chain")]: [
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1 },
    { tag_slug: "glute_strength", weight: 1 },
  ],
  [key("rowing_erg", "core_bracing")]: [
    { tag_slug: "core_bracing", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("rowing_erg", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.2 },
    { tag_slug: "grip", weight: 1 },
  ],

  // --- Baseball / Softball ---
  [key("baseball", "rotational_power")]: [
    { tag_slug: "rotation", weight: 1.3 },
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1.1 },
    { tag_slug: "power", weight: 1 },
  ],
  [key("baseball", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.3 },
    { tag_slug: "scapular_control", weight: 1.2 },
    { tag_slug: "scapular_strength", weight: 1 },
    { tag_slug: "rotator_cuff", weight: 1.2 },
  ],
  [key("baseball", "hip_mobility_speed")]: [
    { tag_slug: "hip_stability", weight: 1.2 },
    { tag_slug: "hips", weight: 1.1 },
    { tag_slug: "single_leg_strength", weight: 1.1 },
    { tag_slug: "explosive_power", weight: 1 },
    { tag_slug: "glute_strength", weight: 1 },
  ],
  [key("baseball", "core_stability")]: [
    { tag_slug: "core_anti_rotation", weight: 1.3 },
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_bracing", weight: 1 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("baseball", "reactive_speed")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "speed", weight: 1.1 },
    { tag_slug: "plyometric", weight: 1 },
    { tag_slug: "reactive_power", weight: 1 },
  ],

  // --- Soccer ---
  [key("soccer", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("soccer", "speed")]: [
    { tag_slug: "speed", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1 },
  ],
  [key("soccer", "change_of_direction")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("soccer", "hamstring_resilience")]: [
    { tag_slug: "hamstrings", weight: 1 },
    { tag_slug: "eccentric_strength", weight: 1 },
  ],
  [key("soccer", "leg_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "plyometric", weight: 1 },
  ],

  // --- American Football (tackle & flag; legacy flag_football slug maps here) ---
  [key("american_football", "speed_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "speed", weight: 1.2 },
    { tag_slug: "plyometric", weight: 0.9 },
  ],
  [key("american_football", "change_of_direction")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "balance", weight: 0.9 },
  ],
  [key("american_football", "max_strength")]: [
    { tag_slug: "max_strength", weight: 1.3 },
    { tag_slug: "compound", weight: 1 },
    { tag_slug: "squat_pattern", weight: 0.9 },
    { tag_slug: "hinge_pattern", weight: 0.9 },
    { tag_slug: "horizontal_push", weight: 0.8 },
    { tag_slug: "horizontal_pull", weight: 0.8 },
  ],
  [key("american_football", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.3 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
    { tag_slug: "conditioning", weight: 0.9 },
  ],
  [key("american_football", "posterior_chain")]: [
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "hamstrings", weight: 0.9 },
  ],
  [key("american_football", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.2 },
    { tag_slug: "grip", weight: 1.2 },
    { tag_slug: "carry", weight: 0.9 },
  ],

  // --- Lacrosse ---
  [key("lacrosse", "speed")]: [
    { tag_slug: "speed", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1 },
  ],
  [key("lacrosse", "change_of_direction")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "balance", weight: 0.9 },
  ],
  [key("lacrosse", "rotational_power")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1 },
    { tag_slug: "core_anti_rotation", weight: 0.9 },
  ],
  [key("lacrosse", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
  ],
  [key("lacrosse", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.2 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
  ],

  // --- Boxing ---
  [key("boxing", "rotational_power")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("boxing", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.2 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
    { tag_slug: "conditioning", weight: 0.9 },
  ],
  [key("boxing", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
  ],
  [key("boxing", "leg_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "plyometric", weight: 1 },
    { tag_slug: "squat_pattern", weight: 0.9 },
  ],
  [key("boxing", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_bracing", weight: 1 },
    { tag_slug: "core_anti_extension", weight: 0.9 },
  ],

  // --- Grappling (BJJ, Judo, MMA, Wrestling combined) ---
  [key("grappling", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.3 },
    { tag_slug: "grip", weight: 1.2 },
    { tag_slug: "carry", weight: 0.9 },
  ],
  [key("grappling", "hip_stability")]: [
    { tag_slug: "hip_stability", weight: 1.2 },
    { tag_slug: "hips", weight: 1.2 },
    { tag_slug: "mobility", weight: 1 },
    { tag_slug: "glute_strength", weight: 0.9 },
  ],
  [key("grappling", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "horizontal_pull", weight: 1 },
    { tag_slug: "vertical_pull", weight: 1 },
  ],
  [key("grappling", "explosive_power")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "power", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 0.9 },
  ],
  [key("grappling", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.2 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
  ],

  // --- Muay Thai ---
  [key("muay_thai", "rotational_power")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("muay_thai", "hip_stability")]: [
    { tag_slug: "hip_stability", weight: 1.2 },
    { tag_slug: "hips", weight: 1.2 },
    { tag_slug: "mobility", weight: 1 },
    { tag_slug: "glute_strength", weight: 0.9 },
  ],
  [key("muay_thai", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.2 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
    { tag_slug: "conditioning", weight: 0.9 },
  ],
  [key("muay_thai", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_bracing", weight: 1 },
    { tag_slug: "core_anti_extension", weight: 0.9 },
  ],
  [key("muay_thai", "leg_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "plyometric", weight: 1 },
    { tag_slug: "squat_pattern", weight: 0.9 },
  ],

  // --- Rugby (aligned sub-goals with American football) ---
  [key("rugby", "change_of_direction")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "balance", weight: 0.9 },
  ],
  [key("rugby", "max_strength")]: [
    { tag_slug: "max_strength", weight: 1.3 },
    { tag_slug: "compound", weight: 1 },
    { tag_slug: "squat_pattern", weight: 0.9 },
    { tag_slug: "hinge_pattern", weight: 0.9 },
    { tag_slug: "horizontal_push", weight: 0.8 },
    { tag_slug: "horizontal_pull", weight: 0.8 },
  ],
  [key("rugby", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.3 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
    { tag_slug: "conditioning", weight: 0.9 },
  ],
  [key("rugby", "posterior_chain")]: [
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "hamstrings", weight: 0.9 },
  ],
  [key("rugby", "grip_endurance")]: [
    { tag_slug: "grip_endurance", weight: 1.2 },
    { tag_slug: "grip", weight: 1.2 },
    { tag_slug: "carry", weight: 0.9 },
  ],
  [key("rugby", "speed_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "speed", weight: 1.2 },
    { tag_slug: "plyometric", weight: 0.9 },
  ],

  // --- Racquet & Court Sports (Tennis, Pickleball, Badminton, Squash combined) ---
  [key("court_racquet", "lateral_speed")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "speed", weight: 1 },
  ],
  [key("court_racquet", "rotational_power")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1 },
  ],
  [key("court_racquet", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1 },
  ],
  [key("court_racquet", "core_rotation")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("court_racquet", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
  ],

  // --- Hockey ---
  [key("hockey", "speed")]: [
    { tag_slug: "speed", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1 },
  ],
  [key("hockey", "change_of_direction")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "balance", weight: 0.9 },
  ],
  [key("hockey", "leg_power")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "plyometric", weight: 1 },
  ],
  [key("hockey", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("hockey", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1.2 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
  ],

  // --- Basketball ---
  [key("basketball", "vertical_jump")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.2 },
  ],

  // --- Volleyball (indoor + beach combined) ---
  [key("volleyball", "vertical_jump")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.2 },
    { tag_slug: "power", weight: 1 },
    { tag_slug: "squat_pattern", weight: 0.9 },
  ],
  [key("volleyball", "landing_mechanics")]: [
    { tag_slug: "eccentric_strength", weight: 1.2 },
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "reactive_power", weight: 1 },
  ],
  [key("volleyball", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
  ],
  [key("volleyball", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("volleyball", "knee_resilience")]: [
    { tag_slug: "knee_stability", weight: 1.2 },
    { tag_slug: "eccentric_quad_strength", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 0.9 },
  ],

  // --- Golf ---
  [key("golf", "rotational_power")]: [
    { tag_slug: "rotation", weight: 1.3 },
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
    { tag_slug: "power", weight: 0.9 },
  ],
  [key("golf", "core_rotation")]: [
    { tag_slug: "core_anti_rotation", weight: 1.2 },
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("golf", "thoracic_mobility")]: [
    { tag_slug: "thoracic_mobility", weight: 1.3 },
    { tag_slug: "t_spine", weight: 1.2 },
    { tag_slug: "mobility", weight: 1 },
  ],
  [key("golf", "hip_mobility_stability")]: [
    { tag_slug: "hip_stability", weight: 1.2 },
    { tag_slug: "hips", weight: 1.2 },
    { tag_slug: "mobility", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 0.9 },
  ],
  [key("golf", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 1 },
    { tag_slug: "core_bracing", weight: 1 },
  ],

  // --- Vertical Jump / Dunk (standalone sport) ---
  [key("vertical_jump", "vertical_jump")]: [
    { tag_slug: "explosive_power", weight: 1.4 },
    { tag_slug: "plyometric", weight: 1.3 },
    { tag_slug: "explosive", weight: 1.2 },
    { tag_slug: "power", weight: 1.2 },
    { tag_slug: "reactive_power", weight: 1 },
    { tag_slug: "squat_pattern", weight: 0.9 },
    { tag_slug: "hinge_pattern", weight: 0.9 },
    { tag_slug: "single_leg_strength", weight: 0.8 },
    { tag_slug: "knee_stability", weight: 0.7 },
  ],
  [key("vertical_jump", "strength_foundation")]: [
    { tag_slug: "squat_pattern", weight: 1.3 },
    { tag_slug: "hinge_pattern", weight: 1.2 },
    { tag_slug: "max_strength", weight: 1.1 },
    { tag_slug: "posterior_chain", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 0.9 },
  ],
  [key("vertical_jump", "reactive_landing")]: [
    { tag_slug: "reactive_power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.2 },
    { tag_slug: "eccentric_strength", weight: 1.1 },
    { tag_slug: "knee_stability", weight: 1 },
  ],
  [key("basketball", "lateral_speed")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("basketball", "change_of_direction")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "knee_stability", weight: 1 },
  ],
  [key("basketball", "core_stability")]: [
    { tag_slug: "core_stability", weight: 1.2 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("basketball", "landing_mechanics")]: [
    { tag_slug: "eccentric_strength", weight: 1 },
    { tag_slug: "knee_stability", weight: 1 },
    { tag_slug: "reactive_power", weight: 1 },
  ],

  // --- Powerbuilding ---
  [key("powerbuilding", "max_strength")]: [
    { tag_slug: "max_strength", weight: 1.3 },
    { tag_slug: "compound", weight: 1 },
  ],
  [key("powerbuilding", "hypertrophy")]: [
    { tag_slug: "hypertrophy", weight: 1.2 },
    { tag_slug: "compound", weight: 1 },
  ],
  [key("powerbuilding", "squat_hinge")]: [
    { tag_slug: "squat_pattern", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1.2 },
  ],
  [key("powerbuilding", "press_pull")]: [
    { tag_slug: "horizontal_push", weight: 1 },
    { tag_slug: "vertical_pull", weight: 1 },
    { tag_slug: "horizontal_pull", weight: 1 },
  ],
  [key("powerbuilding", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1 },
    { tag_slug: "conditioning", weight: 1 },
  ],
  // Legacy sub-focus slugs (stored profiles; former general_strength / olympic_weightlifting picks).
  [key("powerbuilding", "squat_strength")]: [
    { tag_slug: "max_strength", weight: 1.3 },
    { tag_slug: "squat_pattern", weight: 1.2 },
    { tag_slug: "quads", weight: 1 },
    { tag_slug: "glute_strength", weight: 1 },
  ],
  [key("powerbuilding", "bench_strength")]: [
    { tag_slug: "max_strength", weight: 1.3 },
    { tag_slug: "horizontal_push", weight: 1.2 },
    { tag_slug: "pushing_strength", weight: 1 },
  ],
  [key("powerbuilding", "deadlift_strength")]: [
    { tag_slug: "max_strength", weight: 1.3 },
    { tag_slug: "hinge_pattern", weight: 1.2 },
    { tag_slug: "posterior_chain", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1 },
  ],
  [key("powerbuilding", "accessory_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "horizontal_pull", weight: 1 },
    { tag_slug: "vertical_pull", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 1 },
  ],
  [key("powerbuilding", "core_bracing")]: [
    { tag_slug: "core_bracing", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
    { tag_slug: "core_anti_extension", weight: 1.1 },
  ],
  [key("powerbuilding", "explosive_power")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "power", weight: 1 },
  ],
  [key("powerbuilding", "overhead_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "core_bracing", weight: 1 },
  ],
  [key("powerbuilding", "mobility")]: [
    { tag_slug: "hip_mobility", weight: 1 },
    { tag_slug: "thoracic_mobility", weight: 1 },
    { tag_slug: "mobility", weight: 1 },
  ],
  [key("powerbuilding", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1 },
  ],
};
