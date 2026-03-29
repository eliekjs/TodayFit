/** Hiking pattern categories ↔ exercises. Next sport: parallel module + `SportPatternSlotRule` in `hikingBackpackingRules`-style bundle. */
import type { Exercise } from "../types";
import type { HikingPatternCategory } from "./types";

/** Per-exercise overrides (lightweight; heuristics cover the rest). */
const HIKING_CATEGORY_OVERRIDES: Partial<Record<string, HikingPatternCategory[]>> = {
  stepup: ["locomotion_step_up", "unilateral_knee_dominant", "descent_eccentric_control"],
  walking_lunge: ["unilateral_knee_dominant", "descent_eccentric_control", "incline_stair_conditioning"],
  split_squat: ["unilateral_knee_dominant", "descent_eccentric_control"],
  farmer_carry: ["loaded_carry_pack_tolerance", "trunk_bracing_under_load"],
  zone2_stair_climber: ["incline_stair_conditioning", "calf_ankle_durability"],
  zone2_treadmill: ["incline_stair_conditioning"],
  bodyweight_calf_raise: ["calf_ankle_durability"],
  single_leg_calf_raise: ["calf_ankle_durability", "unilateral_knee_dominant"],
};

const LOWER_MUSCLE = new Set(["legs", "quads", "glutes", "hamstrings", "calves"]);

function textBlob(ex: Exercise): string {
  const id = ex.id.toLowerCase();
  const name = (ex.name ?? "").toLowerCase();
  return `${id} ${name}`;
}

function hasLowerContribution(ex: Exercise): boolean {
  const pm = ex.primary_muscle_groups ?? ex.muscle_groups ?? [];
  return pm.some((m) => LOWER_MUSCLE.has(m.toLowerCase()));
}

