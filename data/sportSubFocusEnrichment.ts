/**
 * Curated sport sub-focus tags for exercises in the default generator pool (eligible_core)
 * that lack tags required by exerciseMatchesSportSubFocusSlug.
 *
 * Tags MUST match `SUB_FOCUS_TAG_MAP` slugs (not display sub-focus names).
 * Applied after goal intent enrichment in exerciseDefinitionToGeneratorExercise.
 *
 * Evidence (2026-08-12 priority sports build-up):
 * - Alpine eccentric control: NSCA / Berg & Eiken — slow eccentric quad absorption
 * - Soccer hamstring_resilience: BJSM meta-analyses — Nordic + eccentric hamstring ~50% injury reduction
 * - Aerobic base: ACSM endurance — zone2_cardio / aerobic_base on steady cardio staples
 * - Climbing finger_strength: hangboard / dead-hang literature (PMC9039162, Frontiers 2022)
 * - Cycling vo2_intervals: high fraction of VO2max intervals (EJSC / cycling HIIT) → anaerobic_capacity + zone3
 * See docs/research/priority-sports-mapping-2026-08.md
 */

import type { ExerciseMetadataPatch } from "../lib/exerciseMetadata/metadataOverrideTypes";

function patch(tags: string[]): ExerciseMetadataPatch {
  return { attribute_tags_append: tags };
}

function mergeTags(
  acc: Record<string, ExerciseMetadataPatch>,
  ids: readonly string[],
  tags: string[]
): void {
  for (const id of ids) {
    const prev = acc[id]?.attribute_tags_append ?? [];
    acc[id] = patch([...new Set([...prev, ...tags])]);
  }
}

const CORE_STABILITY_IDS: readonly string[] = [
  "bear_crawl",
  "cable_woodchops",
  "cable_woodchop",
  "reverse_cable_woodchops",
  "scapular_pull_up",
  "scapular_push_up",
  "dead_hang",
  "dead_hangs",
  "rotation",
  "squat_chops",
  "bird_dog",
  "pallof_press",
  "pallof_hold",
  "plank",
  "side_plank",
  "dead_bug",
];

/** Matches trail/xc/soccer/backcountry aerobic_base → zone2_cardio + aerobic_base */
const AEROBIC_BASE_IDS: readonly string[] = [
  "zone2_treadmill",
  "zone2_bike",
  "zone2_rower",
  "zone2_stair_climber",
  "treadmill_incline_walk",
  "incline_treadmill_walk",
  "assault_bike_steady",
  "assault_bike",
  "rower_steady",
  "elliptical_steady",
  "stair_climber_steady",
  "ski_erg_steady",
  "ski_erg",
  "elliptical",
  "stair_climber",
  "stair_climb",
  "treadmill_run",
  "jump_rope",
  "sprinter_step_ups",
  "ff_kettlebell_goblet_step_up",
  "crossover_step_up",
  "decel_step_ups",
];

const GRIP_ENDURANCE_IDS: readonly string[] = [
  "dead_hang",
  "dead_hangs",
  "farmer_carry",
  "farmers_carry",
  "suitcase_carry",
  "sandbag_carry",
  "suitcase_lunges",
  "pullup",
  "pullups",
  "chin_up",
  "chin_ups",
  "underhand_chin_ups",
  "eccentric_chin_ups",
  "scapular_pull_up",
  "bar_hang",
  "australian_pull_up",
  "inverted_rows",
  "inverted_row_feet_elevated",
  "pause_deadlift",
  "deficit_deadlift",
  "dimmel_deadlift",
  "sumo_deadlift",
  "finger_extensions",
];

const FINGER_STRENGTH_IDS: readonly string[] = [
  "dead_hang",
  "dead_hangs",
  "pullup",
  "pullups",
  "chin_up",
  "chin_ups",
  "underhand_chin_ups",
  "eccentric_chin_ups",
  "scapular_pull_up",
  "finger_extensions",
  "bar_hang",
  "hanging_knee_raise",
  "hanging_leg_raise",
  "australian_pull_up",
  "farmer_carry",
  "suitcase_carry",
];

/** Cycling / endurance VO2 → anaerobic_capacity + zone3_cardio (not Zone-2 steady) */
const VO2_INTERVAL_IDS: readonly string[] = [
  "treadmill_sprint_intervals",
  "treadmill_hill_sprints",
  "treadmill_hill_run",
  "stair_climber_repeats",
  "bike_threshold_sweet_spot",
  "treadmill_tempo_run",
  "treadmill_cruise_intervals",
  "rower_threshold_intervals",
  "ski_erg_threshold_intervals",
  "jump_rope",
  "mountain_climber",
  "burpee",
  "band_piston_sprint",
  "bound_to_sprint",
  "build_up_sprint",
  "wall_sprint_drill",
  "power_shuffle_to_sprint",
  "low_hurdle_lateral_to_linear",
];

