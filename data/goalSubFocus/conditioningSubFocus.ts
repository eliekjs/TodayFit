/**
 * Conditioning sub-focus: direct slug matching as first-class signals.
 * Exercises declare sub-focus slugs (e.g. zone2_aerobic_base, intervals_hiit) in attribute_tags;
 * we match directly — no large hidden ontology. Minimal legacy helpers only where needed.
 */

import { normalizedMusclesIntersect } from "../../lib/ontology/muscleSlugs";
import type { SubFocusProfile } from "./types";

/** Minimal exercise shape for direct sub-focus matching (avoids data -> logic dependency). */
export type ExerciseForSubFocus = {
  id: string;
  name?: string;
  /** Generator field; catalog uses `equipment` on definitions. */
  equipment_required?: string[];
  tags?: { attribute_tags?: string[]; stimulus?: string[] };
  primary_movement_family?: string;
  muscle_groups?: string[];
};

/** Canonical conditioning intent slugs (drive primary selection and template structure). */
export const CONDITIONING_INTENT_SLUGS = [
  "zone2_aerobic_base",
  "intervals_hiit",
  "threshold_tempo",
  "hills",
  "lower_body_power_plyos",
  "olympic_triple_extension",
  "upper_body_power",
  "vertical_jump",
  "sprint",
] as const;

/** Canonical conditioning overlay slugs (drive filtering and secondary scoring). */
export const CONDITIONING_OVERLAY_SLUGS = ["upper", "lower", "core", "full_body"] as const;

const OVERLAY_SET = new Set<string>(CONDITIONING_OVERLAY_SLUGS);

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_");
}

/** Incline / stair / sled patterns when canonical `hills` intent tag is missing (legacy catalog). */
function exerciseLooksLikeHillConditioning(exercise: ExerciseForSubFocus): boolean {
  const id = (exercise.id ?? "").toLowerCase();
  const name = (exercise.name ?? "").toLowerCase();
  const eq = (exercise.equipment_required ?? []).map((x) => x.toLowerCase().replace(/\s/g, "_"));
  const uphillTreadmill =
    eq.includes("treadmill") &&
    (id.includes("incline") ||
      id.includes("uphill") ||
      name.includes("incline") ||
      name.includes("uphill") ||
      name.includes("hill"));
  return (
    id.includes("treadmill_incline") ||
    id.includes("incline") ||
    name.includes("incline") ||
    name.includes("stair") ||
    id.includes("stair") ||
    id.includes("stair_climber") ||
    id.includes("stepup") ||
    id.includes("step_up") ||
    id.includes("sled_push") ||
    id.includes("sled_drag") ||
    uphillTreadmill ||
    eq.includes("stair_climber") ||
    eq.includes("sled")
  );
}

/**
 * True if the exercise matches the given sub-focus slug.
 * Primary: attribute_tags (canonical). Legacy: zone2_aerobic_base <-> stimulus aerobic_zone2; intervals_hiit <-> high-intensity/anaerobic/plyometric.
 */
export function exerciseHasSubFocusSlug(exercise: ExerciseForSubFocus, slug: string): boolean {
  const norm = toSlug(slug);
  const attrs = (exercise.tags?.attribute_tags ?? []).map(toSlug);
  if (attrs.includes(norm)) return true;
  // Minimal legacy: exercises without attribute_tags can still match by stimulus/role
  if (norm === "zone2_long_steady") {
    return exerciseHasSubFocusSlug(exercise, "zone2_aerobic_base");
  }
  if (norm === "zone2_aerobic_base") {
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (stimulus.includes("aerobic_zone2")) return true;
  }
  if (norm === "durability") {
    const attrs = (exercise.tags?.attribute_tags ?? []).map(toSlug);
    if (attrs.includes("durability")) return true;
    const stim = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (
      stim.some((s) =>
        ["isometric", "scapular_control", "trunk_anti_rotation", "anti_flexion", "single_leg"].includes(s)
      )
    )
      return true;
    return attrs.some((a) =>
      ["ankle_stability", "hip_stability", "core_stability", "low_impact", "knee_load"].includes(a)
    );
  }
  // Endurance UI uses `intervals`; conditioning uses `intervals_hiit` — same exercise signals.
  if (norm === "intervals_hiit" || norm === "intervals") {
    if (attrs.includes("intervals_hiit") || attrs.includes("intervals")) return true;
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (stimulus.some((s) => ["anaerobic", "plyometric"].includes(s))) return true;
    return false;
  }
  if (norm === "hills") {
    if (attrs.includes("hills")) return true;
    return exerciseLooksLikeHillConditioning(exercise);
  }

  // Threshold / tempo: direct slug + energy-system tags (DB often uses lactate_threshold / zone3_cardio only).
  if (norm === "threshold_tempo") {
    if (attrs.includes("threshold_tempo")) return true;
    if (attrs.includes("lactate_threshold") || attrs.includes("zone3_cardio")) return true;
    return false;
  }

  // Upper-body power (conditioning): explicit slug, or plyometric stimulus with upper-body signals.
  if (norm === "upper_body_power") {
    if (attrs.includes("upper_body_power")) return true;
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (!stimulus.includes("plyometric")) return false;
    const fam = toSlug(exercise.primary_movement_family ?? "");
    if (fam.includes("upper") || fam === "push" || fam === "pull") return true;
    const muscles = new Set((exercise.muscle_groups ?? []).map(toSlug));
    return (
      muscles.has("chest") ||
      muscles.has("shoulders") ||
      muscles.has("triceps") ||
      muscles.has("lats") ||
      muscles.has("biceps") ||
      muscles.has("upper_back")
    );
  }

  // Conditioning / Endurance overlay slugs: used both as selection filters (filterPoolByOverlay)
  // and for session-intent annotation. Match using the same shape signals as filterPoolByOverlay
  // so coverage counts reflect exercises that will actually be selected.
  if (norm === "upper" || norm === "lower" || norm === "core" || norm === "full_body") {
    return exerciseMatchesConditioningOverlay(exercise, norm);
  }

  return false;
}

