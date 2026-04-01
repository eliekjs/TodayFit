/**
 * Shared types for generic vs sport-owned main / secondary (accessory) exercise selection.
 */

import type { Exercise } from "../types";
import type { GenerateWorkoutInput } from "../types";
import type { FatigueState } from "../../../lib/generation/fatigueRules";
import type { TrainingHistoryContext } from "../historyTypes";
import type { SessionIntentContract } from "../sessionIntentContract";
import type { SessionTargetVector } from "../../workoutIntelligence/types";
import type { SportPatternGateResult, SportPatternSlotRule } from "../sportPattern/framework/types";
import type { IntentSurvivalCollector } from "../intentSurvivalDebug";

/** Erased score hook so mainSelectors never import dailyGenerator (no cycles). */
export type ScoreExerciseLike = (
  exercise: Exercise,
  input: GenerateWorkoutInput,
  recentExerciseIds: Set<string>,
  movementPatternCounts: Map<string, number>,
  fatigueState?: FatigueState,
  options?: Record<string, unknown>
) => { score: number };

export type MainSelectorSessionTrace = {
  entries: Array<{
    phase: "main_strength" | "accessory" | "main_hypertrophy";
    selector: "generic" | "sport_owned";
    sport_slug?: string;
    notes: string[];
  }>;
};

export type SportMainSelectorDeps = {
  scoreExercise: ScoreExerciseLike;
  sessionTargetVector?: SessionTargetVector;
};

export type CandidateMovementValidator = (chosen: Exercise[], candidate: Exercise) => boolean;

/** Injected hooks so sport-owned picks respect the same movement caps as generic selection. */
export type AlpinePickEnvironment = {
  validateCandidate: CandidateMovementValidator;
  onMovementCountCommit: (exercise: Exercise) => void;
  onFatigueRegionCommit?: (exercise: Exercise) => void;
};

export type AlpineStrengthMainLiftContext = {
  contract: SessionIntentContract;
  mainPool: Exercise[];
  mainLiftCount: number;
  intentSlugs: string[];
  primaryIntent: string | undefined;
  input: GenerateWorkoutInput;
  recentIds: Set<string>;
  movementCounts: Map<string, number>;
  rng: () => number;
  fatigueState?: FatigueState;
  sessionFatigueRegions?: Map<string, number>;
  historyContext?: TrainingHistoryContext;
  alpineMainRule: SportPatternSlotRule;
  alpineMainStrengthMode: "gated" | "fallback";
  sportPatCounts: Map<string, number>;
  alpineEmphasis: number;
  replacementCatalog: Exercise[];
  pickEnv: AlpinePickEnvironment;
  intentTrace?: IntentSurvivalCollector;
  gateSnapshot?: SportPatternGateResult;
  traceNotes?: string[];
};

export type AlpineStrengthAccessoryCoverageContext = {
  mainLifts: Exercise[];
  pairs: Exercise[][];
  replacementCatalog: Exercise[];
};

export type AlpineHypertrophyVolumeContext = {
  contract: SessionIntentContract;
  pool: Exercise[];
  wantCount: number;
  input: GenerateWorkoutInput;
  used: Set<string>;
  recentIds: Set<string>;
  movementCounts: Map<string, number>;
  rng: () => number;
  fatigueState?: FatigueState;
  sessionFatigueRegions?: Map<string, number>;
  historyContext?: TrainingHistoryContext;
  alpineHypertrophyRule: SportPatternSlotRule;
  alpineHypertrophyMode: "gated" | "fallback";
  sportPatCounts: Map<string, number>;
  alpineEmphasis: number;
  isHypertrophyPrimary: boolean;
  muscleSubFocusRanked: string[];
  hasBalanced: boolean;
  directSubFocusSlugs: string[];
  dominantSlug: string | undefined;
  replacementCatalog: Exercise[];
  pickEnv: AlpinePickEnvironment;
  intentTrace?: IntentSurvivalCollector;
  gateSnapshot?: SportPatternGateResult;
  traceNotes?: string[];
  exerciseMatchesHypertrophySubFocusSlug: (e: Exercise, slug: string) => boolean;
};

/**
 * Sport-owned main / secondary selection for a single primary sport slug.
 * Only alpine skiing is fully implemented; hiking/trail stay on generic + gates until migrated.
 */
export type SportMainHandles = {
  readonly sportSlug: string;
  selectStrengthMainLifts: (ctx: AlpineStrengthMainLiftContext) => Exercise[];
  applyStrengthAccessoryCoverage: (ctx: AlpineStrengthAccessoryCoverageContext) => void;
  selectHypertrophyVolume: (ctx: AlpineHypertrophyVolumeContext) => Exercise[];
  refineHypertrophyPairsCoverage: (chosen: Exercise[], pairs: Exercise[][], replacementCatalog: Exercise[]) => void;
};

export type GenericMainPickFn = (pool: Exercise[], count: number, pass_id: string) => Exercise[];

export type GenericStrengthMainSelectionArgs = {
  mainPool: Exercise[];
  mainLiftCount: number;
  intentSlugs: string[];
  primaryIntent: string | undefined;
  getComplementaryStrengthIntents: (intent?: string) => string[];
  pick: GenericMainPickFn;
};

export type GenericHypertrophySelectionArgs = {
  pool: Exercise[];
  wantCount: number;
  isHypertrophyPrimary: boolean;
  muscleSubFocusRanked: string[];
  hasBalanced: boolean;
  directSubFocusSlugs: string[];
  dominantSlug: string | undefined;
  pick: GenericMainPickFn;
  exerciseMatchesHypertrophySubFocusSlug: (e: Exercise, slug: string) => boolean;
  /** When set, first-segment hypertrophy picks are registered (legacy parity with pre-split generator). */
  used?: Set<string>;
};
