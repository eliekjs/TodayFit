/**
 * Joint-health exercise tagging for sub-focus matching (runtime enrichment).
 * Evidence: terminal knee extension, wall sit / Spanish squat isometrics, step-downs,
 * split-squat progressions, hip-knee stability (Copenhagen/clamshell/lateral band walks),
 * calf/tibialis support (SportsRehab VMO program; IJSPT quad rehab framework).
 *
 * Tags per region:
 * - `{region}_health` — required for strict sub-focus pool matching
 * - `{region}_activation` | `{region}_strength` | `{region}_stability` | `{region}_mobility` — slot roles
 *
 * Shoulder evidence: scapular stabilization + rotator cuff motor control (JOSPT 2024 SR;
 * Frontiers 2024 SAPS meta-analysis; targeted SSE RCTs).
 *
 * Hip evidence: FAI / hip OA rehab — controlled articular rotation (CARs), 90/90 switches,
 * glute med activation (clamshell, fire hydrant, lateral band walks), Copenhagen adduction
 * for groin/hip stability, progressive hip airplane and bridge isometrics (BJSM groin rehab;
 * JOSPT hip-related exercise frameworks).
 *
 * Ankle/foot evidence: lateral ankle sprain rehab — ankle CARs, tibialis anterior activation,
 * controlled calf raises (gastroc/soleus), balance/step-down progressions, achilles/DF mobility
 * (JOSPT lateral ankle instability guidelines; chronic ankle instability exercise reviews).
 *
 * Back/spine evidence: McGill big-3 adjacent progressions — dead bug, bird dog, side plank;
 * anti-rotation (Pallof), thoracic mobility (open book, thread the needle), segmental cat-cow,
 * diaphragmatic breathing; avoid loaded flexion / max extension early (JOSPT LBP clinical guidelines;
 * McGill spine stability framework).
 *
 * Elbow/wrist evidence: lateral/medial epicondylalgia rehab — progressive eccentric wrist flexor/extensor
 * loading, isometric grip progressions (dead hang), forearm pronation/supination prep, upstream scapular
 * control (serratus, band pull-aparts); avoid heavy elbow-extension / compressive gripping early
 * (BJSM tendinopathy consensus; JOSPT epicondylalgia exercise frameworks).
 */

import type { ExerciseMetadataPatch } from "../lib/exerciseMetadata/metadataOverrideTypes";

function patch(
  tags: string[],
  extra?: Partial<ExerciseMetadataPatch>
): ExerciseMetadataPatch {
  return {
    attribute_tags_append: tags,
    ...extra,
  };
}

function merge(
  acc: Record<string, ExerciseMetadataPatch>,
  ids: readonly string[],
  tags: string[],
  extra?: Partial<ExerciseMetadataPatch>
): void {
  for (const id of ids) {
    const prev = acc[id]?.attribute_tags_append ?? [];
    const mergedTags = [...new Set([...prev, ...tags])];
    acc[id] = {
      ...acc[id],
      ...extra,
      attribute_tags_append: mergedTags,
    };
  }
}

/** Bodyweight / band-only joint prep: quad setting, hip-knee mobility, light ROM, prep stretches. */
const KNEE_ACTIVATION_IDS = [
  // Quad / VMO setting
  "straight_leg_raise",
  "lying_leg_raise",
  "quad_set",
  "terminal_knee_extension",
  "band_terminal_knee_extension",
  "ff_bodyweight_wall_supported_tibialis_raise",
  "wall_ankle_mobilization",
  // Hip–knee mobility prep
  "hip_90_90",
  "90_90_hip_switch",
  "90_90_stretch",
  // Light dynamic ROM (bodyweight)
  "bodyweight_squat",
  "ff_bodyweight_squat",
  "ff_bodyweight_squat_to_bench",
  "ff_bodyweight_forward_lunge",
  "ff_bodyweight_cossack_squat",
  "ff_bodyweight_alternating_cossack_squat",
  "ff_bodyweight_low_switch_cossack_squat",
] as const;

