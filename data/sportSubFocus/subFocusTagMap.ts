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

  // --- Rock Climbing ---
  [key("rock_sport_lead", "finger_strength")]: [
    { tag_slug: "finger_strength", weight: 1.3 },
    { tag_slug: "grip", weight: 1 },
    { tag_slug: "isometric_strength", weight: 0.9 },
  ],
  [key("rock_sport_lead", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "vertical_pull", weight: 1 },
    { tag_slug: "lats", weight: 1 },
    { tag_slug: "back", weight: 1 },
  ],
  [key("rock_sport_lead", "lockoff_strength")]: [
    { tag_slug: "lockoff_strength", weight: 1.3 },
    { tag_slug: "isometric_strength", weight: 1 },
    { tag_slug: "pulling_strength", weight: 1 },
  ],
  [key("rock_sport_lead", "core_tension")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("rock_sport_lead", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
    { tag_slug: "scapular_strength", weight: 1 },
  ],
  [key("rock_sport_lead", "power_dynamic")]: [
    { tag_slug: "explosive_power", weight: 1.2 },
    { tag_slug: "plyometric", weight: 1 },
  ],

  // --- Bouldering ---
  [key("rock_bouldering", "finger_strength")]: [
    { tag_slug: "finger_strength", weight: 1.3 },
    { tag_slug: "grip", weight: 1 },
    { tag_slug: "isometric_strength", weight: 0.9 },
  ],
  [key("rock_bouldering", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "vertical_pull", weight: 1 },
    { tag_slug: "lats", weight: 1 },
  ],
  [key("rock_bouldering", "lockoff_strength")]: [
    { tag_slug: "lockoff_strength", weight: 1.3 },
    { tag_slug: "isometric_strength", weight: 1 },
  ],
  [key("rock_bouldering", "core_tension")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("rock_bouldering", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1.2 },
  ],
  [key("rock_bouldering", "power_dynamic")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1 },
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
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("road_running", "leg_resilience")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1 },
    { tag_slug: "knee_stability", weight: 1 },
    { tag_slug: "calves", weight: 0.9 },
  ],

  // --- Trail Running ---
  [key("trail_running", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("trail_running", "uphill_endurance")]: [
    { tag_slug: "zone2_cardio", weight: 1 },
    { tag_slug: "single_leg_strength", weight: 1.2 },
    { tag_slug: "glute_strength", weight: 1 },
  ],
  [key("trail_running", "downhill_control")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1.2 },
    { tag_slug: "knee_stability", weight: 1 },
  ],
  [key("trail_running", "ankle_stability")]: [
    { tag_slug: "ankle_stability", weight: 1.2 },
    { tag_slug: "balance", weight: 1 },
  ],
  [key("trail_running", "terrain_adaptability")]: [
    { tag_slug: "single_leg_strength", weight: 1 },
    { tag_slug: "balance", weight: 1 },
    { tag_slug: "ankle_stability", weight: 1 },
  ],

  // --- Marathon Running ---
  [key("marathon_running", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.3 },
    { tag_slug: "aerobic_base", weight: 1.2 },
  ],
  [key("marathon_running", "threshold")]: [
    { tag_slug: "lactate_threshold", weight: 1.2 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("marathon_running", "marathon_pace")]: [
    { tag_slug: "zone3_cardio", weight: 1 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("marathon_running", "durability")]: [
    { tag_slug: "strength_endurance", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("marathon_running", "leg_resilience")]: [
    { tag_slug: "eccentric_quad_strength", weight: 1 },
    { tag_slug: "knee_stability", weight: 1 },
    { tag_slug: "calves", weight: 1 },
  ],

  // --- Cycling ---
  [key("cycling_road", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("cycling_road", "threshold")]: [
    { tag_slug: "lactate_threshold", weight: 1.2 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("cycling_road", "vo2_intervals")]: [
    { tag_slug: "anaerobic_capacity", weight: 1.2 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("cycling_road", "leg_strength")]: [
    { tag_slug: "glute_strength", weight: 1 },
    { tag_slug: "quads", weight: 1 },
    { tag_slug: "hinge_pattern", weight: 1 },
  ],
  [key("cycling_road", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
  ],

  // --- Triathlon ---
  [key("triathlon", "aerobic_base")]: [
    { tag_slug: "zone2_cardio", weight: 1.2 },
    { tag_slug: "aerobic_base", weight: 1 },
  ],
  [key("triathlon", "threshold")]: [
    { tag_slug: "lactate_threshold", weight: 1 },
    { tag_slug: "zone3_cardio", weight: 1 },
  ],
  [key("triathlon", "swim_specific")]: [
    { tag_slug: "scapular_control", weight: 1.2 },
    { tag_slug: "shoulder_stability", weight: 1 },
    { tag_slug: "core_anti_extension", weight: 1 },
  ],
  [key("triathlon", "bike_run_durability")]: [
    { tag_slug: "strength_endurance", weight: 1 },
    { tag_slug: "posterior_chain", weight: 1 },
    { tag_slug: "core_stability", weight: 1 },
  ],
  [key("triathlon", "core_stability")]: [
    { tag_slug: "core_anti_extension", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
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

  // --- Tennis ---
  [key("tennis", "lateral_speed")]: [
    { tag_slug: "agility", weight: 1.2 },
    { tag_slug: "speed", weight: 1 },
  ],
  [key("tennis", "rotational_power")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "explosive_power", weight: 1 },
  ],
  [key("tennis", "shoulder_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "scapular_control", weight: 1 },
  ],
  [key("tennis", "core_rotation")]: [
    { tag_slug: "rotation", weight: 1.2 },
    { tag_slug: "core_anti_rotation", weight: 1 },
  ],
  [key("tennis", "work_capacity")]: [
    { tag_slug: "work_capacity", weight: 1 },
    { tag_slug: "anaerobic_capacity", weight: 1 },
  ],

  // --- Basketball ---
  [key("basketball", "vertical_jump")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "plyometric", weight: 1.2 },
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

  // --- Olympic Weightlifting ---
  [key("olympic_weightlifting", "explosive_power")]: [
    { tag_slug: "explosive_power", weight: 1.3 },
    { tag_slug: "power", weight: 1 },
  ],
  [key("olympic_weightlifting", "overhead_stability")]: [
    { tag_slug: "shoulder_stability", weight: 1.2 },
    { tag_slug: "core_bracing", weight: 1 },
  ],
  [key("olympic_weightlifting", "mobility")]: [
    { tag_slug: "hip_mobility", weight: 1 },
    { tag_slug: "thoracic_mobility", weight: 1 },
    { tag_slug: "mobility", weight: 1 },
  ],
  [key("olympic_weightlifting", "pull_strength")]: [
    { tag_slug: "pulling_strength", weight: 1.2 },
    { tag_slug: "hinge_pattern", weight: 1 },
  ],
  [key("olympic_weightlifting", "core_bracing")]: [
    { tag_slug: "core_bracing", weight: 1.2 },
    { tag_slug: "core_stability", weight: 1 },
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
};
