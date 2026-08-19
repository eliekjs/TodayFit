/**
 * Expand an existing session by generating one extra block (type + optional body part)
 * and inserting it without regenerating the rest of the workout.
 */

import type { GymProfile } from "../data/gymProfiles";
import { structuralBlockTitle } from "./blockGoalDisplay";
import type { SportGoalContext } from "./dailyGeneratorAdapter";
import type { AppHistorySources } from "./buildAppTrainingHistory";
import { GOAL_SLUG_TO_PRIMARY_FOCUS } from "./goalSlugMapping";
import { loadGeneratorModule } from "./loadGeneratorModule";
import { preferredExerciseNamesForManualPreferences } from "./manualPreferredExerciseNames";
import { composeRunGenerationSeed } from "./generationSeed";
import {
  applyBodyChoicesSubFocusToPrefs,
  BODY_CHOICE_COPY,
  dayBodyFocusChoiceToBias,
  shouldApplyHypertrophySubFocusForBodyChoice,
  type DayBodyFocusChoiceId,
} from "./weekDaySessionFocus";
import type { BlockType, GeneratedWorkout, ManualPreferences, WorkoutBlock, WorkoutItem } from "./types";
import { collectWorkoutExerciseIds } from "./workoutUtils";

const PREP_BLOCK_TYPES = new Set<BlockType>(["warmup", "cooldown"]);
const WORKING_FALLBACK_ORDER: BlockType[] = [
  "main_strength",
  "main_hypertrophy",
  "power",
  "accessory",
  "skill",
  "conditioning",
  "mobility",
];

const ADDED_BLOCK_DURATION_MINUTES = 20;
const MAX_WORKING_ITEMS = 3;
const MAX_PREP_ITEMS = 4;
const DEFAULT_ADDED_MINUTES = 8;

export const ADDABLE_BLOCK_TYPES: { id: BlockType; label: string }[] = [
  { id: "warmup", label: structuralBlockTitle("warmup") },
  { id: "main_strength", label: structuralBlockTitle("main_strength") },
  { id: "main_hypertrophy", label: structuralBlockTitle("main_hypertrophy") },
  { id: "accessory", label: structuralBlockTitle("accessory") },
  { id: "power", label: structuralBlockTitle("power") },
  { id: "conditioning", label: structuralBlockTitle("conditioning") },
  { id: "skill", label: structuralBlockTitle("skill") },
  { id: "mobility", label: structuralBlockTitle("mobility") },
  { id: "cooldown", label: structuralBlockTitle("cooldown") },
];

export const ADDABLE_BODY_CHOICES: { id: DayBodyFocusChoiceId; label: string }[] = [
  { id: "upper", label: BODY_CHOICE_COPY.upper.label },
  { id: "lower", label: BODY_CHOICE_COPY.lower.label },
  { id: "full", label: BODY_CHOICE_COPY.full.label },
  { id: "core", label: BODY_CHOICE_COPY.core.label },
  { id: "push", label: BODY_CHOICE_COPY.push.label },
  { id: "pull", label: BODY_CHOICE_COPY.pull.label },
  { id: "chest", label: BODY_CHOICE_COPY.chest.label },
  { id: "back", label: BODY_CHOICE_COPY.back.label },
  { id: "shoulders", label: BODY_CHOICE_COPY.shoulders.label },
  { id: "arms", label: BODY_CHOICE_COPY.arms.label },
  { id: "legs", label: BODY_CHOICE_COPY.legs.label },
  { id: "quad", label: BODY_CHOICE_COPY.quad.label },
  { id: "posterior", label: BODY_CHOICE_COPY.posterior.label },
  { id: "glutes", label: BODY_CHOICE_COPY.glutes.label },
];

function goalSlugForBlockType(blockType: BlockType): string {
  switch (blockType) {
    case "main_strength":
      return "strength";
    case "main_hypertrophy":
      return "muscle";
    case "power":
      return "power";
    case "conditioning":
      return "endurance";
    case "warmup":
    case "cooldown":
    case "mobility":
      return "mobility";
    default:
      return "strength";
  }
}

/** Primary-focus override so the short generator pass actually produces this block type. */
export function primaryFocusForAddedBlockType(blockType: BlockType): string[] | null {
  if (blockType === "accessory" || blockType === "skill") return null;
  const slug = goalSlugForBlockType(blockType);
  const label = GOAL_SLUG_TO_PRIMARY_FOCUS[slug];
  return label ? [label] : null;
}

