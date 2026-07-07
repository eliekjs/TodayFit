/**
 * Shared eligibility for working-block exercise selection (body-part focus + block-type fit).
 * Used by selectExercises, buildPowerBlock, sport coverage, proportion repair, cooldown, and accessory pools.
 */

import {
  exerciseEligibleForVerticalJumpSession,
  inputHasVerticalJumpSubFocus,
} from "../../data/sportSubFocus/verticalJumpSubFocusShared";
import {
  exerciseIsGenericConditioningMetcon,
  exerciseIsSprintOrCodDrill,
  inputHasIntentDedicatedPowerArchetypeSubFocus,
  resolveBlockStructureProfile,
  sessionBlocksLegPressInAthleticWorkingBlocks,
} from "../../data/sportSubFocus/subFocusIntentRegistry";
import { hardBanLegPressFamily } from "./sportProfileBanPredicates";
import { matchesBodyPartFocus } from "../workoutIntelligence/constraints/eligibilityHelpers";
import type { ResolvedWorkoutConstraints } from "../workoutIntelligence/constraints/constraintTypes";
import { toExerciseWithQualities, type GeneratorExercise } from "../workoutIntelligence/adapters";
import type { Exercise, GenerateWorkoutInput } from "./types";

let activeBlockFillConstraints: ResolvedWorkoutConstraints | undefined;
let activeBlockFillInput: GenerateWorkoutInput | undefined;

export function attachBlockFillContext(
  constraints: ResolvedWorkoutConstraints,
  input: GenerateWorkoutInput
): void {
  activeBlockFillConstraints = constraints;
  activeBlockFillInput = input;
}

export function getActiveBlockFillConstraints(): ResolvedWorkoutConstraints | undefined {
  return activeBlockFillConstraints;
}

export function getActiveBlockFillInput(): GenerateWorkoutInput | undefined {
  return activeBlockFillInput;
}

function normToken(s: string): string {
  return s.toLowerCase().replace(/\s/g, "_");
}

function exerciseBlob(exercise: Pick<Exercise, "id" | "name">): string {
  return normToken(`${exercise.id ?? ""}_${exercise.name ?? ""}`);
}

const POWER_BLOCK_EXCLUDED_ROLES = new Set(["cooldown", "stretch", "mobility", "breathing"]);

const NON_CONDITIONING_WORK_ROLES = new Set([
  "isolation",
  "accessory",
  "main_compound",
  "warmup",
  "prep",
  "mobility",
  "stretch",
  "breathing",
  "cooldown",
]);

const ACCESSORY_EXCLUDED_ROLES = new Set([
  "cooldown",
  "stretch",
  "mobility",
  "breathing",
  "conditioning",
  "warmup",
]);

const METABOLIC_STIMULUS = new Set(["anaerobic", "aerobic_zone2"]);
const METABOLIC_GOAL_TAGS = new Set(["conditioning", "endurance"]);

/** Agility / COD pattern drill id/name cues (underscore-safe). */
const SPRINT_MECHANICS_CUES = [
  "figure_8",
  "figure8",
  "carioca",
  "pro_agility",
  "l_drill",
  "505",
  "cone_drill",
  "agility_ladder",
  "footwork",
  "mirror_drill",
  "shuffle",
  "shuttle",
  "butt_kick",
  "high_knee",
  "arm_pump",
  "wall_drill",
  "_start",
  "starts",
  "skip",
  "skips",
  "acceleration",
  "deceleration",
  "quarter_arc",
  "half_arc",
  "full_arc",
  "circle_run",
  "sprint",
  "cod",
  "agility",
  "lunge",
  "walking_lunge",
  "reverse_lunge",
  "crossover",
] as const;

function blobIsSprintMechanicsPattern(blob: string): boolean {
  return SPRINT_MECHANICS_CUES.some((cue) => blob.includes(cue));
}

/** Metabolic / energy-system keywords (underscore-safe). */
const METABOLIC_CUES = [
  "burpee",
  "battle_rope",
  "mountain_climber",
  "kb_swing",
  "kettlebell_swing",
  "assault",
  "air_bike",
  "tabata",
  "emom",
  "interval",
  "rower",
  "ski_erg",
  "jump_rope",
  "metcon",
  "hiit",
  "farmer_carry",
  "tempo_run",
  "zone2",
  "steady_state",
  "incline_walk",
  "treadmill",
  "elliptical",
  "spin_bike",
  "bike_interval",
  "sled",
  "farmer",
  "carry",
  "prowler",
  "sandbag",
  "stepup",
  "step_up",
  "stair",
] as const;

