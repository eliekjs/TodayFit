/**
 * Regional movement families for mobility/recovery exercises.
 *
 * Phase-1 ontology labels almost all mobility as primary family "mobility", which
 * previously failed body-focus pool gates (lower/upper days got an empty activation
 * pool). Derive lower_body / upper_* / core from muscles, attribute tags, and
 * mobility/stretch targets so warmup/cooldown can still align to the day's focus.
 */

export type MobilityRegionalFamily = "lower_body" | "upper_push" | "upper_pull" | "core";

export type MobilityBodyFocusExercise = {
  id?: string;
  name?: string;
  muscle_groups?: string[];
  mobility_targets?: string[];
  stretch_targets?: string[];
  tags?: { attribute_tags?: string[] };
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
}

const LOWER_MUSCLES = new Set([
  "legs",
  "leg",
  "quads",
  "quadriceps",
  "glutes",
  "hamstrings",
  "calves",
  "adductors",
  "hip_flexors",
  "hips",
]);

const UPPER_PUSH_MUSCLES = new Set(["chest", "shoulders", "triceps", "push", "pecs"]);
const UPPER_PULL_MUSCLES = new Set(["back", "lats", "biceps", "pull", "upper_back"]);

const LOWER_TARGETS = new Set([
  "hamstrings",
  "hip_flexors",
  "glutes",
  "calves",
  "quadriceps",
  "hip_internal_rotation",
  "hip_external_rotation",
]);

const UPPER_PUSH_TARGETS = new Set(["shoulders", "pecs", "wrists"]);
const UPPER_PULL_TARGETS = new Set(["lats"]);
const CORE_TARGETS = new Set(["thoracic_spine", "low_back", "lumbar"]);

/**
 * Regional families implied by mobility/recovery metadata (excludes the generic
 * "mobility" bucket itself).
 */
export function deriveMobilityRegionalFamilies(exercise: MobilityBodyFocusExercise): MobilityRegionalFamily[] {
  const out = new Set<MobilityRegionalFamily>();
  const muscles = new Set((exercise.muscle_groups ?? []).map(norm));
  const attrs = new Set((exercise.tags?.attribute_tags ?? []).map(norm));
  const targets = [
    ...(exercise.mobility_targets ?? []),
    ...(exercise.stretch_targets ?? []),
  ].map(norm);

  if (
    [...LOWER_MUSCLES].some((m) => muscles.has(m)) ||
    attrs.has("lower") ||
    attrs.has("legs") ||
    attrs.has("glutes") ||
    attrs.has("hip_mobility") ||
    attrs.has("hip_activation") ||
    attrs.has("ankle_foot_activation") ||
    attrs.has("knee_mobility")
  ) {
    out.add("lower_body");
  }
  if ([...UPPER_PUSH_MUSCLES].some((m) => muscles.has(m)) || attrs.has("upper")) {
    out.add("upper_push");
  }
  if ([...UPPER_PULL_MUSCLES].some((m) => muscles.has(m))) {
    out.add("upper_pull");
  }
  if (muscles.has("core") || attrs.has("core")) {
    out.add("core");
  }

  for (const t of targets) {
    if (LOWER_TARGETS.has(t)) out.add("lower_body");
    if (UPPER_PUSH_TARGETS.has(t)) out.add("upper_push");
    if (UPPER_PULL_TARGETS.has(t)) out.add("upper_pull");
    if (CORE_TARGETS.has(t)) out.add("core");
  }

  // Name/id fallback when tags are sparse (OTA stubs often only have core+legs muscles).
  const blob = norm(`${exercise.id ?? ""}_${exercise.name ?? ""}`);
  if (
    /\b(cossack|tibialis|hip|glute|ankle|calf|quad|hamstring|pigeon|frog|lunge|leg_swing|adductor|groin)\b/.test(
      blob
    )
  ) {
    out.add("lower_body");
  }
  if (/\b(wall_slide|shoulder|scap|pec|cuff|dislocate|face_pull|arm_circle)\b/.test(blob)) {
    out.add("upper_push");
  }
  if (/\b(lat_stretch|thoracic|cat_cow|cat_camel|open_book|thread_the_needle|dead_bug|bird_dog)\b/.test(blob)) {
    out.add("core");
  }

  return [...out];
}

/**
 * Whether a mobility/recovery exercise may enter the session pool for the day's
 * allowed movement families.
 *
 * - Match on derived regional families (not the opaque "mobility" primary).
 * - Core-only prep may appear on upper/lower days (trunk readiness).
 * - Exercises that claim lower_body must not use the core exception to sneak onto upper days.
 * - Unknown/empty regional signals pass so activation is never wiped to zero.
 */
export function mobilityRecoveryPassesBodyFocus(
  exercise: MobilityBodyFocusExercise,
  allowedFamilies: readonly string[]
): boolean {
  if (!allowedFamilies.length) return true;
  const allowed = new Set(allowedFamilies.map(norm));
  const regional = deriveMobilityRegionalFamilies(exercise);

  if (regional.length === 0) return true;
  if (regional.some((f) => allowed.has(f))) return true;

  const hasNonCoreFocus = [...allowed].some((f) => f !== "core");
  const isCoreOnlyPrep =
    regional.includes("core") &&
    !regional.includes("lower_body") &&
    !regional.includes("upper_push") &&
    !regional.includes("upper_pull");
  return hasNonCoreFocus && isCoreOnlyPrep;
}