const SHOULDER_STABILITY_IDS: readonly string[] = [
  "scapular_pull_up",
  "scapular_push_up",
  "face_pull",
  "band_pull_apart",
  "ff_superband_pull_apart",
  "ff_superband_shoulder_dislocates",
  "external_rotation_band",
  "cuban_rotation",
  "dead_hang",
];

const KNEE_STABILITY_IDS: readonly string[] = [
  "stepup",
  "step_ups",
  "box_step_up",
  "reverse_lunge",
  "walking_lunge",
  "bulgarian_split_squats",
  "bulgarian_split_squat",
  "dumbbell_split_squat",
  "barbell_split_squat",
  "single_leg_glute_bridge",
  "clamshell",
  "fire_hydrant",
  "lateral_step_down",
  "box_step_down",
  "jump_lunge",
  "decel_step_ups",
];

const KNEE_RESILIENCE_IDS: readonly string[] = [
  "nordic_curl_assisted",
  "nordic_curl",
  "iso_nordic_hamstring_curls",
  "reverse_nordics",
  "reverse_lunge",
  "stepup",
  "box_step_down",
  "single_leg_glute_bridge",
  "rdl_dumbbell",
  "db_rdl",
];

const LANDING_MECHANICS_IDS: readonly string[] = [
  "box_jump",
  "ff_bodyweight_box_jump",
  "depth_drop",
  "rebound_box_jump",
  "jump_lunge",
  "lateral_bound",
  "ascending_skater_jumps",
  "ff_bodyweight_skater_jump",
];

/**
 * Alpine eccentric_control + trail downhill_control map to eccentric_strength /
 * eccentric_quad_strength (not the display slug "eccentric_control").
 */
const ECCENTRIC_STRENGTH_IDS: readonly string[] = [
  "nordic_curl",
  "nordic_curl_assisted",
  "iso_nordic_hamstring_curls",
  "reverse_nordics",
  "rdl_dumbbell",
  "db_rdl",
  "barbell_rdl",
  "single_leg_rdl",
  "staggered_stance_rdl",
  "eccentric_chin_ups",
  "reverse_lunge",
  "box_step_down",
  "lateral_step_down",
  "decel_step_ups",
  "bulgarian_split_squats",
  "bulgarian_split_squat",
  "dumbbell_split_squat",
  "barbell_split_squat",
  "ff_slider_hamstring_curl",
  "ff_stability_ball_hamstring_curl",
  "stability_ball_hamstring_curl",
  "swiss_ball_hamstring_curl",
];

/** Soccer hamstring_resilience → hamstrings + eccentric_strength */
const HAMSTRING_RESILIENCE_IDS: readonly string[] = [
  "nordic_curl_assisted",
  "nordic_curl",
  "iso_nordic_hamstring_curls",
  "reverse_nordics",
  "rdl_dumbbell",
  "db_rdl",
  "barbell_rdl",
  "single_leg_rdl",
  "staggered_stance_rdl",
  "glute_ham_raise",
  "single_leg_glute_bridge",
  "ff_slider_hamstring_curl",
  "ff_stability_ball_hamstring_curl",
  "stability_ball_hamstring_curl",
  "swiss_ball_hamstring_curl",
  "banded_hamstring_curl",
];

/**
 * Alpine/snowboard/backcountry leg_strength → eccentric_quad_strength, glute_strength, single_leg_strength
 */
const LEG_STRENGTH_SNOW_IDS: readonly string[] = [
  "goblet_squat",
  "barbell_squat",
  "reverse_lunge",
  "walking_lunge",
  "bulgarian_split_squats",
  "bulgarian_split_squat",
  "dumbbell_split_squat",
  "barbell_split_squat",
  "split_squat",
  "goblet_split_squat",
  "stepup",
  "step_ups",
  "box_step_up",
  "hip_thrust",
  "jump_lunge",
  "cossack_squat",
  "single_leg_glute_bridge",
  "single_leg_hip_thrust",
  "ff_bodyweight_single_leg_glute_bridge",
  "ff_bodyweight_split_squat",
];

const BALANCE_IDS: readonly string[] = [
  "single_leg_glute_bridge",
  "single_leg_rdl",
  "stepup",
  "step_ups",
  "box_step_down",
  "pistol_squat",
  "assisted_pistol_squat",
  "cossack_squat",
  "dead_hang",
  "ascending_skater_jumps",
  "ff_bodyweight_skater_jump",
  "single_leg_hop",
  "single_leg_calf_raise",
  "standing_calf_raise_single",
];

const LATERAL_STABILITY_IDS: readonly string[] = [
  "cossack_squat",
  "ascending_skater_jumps",
  "ff_bodyweight_skater_jump",
  "lateral_bound",
  "lateral_step_up",
  "resisted_skater_hops",
  "side_plank",
  "pallof_press",
  "pallof_hold",
];

