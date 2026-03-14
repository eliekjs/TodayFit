/**
 * Phase 10: Ontology normalization layer.
 * Resolves exercise ontology + legacy fields into one canonical shape for generator/scoring.
 * Prefer explicit ontology when present; fall back safely to legacy only when needed.
 * Do not break backward compatibility with existing seeds or tests.
 */

import {
  MOVEMENT_FAMILIES,
  MOVEMENT_PATTERNS,
  LEGACY_MOVEMENT_PATTERNS,
  JOINT_STRESS_TAGS,
  EXERCISE_ROLES,
  PAIRING_CATEGORIES,
  FATIGUE_REGIONS,
  MOBILITY_TARGETS,
  STRETCH_TARGETS,
  normalizeSlug,
} from "../../lib/ontology";
import { getLegacyMovementPattern } from "../../lib/ontology/legacyMapping";

/** Minimal exercise-like shape for normalization (generator Exercise or adapter). */
export interface ExerciseForNormalization {
  id: string;
  movement_pattern?: string;
  muscle_groups?: string[];
  primary_movement_family?: string;
  secondary_movement_families?: string[];
  movement_patterns?: string[];
  exercise_role?: string;
  pairing_category?: string;
  fatigue_regions?: string[];
  mobility_targets?: string[];
  stretch_targets?: string[];
  joint_stress_tags?: string[];
  tags?: { joint_stress?: string[]; stimulus?: string[] };
  unilateral?: boolean;
  grip_demand?: string;
}

const SET_MOVEMENT_FAMILY = new Set<string>(MOVEMENT_FAMILIES);
const SET_JOINT_STRESS = new Set<string>(JOINT_STRESS_TAGS);
const SET_EXERCISE_ROLE = new Set<string>(EXERCISE_ROLES);
const SET_PAIRING_CATEGORY = new Set<string>(PAIRING_CATEGORIES);
const SET_FATIGUE_REGION = new Set<string>(FATIGUE_REGIONS);
const SET_MOBILITY_TARGET = new Set<string>(MOBILITY_TARGETS);
const SET_STRETCH_TARGET = new Set<string>(STRETCH_TARGETS);
const SET_MOVEMENT_PATTERN = new Set<string>(MOVEMENT_PATTERNS);

function norm(s: string | undefined): string {
  if (!s) return "";
  return normalizeSlug(s);
}

/** Muscle group -> canonical fatigue region (legacy fallback). forearms -> grip. */
const MUSCLE_TO_FATIGUE: Record<string, string> = {
  chest: "pecs",
  pecs: "pecs",
  triceps: "triceps",
  shoulders: "shoulders",
  back: "lats",
  lats: "lats",
  biceps: "biceps",
  quads: "quads",
  glutes: "glutes",
  hamstrings: "hamstrings",
  calves: "calves",
  core: "core",
  forearms: "grip",
};

/** Grip-demand indicators: ontology, tags, pattern, and common exercise heuristics. */
const GRIP_STIMULUS = new Set(["grip", "grip_strength", "forearm_endurance"]);
const GRIP_JOINT_STRESS = new Set(["grip_hanging"]);
const GRIP_PATTERNS = new Set(["vertical_pull", "pull"]); // pull-ups, rows often grip-heavy
const GRIP_PAIRING = "grip";

/**
 * Whether the exercise has meaningful grip fatigue demand (ontology first, then heuristics).
 * Used to add "grip" to canonical fatigue regions when appropriate.
 */
