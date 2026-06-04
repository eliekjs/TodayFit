/**
 * Curated sport sub-focus tags for exercises in the default generator pool (eligible_core)
 * that lack tags required by exerciseMatchesSportSubFocusSlug.
 *
 * Applied after goal intent enrichment in exerciseDefinitionToGeneratorExercise.
 * See docs/research/goal-intent-pool-expansion-2026-06.md
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
  "reverse_cable_woodchops",
  "scapular_pull_up",
  "scapular_push_up",
  "dead_hang",
  "dead_hangs",
  "rotation",
  "squat_chops",
  "bird_dog",
  "pallof_press",
  "plank",
  "side_plank",
  "dead_bug",
];

const AEROBIC_BASE_IDS: readonly string[] = [
  "zone2_treadmill",
  "zone2_bike",
  "zone2_rower",
  "zone2_stair_climber",
  "treadmill_incline_walk",
];

const GRIP_ENDURANCE_IDS: readonly string[] = [
  "dead_hang",
  "dead_hangs",
  "farmer_carry",
  "pullup",
  "pullups",
  "chin_up",
  "chin_ups",
  "scapular_pull_up",
  "bar_hang",
];

const FINGER_STRENGTH_IDS: readonly string[] = [
  "dead_hang",
  "dead_hangs",
  "pullup",
  "pullups",
  "chin_up",
  "scapular_pull_up",
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
  "reverse_lunge",
  "walking_lunge",
  "bulgarian_split_squats",
  "single_leg_glute_bridge",
  "clamshell",
  "fire_hydrant",
  "stepup",
  "lateral_step_down",
  "jump_lunge",
];

const KNEE_RESILIENCE_IDS: readonly string[] = [
  "nordic_curl_assisted",
  "nordic_curl",
  "reverse_lunge",
  "stepup",
  "box_step_down",
  "single_leg_glute_bridge",
  "rdl_dumbbell",
];

const LANDING_MECHANICS_IDS: readonly string[] = [
  "box_jump",
  "ff_bodyweight_box_jump",
  "depth_drop",
  "rebound_box_jump",
  "jump_lunge",
  "lateral_bound",
];

const ECCENTRIC_CONTROL_IDS: readonly string[] = [
  "nordic_curl",
  "nordic_curl_assisted",
  "rdl_dumbbell",
  "db_rdl",
  "eccentric_chin_ups",
  "reverse_lunge",
];

const HAMSTRING_RESILIENCE_IDS: readonly string[] = [
  "nordic_curl_assisted",
  "nordic_curl",
  "rdl_dumbbell",
  "db_rdl",
  "glute_ham_raise",
  "single_leg_glute_bridge",
];

const LEG_STRENGTH_IDS: readonly string[] = [
  "goblet_squat",
  "barbell_squat",
  "reverse_lunge",
  "bulgarian_split_squats",
  "stepup",
  "hip_thrust",
  "jump_lunge",
];

const BALANCE_IDS: readonly string[] = [
  "single_leg_glute_bridge",
  "stepup",
  "box_step_down",
  "pistol_squat",
  "assisted_pistol_squat",
  "dead_hang",
];

const THRESHOLD_IDS: readonly string[] = [
  "treadmill_tempo_run",
  "treadmill_cruise_intervals",
  "rower_threshold_intervals",
  "zone2_treadmill",
];

function buildEnrichmentMap(): Record<string, ExerciseMetadataPatch> {
  const out: Record<string, ExerciseMetadataPatch> = {};
  mergeTags(out, CORE_STABILITY_IDS, [
    "core_stability",
    "core_anti_rotation",
    "core_bracing",
  ]);
  mergeTags(out, AEROBIC_BASE_IDS, ["aerobic_base", "zone2_cardio"]);
  mergeTags(out, GRIP_ENDURANCE_IDS, ["grip_endurance", "grip_strength"]);
  mergeTags(out, FINGER_STRENGTH_IDS, ["finger_strength", "grip", "isometric_strength"]);
  mergeTags(out, SHOULDER_STABILITY_IDS, [
    "shoulder_stability",
    "scapular_control",
    "scapular_strength",
  ]);
  mergeTags(out, KNEE_STABILITY_IDS, ["knee_stability", "single_leg_strength"]);
  mergeTags(out, KNEE_RESILIENCE_IDS, ["knee_resilience", "knee_stability"]);
  mergeTags(out, LANDING_MECHANICS_IDS, ["landing_mechanics", "plyometric"]);
  mergeTags(out, ECCENTRIC_CONTROL_IDS, ["eccentric_control", "eccentric_strength"]);
  mergeTags(out, HAMSTRING_RESILIENCE_IDS, ["hamstring_resilience", "hamstrings"]);
  mergeTags(out, LEG_STRENGTH_IDS, ["leg_strength", "squat", "legs"]);
  mergeTags(out, BALANCE_IDS, ["balance", "single_leg"]);
  mergeTags(out, THRESHOLD_IDS, ["lactate_threshold", "threshold_tempo"]);
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
};