export function preferencesForAddedBlock(
  base: ManualPreferences,
  blockType: BlockType,
  bodyChoiceId?: DayBodyFocusChoiceId | null
): ManualPreferences {
  let prefs: ManualPreferences = {
    ...base,
    durationMinutes: ADDED_BLOCK_DURATION_MINUTES,
  };
  const focusOverride = primaryFocusForAddedBlockType(blockType);
  if (focusOverride) {
    prefs = { ...prefs, primaryFocus: focusOverride };
  }
  if (bodyChoiceId) {
    const bias = dayBodyFocusChoiceToBias(bodyChoiceId);
    prefs = {
      ...prefs,
      targetBody: bias.targetBody,
      targetModifier: [...bias.targetModifier],
      specificBodyFocus: bias.specificBodyFocus,
    };
    if (blockType === "main_hypertrophy") {
      prefs = { ...prefs, primaryFocus: ["Build Muscle (Hypertrophy)"] };
      prefs = applyBodyChoicesSubFocusToPrefs(prefs, [bodyChoiceId]);
    } else if (shouldApplyHypertrophySubFocusForBodyChoice(prefs.primaryFocus)) {
      prefs = applyBodyChoicesSubFocusToPrefs(prefs, [bodyChoiceId]);
    }
  }
  return prefs;
}

function blockHasExercises(block: WorkoutBlock): boolean {
  if ((block.supersetPairs?.length ?? 0) > 0) return true;
  return (block.items?.length ?? 0) > 0;
}

function collectBlockExerciseIds(block: WorkoutBlock): string[] {
  if (block.supersetPairs?.length) {
    return block.supersetPairs.flatMap((pair) => pair.map((it) => it.exercise_id).filter(Boolean));
  }
  return (block.items ?? []).map((it) => it.exercise_id).filter(Boolean);
}

export function normalizeAddedBlock(
  block: WorkoutBlock,
  blockType: BlockType,
  bodyChoiceId?: DayBodyFocusChoiceId | null
): WorkoutBlock {
  const ids = collectBlockExerciseIds(block);
  return {
    ...block,
    block_type: blockType,
    title: structuralBlockTitle(blockType),
    goal_intent: {
      intent_kind: bodyChoiceId ? "goal_sub_focus" : "goal",
      goal_slug: goalSlugForBlockType(blockType),
      sub_focus_slug: bodyChoiceId ?? undefined,
      swap_pool_exercise_ids: ids,
    },
  };
}

export function extractBlockForType(
  blocks: WorkoutBlock[],
  requested: BlockType
): WorkoutBlock | null {
  const exact = blocks.find((b) => b.block_type === requested && blockHasExercises(b));
  if (exact) return exact;

  if (requested === "skill") {
    const accessory = blocks.find((b) => b.block_type === "accessory" && blockHasExercises(b));
    if (accessory) return accessory;
  }
  if (requested === "mobility") {
    const mobility = blocks.find(
      (b) => (b.block_type === "mobility" || b.block_type === "cooldown") && blockHasExercises(b)
    );
    if (mobility) return mobility;
  }

  if (!PREP_BLOCK_TYPES.has(requested)) {
    for (const type of WORKING_FALLBACK_ORDER) {
      const found = blocks.find((b) => b.block_type === type && blockHasExercises(b));
      if (found) return found;
    }
  }

  return blocks.find(blockHasExercises) ?? null;
}

export function stripDuplicateExercises(
  block: WorkoutBlock,
  usedIds: ReadonlySet<string>
): WorkoutBlock | null {
  if (block.supersetPairs?.length) {
    const pairs = block.supersetPairs.filter(
      ([a, b]) => !usedIds.has(a.exercise_id) && !usedIds.has(b.exercise_id)
    );
    if (pairs.length > 0) {
      const keep = new Set(pairs.flatMap((pair) => pair.map((it) => it.exercise_id)));
      return {
        ...block,
        supersetPairs: pairs,
        items: (block.items ?? []).filter((it) => keep.has(it.exercise_id)),
      };
    }
  }
  const items = (block.items ?? []).filter((it) => it.exercise_id && !usedIds.has(it.exercise_id));
  if (items.length === 0) return null;
  return { ...block, items, supersetPairs: undefined };
}

export function capAddedBlockItems(block: WorkoutBlock, blockType: BlockType): WorkoutBlock {
  const max = PREP_BLOCK_TYPES.has(blockType) || blockType === "mobility" ? MAX_PREP_ITEMS : MAX_WORKING_ITEMS;
  if (block.supersetPairs?.length) {
    const maxPairs = Math.max(1, Math.floor(max / 2));
    const pairs = block.supersetPairs.slice(0, maxPairs);
    const keep = new Set(pairs.flatMap((pair) => pair.map((it) => it.exercise_id)));
    return {
      ...block,
      supersetPairs: pairs,
      items: (block.items ?? []).filter((it) => keep.has(it.exercise_id)),
    };
  }
  return { ...block, items: (block.items ?? []).slice(0, max) };
}

