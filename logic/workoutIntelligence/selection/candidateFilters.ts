/**
 * Phase 4: Candidate filtering pipeline.
 * Modular filters composed into a single pipeline; each filter returns pass/fail.
 */

import type { ExerciseWithQualities } from "../types";
import type { BlockSpec } from "../types";
import type { WorkoutSelectionInput } from "../scoring/scoreTypes";
import type { StimulusProfileSlug } from "../types";
import { getStimulusProfile } from "../stimulusProfiles";
import {
  getInjuryAvoidTags,
  getInjuryAvoidExerciseIds,
  normalizeInjuryKey,
} from "../../../lib/workoutRules";

export type FilterResult = { pass: boolean; reason?: string };

/** Normalize equipment for comparison. */
function normalizeEquipment(eq: string): string {
  return eq.toLowerCase().replace(/\s/g, "_");
}

/** Equipment compatibility: exercise only uses available equipment (and none excluded). */
export function filterEquipment(
  exercise: ExerciseWithQualities,
  input: WorkoutSelectionInput
): FilterResult {
  const available = new Set(input.available_equipment.map(normalizeEquipment));
  const excluded = new Set((input.excluded_equipment ?? []).map(normalizeEquipment));
  const required = (exercise.equipment_required ?? []).map(normalizeEquipment);
  if (required.length === 0) return { pass: true };
  for (const r of required) {
    if (excluded.has(r)) return { pass: false, reason: "excluded_equipment" };
    if (!available.has(r)) return { pass: false, reason: "missing_equipment" };
  }
  return { pass: true };
}

/** Movement pattern: block has target patterns; exercise should match or be acceptable. */
export function filterMovementPattern(
  exercise: ExerciseWithQualities,
  blockSpec: BlockSpec,
  input: WorkoutSelectionInput
): FilterResult {
  const avoid = new Set(input.avoid_movement_patterns ?? []);
  if (avoid.has(exercise.movement_pattern)) return { pass: false, reason: "avoid_pattern" };
  return { pass: true };
}

/** Training quality relevance: exercise should have some overlap with block/session qualities. */
export function filterQualityRelevance(
  exercise: ExerciseWithQualities,
  blockQualityWeights: Partial<Record<string, number>>
): FilterResult {
  const weights = (exercise.training_quality_weights ?? {}) as Record<string, number>;
  let dot = 0;
  for (const [q, w] of Object.entries(blockQualityWeights)) {
    dot += (weights[q] ?? 0) * (w ?? 0);
  }
  if (Object.keys(blockQualityWeights).length === 0) return { pass: true };
  return { pass: dot > 0.05, reason: dot <= 0.05 ? "low_quality_relevance" : undefined };
}

/** Skill/energy: low energy prefers lower-skill exercises. */
export function filterSkillForEnergy(
  exercise: ExerciseWithQualities,
  input: WorkoutSelectionInput
): FilterResult {
  if (input.energy_level !== "low") return { pass: true };
  const skill = exercise.skill_level ?? 3;
  if (skill >= 4) return { pass: false, reason: "high_skill_low_energy" };
  return { pass: true };
}

/** Injury / joint stress: exclude exercises that conflict with limitations. */
export function filterInjury(
  exercise: ExerciseWithQualities,
  input: WorkoutSelectionInput
): FilterResult {
  const injuries = input.injuries_or_limitations ?? [];
  if (injuries.length === 0) return { pass: true };
  const avoidTags = getInjuryAvoidTags(injuries);
  const avoidIds = getInjuryAvoidExerciseIds(injuries);
  if (avoidIds.has(exercise.id)) return { pass: false, reason: "injury_excluded_id" };
  const jointStress = exercise.joint_stress ?? [];
  for (const t of jointStress) {
    if (avoidTags.has(t)) return { pass: false, reason: "injury_joint_stress" };
  }
  const contraindications = exercise.contraindications ?? [];
  for (const c of contraindications) {
    const key = normalizeInjuryKey(c);
    if (injuries.some((i) => normalizeInjuryKey(i) === key))
      return { pass: false, reason: "contraindication" };
  }
  return { pass: true };
}