/** Prep-appropriate stretches (also eligible as mobility finisher). */
const KNEE_PREP_STRETCH_IDS = [
  "standing_quad_stretch",
  "quad_stretch_side_lying",
  "calf_stretch_wall",
  "calf_stretch_standing",
] as const;

/** Isometric & controlled quad loading */
const KNEE_STRENGTH_IDS = [
  "wall_sit",
  "spanish_squat_iso",
  "spanish_squats",
  "ff_bodyweight_wall_sit",
  "ff_miniband_wall_sit_hip_abduction",
  "goblet_squat",
  "box_squat",
  "mini_squat",
  "leg_extension",
] as const;

/** Unilateral control, step-downs, hip-knee stability */
const KNEE_STABILITY_IDS = [
  "split_squat",
  "bulgarian_split_squat",
  "bulgarian_split_squats",
  "barbell_split_squat",
  "stepup",
  "step_up",
  "lateral_box_step",
  "iso_step_down",
  "reverse_lunge",
  "step_back_lunge",
  "deficit_reverse_lunge",
  "walking_lunge",
  "clamshell",
  "banded_lateral_walk",
  "monster_walk",
  "lateral_band_walk",
  "single_leg_glute_bridge",
  "glute_bridge",
  "single_leg_calf_raise",
  "bodyweight_calf_raise",
  "standing_calf_raise",
  "seated_calf_raise",
  "calf_raise",
  "tibialis_raise",
  "ff_superband_single_leg_tibialis_raise",
  "ff_bodyweight_wall_supported_tibialis_raise",
] as const;

/** Knee-adjacent mobility finishers only (not thoracic / full-body flows) */
const KNEE_MOBILITY_FINISHER_IDS = [
  "standing_hamstring_stretch",
  "foam_roll_quad",
  "foam_roll_it_band",
] as const;

/** Bodyweight / band scapular + cuff prep (no loads, cables, or machines). */
const SHOULDER_ACTIVATION_IDS = [
  "arm_circles",
  "wall_slide",
  "wall_slides_with_lift_off",
  "wall_angel",
  "ff_bodyweight_standing_wall_angels",
  "ff_bodyweight_seated_wall_angels",
  "scapular_slides",
  "wall_scap_mobility",
  "band_pullapart",
  "band_pull_apart",
  "ff_resistance_band_pull_apart",
  "ff_superband_pull_apart",
  "ff_superband_shoulder_dislocates",
  "prone_external_rotations",
  "ff_miniband_standing_shoulder_external_rotation",
  "band_ir_er",
  "push_up_plus",
  "band_shoulder_dislocations",
  "prone_arm_circles",
  "ff_resistance_band_shoulder_dislocates",
] as const;

/** Prep stretches for shoulder / pec / lat (also usable as mobility finisher). */
const SHOULDER_PREP_STRETCH_IDS = [
  "chest_stretch_doorway",
  "pec_stretch_wall",
  "banded_pec_stretch",
] as const;

/** Controlled cuff + scapular loading (bands / light bodyweight). */
const SHOULDER_STRENGTH_IDS = [
  "band_face_pull_external_rotation",
  "face_pull_band",
  "ff_resistance_band_half_kneeling_face_pull",
  "ff_resistance_band_cuban_press",
  "ff_resistance_band_tall_kneeling_cuban_press",
  "seated_shoulder_external_rotation",
  "band_internal_rotation",
  "prone_itys",
] as const;

/** Scapular stability & unilateral shoulder control. */
const SHOULDER_STABILITY_IDS = [
  "scapular_push_up",
  "scapular_pull_up",
  "ff_ring_scapular_pull_up",
  "band_external_rotation",
  "cuban_press",
  "ff_single_arm_resistance_band_standing_shoulder_external_rotation",
] as const;

