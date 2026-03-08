/**
 * Phase 4: Block filling engine.
 * Selects exercises for one block given spec, pool, qualities, context, and session state.
 */

import type { ExerciseWithQualities } from "../types";
import type { BlockSpec } from "../types";
import type { WorkoutSelectionInput, DesiredQualityProfile } from "../scoring/scoreTypes";
import type { SessionSelectionState, BlockSelectionResult, SelectionConfig } from "../scoring/scoreTypes";
import { getBlockTemplate } from "../blockTemplates";
import { filterCandidates } from "./candidateFilters";
import { scoreAndRankCandidatesForSelection } from "../scoring/exerciseScoring";
import { wouldViolateGuardrail } from "../scoring/movementBalanceGuardrails";
import {
  wouldExceedSessionFatigue,
  wouldExceedBlockFatigue,
  applyExerciseToState,
  exerciseFatigueContribution,
} from "../scoring/fatigueTracking";
import { assembleSupersetPairs } from "../scoring/pairing";
import { DEFAULT_SELECTION_CONFIG } from "../scoring/scoringConfig";
import type { GeneratedBlock, GeneratedExerciseSlot } from "../workoutTypes";
import {
  getInjuryAvoidTags,
  getInjuryAvoidExerciseIds,
} from "../../../lib/workoutRules";

export interface FillBlockInput {
  blockSpec: BlockSpec;
  blockIndex: number;
  exercisePool: ExerciseWithQualities[];
  blockQualities: DesiredQualityProfile;
  input: WorkoutSelectionInput;
  state: SessionSelectionState;
  stimulusProfile: import("../types").StimulusProfileSlug;
  config?: SelectionConfig;
}

/**
 * Fill one block with exercises. Respects min/max items, format, fatigue, guardrails.
 */
export function fillBlock(inp: FillBlockInput): BlockSelectionResult {
  const config = inp.config ?? DEFAULT_SELECTION_CONFIG;
  const blockTmpl = getBlockTemplate(inp.blockSpec.block_type, inp.blockSpec.format);
  const blockFatigueShare = blockTmpl.fatigue_budget_share;

  const candidates = filterCandidates(
    inp.exercisePool,
    inp.input,
    inp.blockSpec,
    inp.blockQualities.weights ?? {},
    inp.stimulusProfile
  );

  const recentIds = new Set(inp.input.recent_exercise_ids ?? []);
  const avoidTags = getInjuryAvoidTags(inp.input.injuries_or_limitations ?? []);
  const avoidIds = getInjuryAvoidExerciseIds(inp.input.injuries_or_limitations ?? []);

  const scored = scoreAndRankCandidatesForSelection(
    candidates,
    {
      blockQualities: inp.blockQualities,
      blockType: inp.blockSpec.block_type,
      targetMovementPatterns: blockTmpl.target_movement_patterns,
      stimulusProfile: inp.stimulusProfile,
      state: inp.state,
      recentExerciseIds: recentIds,
      fatigueState: inp.input.recent_fatigue_state,
      avoidTags,
      avoidExerciseIds: avoidIds,
      energyLevel: inp.input.energy_level,
      includeBreakdown: false,
    },
    config
  );

  const format = inp.blockSpec.format;
  const minItems = inp.blockSpec.min_items;
  const maxItems = inp.blockSpec.max_items;

  let selected: ExerciseWithQualities[] = [];

  if (
    (format === "superset" || format === "alternating_sets") &&
    maxItems >= 2
  ) {
    selected = assembleSupersetPairs(
      scored,
      inp.state.used_exercise_ids,
      minItems,
      maxItems,
      config
    );
  } else {
    for (const { exercise } of scored) {
      if (selected.length >= maxItems) break;
      if (inp.state.used_exercise_ids.has(exercise.id)) continue;
      if (wouldViolateGuardrail(exercise, inp.state, config)) continue;
      if (wouldExceedSessionFatigue(inp.state, exercise)) continue;
      if (
        wouldExceedBlockFatigue(inp.state, inp.blockIndex, exercise, blockFatigueShare)
      )
        continue;
      const patternCount = inp.state.movement_pattern_counts.get(exercise.movement_pattern ?? "") ?? 0;
      if (patternCount >= config.max_same_pattern_per_session) continue;
      selected.push(exercise);
      applyExerciseToState(inp.state, exercise, inp.blockIndex);
    }
  }

  if ((format === "superset" || format === "alternating_sets") && selected.length > 0) {
    for (const ex of selected) {
      applyExerciseToState(inp.state, ex, inp.blockIndex);
    }
  }
  let fatigueContribution = 0;
  for (const ex of selected) {
    fatigueContribution += exerciseFatigueContribution(ex);
  }

  const title = blockTmpl.title;
  const slots: GeneratedExerciseSlot[] = selected.map((ex) => ({
    exercise_id: ex.id,
  }));

  const generated_block: GeneratedBlock = {
    block_type: inp.blockSpec.block_type,
    format: inp.blockSpec.format,
    title,
    exercises: slots,
  };

  return {
    block_spec: inp.blockSpec,
    block_index: inp.blockIndex,
    exercises: selected,
    generated_block,
    fatigue_contribution: fatigueContribution,
  };
}
