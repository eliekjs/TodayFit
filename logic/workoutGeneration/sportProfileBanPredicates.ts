/**
 * Named ban predicates for sport profiles (referenced by key from canonical `SportDefinition.engine`).
 */

import type { SportBanPredicateKey } from "../../data/sportSubFocus/types";
import type { Exercise } from "./types";

function normTag(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_");
}

function collectExerciseTagSet(exercise: Exercise): Set<string> {
  const slugs = new Set<string>();
  const add = (s: string) => slugs.add(normTag(s));
  for (const t of exercise.tags.goal_tags ?? []) add(t);
  for (const t of exercise.tags.sport_tags ?? []) add(t);
  for (const t of exercise.tags.stimulus ?? []) add(t);
  for (const t of exercise.tags.attribute_tags ?? []) add(t);
  for (const m of exercise.muscle_groups ?? []) add(m);
  if (exercise.movement_pattern) add(exercise.movement_pattern);
  const pairing = (exercise.pairing_category ?? "").trim();
  if (pairing) add(pairing);
  return slugs;
}

function equipmentNorm(exercise: Exercise): Set<string> {
  return new Set(exercise.equipment_required.map((eq) => normTag(eq)));
}

/** Heavy lower-only squat/hinge (no upper / core emphasis) — limit for climbing prep. */
export function exerciseIsHeavyLowerOnlySquatHinge(exercise: Exercise): boolean {
  if (exercise.modality === "conditioning" || exercise.modality === "mobility" || exercise.modality === "recovery") {
    return false;
  }
  const pat = exercise.movement_pattern;
  if (pat !== "squat" && pat !== "hinge") return false;
  const tags = collectExerciseTagSet(exercise);
  if (tags.has("single_leg") || tags.has("single_leg_strength") || tags.has("unilateral")) return false;
  const mg = exercise.muscle_groups.map(normTag);
  const hasUpper = mg.some((m) =>
    ["chest", "lats", "biceps", "triceps", "shoulders", "upper_back", "push", "pull"].includes(m)
  );
  if (hasUpper) return false;
  const hasCore = mg.includes("core") || tags.has("core_stability") || tags.has("core_bracing");
  if (hasCore) return false;
  return mg.includes("legs") || tags.has("quad") || tags.has("quads") || tags.has("hamstrings") || tags.has("glutes");
}

export function hardBanLegPressFamily(exercise: Exercise): boolean {
  const id = normTag(exercise.id);
  if (id.includes("leg_press") || id.includes("hack_squat") || id.includes("smith_machine_squat")) return true;
  const eq = equipmentNorm(exercise);
  if (eq.has("leg_press") || eq.has("machine")) {
    const pairing = normTag(exercise.pairing_category ?? "");
    if (pairing.includes("leg_press") || (pairing.includes("quad") && eq.has("leg_press"))) return true;
  }
  if (eq.has("leg_press")) return true;
  return false;
}

/** Alpine: upper-only push/pull strength work without lower context. */
export function exerciseAlpineUpperOnlyPushPullStrength(exercise: Exercise): boolean {
  if (exercise.modality !== "strength" && exercise.modality !== "hypertrophy") return false;
  const mg = exercise.muscle_groups.map(normTag);
  const lower = mg.some((m) => ["legs", "quads", "glutes", "hamstrings", "calves"].includes(m));
  if (lower) return false;
  const upperOnly =
    mg.length > 0 &&
    mg.every((m) =>
      ["chest", "shoulders", "triceps", "biceps", "lats", "upper_back", "push", "pull"].includes(m)
    );
  return upperOnly && (exercise.movement_pattern === "push" || exercise.movement_pattern === "pull");
}

export const BAN_PREDICATES: Record<SportBanPredicateKey, (exercise: Exercise) => boolean> = {
  heavy_lower_only_squat_hinge: exerciseIsHeavyLowerOnlySquatHinge,
  leg_press_family: hardBanLegPressFamily,
  alpine_upper_only_push_pull_strength: exerciseAlpineUpperOnlyPushPullStrength,
};

export function resolveBanPredicateKeys(
  keys: SportBanPredicateKey[] | undefined
): Array<(exercise: Exercise) => boolean> {
  const out: Array<(exercise: Exercise) => boolean> = [];
  for (const k of keys ?? []) {
    const fn = BAN_PREDICATES[k];
    if (!fn) throw new Error(`sportProfileBanPredicates: missing implementation for key "${k}"`);
    out.push(fn);
  }
  return out;
}