/** Shoulder-adjacent mobility finishers. */
const SHOULDER_MOBILITY_FINISHER_IDS = [
  "sleeper_stretch",
  "sleeper_internal_external_stretch",
  "lat_stretch_kneeling",
  "thread_the_needle",
  "thread_needle",
  "banded_lat_stretch",
  "lat_stretch",
  "lat_stretch_door",
  "overhead_band_lat_stretch",
] as const;

/** Bodyweight / band hip mobility + glute med wake-up (no loads, cables, or machines). */
const HIP_ACTIVATION_IDS = [
  "hip_90_90",
  "90_90_hip_switch",
  "hip_cars",
  "cossack_squat",
  "ff_bodyweight_cossack_squat",
  "ff_bodyweight_alternating_cossack_squat",
  "ff_bodyweight_low_switch_cossack_squat",
  "worlds_greatest_stretch",
  "clamshell",
  "ff_bodyweight_side_lying_clamshell",
  "ff_miniband_side_lying_clamshell",
  "fire_hydrant",
  "ff_bodyweight_fire_hydrant",
  "ff_miniband_fire_hydrant",
  "hip_circles",
  "quadruped_hip_circle",
  "standing_hip_circle",
  "lying_hip_rotation",
  "banded_hip_flexor_stretch",
] as const;

/** Hip opener stretches (mobility finisher; not activation slot). */
const HIP_PREP_STRETCH_IDS = [
  "hip_flexor_stretch",
  "kneeling_hip_flexor_stretch",
  "pigeon_stretch",
  "pigeon_pose",
  "elevated_pigeon",
  "frog_stretch",
  "frog",
  "dynamic_frog",
  "figure_four_stretch",
  "reclined_figure_four",
  "90_90_stretch",
] as const;

/** Controlled glute / hip isometrics and light loading. */
const HIP_STRENGTH_IDS = [
  "glute_bridge",
  "glute_bridge_hold",
  "ff_bodyweight_glute_bridge",
  "ff_miniband_glute_bridge",
  "band_glute_bridge_with_abduction",
  "ff_miniband_glute_bridge_hip_abduction",
  "hamstring_focus_glute_bridge",
  "ff_bodyweight_feet_elevated_glute_bridge",
] as const;

/** Single-leg control, Copenhagen, band walks, hip airplane. */
const HIP_STABILITY_IDS = [
  "hip_airplanes",
  "ff_bodyweight_wall_assisted_hip_airplane",
  "ff_bodyweight_plate_assisted_hip_airplane",
  "ff_bodyweight_copenhagen_plank",
  "ff_bodyweight_bent_knee_copenhagen_plank",
  "single_leg_glute_bridge",
  "ff_bodyweight_single_leg_glute_bridge",
  "ff_miniband_thigh_lateral_walk",
  "ff_miniband_thigh_monster_walk",
  "lateral_monster_walk",
  "monster_walks",
] as const;

/** Hip-adjacent mobility finishers. */
const HIP_MOBILITY_FINISHER_IDS = [
  "pigeon_stretch",
  "frog_stretch",
  "figure_four_stretch",
  "hip_flexor_stretch",
  "90_90_stretch",
  "lying_hip_rotation",
  "kneeling_hip_flexor_stretch",
] as const;

/** Bodyweight / band ankle & foot prep (no loads, cables, or machines). */
const ANKLE_FOOT_ACTIVATION_IDS = [
  "ankle_cars",
  "ankle_circles",
  "half_kneeling_achilles_ankle_rockers",
  "heel_walks",
  "toe_walks",
  "heel_to_toe_walks",
  "band_ankle_stretch",
  "banded_ankle_mob",
  "tibialis_raise",
  "ff_bodyweight_wall_supported_tibialis_raise",
] as const;

/** Controlled calf / tibialis loading. */
const ANKLE_FOOT_STRENGTH_IDS = [
  "bodyweight_calf_raise",
  "ff_bodyweight_calf_raise",
  "standing_calf_raise",
  "standing_calf_raise_on_wall",
  "seated_calf_raise",
  "ff_superband_single_leg_tibialis_raise",
] as const;

