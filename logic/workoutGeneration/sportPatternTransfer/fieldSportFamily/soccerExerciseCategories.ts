/**
 * Exercise ↔ soccer / field-sport transfer categories (heuristic tagging).
 */

import type { Exercise } from "../../types";
import type { SoccerPatternCategory } from "./soccerPatternTypes";

const LOWER = new Set(["legs", "quads", "glutes", "hamstrings", "calves", "adductors"]);

function textBlob(ex: Exercise): string {
  return `${ex.id.toLowerCase()} ${(ex.name ?? "").toLowerCase()}`;
}

function hasLower(ex: Exercise): boolean {
  const pm = ex.primary_muscle_groups ?? ex.muscle_groups ?? [];
  return pm.some((m) => LOWER.has(m.toLowerCase()));
}

function isUnilateralPattern(ex: Exercise, t: string): boolean {
  if (ex.unilateral) return true;
  const fine = (ex.movement_patterns ?? []).map((p) => p.toLowerCase().replace(/\s/g, "_"));
  if (fine.some((p) => p.includes("lunge") || p.includes("split") || p.includes("single_leg"))) return true;
  return /\bsingle_leg|one_leg|unilateral|lunge|split_squat|bulgarian|rfe|ffe|b_stance|b-stance|pistol/i.test(t);
}

export function getSoccerPatternCategoriesForExercise(ex: Exercise): Set<SoccerPatternCategory> {
  const out = new Set<SoccerPatternCategory>();
  const t = textBlob(ex);
  const role = (ex.exercise_role ?? "").toLowerCase().replace(/\s/g, "_");
  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const stim = new Set((ex.tags.stimulus ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));
  const goalTags = new Set((ex.tags.goal_tags ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));
  const sports = new Set(
    [...(ex.tags.sport_tags ?? []), ...(ex.tags.attribute_tags ?? [])].map((s) =>
      String(s).toLowerCase().replace(/\s/g, "_")
    )
  );

  if (sports.has("sport_soccer") || sports.has("soccer_transfer")) {
    out.add("soccer_sprint_loc_support");
  }
  if (goalTags.has("agility") || goalTags.has("speed") || goalTags.has("plyometric")) {
    out.add("soccer_sprint_loc_support");
  }
  if (/\bshuttle|sprint|acceleration|deceleration|cutting|cod\b|change\s*of\s*direction|pro\s*agility|t-drill|agility/i.test(t)) {
    out.add("soccer_sprint_loc_support");
  }
  if (/\blateral\s*lunge|copenhagen|adductor|skater|shuffle|lateral\s*bound/i.test(t)) {
    out.add("soccer_cod_lateral");
  }
  if (/\bnordic|hamstring\s*curl|eccentric|slow\s*negative|tempo.*squat|rdl|romanian|hip_hinge|good\s*morning/i.test(t)) {
    out.add("soccer_posterior_durability");
    out.add("soccer_deceleration_eccentric");
  }
  if (stim.has("eccentric") && /squat|lunge|split|leg|hamstring|hinge/i.test(t)) {
    out.add("soccer_deceleration_eccentric");
  }
  if (pattern === "hinge" || /\bdeadlift|rdl|romanian|hip_thrust|glute_bridge/i.test(ex.id)) {
    if (hasLower(ex)) out.add("soccer_posterior_durability");
  }
  if ((pattern === "squat" || /squat|lunge|split|step_up|stepup|leg_press/i.test(t)) && hasLower(ex)) {
    if (isUnilateralPattern(ex, t)) {
      out.add("soccer_unilateral_strength");
    } else if (/\bback_squat|front_squat|leg_press|hack_squat|goblet/i.test(t)) {
      out.add("soccer_bilateral_lower_noise");
    }
  }
  if (/\bwalking_lunge|reverse_lunge|forward_lunge|split_squat|bulgarian|step[\s_-]?up/i.test(t) && hasLower(ex)) {
    out.add("soccer_unilateral_strength");
    out.add("soccer_deceleration_eccentric");
  }
  if (pattern === "rotate" || /pallof|anti.?rotation|landmine|chop|lift|carry.*core/i.test(t)) {
    if (hasLower(ex) || pattern === "rotate") out.add("soccer_trunk_locomotion_brace");
  }
  if (/\bbcaa|woodchop|side\s*plank|plank.*reach|dead_bug|bird\s*dog/i.test(t)) {
    out.add("soccer_trunk_locomotion_brace");
  }
  if (ex.modality === "conditioning") {
    if (
      /\bhiit|interval|tabata|fartlek|repeat\s*sprint|rsa|shuttle|sprint\b|assault|spin|bike\s*sprint/i.test(t) ||
      stim.has("anaerobic") ||
      stim.has("hiit")
    ) {
      out.add("soccer_rsa_conditioning");
    }
    if (/\bzone\s*2|steady|long\s*slow|lsd|easy\s*run\b(?!\s*sprint)/i.test(t) || /\bzone2_treadmill|zone2_stair/i.test(ex.id)) {
      out.add("soccer_steady_state_cardio_only");
    }
    if (/\brun|treadmill|row|bike|ski_erg|assault|sprint/i.test(t)) {
      out.add("soccer_rsa_conditioning");
    }
  }
  if (/\bbench|curl|triceps_extension|face_pull|lat_pull|fly|rear_delt|shrug\b/i.test(t) && !hasLower(ex)) {
    if (pattern === "push" || pattern === "pull") out.add("soccer_upper_irrelevant");
  }
  if (/\bclean|snatch|muscle_up|thruster|wall_ball|manmaker|burpee/i.test(t) && (role === "main_compound" || ex.modality === "power")) {
    out.add("soccer_skill_olympic_noise");
  }
  if (/\bamrap|wod|chipper|hyrox/i.test(t)) {
    out.add("soccer_crossfit_mixed_noise");
  }

  if (out.size === 0 && hasLower(ex) && (pattern === "squat" || pattern === "hinge")) {
    if (isUnilateralPattern(ex, t)) out.add("soccer_unilateral_strength");
    else out.add("soccer_bilateral_lower_noise");
  }

  return out;
}

