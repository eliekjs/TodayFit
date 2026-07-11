/**
 * Curated conditioning intent tags for exercises with sparse direct-match coverage.
 * Applied after phase inference in exerciseDefinitionToGeneratorExercise.
 *
 * Sources: NSCA/sports-science consensus for hills (incline/stair/sled), sprint drills
 * (acceleration starts, shuttles — sprint intent only), plyometrics (box/depth/broad jump),
 * and Olympic derivatives for triple-extension power work.
 *
 * See docs/research/conditioning-intent-pool-expansion-2026-06.md
 */

import type { ExerciseMetadataPatch } from "../lib/exerciseMetadata/metadataOverrideTypes";

/** OTA / catalog sprint & COD conditioning drills → sprint intent only (not HIIT intervals). */
const SPRINT_CONDITIONING_DRILL_IDS: readonly string[] = [
  "2_point_start",
  "3_point_start",
  "40_start",
  "60_start",
  "accelerate_to_back_pedal",
  "arm_pump_drill",
  "ascending_descending_lateral_shuffle",
  "back_pedal_ball_drops",
  "back_pedal_to_accelerate",
  "backpedal_to_hip_flip",
  "ball_drops",
  "band_piston_sprint",
  "build_up_sprint",
  "butt_kick_run",
  "carioca_run",
  "crossover_run",
  "crouching_start",
  "dead_leg_run",
  "decel_series",
  "dowel_rod_cue",
  "falling_starts",
  "figure_8",
  "full_arc_or_circle_run",
  "ground_starts",
  "half_arc",
  "half_kneeling_arm_pump",
  "half_kneeling_starts",
  "high_knee_butt_kick_run",
  "high_knee_run",
  "jump_back_starts",
  "kick_up_starts",
  "l_drill",
  "lateral_butt_kick_run",
  "lateral_ground_start",
  "lateral_half_kneeling_starts",
  "lateral_high_knee_run",
  "lateral_power_shuffle",
  "lateral_short_shuttle",
  "lateral_shuffle",
  "lateral_shuffle_mirror_drill",
  "lateral_shuffle_to_ball_drop",
  "lateral_shuffle_to_react_sprint",
  "lateral_shuffle_to_sprint",
  "lateral_shuffle_with_ball_react_facing_or_against_wall",
  "lateral_wall_drill",
  "linear",
  "low_box_hip_switches",
  "low_hurdle_lateral_run",
  "low_hurdle_lateral_to_linear",
  "pad_cue",
  "partner_lean_start",
  "piston_run",
  "power_carioca",
  "power_shuffle_to_sprint",
  "pro_shuttle",
  "push_up_start",
  "quarter_arc",
  "resisted_crossover_run",
  "resisted_ground_starts",
  "resisted_lateral_shuffle",
  "short_shuttle",
  "single_leg_high_knee_mini_hurdles",
  "single_leg_high_knees",
  "single_leg_push_off",
  "single_leg_step_over",
  "single_leg_step_over_mini_hurdles",
  "stance_to_wall_drill",
  "stop_and_go",
  "thigh_pop_run",
  "wall_drill_double_switch",
  "wall_drill_single_switch",
  "wall_drill_timed",
  "wall_sprint_drill",
  "y_cut_drill",
  "y_cut_drill_with_reaction",
];

/** Sprint-only tags (skips, bounds, sprint intervals — excluded from intervals_hiit). */
const SPRINT_ONLY_EXTRA_IDS: readonly string[] = [
  "a_skip",
  "b_skip_with_power",
  "crossover_bounds",
  "jump_cut_drill",
  "jump_cut_drill_with_reaction",
  "straight_leg_bounds",
  "sled_resisted_sprint",
  "treadmill_sprint_intervals",
];

/** Hills / incline / stair / sled (no walking lunge — strength endurance, not hill stimulus). */
const HILLS_IDS: readonly string[] = [
  "stepup",
  "sled_push",
  "sled_march",
  "zone2_stair_climber",
  "treadmill_incline_walk",
  "treadmill_hill_run",
  "treadmill_hill_sprints",
  "stair_climber_repeats",
  "sprinter_step_up_launches",
  "sprinter_step_ups",
  "ff_sled_sprint",
];

/** Plyometric / jump power (lower body). */
const LOWER_POWER_PLYO_IDS: readonly string[] = [
  "box_jump",
  "jump_squat",
  "jump_lunge",
  "lateral_bound",
  "ff_bodyweight_box_jump",
  "ff_bodyweight_tuck_jump",
  "ff_bodyweight_skater_jump",
  "ff_bodyweight_bulgarian_split_squat_jump",
  "ff_superband_resisted_skater_jump",
  "ff_bodyweight_lateral_box_jump",
  "ff_bodyweight_alternating_lateral_box_jump",
  "ff_bodyweight_single_leg_box_jump",
  "approach_box_jump",
  "single_leg_box_jump",
  "rebound_box_jump",
];