/** Single-leg balance, step-down, toe balance. */
const ANKLE_FOOT_STABILITY_IDS = [
  "single_leg_calf_raise",
  "ff_bodyweight_single_leg_calf_raise",
  "single_leg_wall_calf_raise",
  "iso_step_down",
  "ff_bodyweight_toe_balance_squat",
] as const;

/** Ankle-adjacent mobility finishers. */
const ANKLE_FOOT_MOBILITY_FINISHER_IDS = [
  "calf_stretch_wall",
  "calf_stretch_standing",
  "ankle_dorsiflexion_stretch",
  "kneeling_dorsiflexion_stretch",
] as const;

/** Bodyweight / band spine prep — segmental mobility, breathing, thoracic rotation. */
const BACK_SPINE_ACTIVATION_IDS = [
  "cat_camel",
  "breathing_diaphragmatic",
  "quadruped_rockback",
  "t_spine_rotation",
  "quadruped_extension_rotation",
  "open_books",
  "open_book_ts",
  "thoracic_open_books",
  "thread_the_needle",
  "thread_needle",
  "bird_dog_prep",
  "dead_bug_prep",
] as const;

/** Anti-flexion / anti-rotation strength (McGill-adjacent). */
const BACK_SPINE_STRENGTH_IDS = [
  "dead_bug",
  "ff_bodyweight_dead_bug",
  "ff_miniband_dead_bug",
  "ff_superband_dead_bug",
  "bird_dog",
  "ff_bodyweight_bird_dog",
  "ff_bodyweight_ipsilateral_bird_dog",
  "glute_bridge",
  "ff_bodyweight_glute_bridge",
  "ff_bodyweight_prone_cobra",
] as const;

/** Side plank, Pallof, unilateral trunk control. */
const BACK_SPINE_STABILITY_IDS = [
  "side_plank",
  "ff_bodyweight_side_plank",
  "ff_superband_pallof_press",
  "ff_superband_half_kneeling_pallof_press",
  "ff_superband_tall_kneeling_pallof_press",
  "kneeling_pallof_press",
  "pallof_press",
] as const;

/** Spine-adjacent mobility finishers. */
const BACK_SPINE_MOBILITY_FINISHER_IDS = [
  "childs_pose",
  "thread_the_needle",
  "thread_needle",
  "open_books",
  "thoracic_open_books",
] as const;

/** Bodyweight / band wrist & forearm prep + upstream scapular wake-up. */
const ELBOW_WRIST_ACTIVATION_IDS = [
  "wrist_circles",
  "finger_extensions",
  "band_pullapart",
  "band_pull_apart",
  "ff_resistance_band_pull_apart",
  "ff_superband_pull_apart",
  "diagonal_band_pull_aparts",
  "push_up_plus",
  "scapular_push_up",
  "prone_external_rotations",
  "ff_miniband_standing_shoulder_external_rotation",
  "band_ir_er",
  "internal_external_rotations",
] as const;

/** Eccentric / isometric forearm & grip loading. */
const ELBOW_WRIST_STRENGTH_IDS = [
  "wrist_curl",
  "ff_barbell_seated_wrist_curl",
  "ff_barbell_seated_reverse_grip_wrist_curl",
  "reverse_curl",
  "hammer_curl",
  "dead_hang",
  "ff_ring_dead_hang",
  "ff_bar_dead_hang",
  "farmer_carry",
] as const;

/** Unilateral grip, forearm isometrics, anti-rotation carries. */
const ELBOW_WRIST_STABILITY_IDS = [
  "suitcase_carry",
  "ff_single_arm_dumbbell_suitcase_carry",
  "ff_bodyweight_forearm_plank",
  "ff_stability_ball_single_arm_forearm_plank",
  "ff_bodyweight_kneeling_forearm_plank",
] as const;

/** Forearm / wrist mobility finishers. */
const ELBOW_WRIST_MOBILITY_FINISHER_IDS = [
  "cross_body_stretch",
  "shoulder_cross_body_stretch",
] as const;

