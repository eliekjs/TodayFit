/**
 * Phase 4: Resolve desired training qualities for session and per-block.
 * Combines goals, sports, session type, stimulus profile, and block target_qualities.
 */

import type { TrainingQualitySlug } from "../trainingQualities";
import type { SessionTemplateV2, BlockSpec } from "../types";
import type { DesiredQualityProfile, WorkoutSelectionInput } from "./scoreTypes";
import { mergeTargetVector } from "../targetVector";
import { getBlockTemplate } from "../blockTemplates";
/**
 * Build session-level desired quality profile from user input and template.
 */
export function resolveSessionQualities(
  input: WorkoutSelectionInput,
  template: SessionTemplateV2
): DesiredQualityProfile {
  if (input.target_training_qualities && Object.keys(input.target_training_qualities).length > 0) {
    return { weights: normalizeWeights(input.target_training_qualities) };
  }
  const targetVector = mergeTargetVector({
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals ?? [],
    sport_slugs: input.sports,
    goal_weights: [0.6, 0.3, 0.1],
    sport_weight: input.sports?.length ? 0.5 : 0,
  });
  const weights: Partial<Record<TrainingQualitySlug, number>> = {};
  targetVector.forEach((v, k) => {
    weights[k] = v;
  });
  return { weights };
}

/**
 * Resolve desired qualities for a specific block.
 * Merges session qualities with block-level quality_focus from block spec/template.
 */
export function resolveBlockQualities(
  blockSpec: BlockSpec,
  blockIndex: number,
  sessionQualities: DesiredQualityProfile,
  template: SessionTemplateV2
): DesiredQualityProfile {
  const sessionWeights = sessionQualities.weights;
  const focus = blockSpec.quality_focus;
  const blockTmpl = getBlockTemplate(blockSpec.block_type, blockSpec.format);
  const blockTargets = focus?.length ? focus : blockTmpl.target_qualities;

  if (!blockTargets?.length) {
    return sessionQualities;
  }

  const weights: Partial<Record<TrainingQualitySlug, number>> = { ...sessionWeights };
  const blockBoost = 1.4;
  for (const q of blockTargets) {
    const current = weights[q] ?? 0;
    weights[q] = Math.min(1, current * blockBoost);
  }
  return { weights: normalizeWeights(weights) };
}

/**
 * Build full resolved context: session + per-block qualities.
 */
export function resolveSessionContext(
  input: WorkoutSelectionInput,
  template: SessionTemplateV2
): { session_qualities: DesiredQualityProfile; block_qualities: DesiredQualityProfile[] } {
  const session_qualities = resolveSessionQualities(input, template);
  const block_qualities = template.block_specs.map((spec, i) =>
    resolveBlockQualities(spec, i, session_qualities, template)
  );
  return { session_qualities, block_qualities };
}

function normalizeWeights(
  w: Partial<Record<TrainingQualitySlug, number>>
): Partial<Record<TrainingQualitySlug, number>> {
  let max = 0;
  for (const v of Object.values(w)) {
    if (typeof v === "number" && v > max) max = v;
  }
  if (max <= 0) return w;
  const out: Partial<Record<TrainingQualitySlug, number>> = {};
  for (const [k, v] of Object.entries(w)) {
    if (typeof v === "number") out[k as TrainingQualitySlug] = v / max;
  }
  return out;
}