/** Vertical jump emphasis (core-pool plyometrics on default gym profiles). */
const VERTICAL_JUMP_IDS: readonly string[] = [
  "box_jump",
  "ff_bodyweight_box_jump",
  "ff_bodyweight_tuck_jump",
  "approach_box_jump",
  "approach_vertical_jump",
  "approach_single_leg_vertical_jump",
  "approach_tuck_jump",
  "approach_tuck_jump_to_low_squat",
  "approach_tuck_jump_to_split_lunge",
  "approach_hurdle_jump",
  "single_leg_box_jump",
  "rebound_box_jump",
  "seated_box_jump",
  "depth_drop",
  "rebound_vertical_jump",
  "jump_squat",
  "squat_jump",
  "tuck_jump",
  "vertical_jump",
  "single_leg_vertical",
  "single_leg_tuck_jump",
  "knee_jump",
  "low_squat_to_vertical",
  "low_squat_jump",
  "lateral_squat_jump",
  "pogo_jump",
  "linear_pogo_jumps",
  "lateral_pogo_jumps",
  "mini_hurdle_hops",
  "low_lateral_hurdle_hop",
  "reactive_trap_bar_jumps",
  "ascending_knee_jump",
  "ascending_skater_jumps",
  "v_jumps",
];

/** Upper-body power / med-ball throws (bodyweight-friendly catalog entries). */
const UPPER_BODY_POWER_IDS: readonly string[] = [
  "med_ball_slam",
  "med_ball_broad_jumps",
  "med_ball_vertical_toss",
  "med_ball_underhand_toss",
  "med_ball_half_kneeling_vertical_toss",
  "seated_med_ball_toss",
  "staggered_stance_vertical_toss",
  "lateral_plyo_push_up",
  "alternating_staggered_plyo_push_up",
  "kneeling_side_slam",
  "side_slam",
];

/** Olympic / triple-extension barbell and KB derivatives. */
const OLYMPIC_TRIPLE_EXTENSION_IDS: readonly string[] = [
  "ff_barbell_power_clean",
  "ff_barbell_hang_power_clean",
  "ff_barbell_power_snatch",
  "ff_barbell_hang_power_snatch",
  "ff_barbell_power_clean_to_overhead_press",
  "ff_barbell_squat_clean",
  "ff_double_kettlebell_push_jerk",
  "ff_single_arm_kettlebell_push_jerk",
  "ff_single_arm_kettlebell_bottoms_up_push_jerk",
  "ff_single_arm_landmine_split_clean_to_split_jerk",
];

/** Metcon / HIIT staples (often power-first modality). */
const HIIT_POWER_IDS: readonly string[] = [
  "kb_swing",
  "burpee",
  "mountain_climber",
  "mountain_climber_starts_2",
  "ff_battle_rope_alternating_wave",
  "ff_battle_rope_power_slam",
  "ff_battle_rope_squat_jump_power_slam",
  "ff_battle_rope_power_slam_to_burpee",
  "ff_bodyweight_burpee",
  "ff_bodyweight_rolling_squat_burpee",
];

/** Threshold / tempo (LT2-ish): sustained hard aerobic, NOT zone 2 steady state. */
const THRESHOLD_IDS: readonly string[] = [
  "tempo_run",
  "treadmill_tempo_run",
  "treadmill_cruise_intervals",
  "rower_threshold_intervals",
  "bike_threshold_sweet_spot",
  "ski_erg_threshold_intervals",
];

/** zone2-only steady entries documented for audits (phase-4 no longer adds intervals_hiit to these). */
const ZONE2_STEADY_IDS: readonly string[] = ["zone2_treadmill", "zone2_bike", "zone2_rower"];
void ZONE2_STEADY_IDS;

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

function buildEnrichmentMap(): Record<string, ExerciseMetadataPatch> {
  const out: Record<string, ExerciseMetadataPatch> = {};

  mergeTags(out, SPRINT_CONDITIONING_DRILL_IDS, ["sprint"]);
  mergeTags(out, SPRINT_ONLY_EXTRA_IDS, ["sprint"]);
  mergeTags(out, HILLS_IDS, ["hills"]);
  mergeTags(out, LOWER_POWER_PLYO_IDS, ["lower_body_power_plyos", "intervals_hiit"]);
  mergeTags(out, VERTICAL_JUMP_IDS, ["vertical_jump", "lower_body_power_plyos"]);
  // Keep olympic distinct from plyos so dual sub-focus sessions can cover both intents.
  mergeTags(out, OLYMPIC_TRIPLE_EXTENSION_IDS, ["olympic_triple_extension"]);
  mergeTags(out, HIIT_POWER_IDS, ["intervals_hiit"]);
  mergeTags(out, THRESHOLD_IDS, ["threshold_tempo"]);
  mergeTags(out, UPPER_BODY_POWER_IDS, ["upper_body_power"]);
  mergeTags(out, ["treadmill_incline_walk"], ["zone2_aerobic_base", "hills"]);

  // zone2_treadmill keeps zone2 only; others get threshold as secondary (versatile ergs).
  out.zone2_treadmill = patch(["zone2_aerobic_base"]);

  return out;
}

/** Per-exercise patches keyed by catalog id. */
export const CONDITIONING_INTENT_ENRICHMENT: Record<string, ExerciseMetadataPatch> =
  buildEnrichmentMap();

export {
  SPRINT_CONDITIONING_DRILL_IDS,
  SPRINT_ONLY_EXTRA_IDS,
  HIIT_POWER_IDS,
  HILLS_IDS,
  THRESHOLD_IDS,
  LOWER_POWER_PLYO_IDS,
  VERTICAL_JUMP_IDS,
  OLYMPIC_TRIPLE_EXTENSION_IDS,
  UPPER_BODY_POWER_IDS,
};
