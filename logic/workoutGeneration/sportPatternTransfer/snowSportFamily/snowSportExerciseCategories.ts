/**
 * Snow family: pattern categories ↔ exercises (alpine + snowboard + backcountry + XC).
 */

import type { Exercise } from "../../types";
import type { SnowSportKind, SnowSportPatternCategory } from "./snowSportTypes";

const LOWER_MUSCLE = new Set(["legs", "quads", "glutes", "hamstrings", "calves"]);

const SNOW_OVERRIDES: Partial<Record<string, SnowSportPatternCategory[]>> = {
  wall_sit: ["quad_dominant_endurance", "sustained_tension_lower_body", "hip_knee_control"],
  copenhagen_plank: ["lateral_frontal_plane_stability", "hip_knee_control", "sustained_tension_lower_body"],
  pallof_press: ["trunk_bracing_dynamic", "lateral_frontal_plane_stability"],
  zone2_stair_climber: ["locomotion_hiking_trail_identity", "uphill_skin_travel_endurance"],
  zone2_treadmill: ["locomotion_hiking_trail_identity", "uphill_skin_travel_endurance"],
};

function textBlob(ex: Exercise): string {
  return `${ex.id.toLowerCase()} ${(ex.name ?? "").toLowerCase()}`;
}

function hasLowerContribution(ex: Exercise): boolean {
  const pm = ex.primary_muscle_groups ?? ex.muscle_groups ?? [];
  return pm.some((m) => LOWER_MUSCLE.has(m.toLowerCase()));
}

function hasLowerBodyEccentricContext(ex: Exercise, text: string): boolean {
  if (!hasLowerContribution(ex)) return false;
  if (/\bsquat|lunge|split|leg_press|wall_sit|step|landing|decel|drop_jump|depth_jump|ski/i.test(text)) {
    return true;
  }
  const patterns = (ex.movement_patterns ?? []).map((p) => p.toLowerCase().replace(/\s/g, "_"));
  return patterns.some((p) => p.includes("squat") || p.includes("lunge") || p.includes("single_leg"));
}

