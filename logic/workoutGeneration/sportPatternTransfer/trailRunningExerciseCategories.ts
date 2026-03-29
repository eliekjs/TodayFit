/**
 * Trail-running pattern categories ↔ exercises.
 * Prefer derived heuristics + small overrides; add `trail_transfer_*` attribute_tags when enriching DB.
 */

import type { Exercise } from "../types";
import type { TrailRunningPatternCategory } from "./trailRunningTypes";

const LOWER_MUSCLE = new Set(["legs", "quads", "glutes", "hamstrings", "calves"]);

const TRAIL_OVERRIDES: Partial<Record<string, TrailRunningPatternCategory[]>> = {
  walking_lunge: ["unilateral_running_stability", "downhill_eccentric_control", "uphill_locomotion_support"],
  reverse_lunge: ["downhill_eccentric_control", "unilateral_running_stability"],
  split_squat: ["uphill_locomotion_support", "unilateral_running_stability"],
  stepup: ["uphill_locomotion_support", "hiking_step_stair_identity", "unilateral_running_stability"],
  farmer_carry: ["pack_load_carry_primary", "heavy_carry_dominant", "locomotion_core_stability"],
  zone2_stair_climber: ["running_conditioning", "calf_soleus_durability", "hiking_step_stair_identity"],
  zone2_treadmill: ["running_conditioning", "uphill_locomotion_support"],
  bodyweight_calf_raise: ["calf_soleus_durability", "ankle_foot_stability"],
  single_leg_calf_raise: ["calf_soleus_durability", "ankle_foot_stability", "unilateral_running_stability"],
};

function textBlob(ex: Exercise): string {
  return `${ex.id.toLowerCase()} ${(ex.name ?? "").toLowerCase()}`;
}

function hasLowerContribution(ex: Exercise): boolean {
  const pm = ex.primary_muscle_groups ?? ex.muscle_groups ?? [];
  return pm.some((m) => LOWER_MUSCLE.has(m.toLowerCase()));
}

