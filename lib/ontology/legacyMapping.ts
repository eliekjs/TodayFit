/**
 * Legacy mapping: ontology fields <-> legacy generator fields.
 * When ontology fields are present they are source of truth; these helpers
 * populate legacy fields (tags.joint_stress, tags.contraindications, movement_pattern)
 * so existing generator code keeps working.
 */

import type { LegacyMovementPattern } from "./vocabularies";
import { isLegacyMovementPattern, normalizeSlug } from "./vocabularies";

import { GOAL_SUB_FOCUS_TAG_MAP } from "../../data/goalSubFocus";
import { SUB_FOCUS_TAG_MAP } from "../../data/sportSubFocus/subFocusTagMap";
import { SPORTS_WITH_SUB_FOCUSES } from "../../data/sportSubFocus/sportsWithSubFocuses";

const MATCHABLE_TAG_SLUGS: Set<string> = (() => {
  const out = new Set<string>();
  const goalToTags = (goal: string): string[] => {
    const g = goal.toLowerCase().replace(/\s+/g, "_");
    const map: Record<string, string[]> = {
      strength: ["strength"],
      power: ["power"],
      hypertrophy: ["hypertrophy"],
      body_recomp: ["hypertrophy", "strength"],
      endurance: ["endurance"],
      conditioning: ["conditioning"],
      mobility: ["mobility"],
      recovery: ["recovery"],
      athletic_performance: ["athleticism", "power"],
      calisthenics: ["calisthenics", "strength"],
    };
    return map[g] ?? [g];
  };

  for (const g of [
    "strength",
    "power",
    "hypertrophy",
    "body_recomp",
    "endurance",
    "conditioning",
    "mobility",
    "recovery",
    "athletic_performance",
    "calisthenics",
  ]) {
    for (const t of goalToTags(g)) out.add(normalizeSlug(t));
  }

  for (const entries of Object.values(GOAL_SUB_FOCUS_TAG_MAP)) {
    for (const e of entries) out.add(normalizeSlug(e.tag_slug));
  }

  for (const entries of Object.values(SUB_FOCUS_TAG_MAP)) {
    for (const e of entries) out.add(normalizeSlug(e.tag_slug));
  }

  for (const sport of SPORTS_WITH_SUB_FOCUSES) out.add(normalizeSlug(sport.slug));
  return out;
})();

/** Maps fine movement_patterns to legacy single movement_pattern. */
const PATTERN_TO_LEGACY: Record<string, LegacyMovementPattern> = {
  squat: "squat",
  hinge: "hinge",
  lunge: "squat", // lunge is lower-body; balance logic often groups with squat
  horizontal_push: "push",
  vertical_push: "push",
  horizontal_pull: "pull",
  vertical_pull: "pull",
  carry: "carry",
  rotation: "rotate",
  anti_rotation: "rotate",
  locomotion: "locomotion",
  shoulder_stability: "pull", // prep/mobility; treat as pull for balance
  thoracic_mobility: "rotate",
};

/**
 * Derive legacy movement_pattern from movement_patterns[] or existing movement_pattern.
 * Use when generator expects a single MovementPattern (squat | hinge | push | pull | carry | rotate | locomotion).
 */
export function getLegacyMovementPattern(options: {
  movement_patterns?: string[] | null;
  movement_pattern?: string | null;
}): LegacyMovementPattern {
  const patterns = options.movement_patterns;
  if (patterns?.length) {
    const first = normalizeSlug(patterns[0]);
    const legacy = PATTERN_TO_LEGACY[first];
    if (legacy) return legacy;
    if (isLegacyMovementPattern(first)) return first as LegacyMovementPattern;
  }
  const existing = options.movement_pattern;
  if (existing && isLegacyMovementPattern(normalizeSlug(existing))) {
    return normalizeSlug(existing) as LegacyMovementPattern;
  }
  return "push"; // safe default for unknown
}

/**
 * Prefer ontology joint_stress_tags for tags.joint_stress when present.
 * Returns array suitable for Exercise.tags.joint_stress (canonical slugs).
 */
export function mergeJointStressForTags(options: {
  joint_stress_tags?: string[] | null;
  joint_stress?: string[] | null;
}): string[] | undefined {
  const fromOntology = options.joint_stress_tags;
  if (fromOntology?.length) return [...fromOntology];
  return options.joint_stress?.length ? options.joint_stress : undefined;
}

/**
 * Prefer ontology contraindication_tags for tags.contraindications when present.
 * Returns array suitable for Exercise.tags.contraindications (canonical slugs).
 */
export function mergeContraindicationsForTags(options: {
  contraindication_tags?: string[] | null;
  contraindications?: string[] | null;
}): string[] | undefined {
  const fromOntology = options.contraindication_tags;
  if (fromOntology?.length) return [...fromOntology];
  return options.contraindications?.length ? options.contraindications : undefined;
}

/** Map equipment slugs to app canonical form (EquipmentKey). Used so filtering matches gym profile options. */
const EQUIPMENT_ALIASES: Record<string, string> = {
  resistance_band: "bands",
};

