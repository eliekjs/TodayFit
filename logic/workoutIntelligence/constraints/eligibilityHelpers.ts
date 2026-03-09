/**
 * Strict eligibility helpers for the filter-to-workout rules engine.
 * Use resolved constraints and exercise metadata to gate inclusion and pairing.
 */

import type { ExerciseWithQualities } from "../types";
import type {
  ResolvedWorkoutConstraints,
  MovementFamily,
  JointStressTag,
} from "./constraintTypes";
import {
  getEffectivePairingFamilies,
  hasGripDemand as hasGripDemandPairing,
} from "../supersetPairing";

const VALID_MOVEMENT_FAMILIES: MovementFamily[] = [
  "upper_push", "upper_pull", "lower_body", "core", "mobility", "conditioning",
];

/** Derive primary movement family from existing exercise fields (or use DB primary_movement_family when set). */
export function deriveMovementFamily(ex: ExerciseWithQualities): MovementFamily {
  const fromDb = ex.primary_movement_family?.toLowerCase().replace(/\s/g, "_");
  if (fromDb && VALID_MOVEMENT_FAMILIES.includes(fromDb as MovementFamily))
    return fromDb as MovementFamily;

  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const muscles = new Set((ex.muscle_groups ?? []).map((m) => m.toLowerCase()));
  const modality = (ex.modality ?? "").toLowerCase();

  if (modality === "mobility" || modality === "recovery") return "mobility";
  if (modality === "conditioning") return "conditioning";

  if (pattern === "push") {
    if (muscles.has("chest") || muscles.has("triceps") || muscles.has("push") || muscles.has("shoulders"))
      return "upper_push";
    return "upper_push";
  }
  if (pattern === "pull") {
    if (muscles.has("back") || muscles.has("biceps") || muscles.has("pull") || muscles.has("lats"))
      return "upper_pull";
    return "upper_pull";
  }
  if (pattern === "squat" || pattern === "hinge" || pattern === "locomotion") {
    if (muscles.has("legs") || muscles.has("quad") || muscles.has("glutes") || muscles.has("hamstrings"))
      return "lower_body";
    if (muscles.has("core") || muscles.has("abs")) return "core";
    return "lower_body";
  }
  if (pattern === "carry") {
    if (muscles.has("core") && !muscles.has("legs")) return "core";
    return "lower_body";
  }
  if (pattern === "rotate") {
    if (muscles.has("core") || muscles.has("abs")) return "core";
    return "core";
  }
  return "lower_body";
}

/** Ontology-first: joint stress tags to check (prefer structured, fallback to legacy). */
function getJointStressForEligibility(ex: ExerciseWithQualities): string[] {
  const fromOntology = ex.joint_stress_tags ?? [];
  if (fromOntology.length > 0) return fromOntology;
  return ex.joint_stress ?? [];
}

/** Ontology-first: contraindication tags to check (prefer structured, fallback to legacy). */
function getContraindicationsForEligibility(ex: ExerciseWithQualities): string[] {
  const fromOntology = ex.contraindication_tags ?? [];
  if (fromOntology.length > 0) return fromOntology;
  return ex.contraindications ?? [];
}

/** Check if exercise is allowed given injury/restriction rules (hard exclude). Uses ontology fields first when present. */
export function isExerciseAllowedByInjuries(
  exercise: ExerciseWithQualities,
  constraints: ResolvedWorkoutConstraints
): boolean {
  if (constraints.excluded_exercise_ids.has(exercise.id)) return false;
  const jointStress = getJointStressForEligibility(exercise);
  for (const tag of jointStress) {
    const normalized = tag.toLowerCase().replace(/\s/g, "_");
    if (constraints.excluded_joint_stress_tags.has(normalized)) return false;
  }
  const contra = getContraindicationsForEligibility(exercise);
  const excludedContra = constraints.excluded_contraindication_keys;
  if (excludedContra.size > 0) {
    for (const c of contra) {
      const key = c.toLowerCase().replace(/\s/g, "_");
      if (excludedContra.has(key)) return false;
      for (const exKey of excludedContra) {
        if (key.includes(exKey) || exKey.includes(key)) return false;
      }
    }
  }
  return true;
}

/** Check equipment compatibility (ontology-agnostic; uses exercise.equipment_required). */
export function matchesEquipmentConstraints(
  exercise: ExerciseWithQualities,
  availableEquipment: string[],
  excludedEquipment: string[] = []
): boolean {
  const available = new Set(availableEquipment.map((e) => e.toLowerCase().replace(/\s/g, "_")));
  const excluded = new Set(excludedEquipment.map((e) => e.toLowerCase().replace(/\s/g, "_")));
  const required = (exercise.equipment_required ?? []).map((e) => e.toLowerCase().replace(/\s/g, "_"));
  if (required.length === 0) return true;
  for (const r of required) {
    if (excluded.has(r)) return false;
    if (!available.has(r)) return false;
  }
  return true;
}

/** One-shot eligibility: allowed by injuries, body-part, and equipment. Uses ontology when present. */
export function isExerciseEligibleByConstraints(
  exercise: ExerciseWithQualities,
  constraints: ResolvedWorkoutConstraints,
  options: { blockType?: string; availableEquipment?: string[]; excludedEquipment?: string[] }
): boolean {
  if (!isExerciseAllowedByInjuries(exercise, constraints)) return false;
  if (!matchesBodyPartFocus(exercise, constraints, options.blockType)) return false;
  if (options.availableEquipment != null && !matchesEquipmentConstraints(
    exercise,
    options.availableEquipment,
    options.excludedEquipment ?? []
  )) return false;
  return true;
}

