/**
 * Prescription context from block type + active sub-focus archetype (not primary_goal alone).
 */

import {
  collectActiveSubFocusSlugs,
  inputHasSpeedOrCodSubFocus,
  inputHasVerticalJumpSubFocus,
  normalizeSubFocusSlug,
} from "../../data/sportSubFocus/subFocusIntentRegistry";
import {
  isExplosivePlyometricSportSubFocusSlug,
  tagSetHasDynamicPowerSignal,
} from "../../data/sportSubFocus/subFocusIntentArchetypes";
import { isSpeedAgilityPowerStyleSubFocusSlug } from "../../data/sportSubFocus/speedAgilitySubFocusShared";
import type { BlockType, Exercise, GenerateWorkoutInput, PrimaryGoal } from "./types";
import { getActiveSessionPrescriptionFeel, shouldPrescribePowerIntent } from "./sessionFeelPrescription";

export type PrescriptionContext = {
  blockType: BlockType;
  primaryGoal: PrimaryGoal;
  isAccessory: boolean;
};

function exercisePowerSignalTags(exercise: Exercise): Set<string> {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) out.add(s.toLowerCase().replace(/\s/g, "_"));
  };
  for (const t of exercise.tags?.stimulus ?? []) add(String(t));
  for (const t of exercise.tags?.attribute_tags ?? []) add(String(t));
  return out;
}

function sessionHasExplosiveSubFocus(input: GenerateWorkoutInput): boolean {
  return collectActiveSubFocusSlugs(input).some((s) => isExplosivePlyometricSportSubFocusSlug(s));
}

function sessionHasSpeedAgilitySubFocus(input: GenerateWorkoutInput): boolean {
  return collectActiveSubFocusSlugs(input).some((s) => isSpeedAgilityPowerStyleSubFocusSlug(normalizeSubFocusSlug(s)));
}

/**
 * Resolve block type and goal used by getPrescription for a slot.
 */
export function resolvePrescriptionContext(
  blockType: BlockType,
  exercise: Exercise,
  input: GenerateWorkoutInput,
  isAccessory?: boolean
): PrescriptionContext {
  const primaryGoal = input.primary_goal;
  const feel = getActiveSessionPrescriptionFeel();
  const tags = exercisePowerSignalTags(exercise);
  const isPlyoOrPower =
    exercise.modality === "power" ||
    tags.has("plyometric") ||
    tagSetHasDynamicPowerSignal(tags);

  if (blockType === "power") {
    return { blockType: "power", primaryGoal: "power", isAccessory: isAccessory ?? false };
  }

  const explosiveIntent =
    sessionHasExplosiveSubFocus(input) ||
    inputHasVerticalJumpSubFocus(input) ||
    inputHasSpeedOrCodSubFocus(input) ||
    sessionHasSpeedAgilitySubFocus(input);

  if (explosiveIntent && isPlyoOrPower && (blockType === "accessory" || blockType === "main_strength")) {
    return { blockType: "power", primaryGoal: "power", isAccessory: isAccessory ?? blockType === "accessory" };
  }

  if (
    shouldPrescribePowerIntent(blockType, primaryGoal, exercise, feel) &&
    (blockType === "main_strength" || blockType === "accessory")
  ) {
    return { blockType: "power", primaryGoal: "power", isAccessory: isAccessory ?? blockType === "accessory" };
  }

  return { blockType, primaryGoal, isAccessory: isAccessory ?? blockType === "accessory" };
}

/** Cap sets for power/plyo blocks — quality over volume. */
export function capPowerBlockSets(sets: number, blockType: BlockType): number {
  if (blockType !== "power") return sets;
  return Math.min(Math.max(sets, 2), 4);
}
