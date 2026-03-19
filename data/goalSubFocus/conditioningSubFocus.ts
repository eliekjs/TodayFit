/**
 * Conditioning sub-focus: direct slug matching as first-class signals.
 * Exercises declare sub-focus slugs (e.g. zone2_aerobic_base, intervals_hiit) in attribute_tags;
 * we match directly — no large hidden ontology. Minimal legacy helpers only where needed.
 */

import type { SubFocusProfile } from "./types";

/** Minimal exercise shape for direct sub-focus matching (avoids data -> logic dependency). */
export type ExerciseForSubFocus = {
  id: string;
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

/**
 * True if the exercise matches the given sub-focus slug.
 * Primary: attribute_tags (canonical). Legacy: zone2_aerobic_base <-> stimulus aerobic_zone2; intervals_hiit <-> high-intensity/anaerobic/plyometric.
 */
export function exerciseHasSubFocusSlug(exercise: ExerciseForSubFocus, slug: string): boolean {
  const norm = toSlug(slug);
  const attrs = (exercise.tags?.attribute_tags ?? []).map(toSlug);
  if (attrs.includes(norm)) return true;
  // Minimal legacy: exercises without attribute_tags can still match by stimulus/role
  if (norm === "zone2_aerobic_base") {
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (stimulus.includes("aerobic_zone2")) return true;
  }
  if (norm === "intervals_hiit") {
    const stimulus = (exercise.tags?.stimulus ?? []).map(toSlug);
    if (stimulus.some((s) => ["anaerobic", "plyometric"].includes(s))) return true;
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
    (e.muscle_groups ?? []).some((m) => wantedMuscles.has(toSlug(m)));
  const filtered = pool.filter((e) => familyMatch(e) || muscleMatch(e));
  return filtered.length > 0 ? filtered : pool;
}