function buildJointHealthEnrichmentMap(): Record<string, ExerciseMetadataPatch> {
  const out: Record<string, ExerciseMetadataPatch> = {};

  merge(out, KNEE_ACTIVATION_IDS, ["knee_health", "knee_activation"]);
  merge(
    out,
    [
      "straight_leg_raise",
      "lying_leg_raise",
      "quad_set",
      "terminal_knee_extension",
      "band_terminal_knee_extension",
      "ff_bodyweight_wall_supported_tibialis_raise",
    ],
    ["terminal_knee_extension", "vmo"],
    { stimulus_append: ["isometric"] }
  );
  merge(out, KNEE_PREP_STRETCH_IDS, ["knee_health", "knee_activation", "knee_mobility"]);
  merge(out, KNEE_STRENGTH_IDS, ["knee_health", "knee_strength", "quad_strength", "patellar_tolerance"], {
    stimulus_append: ["isometric"],
  });
  merge(out, KNEE_STABILITY_IDS, ["knee_health", "knee_stability", "single_leg", "hip_stability"], {
    stimulus_append: ["single_leg"],
  });
  merge(out, KNEE_MOBILITY_FINISHER_IDS, ["knee_health", "knee_mobility"]);
  merge(out, ["standing_hamstring_stretch", "standing_quad_stretch", "calf_stretch_wall", "calf_stretch_standing"], [
    "knee_mobility",
  ]);

  merge(out, SHOULDER_ACTIVATION_IDS, ["shoulder_health", "shoulder_activation", "scapular_control"]);
  merge(
    out,
    [
      "prone_external_rotations",
      "ff_miniband_standing_shoulder_external_rotation",
      "band_ir_er",
      "band_face_pull_external_rotation",
      "seated_shoulder_external_rotation",
      "band_internal_rotation",
      "band_external_rotation",
    ],
    ["rotator_cuff"],
    { stimulus_append: ["scapular_control"] }
  );
  merge(out, SHOULDER_PREP_STRETCH_IDS, ["shoulder_health", "shoulder_mobility"]);
  merge(out, SHOULDER_STRENGTH_IDS, ["shoulder_health", "shoulder_strength", "rotator_cuff", "scapular_control"], {
    stimulus_append: ["scapular_control"],
  });
  merge(out, SHOULDER_STABILITY_IDS, ["shoulder_health", "shoulder_stability", "scapular_control", "shoulder_stability"], {
    stimulus_append: ["scapular_control"],
  });
  merge(out, SHOULDER_MOBILITY_FINISHER_IDS, ["shoulder_health", "shoulder_mobility"]);
  merge(out, ["sleeper_stretch", "lat_stretch_kneeling", "thread_the_needle", "pec_stretch_wall"], ["shoulder_mobility"]);

  merge(out, HIP_ACTIVATION_IDS, ["hip_health", "hip_activation", "hip_mobility", "glute_med"]);
  merge(
    out,
    ["clamshell", "ff_bodyweight_side_lying_clamshell", "ff_miniband_side_lying_clamshell", "fire_hydrant", "ff_bodyweight_fire_hydrant", "ff_miniband_fire_hydrant"],
    ["glute_med", "hip_stability"],
    { stimulus_append: ["isometric"] }
  );
  merge(out, HIP_PREP_STRETCH_IDS, ["hip_health", "hip_mobility"]);
  merge(out, HIP_STRENGTH_IDS, ["hip_health", "hip_strength", "glute_med", "hip_stability"], {
    stimulus_append: ["isometric"],
  });
  merge(out, HIP_STABILITY_IDS, ["hip_health", "hip_stability", "glute_med", "single_leg", "adductor"], {
    stimulus_append: ["single_leg"],
  });
  merge(out, HIP_MOBILITY_FINISHER_IDS, ["hip_health", "hip_mobility"]);
  merge(out, ["worlds_greatest_stretch", "90_90_stretch", "pigeon_stretch", "frog_stretch"], ["hip_mobility"]);

  merge(out, ANKLE_FOOT_ACTIVATION_IDS, ["ankle_foot_health", "ankle_foot_activation", "tibialis", "ankle_stability"]);
  merge(
    out,
    ["tibialis_raise", "ff_bodyweight_wall_supported_tibialis_raise", "ff_superband_single_leg_tibialis_raise"],
    ["tibialis"],
    { stimulus_append: ["isometric"] }
  );
  merge(out, ANKLE_FOOT_STRENGTH_IDS, ["ankle_foot_health", "ankle_foot_strength", "calf", "tibialis"], {
    stimulus_append: ["isometric", "eccentric"],
  });
  merge(out, ANKLE_FOOT_STABILITY_IDS, ["ankle_foot_health", "ankle_foot_stability", "balance", "single_leg"], {
    stimulus_append: ["single_leg"],
  });
  merge(out, ANKLE_FOOT_MOBILITY_FINISHER_IDS, ["ankle_foot_health", "ankle_foot_mobility"]);
  merge(out, ["calf_stretch_wall", "calf_stretch_standing", "ankle_dorsiflexion_stretch", "kneeling_dorsiflexion_stretch"], ["ankle_foot_mobility"]);

  merge(out, BACK_SPINE_ACTIVATION_IDS, ["back_spine_health", "back_spine_activation", "thoracic_mobility"]);
  merge(
    out,
    ["dead_bug", "ff_bodyweight_dead_bug", "ff_miniband_dead_bug", "ff_superband_dead_bug", "bird_dog", "ff_bodyweight_bird_dog"],
    ["core_stability", "anti_rotation"],
    { stimulus_append: ["anti_flexion", "trunk_anti_rotation"] }
  );
  merge(out, BACK_SPINE_STRENGTH_IDS, ["back_spine_health", "back_spine_strength", "core_stability"], {
    stimulus_append: ["anti_flexion"],
  });
  merge(out, BACK_SPINE_STABILITY_IDS, ["back_spine_health", "back_spine_stability", "core_stability", "anti_rotation"], {
    stimulus_append: ["trunk_anti_rotation", "isometric"],
  });
  merge(out, BACK_SPINE_MOBILITY_FINISHER_IDS, ["back_spine_health", "back_spine_mobility", "thoracic_mobility"]);
  merge(out, ["childs_pose", "thread_the_needle", "open_books"], ["back_spine_mobility"]);

  merge(out, ELBOW_WRIST_ACTIVATION_IDS, ["elbow_wrist_health", "elbow_wrist_activation", "scapular_control"]);
  merge(
    out,
    ["finger_extensions", "wrist_curl", "ff_barbell_seated_wrist_curl", "ff_barbell_seated_reverse_grip_wrist_curl", "reverse_curl"],
    ["forearm", "tendon_loading"],
    { stimulus_append: ["eccentric"] }
  );
  merge(
    out,
    ["dead_hang", "ff_ring_dead_hang", "ff_bar_dead_hang", "farmer_carry"],
    ["grip"],
    { stimulus_append: ["grip", "isometric"] }
  );
  merge(out, ELBOW_WRIST_STRENGTH_IDS, ["elbow_wrist_health", "elbow_wrist_strength", "forearm", "grip"], {
    stimulus_append: ["grip", "eccentric", "isometric"],
  });
  merge(out, ELBOW_WRIST_STABILITY_IDS, ["elbow_wrist_health", "elbow_wrist_stability", "forearm", "grip"], {
    stimulus_append: ["grip", "isometric", "trunk_anti_rotation"],
  });
  merge(out, ELBOW_WRIST_MOBILITY_FINISHER_IDS, ["elbow_wrist_health", "elbow_wrist_mobility", "forearm"]);
  merge(out, ["cross_body_stretch", "shoulder_cross_body_stretch"], ["elbow_wrist_mobility"]);

  return out;
}