export function getSnowSportPatternCategoriesForExercise(ex: Exercise): Set<SnowSportPatternCategory> {
  const out = new Set<SnowSportPatternCategory>();
  const ov = SNOW_OVERRIDES[ex.id];
  if (ov) for (const c of ov) out.add(c);

  const t = textBlob(ex);
  const role = (ex.exercise_role ?? "").toLowerCase().replace(/\s/g, "_");
  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const fine = (ex.movement_patterns ?? []).map((p) => p.toLowerCase().replace(/\s/g, "_"));
  const attr = new Set((ex.tags.attribute_tags ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));
  const stim = new Set((ex.tags.stimulus ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));

  if (attr.has("alpine_transfer_eccentric_braking")) out.add("eccentric_braking_control");
  if (attr.has("alpine_transfer_lateral_stability")) out.add("lateral_frontal_plane_stability");
  if (attr.has("alpine_transfer_quad_endurance")) out.add("quad_dominant_endurance");
  if (attr.has("alpine_transfer_ski_conditioning")) out.add("ski_conditioning");
  if (attr.has("nordic_transfer_poling") || attr.has("xc_transfer_double_pole")) {
    out.add("nordic_poling_pull_endurance");
  }

  if (stim.has("eccentric") && hasLowerBodyEccentricContext(ex, t)) {
    out.add("eccentric_braking_control");
  }
  if (/\btempo|slow|negative|eccentric|long_eccentric|2-0-2|3-0-1/i.test(t) && hasLowerBodyEccentricContext(ex, t)) {
    out.add("eccentric_braking_control");
  }

  if (stim.has("isometric") && /squat|lunge|wall_sit|split|hold|static/i.test(t)) {
    out.add("sustained_tension_lower_body");
  }
  if (/\bwall_sit|wall sit|iso_squat|static_lunge|pause_squat|bottom_squat/i.test(t)) {
    out.add("sustained_tension_lower_body");
    out.add("quad_dominant_endurance");
  }

  if (
    /\blateral|side\s*lunge|copenhagen|curtsy|skater|monster_walk|band_walk|hip_abduction|clamshell|y_balance|single_leg.*side/i.test(
      t
    ) ||
    fine.some((p) => p.includes("lateral") || p.includes("frontal"))
  ) {
    out.add("lateral_frontal_plane_stability");
  }

  if (/\bhigh_rep|15\+|20\+|burn|endurance.*squat|leg_press|leg_extension|cycle|bike.*leg/i.test(t)) {
    out.add("quad_dominant_endurance");
  }

  if (
    /\blunge|split_squat|bulgarian|single_leg|one_leg|pistol|valgus|knee|patellar|terminal_knee/i.test(t) ||
    fine.some((p) => ["lunge", "split_squat", "single_leg_squat"].some((k) => p.includes(k)))
  ) {
    out.add("hip_knee_control");
  }

  if (
    /\bpallof|anti_rotation|antirotation|dead_bug|bird_dog|plank|rollout|landmine.*anti|suitcase_deadlift/i.test(t) ||
    (pattern === "carry" && /suitcase|unilateral|one_arm/i.test(t))
  ) {
    out.add("trunk_bracing_dynamic");
  }

  if (
    /\bplyometric|drop_jump|depth_jump|box_jump|landing|reactive|hop|bound/i.test(t) ||
    stim.has("plyometric") ||
    (ex.impact_level === "high" && /squat|lunge|jump/i.test(t))
  ) {
    out.add("landing_deceleration_support");
  }

  if (
    ex.modality === "conditioning" &&
    (/\binterval|hiit|tabata|emom|amrap|round|repeat|sprint|assault|fan_bike|row_sprint|ski_erg|burn|threshold/i.test(
      t
    ) ||
      /\binterval|hiit|tabata|emom|sprint_rounds/i.test(ex.id))
  ) {
    out.add("ski_conditioning");
  }

  if (
    /\bstep[\s_-]?up|stepup|box_step|farmer|suitcase|ruck|walk.*incline|hill_walk|hiking|zone2_stair|stair_climber|zone2_treadmill|skin|skinning|touring/i.test(
      t
    ) &&
    !/\bski_erg|ski erg/i.test(t)
  ) {
    out.add("locomotion_hiking_trail_identity");
  }
  if (/\bincline.*walk|treadmill.*incline|stair|vert.*mill|hill_climb|skin|skinning/i.test(t)) {
    out.add("uphill_skin_travel_endurance");
  }

  if (/\brow|pulldown|pullup|pull-up|lat_pulldown|cable_row|erg|double.?pole|poling/i.test(t) && pattern === "pull") {
    out.add("nordic_poling_pull_endurance");
  }
  if (/\bface_pull|band_pull|rear_delt|scapular/i.test(t) && ex.modality === "strength") {
    out.add("nordic_poling_pull_endurance");
  }

  if (/\brun|sprint|stride|fartlek|jog|tempo_run|shuffle_to_run|hurdle.*run/i.test(t) && ex.modality === "conditioning") {
    out.add("running_gait_identity");
  }

  const isGenericBilateralSquat =
    pattern === "squat" &&
    !/lunge|split|lateral|single|unilateral|tempo|eccentric|pause|wall|skater|copenhagen|curtsy/i.test(t) &&
    hasLowerContribution(ex) &&
    !stim.has("eccentric") &&
    !stim.has("isometric");
  if (isGenericBilateralSquat) {
    out.add("low_transfer_sagittal_only");
  }

  if (
    /\bcurtsy|stagger|split\s*stance|duck\s*stance|j\s*stance|asym|goofy|regular\s*stance/i.test(t) ||
    (ex.unilateral === true && out.has("lateral_frontal_plane_stability"))
  ) {
    out.add("snowboard_asymmetric_stance");
  }

  if (
    (pattern === "push" || pattern === "pull") &&
    !hasLowerContribution(ex) &&
    role !== "warmup_prep" &&
    ex.modality !== "mobility" &&
    ex.modality !== "recovery"
  ) {
    out.add("unrelated_upper_body_dominant");
  }

  if (/(^|_)clean|clean_to|snatch|jerk|muscle_up/i.test(ex.id) && (role === "main_compound" || ex.modality === "power")) {
    out.add("overly_complex_skill_lift");
  }

  if (ex.modality === "conditioning") {
    if (
      /\binterval|hiit|tabata|emom|amrap|assault|sprint|metcon|fan_bike|row_sprint|ski_erg|battle|sled|round|repeat|burn|threshold|lactate/i.test(
        t
      )
    ) {
      out.add("ski_conditioning");
    }
  }

  return out;
}

