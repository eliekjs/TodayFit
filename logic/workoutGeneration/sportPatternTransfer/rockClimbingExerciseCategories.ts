/**
 * Rock climbing: map exercises → transfer / noise categories (heuristic + small overrides).
 */

import type { Exercise } from "../types";
import type { RockClimbingPatternCategory } from "./rockClimbingTypes";

const OVERRIDES: Partial<Record<string, RockClimbingPatternCategory[]>> = {};

function textBlob(ex: Exercise): string {
  return `${ex.id.toLowerCase()} ${(ex.name ?? "").toLowerCase()}`;
}

function isOlympicSkillNoise(ex: Exercise, t: string): boolean {
  const role = (ex.exercise_role ?? "").toLowerCase().replace(/\s/g, "_");
  if (/(^|_)clean\b|clean_to|snatch|jerk|muscle_up/i.test(ex.id) && (role === "main_compound" || ex.modality === "power")) {
    return true;
  }
  return false;
}

export function getRockClimbingPatternCategoriesForExercise(ex: Exercise): Set<RockClimbingPatternCategory> {
  const out = new Set<RockClimbingPatternCategory>();
  const ov = OVERRIDES[ex.id];
  if (ov) for (const c of ov) out.add(c);

  const t = textBlob(ex);
  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const fine = (ex.movement_patterns ?? []).map((p) => p.toLowerCase().replace(/\s/g, "_"));
  const role = (ex.exercise_role ?? "").toLowerCase().replace(/\s/g, "_");
  const attr = new Set((ex.tags.attribute_tags ?? []).map((s) => String(s).toLowerCase().replace(/\s/g, "_")));

  if (attr.has("overhead_press_shear") || attr.has("bench_press_identity")) {
    /* ontology hooks if present */
  }

  if (isOlympicSkillNoise(ex, t)) out.add("olympic_skill_lift");

  if (
    /\bburpee|thruster|devil_press|man_maker|battle_rope|assault|fan_bike|ski_erg_sprint|row_sprint\b/i.test(t) &&
    ex.modality === "conditioning"
  ) {
    out.add("metcon_flash_athletic");
  }
  if (/\brun|jog|tempo_run|stride|fartlek\b/i.test(t) && ex.modality === "conditioning") {
    out.add("running_conditioning_identity");
  }
  if (/\bleg_press|hack_squat_machine\b/i.test(t) && pattern === "squat") {
    out.add("leg_press_machine_identity");
  }

  const isPullish = pattern === "pull" || fine.some((p) => p.includes("pull") || p.includes("row"));
  const isHinge = pattern === "hinge" || fine.some((p) => p.includes("hinge") || p.includes("deadlift"));
  const isSquat = pattern === "squat" || fine.some((p) => p.includes("squat"));

  if (pattern === "push" && /\b(overhead|ohp|oh_press|strict_press|push_press|military_press|shoulder_press)\b/i.test(t)) {
    if (role === "main_compound" || ex.modality === "strength") out.add("overhead_press_strength_identity");
  }
  if (
    pattern === "push" &&
    /\b(bench|floor_press|incline_press|db_press|chest_press)\b/i.test(t) &&
    !/landmine|v.up|vertical/i.test(t)
  ) {
    if (role === "main_compound" || (ex.modality === "strength" && /\bbench\b/i.test(t))) {
      out.add("bench_horizontal_push_identity");
    }
  }

  if (
    isSquat &&
    /\b(back_squat|front_squat|goblet_squat|high_bar|low_bar)\b/i.test(t) &&
    !/split|lateral|pistol|jump/i.test(t)
  ) {
    out.add("squat_dominant_sagittal_lower");
  }

  if (isHinge && /\b(romanian|rdl|hip_thrust|glute_bridge|good_morning|nordic_ham)\b/i.test(t)) {
    out.add("posterior_chain_climbing_support");
  }

  if (isPullish) {
    if (
      /\b(pull-up|pullup|chin|lat_pulldown|lat pulldown|pulldown|rope_climb|assisted_pull|negative_pull)\b/i.test(t) ||
      /\bstern|lat_pr|lat pull|neutral_grip_lat\b/i.test(t)
    ) {
      out.add("vertical_pull_transfer");
    }
    if (
      /\b(row|bent.over|bent_over|seated_row|cable_row|t-bar|t_bar|chest_supported|inverted_row|ring row|renegade)\b/i.test(
        t
      ) ||
      (/\brow\b/i.test(t) && ex.unilateral === true)
    ) {
      out.add("horizontal_pull_transfer");
    }
    if (ex.unilateral === true && /\brow|pulldown|pull|lat\b/i.test(t) && !/face_pull|rear_delt/i.test(t)) {
      out.add("unilateral_pull_brace");
    }
    if (
      /\b(face_pull|face pull|band_pull|pull.?apart|rear_delt|scapular|wall_slide|prone_y|yt|y_raise|i_raise)\b/i.test(t)
    ) {
      out.add("scapular_stability_pull");
    }
  }

  if (/\b(dead_hang|dead hang|finger_hang|flexed_arm_hang|towel_|pinch|\bhang\b|captains_of)\b/i.test(t)) {
    out.add("grip_hang_support");
  }
  if (/\b(wrist_curl|reverse_wrist|forearm|grip_squeeze|rice_bucket)\b/i.test(t) && ex.modality !== "mobility") {
    out.add("grip_hang_support");
  }

  if (
    /\b(hollow|dead_bug|bird_dog|plank|l-sit|lsit|pallof|rollout|dragon_flag|hanging_leg|toes_to_bar|copenhagen)\b/i.test(
      t
    ) ||
    (fine.some((p) => p.includes("anti_extension") || p.includes("anti_rotation")) && ex.modality === "strength")
  ) {
    out.add("trunk_bracing_climbing");
  }

  if (
    pattern === "carry" &&
    /\b(suitcase|farmer|bottoms_up|rack_carry)\b/i.test(t) &&
    !/\bsled_push|yin|yoke/i.test(t)
  ) {
    out.add("grip_hang_support");
    out.add("trunk_bracing_climbing");
  }

  return out;
}

export function exerciseMatchesAnyRockClimbingCategory(ex: Exercise, cats: readonly string[]): boolean {
  const h = getRockClimbingPatternCategoriesForExercise(ex);
  return cats.some((c) => h.has(c as RockClimbingPatternCategory));
}

export function isExcludedFromRockClimbingMainWorkSlot(ex: Exercise): boolean {
  const c = getRockClimbingPatternCategoriesForExercise(ex);
  if (c.has("olympic_skill_lift")) return true;
  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  if (c.has("bench_horizontal_push_identity") && pattern === "push") return true;
  if (
    c.has("overhead_press_strength_identity") &&
    pattern === "push" &&
    !c.has("vertical_pull_transfer") &&
    !c.has("horizontal_pull_transfer")
  ) {
    return true;
  }
  return false;
}