export function hasGripFatigueDemand(ex: ExerciseForNormalization): boolean {
  const demand = ex.grip_demand && norm(ex.grip_demand);
  if (demand === "high" || demand === "medium") return true;
  const cat = ex.pairing_category && norm(ex.pairing_category);
  if (cat === GRIP_PAIRING) return true;
  const stress = ex.joint_stress_tags ?? ex.tags?.joint_stress ?? [];
  if (stress.some((s) => GRIP_JOINT_STRESS.has(norm(s)))) return true;
  const stimulus = ex.tags?.stimulus ?? [];
  if (stimulus.some((s) => GRIP_STIMULUS.has(norm(s)))) return true;
  const regions = ex.fatigue_regions ?? [];
  if (regions.some((r) => norm(r) === "grip" || norm(r) === "forearms")) return true;
  const pattern = norm(ex.movement_pattern);
  const patterns = (ex.movement_patterns ?? []).map(norm);
  if (GRIP_PATTERNS.has(pattern) || patterns.some((p) => GRIP_PATTERNS.has(p))) {
    const muscles = new Set((ex.muscle_groups ?? []).map((m) => norm(m)));
    if (muscles.has("forearms") || muscles.has("lats") || muscles.has("back")) return true;
  }
  return false;
}

/** Canonical exercise role (ontology first, else undefined; no derivation to avoid misclassification). */
export function getCanonicalExerciseRole(ex: ExerciseForNormalization): string | undefined {
  const r = ex.exercise_role && norm(ex.exercise_role);
  if (!r) return undefined;
  return SET_EXERCISE_ROLE.has(r) ? r : r;
}

/** Canonical primary + secondary movement families (ontology first, else derived). */
export function getCanonicalMovementFamilies(ex: ExerciseForNormalization): {
  primary: string | undefined;
  secondary: string[];
} {
  const primary = ex.primary_movement_family && norm(ex.primary_movement_family);
  if (primary && SET_MOVEMENT_FAMILY.has(primary)) {
    const secondary = (ex.secondary_movement_families ?? []).map(norm).filter((s) => SET_MOVEMENT_FAMILY.has(s));
    return { primary, secondary };
  }
  const pattern = norm(ex.movement_pattern);
  const muscles = new Set((ex.muscle_groups ?? []).map((m) => norm(m)));
  if (pattern === "push" || muscles.has("chest") || muscles.has("triceps") || muscles.has("shoulders"))
    return { primary: "upper_push", secondary: [] };
  if (pattern === "pull" || muscles.has("back") || muscles.has("biceps") || muscles.has("lats"))
    return { primary: "upper_pull", secondary: [] };
  if (
    pattern === "squat" ||
    pattern === "hinge" ||
    pattern === "locomotion" ||
    muscles.has("legs") ||
    muscles.has("quads") ||
    muscles.has("glutes") ||
    muscles.has("hamstrings")
  ) {
    if (muscles.has("core") && !muscles.has("legs") && !muscles.has("quads")) return { primary: "core", secondary: [] };
    return { primary: "lower_body", secondary: [] };
  }
  if (pattern === "carry")
    return muscles.has("core") && !muscles.has("legs") ? { primary: "core", secondary: [] } : { primary: "lower_body", secondary: [] };
  if (pattern === "rotate") return { primary: "core", secondary: [] };
  return { primary: undefined, secondary: [] };
}

const SET_LEGACY_PATTERN = new Set<string>(LEGACY_MOVEMENT_PATTERNS);

/** Canonical movement patterns (ontology first; legacy single mapped to patterns). */
export function getCanonicalMovementPatterns(ex: ExerciseForNormalization): string[] {
  const fromOntology = ex.movement_patterns ?? [];
  if (fromOntology.length) {
    return fromOntology.map(norm).filter((p) => SET_MOVEMENT_PATTERN.has(p) || SET_LEGACY_PATTERN.has(p));
  }
  const leg = norm(ex.movement_pattern);
  if (SET_LEGACY_PATTERN.has(leg)) {
    if (leg === "push") return ["horizontal_push", "vertical_push"];
    if (leg === "pull") return ["horizontal_pull", "vertical_pull"];
    return [leg];
  }
  return [];
}

