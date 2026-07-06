/**
 * Goal sub-focus intent tags (direct `attribute_tags` slugs) for low-coverage manual goals.
 * Applied in exerciseDefinitionToGeneratorExercise after conditioning intent enrichment.
 *
 * Evidence: NSCA Foundations warm-up (ankle/hip/T-spine mobilization, cat-cow segmental motion);
 * calisthenics progressions for pistol/shrimp/front lever (MPCalisthenics, Calisthenics Association);
 * Olympic derivatives for triple extension (NSCA S&C); threshold/tempo and hills (endurance coaching consensus).
 *
 * See docs/research/goal-intent-pool-expansion-2026-06.md
 */

import type { WorkoutTierPreference } from "../lib/types";
import type { ExerciseMetadataPatch } from "../lib/exerciseMetadata/metadataOverrideTypes";

const INTERMEDIATE_ACCESS: WorkoutTierPreference[] = ["beginner", "intermediate", "advanced"];

function patch(tags: string[], workoutLevels?: WorkoutTierPreference[]): ExerciseMetadataPatch {
  return {
    attribute_tags_append: tags,
    ...(workoutLevels?.length ? { workout_levels: workoutLevels } : {}),
  };
}

function mergePatch(
  acc: Record<string, ExerciseMetadataPatch>,
  ids: readonly string[],
  tags: string[],
  workoutLevels?: WorkoutTierPreference[]
): void {
  for (const id of ids) {
    const prev = acc[id]?.attribute_tags_append ?? [];
    const prevLevels = acc[id]?.workout_levels;
    acc[id] = patch(
      [...new Set([...prev, ...tags])],
      workoutLevels ?? prevLevels
    );
  }
}

/** Builtin + FF calisthenics leg / pistol progressions (default gym pool). */
const LEGS_PISTOL_IDS: readonly string[] = [
  "ff_bodyweight_pistol_squat",
  "ff_bodyweight_alternating_pistol_squat",
  "ff_bodyweight_shrimp_squat",
  "ff_bodyweight_box_pistol_squat",
  "ff_superband_assisted_pistol_squat",
  "pistol_squat",
  "shrimp_squat",
  "assisted_pistol_squat",
  "box_pistol_squat",
  "bulgarian_split_squats",
  "barbell_split_squat",
  "reverse_lunge",
  "walking_lunge",
  "stepup",
  "single_leg_glute_bridge",
  "jump_lunge",
];

const FRONT_LEVER_ADVANCED_IDS: readonly string[] = [
  "front_lever_tuck",
  "front_lever_advanced_tuck",
  "front_lever_negative",
  "skin_the_cat",
  "ff_bar_tuck_front_lever",
  "ff_bar_advanced_tuck_front_lever",
  "ff_bar_straddle_front_lever",
  "ff_ring_tuck_front_lever",
  "ff_ring_advanced_tuck_front_lever",
  "ff_ring_front_lever_pull_to_inverted_hang",
  "ff_bar_dead_hang_to_front_lever_pull_up",
  "pullup",
  "dead_hang",
];

const HANDSTAND_IDS: readonly string[] = [
  "wall_walk",
  "wall_handstand_hold",
  "wall_handstand",
  "handstand_push_up_wall",
  "pike_push_up",
  "incline_pike_push_up",
  "ff_bodyweight_wall_facing_handstand",
];

const DIPS_IDS: readonly string[] = [
  "bar_dip",
  "dips",
  "bench_dips",
  "tricep_dip_bench",
  "ff_bodyweight_dips",
  "ring_dip",
];

/** Hypertrophy balanced: compound / multi-region staples. */
const BALANCED_HYPERTROPHY_IDS: readonly string[] = [
  "goblet_squat",
  "barbell_squat",
  "rdl_dumbbell",
  "pushup",
  "pullup",
  "farmer_carry",
  "kb_swing",
  "deadlift",
  "hip_thrust",
  "bench_press",
];

/** Hip mobility / resilience (NSCA dynamic warm-up; half-kneeling hip flexor stretch evidence). */
const MOBILITY_HIPS_IDS: readonly string[] = [
  "worlds_greatest_stretch",
  "hip_90_90",
  "90_90_hip_switch",
  "pigeon_stretch",
  "frog_stretch",
  "figure_four_stretch",
  "hip_flexor_stretch",
  "standing_hip_circle",
  "inchworm",
  "glute_bridge",
  "single_leg_glute_bridge",
  "clamshell",
  "fire_hydrant",
];