/**
 * Effective movement families for an exercise (ontology-first; used for strict body-part filtering).
 * For hybrids (e.g. thruster): primary + secondary so exercise is allowed when focus matches either.
 */
export function getEffectiveMovementFamilies(exercise: ExerciseWithQualities): MovementFamily[] {
  const primary = exercise.primary_movement_family?.toLowerCase().replace(/\s/g, "_");
  if (primary && VALID_MOVEMENT_FAMILIES.includes(primary as MovementFamily)) {
    const secondaries = (exercise.secondary_movement_families ?? [])
      .map((s) => s.toLowerCase().replace(/\s/g, "_"))
      .filter((s): s is MovementFamily => VALID_MOVEMENT_FAMILIES.includes(s as MovementFamily));
    return [primary as MovementFamily, ...secondaries].filter((f, i, a) => a.indexOf(f) === i);
  }
  return [deriveMovementFamily(exercise)];
}

/** Check if exercise matches body-part focus (hard_include). Uses ontology primary + secondary when present; fallback to derivation. */
export function matchesBodyPartFocus(
  exercise: ExerciseWithQualities,
  constraints: ResolvedWorkoutConstraints,
  _blockType?: string
): boolean {
  if (constraints.allowed_movement_families == null || constraints.allowed_movement_families.length === 0)
    return true;
  const families = getEffectiveMovementFamilies(exercise);
  return families.some((f) => constraints.allowed_movement_families!.includes(f));
}

/** Roles that count as mobility/stretch for required_finishers (ontology). */
const COOLDOWN_COUNT_ROLES = new Set([
  "cooldown", "stretch", "mobility", "breathing",
]);

/** Count if exercise counts as mobility/stretch (ontology-first, then modality/derivation). */
export function isMobilityOrStretchExercise(ex: ExerciseWithQualities): boolean {
  const role = ex.exercise_role?.toLowerCase().replace(/\s/g, "_");
  if (role && COOLDOWN_COUNT_ROLES.has(role)) return true;
  const hasTargets =
    (ex.mobility_targets?.length ?? 0) > 0 || (ex.stretch_targets?.length ?? 0) > 0;
  if (hasTargets) return true;
  const fam = deriveMovementFamily(ex);
  const mod = (ex.modality ?? "").toLowerCase();
  return fam === "mobility" || mod === "mobility" || mod === "recovery";
}

/** Check if block requirement is satisfied (e.g. cooldown has mobility). Used by validator. */
export function satisfiesBlockRequirement(
  blockType: string,
  exerciseSlots: { exercise_id: string }[],
  exercisesById: Map<string, ExerciseWithQualities>,
  constraints: ResolvedWorkoutConstraints
): { satisfied: boolean; missing_mobility_count?: number } {
  if (constraints.min_cooldown_mobility_exercises === 0) return { satisfied: true };
  if (blockType !== "cooldown" && blockType !== "mobility" && blockType !== "recovery")
    return { satisfied: true };

  let mobilityCount = 0;
  for (const slot of exerciseSlots) {
    const ex = exercisesById.get(slot.exercise_id);
    if (!ex) continue;
    if (isMobilityOrStretchExercise(ex)) mobilityCount += 1;
  }
  const required = constraints.min_cooldown_mobility_exercises;
  return {
    satisfied: mobilityCount >= required,
    missing_mobility_count: Math.max(0, required - mobilityCount),
  };
}

/** Check if two exercises can be paired in a superset (ontology-aware: effective families, double grip). */
export function canPairInSuperset(
  a: ExerciseWithQualities,
  b: ExerciseWithQualities,
  constraints: ResolvedWorkoutConstraints
): boolean {
  if (a.id === b.id) return false;
  const pairing = constraints.superset_pairing;
  if (pairing) {
    if (pairing.forbidden_same_pattern && (a.movement_pattern === b.movement_pattern)) return false;
    if (pairing.forbid_double_grip) {
      if (hasGripDemandPairing(a) && hasGripDemandPairing(b)) return false;
    }
    if (pairing.forbidden_pairs?.length) {
      const fa = getEffectivePairingFamilies(a);
      const fb = getEffectivePairingFamilies(b);
      for (const [x, y] of pairing.forbidden_pairs) {
        const aHasX = fa.includes(x);
        const aHasY = fa.includes(y);
        const bHasX = fb.includes(x);
        const bHasY = fb.includes(y);
        if ((aHasX && bHasY) || (aHasY && bHasX)) return false;
      }
    }
  }
  return true;
}

/** Select exercises suitable for cooldown mobility/stretch (ontology-aware; for required_finishers). */
export function selectCooldownMobilityExercises(
  pool: ExerciseWithQualities[],
  constraints: ResolvedWorkoutConstraints,
  alreadyUsedIds: Set<string>,
  count: number,
  preferredTargets?: string[]
): ExerciseWithQualities[] {
  const need = Math.max(0, count);
  if (need === 0) return [];
  const allowed = pool.filter((ex) => {
    if (alreadyUsedIds.has(ex.id)) return false;
    if (!isExerciseAllowedByInjuries(ex, constraints)) return false;
    return isMobilityOrStretchExercise(ex);
  });
  if (preferredTargets?.length) {
    const score = (ex: ExerciseWithQualities) => {
      const m = new Set((ex.mobility_targets ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
      const s = new Set((ex.stretch_targets ?? []).map((t) => t.toLowerCase().replace(/\s/g, "_")));
      return preferredTargets.filter((t) => m.has(t) || s.has(t)).length;
    };
    allowed.sort((a, b) => score(b) - score(a));
  }
  return allowed.slice(0, need);
}
