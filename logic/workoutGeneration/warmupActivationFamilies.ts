/**
 * General activation (warmup) families — max one exercise per family per warmup block
 * so lower/upper prep stays varied (not always Cossack + Tibialis Raise).
 *
 * Parallel to jointHealthActivationFamilies, but used for all sessions' Activation blocks.
 */

export type WarmupActivationFamilyId = string;

const EXPLICIT_FAMILIES: Record<WarmupActivationFamilyId, readonly string[]> = {
  cossack_lateral_squat: [
    "cossack_squat",
    "ff_bodyweight_cossack_squat",
    "ff_bodyweight_alternating_cossack_squat",
    "ff_bodyweight_low_switch_cossack_squat",
  ],
  tibialis_shin: [
    "tibialis_raise",
    "ff_bodyweight_wall_supported_tibialis_raise",
    "ff_superband_single_leg_tibialis_raise",
  ],
  ninety_ninety_hip: ["hip_90_90", "90_90_hip_switch", "90_90_stretch"],
  hip_circles: [
    "hip_circles",
    "quadruped_hip_circle",
    "standing_hip_circle",
    "hip_circle_squat",
    "banded_hip_circle_squats",
  ],
  lying_hip_rotation: ["lying_hip_rotation", "seated_hip_internal_rotation"],
  clam_hydrant: [
    "clamshell",
    "ff_bodyweight_side_lying_clamshell",
    "ff_miniband_side_lying_clamshell",
    "side_lying_clamshells",
    "fire_hydrant",
    "ff_bodyweight_fire_hydrant",
    "ff_miniband_fire_hydrant",
  ],
  worlds_greatest: ["worlds_greatest_stretch"],
  frog_adductor: ["frog", "frog_stretch", "dynamic_frog", "groiners", "half_kneeling_groin_stretch"],
  hip_flexor_stretch: [
    "hip_flexor_stretch",
    "banded_hip_flexor_stretch",
    "couch_stretch",
    "couch_stretch_with_hamstring_reach",
    "kneeling_hip_flexor_stretch",
    "lizard_hip_flexor",
  ],
  pigeon_glute: ["pigeon_stretch", "pigeon_pose", "elevated_pigeon", "figure_four_stretch", "reclined_figure_four"],
  hamstring_dynamic: ["inchworm", "standing_hamstring_stretch", "banded_lying_hamstring_stretch"],
  ankle_mobility: [
    "ankle_cars",
    "ankle_circles",
    "banded_ankle_mob",
    "band_ankle_stretch",
    "wall_ankle_mobilization",
    "half_kneeling_achilles_ankle_rockers",
  ],
  quad_stretch: ["standing_quad_stretch", "quad_stretch_side_lying"],
  calf_stretch: ["calf_stretch_wall"],
  glute_bridge_activation: [
    "glute_bridge",
    "glute_bridge_hold",
    "ff_bodyweight_glute_bridge",
    "band_glute_bridge_with_abduction",
    "single_leg_glute_bridge_with_leg_whip",
  ],
  wall_slide_scap: ["wall_slide", "wall_slides_with_lift_off", "scapular_slides", "wall_scap_mobility"],
  band_pull_apart: ["band_pullapart", "band_pull_apart", "banded_pull_aparts", "diagonal_band_pull_aparts"],
  thoracic_rotation: ["thread_the_needle", "open_book", "cat_camel", "cat_cow", "t_spine_rotation"],
  arm_circles: ["arm_circles", "prone_arm_circles", "quadruped_arm_circles"],
};

const ID_TO_FAMILY = new Map<string, WarmupActivationFamilyId>();
for (const [family, ids] of Object.entries(EXPLICIT_FAMILIES)) {
  for (const id of ids) {
    ID_TO_FAMILY.set(id, family);
  }
}

function inferFamilyFromSlug(slug: string): WarmupActivationFamilyId | null {
  if (slug.includes("cossack")) return "cossack_lateral_squat";
  if (slug.includes("tibialis")) return "tibialis_shin";
  if (slug.includes("90_90") || slug.includes("9090")) return "ninety_ninety_hip";
  if (slug.includes("hip_circle")) return "hip_circles";
  if (slug.includes("clamshell") || slug.includes("fire_hydrant")) return "clam_hydrant";
  if (slug.includes("worlds_greatest") || slug.includes("world_greatest")) return "worlds_greatest";
  if (slug.includes("frog") || slug.includes("groiner")) return "frog_adductor";
  if (slug.includes("pigeon") || slug.includes("figure_four") || slug.includes("figure_4")) return "pigeon_glute";
  if (slug.includes("hip_flexor") || slug.includes("couch_stretch")) return "hip_flexor_stretch";
  if (slug.includes("ankle") || slug.includes("achilles")) return "ankle_mobility";
  if (slug.includes("hamstring") || slug.includes("inchworm")) return "hamstring_dynamic";
  if (slug.includes("quad_stretch")) return "quad_stretch";
  if (slug.includes("calf_stretch")) return "calf_stretch";
  if (slug.includes("glute_bridge")) return "glute_bridge_activation";
  if (slug.includes("wall_slide") || slug.includes("scapular_slide")) return "wall_slide_scap";
  if (slug.includes("pull_apart") || slug.includes("pullapart")) return "band_pull_apart";
  if (
    slug.includes("thread_the_needle") ||
    slug.includes("open_book") ||
    slug.includes("cat_camel") ||
    slug.includes("cat_cow")
  ) {
    return "thoracic_rotation";
  }
  if (slug.includes("arm_circle")) return "arm_circles";
  return null;
}

export function getWarmupActivationFamilyId(exerciseId: string): WarmupActivationFamilyId | null {
  const slug = exerciseId.toLowerCase().replace(/[\s-]+/g, "_");
  return ID_TO_FAMILY.get(slug) ?? ID_TO_FAMILY.get(exerciseId) ?? inferFamilyFromSlug(slug);
}

/** Drop candidates whose activation family is already represented in `usedExerciseIds`. */
export function filterByUnusedWarmupActivationFamilies<T extends { id: string }>(
  candidates: T[],
  usedExerciseIds: Iterable<string>
): T[] {
  const usedFamilies = new Set<WarmupActivationFamilyId>();
  for (const id of usedExerciseIds) {
    const fam = getWarmupActivationFamilyId(id);
    if (fam) usedFamilies.add(fam);
  }
  if (usedFamilies.size === 0) return candidates;
  const filtered = candidates.filter((c) => {
    const fam = getWarmupActivationFamilyId(c.id);
    return !fam || !usedFamilies.has(fam);
  });
  return filtered.length > 0 ? filtered : candidates;
}