/** T-spine / thoracic (NSCA quadruped rotations; segmental cat-cow). */
const MOBILITY_T_SPINE_IDS: readonly string[] = [
  "cat_camel",
  "t_spine_rotation",
  "open_book_ts",
  "thread_needle",
  "worlds_greatest_stretch",
  "quadruped_extension_rotation",
  "ff_superband_shoulder_dislocates",
  "ff_superband_pull_apart",
];

/** Ankle dorsiflexion / calf complex (NSCA ankle mobilization in warm-up; Hinge Health PT consensus). */
const MOBILITY_ANKLES_IDS: readonly string[] = [
  "calf_stretch_wall",
  "soleus_stretch_wall",
  "ankle_circles",
  "ankle_cars",
  "wall_ankle_mobilization",
  "quadruped_sit_back",
  "bodyweight_calf_raise",
  "single_leg_calf_raise",
  "ff_bodyweight_calf_raise",
  "standing_quad_stretch",
  "half_kneeling_achilles_ankle_rockers",
  "kneeling_dorsiflexion_stretch",
  "ankle_dorsiflexion_stretch",
  "band_ankle_stretch",
];

/** Knee flexion / quad–hamstring mobility (NSCA lower-body warm-up; patellofemoral-friendly ROM). */
const MOBILITY_KNEES_IDS: readonly string[] = [
  "standing_quad_stretch",
  "quad_stretch_side_lying",
  "standing_hamstring_stretch",
  "half_kneeling_achilles_ankle_rockers",
  "kneeling_dorsiflexion_stretch",
  "kneeling_tibial_stretch",
  "banded_lying_hamstring_stretch",
  "foam_roll_quad",
  "foam_roll_it_band",
  "quadruped_sit_back",
  "hip_flexor_stretch",
  "cossack_squat",
  "90_90_stretch",
  "ankle_dorsiflexion_stretch",
  "wall_ankle_mobilization",
  "straight_leg_raise",
];

/** Elbow flexion/extension mobility (epicondylalgia rehab adjacent — gentle ROM, not loading). */
const MOBILITY_ELBOWS_IDS: readonly string[] = [
  "bicep_stretch",
  "doorway_bicep_stretch",
  "triceps_stretch_overhead",
  "cross_body_stretch",
  "internal_external_rotations",
  "sleeper_internal_external_stretch",
  "band_ir_er",
  "sleeper_stretch",
  "prone_external_rotations",
  "push_up_plus",
  "lat_stretch",
  "lat_stretch_door",
  "wall_slide",
  "scapular_push_up",
  "chest_stretch_doorway",
  "cactus_stretch",
  "banded_pec_stretch",
  "overhead_band_lat_stretch",
  "dowel_lat_stretch_rockers",
];

/** Wrist / forearm mobility (climbing & desk-worker prep; flexor/extensor stretches). */
const MOBILITY_WRISTS_IDS: readonly string[] = [
  "wrist_circles",
  "arm_circles",
  "finger_extensions",
  "wrist_flexor_stretch",
  "wrist_extensor_stretch",
  "tabletop_wrist_stretch",
  "reverse_wrist_stretch",
  "forearm_pronation_supination",
  "bicep_stretch",
  "internal_external_rotations",
  "sleeper_internal_external_stretch",
  "band_pullapart",
  "ff_superband_shoulder_dislocates",
  "ff_resistance_band_shoulder_dislocates",
  "scapular_push_up",
];

/** Lumbar / core stability continuum (NSCA PTQ mobility-stability; bird-dog, anti-rotation). */
const MOBILITY_LOWER_BACK_IDS: readonly string[] = [
  "cat_camel",
  "childs_pose",
  "bird_dog",
  "dead_bug",
  "glute_bridge",
  "pallof_press",
  "cable_woodchops",
  "reverse_cable_woodchops",
  "superman_hold",
  "reverse_hyper",
];

const RESILIENCE_HIPS_IDS = MOBILITY_HIPS_IDS;
const RESILIENCE_T_SPINE_IDS = MOBILITY_T_SPINE_IDS;
const RESILIENCE_ANKLES_IDS = MOBILITY_ANKLES_IDS;
const RESILIENCE_LOWER_BACK_IDS = MOBILITY_LOWER_BACK_IDS;
const RESILIENCE_KNEES_IDS = MOBILITY_KNEES_IDS;
const RESILIENCE_ELBOWS_IDS = MOBILITY_ELBOWS_IDS;
const RESILIENCE_WRISTS_IDS = MOBILITY_WRISTS_IDS;

const RESILIENCE_FULL_BODY_IDS: readonly string[] = [
  "worlds_greatest_stretch",
  "inchworm",
  "breathing_diaphragmatic",
  "cat_camel",
  "childs_pose",
];