/** Canonical fatigue regions (ontology first; then derived; then add grip when hasGripFatigueDemand). */
export function getCanonicalFatigueRegions(ex: ExerciseForNormalization): string[] {
  const fromOntology = ex.fatigue_regions;
  const out: string[] = [];
  if (fromOntology?.length) {
    for (const r of fromOntology) {
      const c = norm(r);
      if (c === "forearms") out.push("grip");
      else if (SET_FATIGUE_REGION.has(c)) out.push(c);
      else if (c) out.push(c);
    }
  } else {
    const cat = ex.pairing_category && norm(ex.pairing_category);
    if (cat && SET_PAIRING_CATEGORY.has(cat)) {
      const map: Record<string, string> = { posterior_chain: "hamstrings", back: "lats" };
      out.push(map[cat] ?? cat);
    }
    const muscles = (ex.muscle_groups ?? []).map((m) => norm(m));
    for (const m of muscles) {
      const canonical = MUSCLE_TO_FATIGUE[m] ?? m;
      if (canonical && !out.includes(canonical)) out.push(canonical);
    }
    if (!out.length && ex.movement_pattern) out.push(norm(ex.movement_pattern));
  }
  if (hasGripFatigueDemand(ex) && !out.includes("grip")) out.push("grip");
  return [...new Set(out)].filter(Boolean);
}

/** Canonical joint stress tags (ontology first, else legacy tags). */
export function getCanonicalJointStressTags(ex: ExerciseForNormalization): string[] {
  const fromOntology = ex.joint_stress_tags;
  if (fromOntology?.length) {
    return fromOntology.map(norm).filter((t) => SET_JOINT_STRESS.has(t));
  }
  const legacy = ex.tags?.joint_stress ?? [];
  return legacy
    .map((t) => (t.startsWith("joint_") ? norm(t.slice(6)) : norm(t)))
    .filter((t) => SET_JOINT_STRESS.has(t) || t.length > 0);
}

/** Canonical mobility targets (ontology first; no derivation). */
export function getCanonicalMobilityTargets(ex: ExerciseForNormalization): string[] {
  const fromOntology = ex.mobility_targets ?? [];
  return fromOntology.map(norm).filter((t) => SET_MOBILITY_TARGET.has(t) || t.length > 0);
}

/** Canonical stretch targets (ontology first; no derivation). */
export function getCanonicalStretchTargets(ex: ExerciseForNormalization): string[] {
  const fromOntology = ex.stretch_targets ?? [];
  return fromOntology.map(norm).filter((t) => SET_STRETCH_TARGET.has(t) || t.length > 0);
}

/** Whether the exercise is canonically a compound (main_compound or secondary_compound role, or derived from role). */
export function isCanonicalCompound(ex: ExerciseForNormalization): boolean {
  const role = getCanonicalExerciseRole(ex);
  if (role === "main_compound" || role === "secondary_compound") return true;
  if (role) return false;
  const pattern = norm(ex.movement_pattern);
  const patterns = (ex.movement_patterns ?? []).map(norm);
  const compoundPatterns = new Set(["squat", "hinge", "horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull", "lunge"]);
  return compoundPatterns.has(pattern) || patterns.some((p) => compoundPatterns.has(p));
}

/** Whether the exercise is canonically isolation (exercise_role isolation or single-joint heuristic). */
export function isCanonicalIsolation(ex: ExerciseForNormalization): boolean {
  const role = getCanonicalExerciseRole(ex);
  if (role === "isolation") return true;
  if (role) return false;
  const muscles = ex.muscle_groups ?? [];
  const singleGroup = muscles.length <= 1;
  const pattern = norm(ex.movement_pattern);
  const smallPatterns = new Set(["push", "pull"]);
  return singleGroup && smallPatterns.has(pattern);
}

/** Whether the exercise is unilateral (ontology first, else false). */
export function isCanonicalUnilateral(ex: ExerciseForNormalization): boolean {
  if (ex.unilateral === true) return true;
  return false;
}

/** Legacy movement pattern for backward compatibility (e.g. balance categories). */
export function getCanonicalLegacyMovementPattern(ex: ExerciseForNormalization): string {
  return getLegacyMovementPattern({
    movement_patterns: ex.movement_patterns?.length ? ex.movement_patterns : undefined,
    movement_pattern: ex.movement_pattern ?? undefined,
  });
}