/** Block type compatibility: e.g. main_strength prefers compound-compatible. */
export function filterBlockType(
  exercise: ExerciseWithQualities,
  blockSpec: BlockSpec,
  stimulusProfile: StimulusProfileSlug
): FilterResult {
  const bt = blockSpec.block_type;
  if (bt === "warmup" || bt === "prep" || bt === "cooldown" || bt === "mobility" || bt === "recovery") {
    const mod = (exercise.modality ?? "").toLowerCase();
    if (bt === "warmup" || bt === "prep") {
      if (mod && mod !== "mobility" && mod !== "recovery" && mod !== "strength")
        return { pass: false, reason: "warmup_prep_modality" };
    }
    return { pass: true };
  }
  if (bt === "power") {
    const mod = (exercise.modality ?? "").toLowerCase();
    const fatigue = exercise.fatigue_cost ?? "medium";
    if (fatigue === "high") return { pass: false, reason: "power_block_high_fatigue" };
    if (mod === "conditioning") return { pass: false, reason: "power_block_conditioning" };
    return { pass: true };
  }
  if (bt === "main_strength") {
    const mod = (exercise.modality ?? "").toLowerCase();
    if (mod === "conditioning" || mod === "mobility") return { pass: false, reason: "main_strength_modality" };
    return { pass: true };
  }
  if (bt === "conditioning") {
    const mod = (exercise.modality ?? "").toLowerCase();
    if (mod !== "conditioning" && mod !== "strength") {
      const q = exercise.training_quality_weights ?? {};
      const hasAerobic = Object.keys(q).some((k) => k.includes("aerobic") || k.includes("anaerobic") || k === "work_capacity");
      if (!hasAerobic) return { pass: false, reason: "conditioning_quality" };
    }
    return { pass: true };
  }
  return { pass: true };
}

/** Session type compatibility (optional): body region focus. */
export function filterBodyRegion(
  exercise: ExerciseWithQualities,
  input: WorkoutSelectionInput
): FilterResult {
  const focus = input.body_region_focus ?? [];
  if (focus.length === 0) return { pass: true };
  const muscles = new Set((exercise.muscle_groups ?? []).map((m) => m.toLowerCase()));
  const pattern = exercise.movement_pattern?.toLowerCase() ?? "";
  const upperPush = focus.some((f) => f.includes("upper_push") || f === "push");
  const upperPull = focus.some((f) => f.includes("upper_pull") || f === "pull");
  const lower = focus.some((f) => f.includes("lower"));
  const core = focus.some((f) => f.includes("core"));
  if (upperPush && (pattern === "push" || muscles.has("chest") || muscles.has("triceps"))) return { pass: true };
  if (upperPull && (pattern === "pull" || muscles.has("back") || muscles.has("biceps"))) return { pass: true };
  if (lower && (pattern === "squat" || pattern === "hinge" || muscles.has("quad") || muscles.has("hamstring"))) return { pass: true };
  if (core && (muscles.has("core") || muscles.has("abs") || pattern === "rotate")) return { pass: true };
  if (focus.length > 0) {
    const anyMatch = upperPush || upperPull || lower || core;
    if (!anyMatch) return { pass: true };
  }
  return { pass: true };
}

/**
 * Run full filter pipeline. Returns only exercises that pass all filters.
 */
export function filterCandidates(
  exercises: ExerciseWithQualities[],
  input: WorkoutSelectionInput,
  blockSpec: BlockSpec,
  blockQualityWeights: Partial<Record<string, number>>,
  stimulusProfile: StimulusProfileSlug
): ExerciseWithQualities[] {
  return exercises.filter((ex) => {
    if (!filterEquipment(ex, input).pass) return false;
    if (!filterMovementPattern(ex, blockSpec, input).pass) return false;
    if (!filterQualityRelevance(ex, blockQualityWeights).pass) return false;
    if (!filterSkillForEnergy(ex, input).pass) return false;
    if (!filterInjury(ex, input).pass) return false;
    if (!filterBlockType(ex, blockSpec, stimulusProfile).pass) return false;
    if (!filterBodyRegion(ex, input).pass) return false;
    return true;
  });
}