function blobHasMetabolicCue(blob: string): boolean {
  return METABOLIC_CUES.some((cue) => blob.includes(cue));
}

/** Strength / isolation / prehab patterns that belong in accessory blocks, not cooldown. */
const STRENGTH_ISOLATION_PREHAB_CUES = [
  "tibialis",
  "shin_raise",
  "calf_raise",
  "y_raise",
  "t_raise",
  "ytw",
  "y_t_w",
  "face_pull",
  "reverse_fly",
  "leg_extension",
  "leg_curl",
  "preacher",
  "triceps_pushdown",
  "pushdown",
  "concentration_curl",
  "pec_deck",
  "skull_crusher",
  "wrist_curl",
  "shrug",
] as const;

/** Stretch / foam-roll / breathing recovery signals. */
const STRETCH_RECOVERY_BLOB =
  /\b(stretch|foam_roll|foam roll|pigeon|childs_pose|child_pose|thread_the_needle|thread_needle|breathing|sphinx|lat_stretch|sleeper_stretch|cross_body|open_book|prone_extension|90_90|hip_flexor|hamstring_stretch|quad_stretch|ankle_dorsiflexion)\b/;

function exerciseTagSlugs(ex: Exercise): Set<string> {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) out.add(normToken(s));
  };
  for (const t of ex.tags?.goal_tags ?? []) add(t);
  for (const t of ex.tags?.stimulus ?? []) add(t);
  for (const t of ex.tags?.attribute_tags ?? []) add(t);
  return out;
}

/** Metabolic signals that indicate sustained energy-system work (not sprint-mechanics tagging alone). */
function hasStrongMetabolicSignal(exercise: Exercise): boolean {
  const tags = exerciseTagSlugs(exercise);
  for (const t of tags) {
    if (METABOLIC_STIMULUS.has(t)) return true;
  }
  for (const t of exercise.tags?.goal_tags ?? []) {
    if (METABOLIC_GOAL_TAGS.has(normToken(t))) return true;
  }
  const blob = exerciseBlob(exercise);
  if (blobHasMetabolicCue(blob)) return true;
  const eq = (exercise.equipment_required ?? []).map((x) => normToken(String(x)));
  if (eq.some((x) => ["assault_bike", "air_bike", "rower", "ski_erg", "treadmill", "elliptical", "stair_climber", "bike"].includes(x))) {
    return true;
  }
  return false;
}

export function hasMetabolicConditioningSignal(exercise: Exercise): boolean {
  return hasStrongMetabolicSignal(exercise);
}

/**
 * Sprint / COD / agility mechanics drills (short efforts, pattern work) — belong in power/speed slots,
 * not generic conditioning finishers unless they also carry metabolic demand.
 */
export function isSprintMechanicsDrill(exercise: Exercise): boolean {
  const blob = exerciseBlob(exercise);
  const patternDrill = exerciseIsSprintOrCodDrill(exercise) || blobIsSprintMechanicsPattern(blob);
  if (!patternDrill) return false;

  // True metabolic implements / HIIT keywords override mis-tagged zone2 on field drills.
  const eq = (exercise.equipment_required ?? []).map((x) => normToken(String(x)));
  if (
    eq.some((x) =>
      ["assault_bike", "air_bike", "rower", "ski_erg", "treadmill", "elliptical", "stair_climber", "bike"].includes(x)
    )
  ) {
    return false;
  }
  const blobSpaced = blob.replace(/_/g, " ");
  if (blobHasMetabolicCue(blob)) return false;

  return true;
}

export type ConditioningEligibilityContext = {
  input?: GenerateWorkoutInput;
};

/**
 * True when an exercise belongs in a conditioning block (metabolic / energy-system work),
 * not accessory isolation, strength fillers, or COD/agility pattern drills.
 */
