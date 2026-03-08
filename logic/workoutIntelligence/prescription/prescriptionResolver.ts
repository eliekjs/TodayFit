/**
 * Phase 5: Prescription resolution engine.
 * Determines sets, reps, rest, intent for each exercise from stimulus, block type, and context.
 */

import type { BlockType, BlockFormat } from "../types";
import type { GeneratedWorkout, GeneratedExerciseSlot, GeneratedExercisePrescription } from "../workoutTypes";
import { getBlockTemplate } from "../blockTemplates";
import { getPrescriptionStyle } from "../prescriptionStyles";
import type { PrescriptionStyleSlug } from "../types";
import { getDurationTier } from "../sessionShaping";
import { getIntentForStyle } from "./intentGuidance";
import { resolveSets, resolveReps, resolveRest, type ResolverContext } from "./setRepResolver";
import { scaleSetsByDuration } from "./durationScaling";
import { assignSupersetGroups } from "./supersetFormatter";
import { getNumericFatigueBudget } from "../sessionShaping";
import { reduceSetsToFitFatigue as reduceSetsForFatigue } from "./durationScaling";
import type { StimulusProfileSlug } from "../types";

/** Minimal exercise info for prescription (lookup by id). */
export interface ExerciseInfo {
  id: string;
  name: string;
  fatigue_cost?: "low" | "medium" | "high";
}

export interface PrescriptionContext {
  duration_minutes: number;
  energy_level: "low" | "medium" | "high";
  /** Lookup exercise name and fatigue cost by id. */
  exerciseLookup: Map<string, ExerciseInfo>;
}

/**
 * Resolve prescription for one exercise in a block.
 */
function resolveOnePrescription(
  exerciseId: string,
  blockType: BlockType,
  format: BlockFormat,
  blockIndex: number,
  totalBlocks: number,
  styleSlug: PrescriptionStyleSlug,
  ctx: PrescriptionContext
): GeneratedExercisePrescription {
  const info = ctx.exerciseLookup.get(exerciseId);
  const name = info?.name ?? exerciseId;
  const fatigueCost = info?.fatigue_cost ?? "medium";
  const style = getPrescriptionStyle(styleSlug);
  const durationTier = getDurationTier(ctx.duration_minutes);

  const resolverCtx: ResolverContext = {
    style,
    fatigueCost,
    durationTier,
    energyLevel: ctx.energy_level,
    blockIndex,
    totalBlocks,
  };

  let sets = resolveSets(resolverCtx);
  sets = scaleSetsByDuration(sets, ctx.duration_minutes);
  const reps = resolveReps(resolverCtx);
  const rest = resolveRest(resolverCtx);
  const intent = getIntentForStyle(styleSlug);

  return {
    exercise_id: exerciseId,
    name,
    sets,
    reps,
    rest_seconds: rest,
    intent,
  };
}

/**
 * Get prescription style for a block from block type and format (Phase 3 block template).
 */
function getStyleForBlock(blockType: BlockType, format: BlockFormat): PrescriptionStyleSlug {
  const tmpl = getBlockTemplate(blockType, format);
  const slug = tmpl.prescription_style;
  if (slug && isValidStyleSlug(slug)) return slug as PrescriptionStyleSlug;
  return "moderate_hypertrophy";
}

function isValidStyleSlug(s: string): boolean {
  return [
    "heavy_strength",
    "moderate_hypertrophy",
    "explosive_power",
    "density_accessory",
    "aerobic_steady",
    "anaerobic_intervals",
    "controlled_resilience",
    "mobility_flow",
  ].includes(s);
}

/** Optional block-level coaching note by block type. */
const BLOCK_NOTES: Partial<Record<BlockType, string>> = {
  warmup: "Elevate heart rate and prepare joints for the main work.",
  prep: "Activation and movement prep.",
  main_strength: "Primary compound lifts to drive maximal force production.",
  main_hypertrophy: "Hypertrophy work; focus on time under tension.",
  power: "Explosive intent; quality over volume.",
  accessory: "Additional volume supporting the session stimulus.",
  core: "Trunk stability and anti-movement work.",
  conditioning: "Energy system work.",
  cooldown: "Reduce arousal and promote recovery.",
  mobility: "Range of motion and tissue quality.",
  recovery: "Light movement and restoration.",
};

function getBlockNote(blockType: BlockType, _stimulusProfile: StimulusProfileSlug): string | undefined {
  return BLOCK_NOTES[blockType];
}

/**
 * Apply prescriptions to all exercises in a workout. Mutates workout in place.
 */
export function applyPrescriptions(
  workout: GeneratedWorkout,
  ctx: PrescriptionContext
): void {
  const totalBlocks = workout.blocks.length;

  for (let bi = 0; bi < workout.blocks.length; bi++) {
    const block = workout.blocks[bi];
    const styleSlug = getStyleForBlock(block.block_type, block.format);

    for (const slot of block.exercises) {
      slot.prescription = resolveOnePrescription(
        slot.exercise_id,
        block.block_type,
        block.format,
        bi,
        totalBlocks,
        styleSlug,
        ctx
      );
    }

    assignSupersetGroups(block.exercises, block.format);
    const note = getBlockNote(block.block_type, workout.stimulus_profile);
    if (note) block.block_notes = note;
  }

  const budget = getNumericFatigueBudget(workout.fatigue_budget);
  reduceSetsForFatigue(workout, budget);
}