export function exerciseMatchesAnySoccerCategory(ex: Exercise, cats: readonly string[]): boolean {
  const h = getSoccerPatternCategoriesForExercise(ex);
  return cats.some((c) => h.has(c as SoccerPatternCategory));
}

/** Main-strength compounds that lack COD/decel/unilateral transfer flavor. */
export function isExcludedFromSoccerMainWorkSlot(ex: Exercise): boolean {
  const c = getSoccerPatternCategoriesForExercise(ex);
  if (c.has("soccer_upper_irrelevant")) return true;
  if (c.has("soccer_skill_olympic_noise")) return true;
  if (c.has("soccer_crossfit_mixed_noise")) return true;
  const role = (ex.exercise_role ?? "").toLowerCase();
  if (c.has("soccer_bilateral_lower_noise") && !c.has("soccer_unilateral_strength") && !c.has("soccer_deceleration_eccentric")) {
    if (/back_squat|front_squat|leg_press|hack_squat/i.test(ex.id)) return true;
  }
  return false;
}

/**
 * Conditioning suited to repeat sprint / incomplete recovery; not steady-state-only as primary field load.
 */
export function isSoccerConditioningExercise(ex: Exercise): boolean {
  if (ex.modality !== "conditioning") return false;
  const c = getSoccerPatternCategoriesForExercise(ex);
  if (c.has("soccer_rsa_conditioning")) return true;
  if (c.has("soccer_steady_state_cardio_only")) return false;
  const t = textBlob(ex);
  if (/\bhiit|interval|tabata|fartlek|sprint|shuttle|assault|bike|row|ski|tempo|stride/i.test(t)) return true;
  return true;
}
