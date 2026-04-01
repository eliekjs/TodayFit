/**
 * Alpine skiing (downhill / resort prep) — pattern categories ↔ exercises.
 * Heuristics + small overrides; optional `alpine_transfer_*` attribute_tags when enriching DB.
 */

import type { Exercise } from "../types";
import type { AlpineSkiingPatternCategory } from "./alpineSkiingTypes";

const LOWER_MUSCLE = new Set(["legs", "quads", "glutes", "hamstrings", "calves"]);

const ALPINE_OVERRIDES: Partial<Record<string, AlpineSkiingPatternCategory[]>> = {
  wall_sit: ["quad_dominant_endurance", "sustained_tension_lower_body", "hip_knee_control"],
  copenhagen_plank: ["lateral_frontal_plane_stability", "hip_knee_control", "sustained_tension_lower_body"],
  pallof_press: ["trunk_bracing_dynamic", "lateral_frontal_plane_stability"],
  zone2_stair_climber: ["locomotion_hiking_trail_identity"],
  zone2_treadmill: ["locomotion_hiking_trail_identity"],
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

export function getAlpineSkiingPatternCategoriesForExercise(ex: Exercise): Set<AlpineSkiingPatternCategory> {
  const out = new Set<AlpineSkiingPatternCategory>();
  const ov = ALPINE_OVERRIDES[ex.id];
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
    /\bstep[\s_-]?up|stepup|box_step|farmer|suitcase|ruck|walk.*incline|hill_walk|hiking|zone2_stair|stair_climber|zone2_treadmill/i.test(
      t
    ) &&
    !/\bski_erg|ski erg/i.test(t)
  ) {
    out.add("locomotion_hiking_trail_identity");
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
    (pattern === "push" || pattern === "pull") &&
    !hasLowerContribution(ex) &&
    pattern !== "carry" &&
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

export function exerciseMatchesAnyAlpineSkiingCategory(
  ex: Exercise,
  cats: readonly string[]
): boolean {
  const h = getAlpineSkiingPatternCategoriesForExercise(ex);
  return cats.some((c) => h.has(c as AlpineSkiingPatternCategory));
}

export function isExcludedFromAlpineMainWorkSlot(ex: Exercise): boolean {
  return getAlpineSkiingPatternCategoriesForExercise(ex).has("overly_complex_skill_lift");
}

/** Conditioning: intervals / repeat effort / leg-burn — not steady hiking stair or pure running-drill identity. */
export function isAlpineSkiingConditioningExercise(ex: Exercise): boolean {
  const c = getAlpineSkiingPatternCategoriesForExercise(ex);
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
