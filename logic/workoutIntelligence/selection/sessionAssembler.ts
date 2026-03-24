/**
 * Phase 4: Session assembly engine (MVP).
 * Takes resolved template, iterates blocks, resolves qualities, filters, scores, fills,
 * tracks fatigue and balance, returns GeneratedWorkout skeleton.
 * Resolves workout constraints from input for strict filter-to-workout rules.
 */

import type { ExerciseWithQualities } from "../types";
import type { WorkoutSelectionInput } from "../scoring/scoreTypes";
import { resolveSessionContext } from "../scoring/qualityResolution";
import { createSessionSelectionState } from "../scoring/fatigueTracking";
import { getFatigueBudgetForStimulus, getNumericFatigueBudget } from "../sessionShaping";
import { resolveWorkoutConstraints } from "../constraints/resolveWorkoutConstraints";
import { fillBlock } from "./blockFiller";
import { DEFAULT_SELECTION_CONFIG } from "../scoring/scoringConfig";
import type { GeneratedWorkout } from "../workoutTypes";
import { getCanonicalSportSlug } from "../../../data/sportSubFocus";

export interface AssembleSessionInput {
  /** User/context input. */
  input: WorkoutSelectionInput;
  /** Session template (e.g. from getSessionTemplateV2 or resolveSessionTemplateV2). */
  template: import("../types").SessionTemplateV2;
  /** Full exercise pool (with qualities). */
  exercisePool: ExerciseWithQualities[];
  /** Optional session title. */
  title?: string;
  /** Optional workout id. */
  workoutId?: string;
}

function hasClimbingDemand(input: WorkoutSelectionInput): boolean {
  if (input.sports?.some((sport) => getCanonicalSportSlug(sport) === "rock_climbing")) return true;
  const subFocusSports = Object.keys(input.sport_sub_focus ?? {});
  return subFocusSports.some((sport) => getCanonicalSportSlug(sport) === "rock_climbing");
}

function getSelectionConfig(input: WorkoutSelectionInput) {
  if (!hasClimbingDemand(input)) return DEFAULT_SELECTION_CONFIG;
  return {
    ...DEFAULT_SELECTION_CONFIG,
    // Climbing support sessions should allow repeated pull patterns instead of forcing full-body balance.
    max_same_pattern_per_session: 4,
    max_heavy_compounds_per_session: 2,
    weights: {
      ...DEFAULT_SELECTION_CONFIG.weights,
      balance_bonus: 0.2,
    },
  };
}

/**
 * Assemble a session: resolve qualities, create state, fill each block in order, return GeneratedWorkout.
 */
export function assembleSession(inp: AssembleSessionInput): GeneratedWorkout {
  const config = getSelectionConfig(inp.input);
  const constraints = resolveWorkoutConstraints(inp.input);
  const { session_qualities, block_qualities } = resolveSessionContext(inp.input, inp.template);

  const fatigueBudget = getFatigueBudgetForStimulus(
    inp.template.stimulus_profile,
    inp.input.energy_level
  );
  const numericBudget = getNumericFatigueBudget(fatigueBudget);
  const state = createSessionSelectionState(
    inp.template.fatigue_budget,
    { max_same_pattern_per_session: config.max_same_pattern_per_session }
  );
  state.session_fatigue_budget = numericBudget;

  const blocks: GeneratedWorkout["blocks"] = [];

  for (let i = 0; i < inp.template.block_specs.length; i++) {
    const blockSpec = inp.template.block_specs[i];
    const blockQualities = block_qualities[i] ?? session_qualities;

    const result = fillBlock({
      blockSpec,
      blockIndex: i,
      exercisePool: inp.exercisePool,
      blockQualities,
      input: inp.input,
      state,
      stimulusProfile: inp.template.stimulus_profile,
      config,
      constraints,
    });

    blocks.push(result.generated_block);
  }

  const title =
    inp.title ??
    inp.template.name ??
    `${inp.template.session_type} / ${inp.template.stimulus_profile}`;

  const workout: GeneratedWorkout = {
    id: inp.workoutId ?? `workout_${Date.now()}`,
    session_type: inp.template.session_type,
    stimulus_profile: inp.template.stimulus_profile,
    title,
    blocks,
    duration_minutes: inp.input.duration_minutes,
    fatigue_budget: inp.template.fatigue_budget,
    meta: {
      duration_tier: inp.input.duration_minutes,
      energy_level: inp.input.energy_level,
    },
  };

  return workout;
}