export const JOINT_HEALTH_EXERCISE_ENRICHMENT: Record<string, ExerciseMetadataPatch> =
  buildJointHealthEnrichmentMap();

export const KNEE_HEALTH_TAGGED_EXERCISE_IDS: ReadonlySet<string> = new Set([
  ...KNEE_ACTIVATION_IDS,
  ...KNEE_PREP_STRETCH_IDS,
  ...KNEE_STRENGTH_IDS,
  ...KNEE_STABILITY_IDS,
  ...KNEE_MOBILITY_FINISHER_IDS,
  "standing_hamstring_stretch",
]);

export const SHOULDER_HEALTH_TAGGED_EXERCISE_IDS: ReadonlySet<string> = new Set([
  ...SHOULDER_ACTIVATION_IDS,
  ...SHOULDER_PREP_STRETCH_IDS,
  ...SHOULDER_STRENGTH_IDS,
  ...SHOULDER_STABILITY_IDS,
  ...SHOULDER_MOBILITY_FINISHER_IDS,
]);

export const HIP_HEALTH_TAGGED_EXERCISE_IDS: ReadonlySet<string> = new Set([
  ...HIP_ACTIVATION_IDS,
  ...HIP_PREP_STRETCH_IDS,
  ...HIP_STRENGTH_IDS,
  ...HIP_STABILITY_IDS,
  ...HIP_MOBILITY_FINISHER_IDS,
]);