export function exerciseMatchesAnySnowSportCategory(ex: Exercise, cats: readonly string[]): boolean {
  const h = getSnowSportPatternCategoriesForExercise(ex);
  return cats.some((c) => h.has(c as SnowSportPatternCategory));
}

export function isExcludedFromSnowSportMainWorkSlot(ex: Exercise): boolean {
  return getSnowSportPatternCategoriesForExercise(ex).has("overly_complex_skill_lift");
}

function conditioningAlpineResortLike(ex: Exercise): boolean {
  const c = getSnowSportPatternCategoriesForExercise(ex);
  if (c.has("ski_conditioning")) return true;
  if (ex.modality !== "conditioning") return false;
  const t = textBlob(ex);
  const isRunIdentity = /\brun|tempo_run|stride|fartlek|jog|shuffle.*run|hurdle.*run\b/i.test(t);
  const isSteadyLocomotion = /\bzone2_stair|zone2_treadmill|steady|walk|incline.*walk|hill_walk\b/i.test(t);
  const hasIntervalIdentity =
    /\binterval|hiit|tabata|emom|amrap|round|repeat|sprint|assault|fan_bike|burn|threshold|lactate|metcon\b/i.test(t);
  const hasMixedModalLegBurn =
    /\brow|ski_erg|bike|wall_ball|thruster|sled|battle_rope|jump_rope|burpee|shuttle|erg\b/i.test(t);

  if (isRunIdentity && !hasIntervalIdentity) return false;
  if (isSteadyLocomotion && !hasIntervalIdentity) return false;
  if (hasIntervalIdentity) return true;
  if (hasMixedModalLegBurn && !isRunIdentity && !isSteadyLocomotion) return true;
  return false;
}

/** Conditioning relevance by snow sport (family-level policy). */
export function isSnowSportConditioningExercise(ex: Exercise, kind: SnowSportKind): boolean {
  if (kind === "backcountry_skiing") {
    if (conditioningAlpineResortLike(ex)) return true;
    if (ex.modality !== "conditioning") return false;
    const t = textBlob(ex);
    if (/\bincline|stair|hill_walk|step_mill|vert|walking.*pack|ruck/i.test(t)) return true;
    return getSnowSportPatternCategoriesForExercise(ex).has("uphill_skin_travel_endurance");
  }
  if (kind === "xc_skiing") {
    const c = getSnowSportPatternCategoriesForExercise(ex);
    if (c.has("ski_conditioning")) return true;
    if (ex.modality !== "conditioning") return false;
    const t = textBlob(ex);
    if (/\brow|ski_erg|bike|run|interval|erg|assault|fan_bike|threshold|zone2/i.test(t)) return true;
    return false;
  }
  return conditioningAlpineResortLike(ex);
}

/** @deprecated Use getSnowSportPatternCategoriesForExercise */
export function getAlpineSkiingPatternCategoriesForExercise(ex: Exercise): Set<SnowSportPatternCategory> {
  return getSnowSportPatternCategoriesForExercise(ex);
}

export function exerciseMatchesAnyAlpineSkiingCategory(ex: Exercise, cats: readonly string[]): boolean {
  return exerciseMatchesAnySnowSportCategory(ex, cats);
}

export function isExcludedFromAlpineMainWorkSlot(ex: Exercise): boolean {
  return isExcludedFromSnowSportMainWorkSlot(ex);
}

export function isAlpineSkiingConditioningExercise(ex: Exercise): boolean {
  return isSnowSportConditioningExercise(ex, "alpine_skiing");
}
