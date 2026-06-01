/**
 * Slice G: Prescription adjustments from session feel (pairs with sessionFeelProfile).
 * Active feel is set once per `generateWorkoutSession` call.
 */

import type { GoalTrainingRule } from "../../lib/generation/prescriptionRules";
import { tagSetHasDynamicPowerSignal } from "../../data/sportSubFocus/subFocusIntentArchetypes";
import { resolveSessionFeelProfile, type SessionFeelEmphasis } from "./sessionFeelProfile";
import type { BlockType, Exercise, GenerateWorkoutInput, PrimaryGoal } from "./types";

let activeFeel: SessionFeelEmphasis = "strength";

export function attachSessionPrescriptionFeel(input: GenerateWorkoutInput): void {
  activeFeel = resolveSessionFeelProfile(input).emphasis;
}

export function getActiveSessionPrescriptionFeel(): SessionFeelEmphasis {
  return activeFeel;
}

export function adjustGoalRulesForSessionFeel(
  rules: GoalTrainingRule,
  emphasis: SessionFeelEmphasis
): GoalTrainingRule {
  if (emphasis === "strength") return rules;

  const out: GoalTrainingRule = {
    ...rules,
    cueStyle: { ...rules.cueStyle },
  };

  if (emphasis === "sports_training") {
    out.accessoryRepRange = { min: 6, max: 10 };
    out.accessoryRestRange = { min: 45, max: 75 };
    out.powerRepRange = out.powerRepRange ?? { min: 3, max: 5 };
    out.powerRestRange = out.powerRestRange ?? { min: 120, max: 180 };
    out.cueStyle.strength =
      out.cueStyle.strength ?? "Athletic intent. Explosive quality, full recovery between sets.";
  } else {
    out.accessoryRepRange = { min: 6, max: 12 };
    out.accessoryRestRange = { min: 45, max: 90 };
    out.powerRepRange = out.powerRepRange ?? { min: 3, max: 6 };
    out.powerRestRange = out.powerRestRange ?? { min: 90, max: 150 };
  }

  return out;
}

function exerciseTagSetForPrescription(exercise: Exercise): Set<string> {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) out.add(s.toLowerCase().replace(/\s/g, "_"));
  };
  for (const t of exercise.tags?.stimulus ?? []) add(String(t));
  for (const t of exercise.tags?.attribute_tags ?? []) add(String(t));
  return out;
}

/**
 * Use power-style reps/rest (low reps, long rest) instead of strength/hypertrophy defaults.
 */
export function shouldPrescribePowerIntent(
  blockType: BlockType,
  primaryGoal: PrimaryGoal,
  exercise: Exercise,
  feel: SessionFeelEmphasis
): boolean {
  if (feel === "strength") {
    return blockType === "power" && primaryGoal === "power";
  }

  if (blockType === "power") return true;
  if (primaryGoal === "power") return blockType === "main_strength" || blockType === "power";

  if (blockType !== "main_strength" && blockType !== "accessory") return false;

  if (exercise.modality === "power") return true;

  const tags = exerciseTagSetForPrescription(exercise);
  if (tags.has("plyometric") || tagSetHasDynamicPowerSignal(tags)) return true;

  return false;
}