const UPHILL_ENDURANCE_IDS: readonly string[] = [
  "treadmill_incline_walk",
  "incline_treadmill_walk",
  "zone2_stair_climber",
  "stair_climber_steady",
  "stair_climber",
  "stair_climb",
  "stepup",
  "step_ups",
  "box_step_up",
  "sprinter_step_ups",
  "ff_kettlebell_goblet_step_up",
];

const THRESHOLD_IDS: readonly string[] = [
  "treadmill_tempo_run",
  "treadmill_cruise_intervals",
  "rower_threshold_intervals",
  "zone2_treadmill",
  "ski_erg_intervals",
];

const DOUBLE_POLE_UPPER_IDS: readonly string[] = [
  "ski_erg",
  "ski_erg_steady",
  "ski_erg_intervals",
  "zone2_rower",
  "rower_steady",
  "straight_arm_pulldowns",
  "face_pull",
  "scapular_pull_up",
  "pullup",
  "chin_up",
];

const SURF_POP_UP_IDS: readonly string[] = [
  "push_up",
  "pushups",
  "clap_push_up",
  "explosive_push_up",
  "medicine_ball_slam",
  "burpee",
];

const SURF_ROTATION_IDS: readonly string[] = [
  "cable_woodchops",
  "cable_woodchop",
  "reverse_cable_woodchops",
  "squat_chops",
  "russian_twist",
  "rotation",
];

function buildEnrichmentMap(): Record<string, ExerciseMetadataPatch> {
  const out: Record<string, ExerciseMetadataPatch> = {};
  mergeTags(out, CORE_STABILITY_IDS, [
    "core_stability",
    "core_anti_rotation",
    "core_bracing",
    "core_anti_extension",
  ]);
  mergeTags(out, AEROBIC_BASE_IDS, ["aerobic_base", "zone2_cardio"]);
  // Tag map keys use `grip` + `carry` (not only grip_strength) for football/climbing matchers.
  mergeTags(out, GRIP_ENDURANCE_IDS, ["grip_endurance", "grip_strength", "grip", "carry"]);
  mergeTags(out, FINGER_STRENGTH_IDS, [
    "finger_strength",
    "grip",
    "isometric_strength",
    "grip_endurance",
  ]);
  mergeTags(out, VO2_INTERVAL_IDS, ["anaerobic_capacity", "zone3_cardio"]);
  mergeTags(out, SHOULDER_STABILITY_IDS, [
    "shoulder_stability",
    "scapular_control",
    "scapular_strength",
  ]);
  mergeTags(out, KNEE_STABILITY_IDS, ["knee_stability", "single_leg_strength"]);
  mergeTags(out, KNEE_RESILIENCE_IDS, ["knee_stability", "knee_resilience", "eccentric_quad_strength"]);
  mergeTags(out, LANDING_MECHANICS_IDS, ["landing_mechanics", "plyometric"]);
  mergeTags(out, ECCENTRIC_STRENGTH_IDS, [
    "eccentric_strength",
    "eccentric_quad_strength",
    "eccentric_control",
  ]);
  mergeTags(out, HAMSTRING_RESILIENCE_IDS, [
    "hamstrings",
    "eccentric_strength",
    "hamstring_resilience",
    "posterior_chain",
  ]);
  mergeTags(out, LEG_STRENGTH_SNOW_IDS, [
    "eccentric_quad_strength",
    "glute_strength",
    "single_leg_strength",
    "leg_strength",
    "squat_pattern",
  ]);
  mergeTags(out, BALANCE_IDS, ["balance", "single_leg_strength", "single_leg"]);
  mergeTags(out, LATERAL_STABILITY_IDS, [
    "core_anti_rotation",
    "hip_stability",
    "lateral_power",
    "balance",
  ]);
  mergeTags(out, UPHILL_ENDURANCE_IDS, [
    "zone2_cardio",
    "aerobic_base",
    "single_leg_strength",
    "uphill_conditioning",
    "glute_strength",
  ]);
  mergeTags(out, THRESHOLD_IDS, ["lactate_threshold", "threshold_tempo"]);
  mergeTags(out, DOUBLE_POLE_UPPER_IDS, [
    "pulling_strength",
    "trunk_endurance",
    "core_anti_extension",
    "lats",
    "back",
    "strength_endurance",
  ]);
  mergeTags(out, SURF_POP_UP_IDS, ["explosive_power", "core_anti_extension"]);
  mergeTags(out, SURF_ROTATION_IDS, ["rotation", "core_anti_rotation"]);
  return out;
}

export const SPORT_SUB_FOCUS_ENRICHMENT: Record<string, ExerciseMetadataPatch> =
  buildEnrichmentMap();

export {
  CORE_STABILITY_IDS,
  AEROBIC_BASE_IDS,
  GRIP_ENDURANCE_IDS,
  FINGER_STRENGTH_IDS,
  SHOULDER_STABILITY_IDS,
  ECCENTRIC_STRENGTH_IDS,
  HAMSTRING_RESILIENCE_IDS,
};
