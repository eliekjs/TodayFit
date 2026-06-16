/**
 * Joint-health activation prep families — max one exercise per family per session
 * so regional prep blocks stay varied (e.g. not three wall-slide or cossack variants).
 */

export type JointHealthActivationFamilyId = string;

/** Shoulder prep families aligned with rehab sequencing: dynamic → scapular → cuff → serratus → pec opening. */
const SHOULDER_ACTIVATION_FAMILIES: Record<JointHealthActivationFamilyId, readonly string[]> = {
  dynamic_arm_circles: ["arm_circles", "prone_arm_circles", "quadruped_arm_circles"],
  wall_slide_scap: [
    "wall_slide",
    "wall_slides_with_lift_off",
    "scapular_slides",
    "wall_scap_mobility",
    "ff_bodyweight_wall_slide_squat",
    "ff_stability_ball_wall_slide_squat",
  ],
  wall_angel: [
    "wall_angel",
    "ff_bodyweight_standing_wall_angels",
    "ff_bodyweight_seated_wall_angels",
  ],
  band_pull_apart: [
    "band_pullapart",
    "band_pull_apart",
    "banded_pull_aparts",
    "diagonal_band_pull_aparts",
    "ff_resistance_band_pull_apart",
    "ff_superband_pull_apart",
  ],
  band_dislocate: [
    "band_shoulder_dislocation",
    "band_shoulder_dislocations",
    "ff_resistance_band_shoulder_dislocates",
    "ff_resistance_band_alternating_shoulder_dislocates",
    "ff_resistance_band_prone_shoulder_dislocates",
    "ff_superband_shoulder_dislocates",
    "ff_superband_alternating_shoulder_dislocates",
    "ff_superband_prone_shoulder_dislocates",
  ],
  cuff_activation: [
    "prone_external_rotations",
    "ff_miniband_standing_shoulder_external_rotation",
    "band_ir_er",
    "band_external_rotation",
    "seated_external_rotations",
  ],
  serratus_activation: ["push_up_plus", "scapular_push_up"],
  pec_opening: ["chest_stretch_doorway", "pec_stretch_wall", "banded_pec_stretch"],
};

/** Hip prep families: CARs / 90-90 → lateral rotation → glute med → opener → flexor. */
const HIP_ACTIVATION_FAMILIES: Record<JointHealthActivationFamilyId, readonly string[]> = {
  ninety_ninety: ["hip_90_90", "90_90_hip_switch", "90_90_stretch"],
  hip_cars: ["hip_cars"],
  cossack_mobility: [
    "cossack_squat",
    "ff_bodyweight_cossack_squat",
    "ff_bodyweight_alternating_cossack_squat",
    "ff_bodyweight_low_switch_cossack_squat",
  ],
  worlds_greatest_opener: ["worlds_greatest_stretch"],
  clam_hydrant: [
    "clamshell",
    "ff_bodyweight_side_lying_clamshell",
    "ff_miniband_side_lying_clamshell",
    "side_lying_clamshells",
    "fire_hydrant",
    "ff_bodyweight_fire_hydrant",
    "ff_miniband_fire_hydrant",
    "ff_bodyweight_knee_hover_quadruped_fire_hydrant",
    "ff_miniband_knee_hover_quadruped_fire_hydrant",
  ],
  hip_circles: [
    "hip_circles",
    "quadruped_hip_circle",
    "standing_hip_circle",
    "hip_circle_squat",
    "banded_hip_circle_squats",
  ],
  lying_hip_rotation: ["lying_hip_rotation"],
  hip_flexor_opening: ["banded_hip_flexor_stretch"],
};

/** Ankle/foot prep families: CARs → circles → gait → band mob → tibialis. */
const ANKLE_FOOT_ACTIVATION_FAMILIES: Record<JointHealthActivationFamilyId, readonly string[]> = {
  ankle_cars: ["ankle_cars"],
  ankle_circles: ["ankle_circles"],
  achilles_rockers: ["half_kneeling_achilles_ankle_rockers"],
  gait_walks: ["heel_walks", "toe_walks", "heel_to_toe_walks"],
  banded_ankle_mob: ["band_ankle_stretch", "banded_ankle_mob"],
  tibialis_activation: [
    "tibialis_raise",
    "ff_bodyweight_wall_supported_tibialis_raise",
    "ff_superband_single_leg_tibialis_raise",
  ],
};