/**
 * Normalize equipment string to canonical slug (lowercase, snake_case).
 * Maps known aliases (e.g. resistance_band → bands) so exercise equipment matches EquipmentKey.
 */
export function normalizeEquipmentSlug(eq: string): string {
  const slug = normalizeSlug(eq);
  return EQUIPMENT_ALIASES[slug] ?? slug;
}

/**
 * Normalize tag slugs so common variants map to canonical sub-focus slugs.
 * This specifically improves goal_sub_focus / sport_sub_focus matching which relies on exact slugs.
 *
 * Returns a list so one input can expand to multiple useful canonical slugs
 * (e.g. "lat_focused" -> ["lats"]).
 */
export function normalizeMatchableTagSlugs(input: string): string[] {
  const slug = normalizeSlug(input).replace(/-/g, "_");
  const out = new Set<string>([slug]);

  const add = (s: string) => out.add(normalizeSlug(s));

  // Hyphen/space variants commonly present in static tags
  const aliasToCanonical: Record<string, string | string[]> = {
    // body regions / muscles
    lat_focused: "lats",
    lat_focus: "lats",
    lat: "lats",
    upper_back: ["upper_back", "back"],
    upperback: "upper_back",
    lower_back: "lower_back",
    low_back: "lower_back",
    lowback: "lower_back",
    chest: "chest",
    shoulders: "shoulders",
    shoulder: "shoulders",
    shoulder_mobility: "shoulders",
    bicep: "biceps",
    tricep: "triceps",
    quad: "quads",
    quad_focused: "quads",
    hamstring: "hamstrings",
    posterior_chain: "posterior_chain",
    posteriorchain: "posterior_chain",
    // derived muscle-group family
    push: ["push", "pushing_strength"],
    pull: ["pull", "pulling_strength"],

    // common generator sub-focus slugs
    core_stability: "core_stability",
    core_stabilization: "core_stability",
    scapular_control: "scapular_control",
    shoulder_stability: "shoulder_stability",
    knee_stability: "knee_stability",
    ankle_stability: "ankle_stability",
    hip_stability: ["hip_stability", "hips"],

    // movement pattern-ish
    row_pattern: "horizontal_pull",
    rows: "horizontal_pull",
    row: "horizontal_pull",
    vertical_push: "vertical_push",
    horizontal_push: "horizontal_push",
    vertical_pull: "vertical_pull",
    horizontal_pull: "horizontal_pull",
    squat_pattern: "squat_pattern",
    hinge_pattern: "hinge_pattern",
    rotate: "rotation",
    locomotion: "locomotion",

    // rotational / anti-rotational phrases (functional fitness exports)
    rotational: "rotation",
    anti_rotational: ["anti_rotation", "core_anti_rotation"],
    anti_extension: "core_anti_extension",

    // mobility targets often written with spaces
    hip_mobility: "hip_mobility",
    thoracic_mobility: ["thoracic_mobility", "t_spine"],

    // hinge / extension patterns (functional fitness exports)
    hip_hinge: ["hinge_pattern", "posterior_chain"],
    hip_extension: ["glute_strength", "posterior_chain", "hinge_pattern"],
    knee_dominant: ["quads", "knee_stability", "squat_pattern"],

    // carry / loaded carries (functional fitness exports)
    loaded_carry: "carry",

    // joint stability qualifiers (functional fitness exports)
    hip_flexion: ["hip_stability", "hips"],
    hip_abduction: ["hip_stability", "hips"],
    ankle_plantar_flexion: "ankle_stability",
    ankle_dorsiflexion: "ankle_stability",
    scapular_elevation: "scapular_strength",

    // strength-quality qualifiers (functional fitness exports)
    isometric_hold: ["isometric_strength", "strength_endurance", "trunk_endurance"],

    // broad region phrases (functional fitness exports)
    upper_body: "shoulders",
    upper: "shoulders",
    lower_body: "legs",
    lower: "legs",
    full_body: "compound",
    trunk: "core",
    core: ["core", "core_bracing"],

    // shoulder technical phrases (functional fitness exports)
    shoulder_abduction: "shoulders",
    shoulder_external_rotation: "shoulders",
    shoulder_dislocates: "shoulders",
    shoulder_dislocation: "shoulders",
    elbow_flexion: "biceps",

    // conditioning synonyms
    zone2: ["zone2_cardio", "aerobic_base", "work_capacity"],
    zone_2: ["zone2_cardio", "aerobic_base", "work_capacity"],
    zone2_cardio: ["zone2_cardio", "aerobic_base", "work_capacity"],
    low_impact: "low_impact",
    uphill_conditioning: "uphill_conditioning",

    // unilateral spelling
    single_leg: ["single_leg", "single_leg_strength"],
    single_legged: ["single_leg", "single_leg_strength"],
  };

  const mapped = aliasToCanonical[slug];
  if (mapped) {
    if (Array.isArray(mapped)) mapped.forEach(add);
    else add(mapped);
  }

  // Some tags are phrases; normalizeSlug handles spaces, but keep a couple extra
  if (slug === "single_leg" || slug === "single_leg_strength") add("unilateral_strength");

  return [...out].filter((s) => MATCHABLE_TAG_SLUGS.has(normalizeSlug(s)));
}