export const ANKLE_FOOT_HEALTH_TAGGED_EXERCISE_IDS: ReadonlySet<string> = new Set([
  ...ANKLE_FOOT_ACTIVATION_IDS,
  ...ANKLE_FOOT_STRENGTH_IDS,
  ...ANKLE_FOOT_STABILITY_IDS,
  ...ANKLE_FOOT_MOBILITY_FINISHER_IDS,
]);

export const BACK_SPINE_HEALTH_TAGGED_EXERCISE_IDS: ReadonlySet<string> = new Set([
  ...BACK_SPINE_ACTIVATION_IDS,
  ...BACK_SPINE_STRENGTH_IDS,
  ...BACK_SPINE_STABILITY_IDS,
  ...BACK_SPINE_MOBILITY_FINISHER_IDS,
]);

export const ELBOW_WRIST_HEALTH_TAGGED_EXERCISE_IDS: ReadonlySet<string> = new Set([
  ...ELBOW_WRIST_ACTIVATION_IDS,
  ...ELBOW_WRIST_STRENGTH_IDS,
  ...ELBOW_WRIST_STABILITY_IDS,
  ...ELBOW_WRIST_MOBILITY_FINISHER_IDS,
]);

export {
  KNEE_ACTIVATION_IDS,
  KNEE_PREP_STRETCH_IDS,
  KNEE_STRENGTH_IDS,
  KNEE_STABILITY_IDS,
  KNEE_MOBILITY_FINISHER_IDS,
  SHOULDER_ACTIVATION_IDS,
  SHOULDER_PREP_STRETCH_IDS,
  SHOULDER_STRENGTH_IDS,
  SHOULDER_STABILITY_IDS,
  SHOULDER_MOBILITY_FINISHER_IDS,
  HIP_ACTIVATION_IDS,
  HIP_PREP_STRETCH_IDS,
  HIP_STRENGTH_IDS,
  HIP_STABILITY_IDS,
  HIP_MOBILITY_FINISHER_IDS,
  ANKLE_FOOT_ACTIVATION_IDS,
  ANKLE_FOOT_STRENGTH_IDS,
  ANKLE_FOOT_STABILITY_IDS,
  ANKLE_FOOT_MOBILITY_FINISHER_IDS,
  BACK_SPINE_ACTIVATION_IDS,
  BACK_SPINE_STRENGTH_IDS,
  BACK_SPINE_STABILITY_IDS,
  BACK_SPINE_MOBILITY_FINISHER_IDS,
  ELBOW_WRIST_ACTIVATION_IDS,
  ELBOW_WRIST_STRENGTH_IDS,
  ELBOW_WRIST_STABILITY_IDS,
  ELBOW_WRIST_MOBILITY_FINISHER_IDS,
};