/** Back/spine prep families: segmental → breath → thoracic rotation → open book → thread needle. */
const BACK_SPINE_ACTIVATION_FAMILIES: Record<JointHealthActivationFamilyId, readonly string[]> = {
  cat_cow: ["cat_camel"],
  diaphragmatic_breathing: ["breathing_diaphragmatic", "breathing_box"],
  quadruped_rock: ["quadruped_rockback", "quadruped_rock"],
  thoracic_rotation: ["t_spine_rotation", "quadruped_extension_rotation", "quadruped_t_spine_pull_through"],
  open_book: ["open_books", "open_book_ts", "thoracic_open_books"],
  thread_needle: ["thread_the_needle", "thread_needle"],
  trunk_prep: ["bird_dog_prep", "dead_bug_prep"],
};

/** Elbow/wrist prep families: wrist CARs → finger intrinsic → scapular chain → cuff upstream. */
const ELBOW_WRIST_ACTIVATION_FAMILIES: Record<JointHealthActivationFamilyId, readonly string[]> = {
  wrist_circles: ["wrist_circles"],
  finger_intrinsic: ["finger_extensions"],
  band_pull_apart: [
    "band_pullapart",
    "band_pull_apart",
    "ff_resistance_band_pull_apart",
    "ff_superband_pull_apart",
    "diagonal_band_pull_aparts",
  ],
  serratus_activation: ["push_up_plus", "scapular_push_up"],
  rotator_upstream: [
    "prone_external_rotations",
    "ff_miniband_standing_shoulder_external_rotation",
    "seated_shoulder_external_rotation",
    "band_ir_er",
    "internal_external_rotations",
  ],
};

const REGIONAL_ACTIVATION_FAMILIES: Record<string, Record<JointHealthActivationFamilyId, readonly string[]>> = {
  shoulder_health: SHOULDER_ACTIVATION_FAMILIES,
  hip_health: HIP_ACTIVATION_FAMILIES,
  ankle_foot_health: ANKLE_FOOT_ACTIVATION_FAMILIES,
  back_spine_health: BACK_SPINE_ACTIVATION_FAMILIES,
  elbow_wrist_health: ELBOW_WRIST_ACTIVATION_FAMILIES,
};

const ACTIVATION_FAMILY_BY_ID = new Map<string, JointHealthActivationFamilyId>();
for (const [region, families] of Object.entries(REGIONAL_ACTIVATION_FAMILIES)) {
  for (const [family, ids] of Object.entries(families)) {
    for (const id of ids) {
      ACTIVATION_FAMILY_BY_ID.set(`${region}:${normalizeSlug(id)}`, family);
    }
  }
}