export function insertIndexForBlockType(blocks: WorkoutBlock[], blockType: BlockType): number {
  if (blockType === "warmup") {
    let i = 0;
    while (i < blocks.length && blocks[i]!.block_type === "warmup") i += 1;
    return i;
  }
  if (blockType === "cooldown") return blocks.length;
  if (blockType === "mobility") {
    const cooldownIdx = blocks.findIndex((b) => b.block_type === "cooldown");
    return cooldownIdx >= 0 ? cooldownIdx : blocks.length;
  }
  const endIdx = blocks.findIndex((b) => b.block_type === "mobility" || b.block_type === "cooldown");
  return endIdx >= 0 ? endIdx : blocks.length;
}

export function estimateAddedBlockMinutes(block: WorkoutBlock): number {
  if (block.estimated_minutes != null && block.estimated_minutes > 0) {
    return Math.round(block.estimated_minutes);
  }
  const items: WorkoutItem[] = block.supersetPairs?.length
    ? block.supersetPairs.flat()
    : (block.items ?? []);
  if (items.length === 0) return DEFAULT_ADDED_MINUTES;
  const fromItems = items.reduce((sum, it) => {
    const work = it.time_seconds != null && it.time_seconds > 0 ? it.time_seconds / 60 : (it.sets ?? 1) * 0.75;
    const rest = ((it.rest_seconds ?? 0) * Math.max(0, (it.sets ?? 1) - 1)) / 60;
    return sum + work + rest;
  }, 0);
  return Math.max(3, Math.round(fromItems));
}

export function insertBlockIntoWorkout(
  workout: GeneratedWorkout,
  block: WorkoutBlock
): GeneratedWorkout {
  const blocks = [...workout.blocks];
  const idx = insertIndexForBlockType(blocks, block.block_type);
  blocks.splice(idx, 0, block);
  const addedMin = estimateAddedBlockMinutes(block);
  return {
    ...workout,
    blocks,
    durationMinutes:
      workout.durationMinutes != null ? workout.durationMinutes + addedMin : addedMin,
  };
}

export function buildAddedBlockFromGeneratedSession(
  generated: GeneratedWorkout,
  requested: BlockType,
  usedExerciseIds: readonly string[],
  bodyChoiceId?: DayBodyFocusChoiceId | null
): WorkoutBlock | null {
  const extracted = extractBlockForType(generated.blocks, requested);
  if (!extracted) return null;
  const stripped = stripDuplicateExercises(extracted, new Set(usedExerciseIds));
  if (!stripped) return null;
  const capped = capAddedBlockItems(stripped, requested);
  if (!blockHasExercises(capped)) return null;
  return normalizeAddedBlock(capped, requested, bodyChoiceId);
}

export type GenerateAndAppendWorkoutBlockArgs = {
  workout: GeneratedWorkout;
  basePreferences: ManualPreferences;
  gymProfile?: GymProfile;
  blockType: BlockType;
  bodyChoiceId?: DayBodyFocusChoiceId | null;
  sportGoalContext?: SportGoalContext;
  seedExtra?: string | number;
  historySources?: AppHistorySources;
};

export async function generateAndAppendWorkoutBlock(
  args: GenerateAndAppendWorkoutBlockArgs
): Promise<GeneratedWorkout> {
  const usedIds = collectWorkoutExerciseIds(args.workout);
  const prefs = preferencesForAddedBlock(args.basePreferences, args.blockType, args.bodyChoiceId);
  const [preferredNames, { generateWorkoutAsync }] = await Promise.all([
    preferredExerciseNamesForManualPreferences(prefs),
    loadGeneratorModule(),
  ]);
  const generated = await generateWorkoutAsync(
    prefs,
    args.gymProfile,
    args.seedExtra ?? composeRunGenerationSeed(`add-block-${args.blockType}`),
    preferredNames,
    {
      ...args.sportGoalContext,
      regeneration_avoid_exercise_ids: [
        ...(args.sportGoalContext?.regeneration_avoid_exercise_ids ?? []),
        ...usedIds,
      ],
    },
    {
      historySources: {
        ...(args.historySources ?? {}),
        regenerationAvoidExerciseIds: [
          ...(args.historySources?.regenerationAvoidExerciseIds ?? []),
          ...usedIds,
        ],
      },
    }
  );
  const added = buildAddedBlockFromGeneratedSession(
    generated,
    args.blockType,
    usedIds,
    args.bodyChoiceId
  );
  if (!added) {
    throw new Error(
      "Couldn't add new exercises for that block. Try a different block type or body part."
    );
  }
  return insertBlockIntoWorkout(args.workout, added);
}