const MOBILITY_FULL_BODY_IDS: readonly string[] = [
  "worlds_greatest_stretch",
  "inchworm",
  "cat_camel",
  "90_90_hip_switch",
];

/** Endurance durability: long steady + tissue tolerance (isometric / stability). */
const DURABILITY_IDS: readonly string[] = [
  "zone2_treadmill",
  "zone2_bike",
  "zone2_rower",
  "zone2_stair_climber",
  "treadmill_incline_walk",
  "farmer_carry",
  "dead_hang",
  "bear_crawl",
  "plank",
  "side_plank",
  "bird_dog",
  "glute_bridge",
];

/** Olympic / triple extension — intermediate-accessible KB/DB derivatives (NSCA Essentials). */
const OLYMPIC_TRIPLE_EXTENSION_GOAL_IDS: readonly string[] = [
  "kettlebell_dead_clean",
  "dumbbell_hang_clean",
  "kettlebell_high_pull",
  "kb_swing",
  "jump_squat",
  "box_jump",
  "med_ball_slam",
];

const UPPER_BODY_POWER_GOAL_IDS: readonly string[] = [
  "med_ball_slam",
  "med_ball_broad_jumps",
  "med_ball_vertical_toss",
  "med_ball_underhand_toss",
  "kneeling_side_slam",
  "side_slam",
  "lateral_plyo_push_up",
  "crossover_bounds",
  "jump_cut_drill",
  "dumbbell_push_press",
];

/** Pistol / lever progressions wrongly inferred as advanced-only — reopen for intermediate default tier. */
const INTERMEDIATE_TIER_OVERRIDE_IDS: readonly string[] = [
  ...LEGS_PISTOL_IDS,
  ...FRONT_LEVER_ADVANCED_IDS.filter((id) => !id.startsWith("ff_bar_straddle")),
  ...HANDSTAND_IDS,
  ...DIPS_IDS,
  "box_pistol_squat",
];

/**
 * Exercises promoted to `eligible_core` so mobility/calisthenics/recovery sub-focus pools
 * are usable on default gym profiles (see scripts/promoteGoalCoverageEligibility.ts).
 */
export const GOAL_COVERAGE_ELIGIBLE_CORE_IDS: readonly string[] = [
  "worlds_greatest_stretch",
  "cat_camel",
  "t_spine_rotation",
  "hip_90_90",
  "90_90_hip_switch",
  "pigeon_stretch",
  "frog_stretch",
  "figure_four_stretch",
  "hip_flexor_stretch",
  "standing_hip_circle",
  "childs_pose",
  "thread_needle",
  "open_book_ts",
  "standing_hamstring_stretch",
  "standing_quad_stretch",
  "calf_stretch_wall",
  "soleus_stretch_wall",
  "wall_ankle_mobilization",
  "quadruped_sit_back",
  "inchworm",
  "breathing_diaphragmatic",
  "bird_dog",
  "ankle_circles",
  "ankle_cars",
  "half_kneeling_achilles_ankle_rockers",
  "kneeling_dorsiflexion_stretch",
  "kneeling_tibial_stretch",
  "banded_lying_hamstring_stretch",
  "quad_stretch_side_lying",
  "foam_roll_it_band",
  "triceps_stretch_overhead",
  "wrist_flexor_stretch",
  "wrist_extensor_stretch",
  "bicep_stretch",
  "internal_external_rotations",
  "sleeper_internal_external_stretch",
  "prone_external_rotations",
  "cossack_squat",
  "90_90_stretch",
  "straight_leg_raise",
  "push_up_plus",
  "lat_stretch",
  "cactus_stretch",
  "banded_pec_stretch",
  "overhead_band_lat_stretch",
  "dowel_lat_stretch_rockers",
  "arm_circles",
  "forearm_pronation_supination",
  "tabletop_wrist_stretch",
  "reverse_wrist_stretch",
  "doorway_bicep_stretch",
  "wrist_circles",
  "finger_extensions",
  "band_pullapart",
  "scapular_push_up",
  "cross_body_stretch",
  "sleeper_stretch",
  "band_ir_er",
  "lat_stretch_door",
  "wall_slide",
  "chest_stretch_doorway",
  "foam_roll_quad",
  "ff_superband_shoulder_dislocates",
  "ff_resistance_band_shoulder_dislocates",
  "front_lever_tuck",
  "front_lever_advanced_tuck",
  "front_lever_negative",
  "skin_the_cat",
  "pallof_press",
  "pistol_squat",
  "shrimp_squat",
  "assisted_pistol_squat",
  "box_pistol_squat",
  "wall_handstand_hold",
  "handstand_push_up_wall",
  "kettlebell_dead_clean",
  "dumbbell_hang_clean",
  "kettlebell_high_pull",
  "dumbbell_push_press",
  "ff_ring_front_lever_pull_to_inverted_hang",
  "ff_bar_tuck_front_lever",
  "ff_bar_advanced_tuck_front_lever",
  "quadruped_extension_rotation",
];