function normalizeSlug(id: string): string {
  return id.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

function inferShoulderActivationFamilyFromSlug(slug: string): JointHealthActivationFamilyId | null {
  if (slug.includes("wall_angel") || slug.includes("wall_angels")) return "wall_angel";
  if (
    slug.includes("wall_slide") ||
    slug.includes("wall_scap") ||
    slug.includes("scapular_slide")
  ) {
    return "wall_slide_scap";
  }
  if (slug.includes("pull_apart") || slug.includes("pullapart")) return "band_pull_apart";
  if (slug.includes("dislocat")) return "band_dislocate";
  if (slug.includes("arm_circle")) return "dynamic_arm_circles";
  if (
    slug.includes("external_rotation") ||
    slug.includes("external_rotat") ||
    slug === "band_ir_er" ||
    slug.includes("prone_external")
  ) {
    return "cuff_activation";
  }
  if (slug.includes("push_up_plus") || slug === "scapular_push_up") return "serratus_activation";
  if (slug.includes("pec_stretch") || slug.includes("chest_stretch")) return "pec_opening";
  return null;
}

function inferHipActivationFamilyFromSlug(slug: string): JointHealthActivationFamilyId | null {
  if (slug.includes("90_90") || slug.includes("hip_90")) return "ninety_ninety";
  if (slug.includes("hip_car")) return "hip_cars";
  if (slug.includes("cossack")) return "cossack_mobility";
  if (slug.includes("worlds_greatest")) return "worlds_greatest_opener";
  if (slug.includes("clamshell") || slug.includes("fire_hydrant")) return "clam_hydrant";
  if (slug.includes("hip_circle")) return "hip_circles";
  if (slug.includes("lying_hip_rotation")) return "lying_hip_rotation";
  if (slug.includes("hip_flexor")) return "hip_flexor_opening";
  return null;
}

function inferAnkleFootActivationFamilyFromSlug(slug: string): JointHealthActivationFamilyId | null {
  if (slug.includes("ankle_car")) return "ankle_cars";
  if (slug.includes("ankle_circle")) return "ankle_circles";
  if (slug.includes("achilles") || slug.includes("ankle_rocker")) return "achilles_rockers";
  if (slug.includes("heel_walk") || slug.includes("toe_walk") || slug.includes("heel_to_toe")) return "gait_walks";
  if (slug.includes("band_ankle") || slug.includes("banded_ankle")) return "banded_ankle_mob";
  if (slug.includes("tibialis")) return "tibialis_activation";
  return null;
}

function inferBackSpineActivationFamilyFromSlug(slug: string): JointHealthActivationFamilyId | null {
  if (slug.includes("cat_camel") || slug.includes("cat_cow")) return "cat_cow";
  if (slug.includes("breathing") || slug.includes("diaphragm")) return "diaphragmatic_breathing";
  if (slug.includes("quadruped_rock")) return "quadruped_rock";
  if (slug.includes("t_spine") || slug.includes("tspine") || slug.includes("thoracic_rotation")) {
    return "thoracic_rotation";
  }
  if (slug.includes("open_book")) return "open_book";
  if (slug.includes("thread_needle") || slug.includes("thread_the_needle")) return "thread_needle";
  if (slug.includes("bird_dog_prep") || slug.includes("dead_bug_prep")) return "trunk_prep";
  return null;
}

function inferElbowWristActivationFamilyFromSlug(slug: string): JointHealthActivationFamilyId | null {
  if (slug.includes("wrist_circle")) return "wrist_circles";
  if (slug.includes("finger_extension")) return "finger_intrinsic";
  if (slug.includes("pull_apart") || slug.includes("pullapart")) return "band_pull_apart";
  if (slug.includes("push_up_plus") || slug === "scapular_push_up") return "serratus_activation";
  if (
    slug.includes("external_rotation") ||
    slug.includes("internal_external") ||
    slug === "band_ir_er" ||
    slug.includes("prone_external")
  ) {
    return "rotator_upstream";
  }
  return null;
}

export function getJointHealthActivationFamilyId(
  exerciseId: string,
  regionalSub: string
): JointHealthActivationFamilyId | null {
  const region = normalizeSlug(regionalSub);
  if (!REGIONAL_ACTIVATION_FAMILIES[region]) return null;

  const slug = normalizeSlug(exerciseId);
  const explicit = ACTIVATION_FAMILY_BY_ID.get(`${region}:${slug}`);
  if (explicit) return explicit;

  if (region === "shoulder_health") return inferShoulderActivationFamilyFromSlug(slug);
  if (region === "hip_health") return inferHipActivationFamilyFromSlug(slug);
  if (region === "ankle_foot_health") return inferAnkleFootActivationFamilyFromSlug(slug);
  if (region === "back_spine_health") return inferBackSpineActivationFamilyFromSlug(slug);
  if (region === "elbow_wrist_health") return inferElbowWristActivationFamilyFromSlug(slug);
  return null;
}

export function jointHealthActivationFamilyAlreadyUsed(
  usedExerciseIds: Iterable<string>,
  candidateId: string,
  regionalSub: string
): boolean {
  const candidateFamily = getJointHealthActivationFamilyId(candidateId, regionalSub);
  if (!candidateFamily) return false;
  for (const id of usedExerciseIds) {
    if (getJointHealthActivationFamilyId(id, regionalSub) === candidateFamily) return true;
  }
  return false;
}

export function filterByUnusedActivationFamilies<T extends { id: string }>(
  candidates: T[],
  usedExerciseIds: Iterable<string>,
  regionalSub: string
): T[] {
  const region = normalizeSlug(regionalSub);
  if (!REGIONAL_ACTIVATION_FAMILIES[region]) return candidates;
  const diverse = candidates.filter(
    (c) => !jointHealthActivationFamilyAlreadyUsed(usedExerciseIds, c.id, regionalSub)
  );
  // When every family is already represented, do not fall back to duplicates.
  return diverse;
}

export function hasRegionalActivationFamilies(regionalSub: string): boolean {
  return REGIONAL_ACTIVATION_FAMILIES[normalizeSlug(regionalSub)] != null;
}