export function getTrailRunningPatternCategoriesForExercise(ex: Exercise): Set<TrailRunningPatternCategory> {
  const out = new Set<TrailRunningPatternCategory>();
  const ov = TRAIL_OVERRIDES[ex.id];
  if (ov) for (const c of ov) out.add(c);

  const t = textBlob(ex);
  const role = (ex.exercise_role ?? "").toLowerCase().replace(/\s/g, "_");
  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const fine = (ex.movement_patterns ?? []).map((p) => p.toLowerCase().replace(/\s/g, "_"));
  const attr = new Set((ex.tags.attribute_tags ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));
  const stim = new Set((ex.tags.stimulus ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));

  if (attr.has("trail_transfer_uphill_locomotion")) out.add("uphill_locomotion_support");
  if (attr.has("trail_transfer_downhill_control")) out.add("downhill_eccentric_control");
  if (attr.has("trail_transfer_ankle_stability")) out.add("ankle_foot_stability");
  if (attr.has("trail_transfer_calf_soleus")) out.add("calf_soleus_durability");
  if (attr.has("trail_transfer_running_stability")) out.add("unilateral_running_stability");
  if (attr.has("trail_transfer_running_conditioning")) out.add("running_conditioning");

  if (
    /\bplyometric|bounds|hop|jump|box_jump|depth_jump|skater|reactive/i.test(t) ||
    stim.has("plyometric") ||
    (ex.impact_level === "high" && /squat|lunge|jump/.test(t))
  ) {
    out.add("elastic_reactive_lower");
  }

  if (
    /\blunge|split_squat|bulgarian|single_leg|one_leg|pistol|skater|b_stance|b-stance|rfe|ffe/i.test(t) ||
    fine.some((p) => ["lunge", "split_squat", "single_leg_squat"].some((k) => p.includes(k)))
  ) {
    out.add("unilateral_running_stability");
  }

  if (
    /\bstep[\s_-]?up|stepup|box_step|bench_step|deficit/i.test(ex.id) ||
    /\bstep[\s_-]?up|box step/i.test(t)
  ) {
    out.add("uphill_locomotion_support");
    out.add("hiking_step_stair_identity");
  }

  if (
    /\breverse_lunge|walking_lunge|forward_lunge|downhill|eccentric|tempo_squat|slow_squat|negative/i.test(t) ||
    (stim.has("eccentric") && /squat|lunge|split|leg_press/i.test(t))
  ) {
    out.add("downhill_eccentric_control");
  }

  /** Calf / ankle isolation often uses `movement_pattern: squat` in the catalog; do not tag as uphill locomotion. */
  const isCalfOrAnkleIsolation =
    /\bcalf_raise|calf raise|soleus|seated_calf|standing_calf|feet_elevated_calf|tibialis|shin_raise|ankle_mob/i.test(t) ||
    /calf_raise|_calf_|soleus_raise/i.test(ex.id);

  if (
    /\bgoblet_squat|front_squat|high_bar|quad_squat|leg_press|wall_sit/i.test(t) ||
    (pattern === "squat" &&
      !/step_up|stepup/.test(ex.id) &&
      hasLowerContribution(ex) &&
      !isCalfOrAnkleIsolation)
  ) {
    out.add("uphill_locomotion_support");
  }

  if (
    /\bcalf|soleus|gastroc|ankle|tibialis|shin|toe_raise|dorsiflex/i.test(t) &&
    !/hamstring_curl|leg_curl|nordic/.test(ex.id)
  ) {
    out.add("calf_soleus_durability");
    out.add("ankle_foot_stability");
  }
  if (/\btibialis|shin_raise|dorsiflexion/i.test(t)) {
    out.add("ankle_foot_stability");
  }

  if (
    /\bmonster_walk|lateral_walk|band_walk|clamshell|copenhagen|y_balance|hip_airplane|ankle.*circle|single_leg_balance/i.test(
      t
    )
  ) {
    out.add("ankle_foot_stability");
  }

  if (
    /\bpallof|anti_rotation|antirotation|dead_bug|bird_dog|plank|carry|suitcase/i.test(t) ||
    (pattern === "carry" && /suitcase|unilateral|one_arm/i.test(t))
  ) {
    out.add("locomotion_core_stability");
  }

  if (pattern === "carry" || /\bfarmer|suitcase|ruck|yoke|sandbag.*carry/i.test(t)) {
    out.add("pack_load_carry_primary");
    if (/\bfarmer|yoke|heavy.*carry|ruck/i.test(t)) out.add("heavy_carry_dominant");
  }

  if (
    ex.modality === "conditioning" &&
    (/\brun|sprint|stride|fartlek|tempo_run|interval.*run|track/i.test(t) ||
      /\bzone2_treadmill|treadmill_run|assault_run|rowing_machine|rower|ski_erg|bike_sprint/i.test(ex.id) ||
      /\bhiit.*run|running_machine/i.test(ex.id))
  ) {
    out.add("running_conditioning");
  }
  if (ex.modality === "conditioning" && /\bzone2\b/.test(t) && (/\brun|treadmill|stride/i.test(t) || /\bzone2_treadmill/i.test(ex.id))) {
    out.add("running_conditioning");
  }

  if (
    /\bstair|stepper|stair_climber|hill_climb_walk/i.test(t) &&
    ex.modality === "conditioning"
  ) {
    out.add("running_conditioning");
    out.add("hiking_step_stair_identity");
  }

  const isMainCompound = role === "main_compound" || role === "secondary_compound";
  if (
    /(^|_)clean|clean_to|snatch|jerk|thruster|muscle_up/i.test(ex.id) &&
    (isMainCompound || ex.modality === "power")
  ) {
    out.add("overly_complex_skill_lift");
  }
  if (
    /\b(clean|snatch|jerk|muscle_up|thruster)\b/i.test(ex.id) &&
    (/lunge|split_squat|step_up|stepup/i.test(ex.id) || /\b(bulgarian|ffe)\b/i.test(ex.id))
  ) {
    out.add("overly_complex_skill_lift");
  }

  if (ex.creative_variation) {
    out.add("low_transfer_running_accessory");
  }

  if (
    (pattern === "push" || pattern === "pull") &&
    !hasLowerContribution(ex) &&
    pattern !== "carry" &&
    role !== "warmup_prep" &&
    ex.modality !== "mobility" &&
    ex.modality !== "recovery"
  ) {
    out.add("unrelated_upper_body_dominant");
  }

  if (pattern === "pull" && isMainCompound && /\brack_pull|pendlay|barbell_row|bent_over_row|t_bar/i.test(ex.id)) {
    out.add("unrelated_upper_body_dominant");
  }

  return out;
}

export function exerciseMatchesAnyTrailRunningCategory(
  ex: Exercise,
  cats: readonly string[]
): boolean {
  const h = getTrailRunningPatternCategoriesForExercise(ex);
  return cats.some((c) => h.has(c as TrailRunningPatternCategory));
}

export function isExcludedFromTrailMainWorkSlot(ex: Exercise): boolean {
  return getTrailRunningPatternCategoriesForExercise(ex).has("overly_complex_skill_lift");
}

export function isTrailRunningConditioningExercise(ex: Exercise): boolean {
  const c = getTrailRunningPatternCategoriesForExercise(ex);
  if (c.has("running_conditioning")) return true;
  if (ex.modality !== "conditioning") return false;
  const t = textBlob(ex);
  if (/\brun|sprint|stride|fartlek|tempo/i.test(t)) return true;
  if (/\bzone2_treadmill|treadmill|assault|row|ski|bike/i.test(ex.id)) return true;
  return false;
}