export function isConditioningEligible(
  exercise: Exercise,
  ctx?: ConditioningEligibilityContext
): boolean {
  const input = ctx?.input ?? activeBlockFillInput;
  const fieldDrillsOk = input
    ? resolveBlockStructureProfile(input).fieldDrillConditioningEligible
    : false;

  const modality = normToken(exercise.modality ?? "");
  const role = normToken(exercise.exercise_role ?? "");

  if (NON_CONDITIONING_WORK_ROLES.has(role)) return false;
  if (modality === "mobility" || modality === "recovery") return false;
  if (isAssessmentExercise(exercise)) return false;

  if (fieldDrillsOk && (exerciseIsSprintOrCodDrill(exercise) || isSprintMechanicsDrill(exercise))) {
    return true;
  }

  if (isSprintMechanicsDrill(exercise)) return false;
  if (hasStrongMetabolicSignal(exercise)) return true;

  const blob = exerciseBlob(exercise);
  // Loaded carries / sled / hill implements can be metabolic conditioning despite strength modality.
  if (
    (modality === "strength" || modality === "hypertrophy") &&
    blobHasMetabolicCue(blob)
  ) {
    return true;
  }

  if (modality === "strength" || modality === "hypertrophy") return false;

  if (modality === "conditioning" || role === "conditioning") {
    // Modality alone is insufficient — reject untagged agility/COD catalog entries.
    return false;
  }

  if (modality === "power" || role === "finisher") {
    return hasMetabolicConditioningSignal(exercise);
  }

  return false;
}

/** Whether an exercise may be picked for a standalone conditioning block pool. */
export function isConditioningBlockPoolCandidate(
  exercise: Exercise,
  ctx?: ConditioningEligibilityContext
): boolean {
  if (!isConditioningEligible(exercise, ctx)) return false;
  const modality = normToken(exercise.modality ?? "");
  if (modality === "conditioning" || modality === "power") return true;
  const input = ctx?.input ?? activeBlockFillInput;
  if (input && resolveBlockStructureProfile(input).fieldDrillConditioningEligible) {
    return exerciseIsSprintOrCodDrill(exercise) || isSprintMechanicsDrill(exercise);
  }
  return false;
}

/** @deprecated Prefer {@link isConditioningEligible}; kept for existing call sites. */
export function isGenuineConditioningExercise(exercise: Exercise): boolean {
  return isConditioningEligible(exercise);
}

/** True when exercise is stretch, mobility, breathing, or foam-roll oriented (recovery). */
export function hasStretchRecoverySignal(exercise: Exercise): boolean {
  const role = normToken(exercise.exercise_role ?? "");
  if (role === "stretch" || role === "cooldown" || role === "breathing") return true;
  if ((exercise.stretch_targets?.length ?? 0) > 0) return true;
  if ((exercise.mobility_targets?.length ?? 0) > 0) return true;
  const mod = normToken(exercise.modality ?? "");
  if (mod === "recovery") return true;
  return STRETCH_RECOVERY_BLOB.test(exerciseBlob(exercise));
}

function blobHasStrengthIsolationCue(blob: string): boolean {
  return STRENGTH_ISOLATION_PREHAB_CUES.some((cue) => blob.includes(cue));
}

/** Strength, isolation, or prehab work — not appropriate for cooldown blocks. */
export function isStrengthIsolationPrehabWork(exercise: Exercise): boolean {
  const role = normToken(exercise.exercise_role ?? "");
  if (role === "isolation" || role === "accessory" || role === "main_compound") return true;
  const mod = normToken(exercise.modality ?? "");
  const blob = exerciseBlob(exercise);
  if (blobHasStrengthIsolationCue(blob)) return true;
  if ((mod === "strength" || mod === "hypertrophy" || mod === "power") && !hasStretchRecoverySignal(exercise)) {
    return true;
  }
  return false;
}

/**
 * Cooldown block eligibility: stretch, mobility, breathing, foam roll — not strength/isolation/prehab.
 */
export function isRecoveryCooldownEligible(exercise: Exercise): boolean {
  if (isAssessmentExercise(exercise)) return false;
  if (isStrengthIsolationPrehabWork(exercise)) return false;
  if (isConditioningEligible(exercise)) return false;
  if (!hasStretchRecoverySignal(exercise)) return false;

  const role = normToken(exercise.exercise_role ?? "");
  if (role === "warmup" || role === "prep") return false;

  const blob = exerciseBlob(exercise);
  if (blob.includes("cossack") || blob.includes("cuban") || blob.includes("inchworm") || blob.includes("inch_worm")) {
    return false;
  }

  const mod = normToken(exercise.modality ?? "");
  if (mod === "conditioning") return false;
  if (mod === "strength" || mod === "hypertrophy") return false;

  // Generic mobility role without stretch/mobility targets is activation, not cooldown.
  if (role === "mobility" && !(exercise.stretch_targets?.length || exercise.mobility_targets?.length)) {
    return false;
  }

  return true;
}

/**
 * Accessory block eligibility: supplemental strength/hypertrophy/prehab — not primary intent, cooldown, or conditioning.
 */