/** Mirrors filterPoolByOverlay() logic so coverage matching and pool filtering agree. */
function exerciseMatchesConditioningOverlay(exercise: ExerciseForSubFocus, ov: string): boolean {
  if (ov === "full_body") {
    // Full-body overlay = compound multi-region. Match exercises with both upper and lower muscle signals.
    const muscles = new Set((exercise.muscle_groups ?? []).map(toSlug));
    const hasUpper = muscles.has("chest") || muscles.has("shoulders") || muscles.has("triceps") ||
      muscles.has("lats") || muscles.has("back") || muscles.has("biceps") || muscles.has("upper_back");
    const hasLower = muscles.has("legs") || muscles.has("quads") || muscles.has("glutes") ||
      muscles.has("hamstrings") || muscles.has("calves");
    if (hasUpper && hasLower) return true;
    const fam = toSlug(exercise.primary_movement_family ?? "");
    if (fam === "lower_body" && (hasUpper)) return true;
    return false;
  }

  const fam = toSlug(exercise.primary_movement_family ?? "");
  const muscles = new Set((exercise.muscle_groups ?? []).map(toSlug));

  if (ov === "upper") {
    if (fam.includes("upper") || fam === "push" || fam === "pull") return true;
    return muscles.has("chest") || muscles.has("triceps") || muscles.has("shoulders") ||
      muscles.has("lats") || muscles.has("biceps") || muscles.has("upper_back");
  }
  if (ov === "lower") {
    if (fam.includes("lower") || fam === "squat" || fam === "hinge" || fam === "legs") return true;
    return muscles.has("legs") || muscles.has("quads") || muscles.has("glutes") ||
      muscles.has("hamstrings") || muscles.has("calves");
  }
  if (ov === "core") {
    if (fam === "core" || fam.includes("rotate")) return true;
    return muscles.has("core");
  }
  return false;
}

/** Intent slugs from profile (effectiveSubFocusSlugs minus overlays). Used for primary selection and template. */
export function getConditioningIntentSlugs(profile: SubFocusProfile): string[] {
  return profile.effectiveSubFocusSlugs.filter((s) => !OVERLAY_SET.has(s));
}

/** Primary intent slug for template (first intent, or undefined). Overlays do not drive template. */
export function getPrimaryConditioningIntent(profile: SubFocusProfile): string | undefined {
  return getConditioningIntentSlugs(profile)[0];
}

/** Filter exercises to those that match at least one of the given sub-focus slugs. If none match, returns full pool (no hard filter). */
export function filterPoolByDirectSubFocus<T extends ExerciseForSubFocus>(
  pool: T[],
  slugs: string[]
): T[] {
  if (!slugs.length) return pool;
  const matching = pool.filter((e) => slugs.some((slug) => exerciseHasSubFocusSlug(e, slug)));
  return matching.length > 0 ? matching : pool;
}

/** Filter exercises by overlay (body region). Uses primary_movement_family and muscle_groups. full_body = no filter. */
export function filterPoolByOverlay<T extends ExerciseForSubFocus>(pool: T[], overlayFilter: string): T[] {
  const ov = toSlug(overlayFilter);
  if (ov === "full_body" || !ov) return pool;
  const wantedMuscles = new Set<string>();
  if (ov === "upper")
    wantedMuscles.add("chest").add("triceps").add("shoulders").add("lats").add("biceps").add("upper_back");
  else if (ov === "lower")
    wantedMuscles.add("legs").add("quads").add("glutes").add("hamstrings").add("calves");
  else if (ov === "core") wantedMuscles.add("core");
  const familyMatch = (e: ExerciseForSubFocus): boolean => {
    const fam = (e.primary_movement_family ?? "").toLowerCase().replace(/\s/g, "_");
    if (ov === "upper" && (fam.includes("upper") || fam === "push" || fam === "pull")) return true;
    if (ov === "lower" && (fam.includes("lower") || fam === "squat" || fam === "hinge" || fam === "legs")) return true;
    if (ov === "core" && (fam === "core" || fam.includes("rotate"))) return true;
    return false;
  };
  const muscleMatch = (e: ExerciseForSubFocus): boolean =>
    normalizedMusclesIntersect(e.muscle_groups, wantedMuscles);
  const filtered = pool.filter((e) => familyMatch(e) || muscleMatch(e));
  return filtered.length > 0 ? filtered : pool;
}