export function getHikingPatternCategoriesForExercise(ex: Exercise): Set<HikingPatternCategory> {
  const out = new Set<HikingPatternCategory>();
  const override = HIKING_CATEGORY_OVERRIDES[ex.id];
  if (override) {
    for (const c of override) out.add(c);
  }

  const t = textBlob(ex);
  const role = (ex.exercise_role ?? "").toLowerCase().replace(/\s/g, "_");
  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const fine = (ex.movement_patterns ?? []).map((p) => p.toLowerCase().replace(/\s/g, "_"));
  const stim = new Set((ex.tags.stimulus ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));
  const attr = new Set((ex.tags.attribute_tags ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));

  if (attr.has("hiking_transfer_locomotion_step_up")) out.add("locomotion_step_up");
  if (attr.has("hiking_transfer_unilateral_knee_dominant")) out.add("unilateral_knee_dominant");

  if (
    /\bstep[\s_-]?up|stepup|box_step|bench_step|deficit_step|dumbbell_suitcase_step|front_rack.*step/i.test(
      ex.id
    ) ||
    /\bstep[\s_-]?up|box step/i.test(t)
  ) {
    out.add("locomotion_step_up");
  }

  if (
    /\blunge|split_squat|bulgarian|b_stance|b-stance|pistol|single_leg_squat|skater|split_squat|rear_foot_elevated|ffe/i.test(
      t
    ) ||
    fine.some((p) => ["lunge", "split_squat", "single_leg_squat"].some((k) => p.includes(k)))
  ) {
    out.add("unilateral_knee_dominant");
  }

  if (
    /\breverse_lunge|walking_lunge|forward_lunge|step_down|negative_squat|tempo_squat|slow_squat|eccentric_squat/i.test(
      t
    ) ||
    (stim.has("eccentric") && /squat|lunge|leg_press|split/.test(t))
  ) {
    out.add("descent_eccentric_control");
  }

  if (
    /\bcalf|soleus|gastroc|ankle|tibialis|shin|toe_raise|dorsiflex/i.test(t) &&
    !/hamstring_curl|leg_curl|nordic/.test(ex.id)
  ) {
    out.add("calf_ankle_durability");
  }
  if (/\btibialis|shin_raise|dorsiflexion|ankle.*invert|toe_raise.*anterior/i.test(t)) {
    out.add("tibialis_shin_strength");
  }

  if (
    /\bclamshell|monster_walk|lateral_walk|band_walk|copenhagen|hip_airplane|y_balance|slider.*lunge|triplanar/i.test(
      t
    )
  ) {
    out.add("hip_stability_gait");
  }

  if (
    /\bpallof|anti_rotation|antirotation|suitcase_deadlift|suitcase_squat|dead_bug|ab_wheel|rollout|loaded_carry/i.test(
      t
    ) ||
    (pattern === "carry" && /suitcase|unilateral|one_arm|single_arm/i.test(t))
  ) {
    out.add("trunk_bracing_under_load");
  }

  if (
    pattern === "carry" ||
    /\bfarmer|suitcase|carry|ruck|yoke|sandbag.*carry|front_rack_walk|overhead_walk/i.test(t)
  ) {
    out.add("loaded_carry_pack_tolerance");
  }

  if (
    /\bstair|incline|uphill|hill_walk|hiking|sled_push|sled_drag|stepper/i.test(t) ||
    /\bzone2_stair|zone2_treadmill|treadmill_walk|incline_walk/i.test(ex.id)
  ) {
    out.add("incline_stair_conditioning");
  }
  if (ex.modality === "conditioning" && (ex.id.startsWith("zone2_") || /\bzone2\b/.test(t))) {
    const eq = (ex.equipment_required ?? []).join(" ").toLowerCase();
    if (eq.includes("stair") || eq.includes("treadmill") || t.includes("incline") || t.includes("walk")) {
      out.add("incline_stair_conditioning");
    }
  }

  const isMainCompound = role === "main_compound" || role === "secondary_compound";
  if (
    pattern === "pull" &&
    isMainCompound &&
    /\brack_pull|pendlay|barbell_row|bent_over_row|t_bar|seal_row|chest_supported_row/i.test(ex.id)
  ) {
    out.add("generic_heavy_pull_as_primary");
  }

  if (ex.creative_variation) {
    out.add("low_transfer_novelty_accessory");
  }

  if (
    (pattern === "push" || pattern === "pull") &&
    !hasLowerContribution(ex) &&
    !pattern.includes("carry") &&
    role !== "warmup_prep" &&
    ex.modality !== "mobility" &&
    ex.modality !== "recovery"
  ) {
    out.add("unrelated_upper_body_dominant");
  }

  if (
    /(^|_)clean|clean_to|snatch|jerk|thruster|muscle_up/i.test(ex.id) &&
    (isMainCompound || ex.modality === "power")
  ) {
    out.add("overly_complex_skill_lift");
  }
  // Olympic/barbell skill combined with single-leg locomotion (low hiking transfer vs simple step/lunge).
  if (
    /\b(clean|snatch|jerk|muscle_up|thruster)\b/i.test(ex.id) &&
    (/lunge|split_squat|step_up|stepup/i.test(ex.id) || /\b(bulgarian|ffe)\b/i.test(ex.id))
  ) {
    out.add("overly_complex_skill_lift");
  }

  return out;
}

/**
 * Excluded from main_strength / main_hypertrophy hiking gate when simpler hiking patterns exist.
 * Accessory blocks may still use these.
 */
export function isExcludedFromHikingMainWorkSlot(ex: Exercise): boolean {
  return getHikingPatternCategoriesForExercise(ex).has("overly_complex_skill_lift");
}

export function exerciseMatchesAnyHikingCategory(
  ex: Exercise,
  cats: readonly HikingPatternCategory[]
): boolean {
  const h = getHikingPatternCategoriesForExercise(ex);
  return cats.some((c) => h.has(c));
}

export function isHikingConditioningExercise(ex: Exercise): boolean {
  const h = getHikingPatternCategoriesForExercise(ex);
  return h.has("incline_stair_conditioning") || h.has("loaded_carry_pack_tolerance") || h.has("locomotion_step_up");
}