export function isAccessoryEligible(exercise: Exercise): boolean {
  if (isAssessmentExercise(exercise)) return false;
  if (isSprintMechanicsDrill(exercise)) return false;

  const role = normToken(exercise.exercise_role ?? "");
  const modality = normToken(exercise.modality ?? "");

  if (ACCESSORY_EXCLUDED_ROLES.has(role)) return false;
  if (isRecoveryCooldownEligible(exercise) && (role === "stretch" || role === "mobility" || role === "breathing")) {
    return false;
  }
  if (isConditioningEligible(exercise)) return false;
  if (modality === "mobility" || modality === "recovery") return false;

  if (modality === "strength" || modality === "hypertrophy") return true;
  if (modality === "power" && (role === "accessory" || role === "isolation" || role === "prep")) return true;
  if (role === "isolation" || role === "accessory" || role === "prep") return true;

  return false;
}

/** Assessment / test movements — not working-set training slots. */
export function isAssessmentExercise(exercise: Exercise): boolean {
  const id = normToken(exercise.id ?? "");
  const name = normToken(exercise.name ?? "");
  if (id === "vertical_jump" || name === "vertical_jump") return true;
  if (/\b(test|assessment|measure|benchmark)\b/.test(id) || /\b(test|assessment|measure|benchmark)\b/.test(name)) {
    return true;
  }
  return false;
}

export type BlockFillEligibilityContext = {
  blockType?: string;
  constraints: ResolvedWorkoutConstraints;
  input?: GenerateWorkoutInput;
};

/**
 * Unified gate for all block fill paths: body-part, block-type, assessment exclusion, sub-focus training fit.
 */
export function isExerciseEligibleForBlock(
  exercise: Exercise,
  ctx: BlockFillEligibilityContext
): boolean {
  if (isAssessmentExercise(exercise)) return false;

  const input = ctx.input ?? activeBlockFillInput;
  if (input && inputHasVerticalJumpSubFocus(input)) {
    if (!exerciseEligibleForVerticalJumpSession(exercise, true)) return false;
  }

  if (
    input &&
    sessionBlocksLegPressInAthleticWorkingBlocks(input) &&
    hardBanLegPressFamily(exercise)
  ) {
    const blockNorm = (ctx.blockType ?? "").toLowerCase().replace(/\s/g, "_");
    if (blockNorm === "power" || blockNorm === "main_strength" || blockNorm === "main_hypertrophy") {
      return false;
    }
  }

  const blockNorm = (ctx.blockType ?? "").toLowerCase().replace(/\s/g, "_");
  if (
    blockNorm === "power" &&
    input &&
    inputHasIntentDedicatedPowerArchetypeSubFocus(input) &&
    exerciseIsGenericConditioningMetcon(exercise) &&
    !exerciseIsSprintOrCodDrill(exercise)
  ) {
    return false;
  }

  if (!exerciseEligibleForWorkingBlock(exercise, ctx.blockType, ctx.constraints, ctx.input)) return false;

  return true;
}

/**
 * Whether an exercise may occupy a working block slot given body-part focus and block type.
 */
export function exerciseEligibleForWorkingBlock(
  exercise: Exercise,
  blockType: string | undefined,
  constraints: ResolvedWorkoutConstraints,
  input?: GenerateWorkoutInput
): boolean {
  const qualities = toExerciseWithQualities(exercise as GeneratorExercise);
  if (!matchesBodyPartFocus(qualities, constraints, blockType)) return false;

  const blockNorm = (blockType ?? "").toLowerCase().replace(/\s/g, "_");
  const modality = normToken(exercise.modality ?? "");
  const role = normToken(exercise.exercise_role ?? "");

  if (blockNorm === "conditioning") {
    return isConditioningEligible(exercise, { input: input ?? activeBlockFillInput });
  }

  if (blockNorm === "accessory") {
    return isAccessoryEligible(exercise);
  }

  if (blockNorm === "cooldown") {
    return isRecoveryCooldownEligible(exercise);
  }

  if (blockNorm === "power") {
    if (modality === "mobility" || modality === "recovery") return false;
    if (role && POWER_BLOCK_EXCLUDED_ROLES.has(role)) return false;
    const hasPower =
      modality === "power" || (exercise.tags?.goal_tags ?? []).some((t) => normToken(t) === "power");
    return hasPower;
  }

  if (blockNorm === "main_strength" || blockNorm === "main_hypertrophy") {
    if (modality === "mobility" || modality === "recovery") return false;
    if (role === "mobility" || role === "stretch" || role === "breathing") return false;
    if (isRecoveryCooldownEligible(exercise) && !role) return false;
    if (blockNorm === "main_hypertrophy" && isSprintMechanicsDrill(exercise)) return false;
  }

  return true;
}