function buildEnrichmentMap(): Record<string, ExerciseMetadataPatch> {
  const out: Record<string, ExerciseMetadataPatch> = {};

  mergePatch(out, LEGS_PISTOL_IDS, ["legs_pistol", "single_leg"]);
  mergePatch(out, FRONT_LEVER_ADVANCED_IDS, ["front_lever_advanced", "pull"]);
  mergePatch(out, HANDSTAND_IDS, ["handstand"]);
  mergePatch(out, DIPS_IDS, ["dips"]);
  mergePatch(out, BALANCED_HYPERTROPHY_IDS, ["balanced", "compound"]);

  mergePatch(out, MOBILITY_HIPS_IDS, ["hips", "hip_mobility"], INTERMEDIATE_ACCESS);
  mergePatch(out, MOBILITY_T_SPINE_IDS, ["t_spine", "thoracic_mobility"], INTERMEDIATE_ACCESS);
  mergePatch(out, MOBILITY_ANKLES_IDS, ["ankles", "ankle_stability"], INTERMEDIATE_ACCESS);
  mergePatch(out, MOBILITY_KNEES_IDS, ["knees", "knee_mobility"], INTERMEDIATE_ACCESS);
  mergePatch(out, MOBILITY_ELBOWS_IDS, ["elbows", "elbow_mobility"], INTERMEDIATE_ACCESS);
  mergePatch(out, MOBILITY_WRISTS_IDS, ["wrists", "wrist_mobility"], INTERMEDIATE_ACCESS);
  mergePatch(out, MOBILITY_LOWER_BACK_IDS, ["lower_back", "core_stability"], INTERMEDIATE_ACCESS);
  mergePatch(out, MOBILITY_FULL_BODY_IDS, ["full_body", "mobility"], INTERMEDIATE_ACCESS);

  mergePatch(out, RESILIENCE_HIPS_IDS, ["hips"], INTERMEDIATE_ACCESS);
  mergePatch(out, RESILIENCE_T_SPINE_IDS, ["t_spine"], INTERMEDIATE_ACCESS);
  mergePatch(out, RESILIENCE_ANKLES_IDS, ["ankles"], INTERMEDIATE_ACCESS);
  mergePatch(out, RESILIENCE_KNEES_IDS, ["knees"], INTERMEDIATE_ACCESS);
  mergePatch(out, RESILIENCE_ELBOWS_IDS, ["elbows"], INTERMEDIATE_ACCESS);
  mergePatch(out, RESILIENCE_WRISTS_IDS, ["wrists"], INTERMEDIATE_ACCESS);
  mergePatch(out, RESILIENCE_LOWER_BACK_IDS, ["lower_back"], INTERMEDIATE_ACCESS);
  mergePatch(out, RESILIENCE_FULL_BODY_IDS, ["full_body", "recovery"], INTERMEDIATE_ACCESS);

  mergePatch(out, DURABILITY_IDS, ["durability", "endurance"]);

  mergePatch(out, OLYMPIC_TRIPLE_EXTENSION_GOAL_IDS, ["olympic_triple_extension", "power"], INTERMEDIATE_ACCESS);
  mergePatch(out, UPPER_BODY_POWER_GOAL_IDS, ["upper_body_power", "power"], INTERMEDIATE_ACCESS);

  mergePatch(out, INTERMEDIATE_TIER_OVERRIDE_IDS, [], INTERMEDIATE_ACCESS);

  return out;
}

export const GOAL_INTENT_ENRICHMENT: Record<string, ExerciseMetadataPatch> = buildEnrichmentMap();

export {
  LEGS_PISTOL_IDS,
  FRONT_LEVER_ADVANCED_IDS,
  MOBILITY_HIPS_IDS,
  MOBILITY_ANKLES_IDS,
  MOBILITY_KNEES_IDS,
  MOBILITY_ELBOWS_IDS,
  MOBILITY_WRISTS_IDS,
  DURABILITY_IDS,
  OLYMPIC_TRIPLE_EXTENSION_GOAL_IDS,
  BALANCED_HYPERTROPHY_IDS,
};
