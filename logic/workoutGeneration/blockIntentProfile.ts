import type { BlockFormat, GenerateWorkoutInput, PrimaryGoal } from "./types";
import type { CardioFormatHint, ConditioningPolicy } from "./cardioIntentPolicyConfig";
import {
  isEnduranceConditioningSubFocusSlug,
  resolveSessionFeelProfile,
  type SessionFeelProfile,
} from "./sessionFeelProfile";
import {
  resolveBlockStructureProfile,
  resolveCooldownPolicy,
  sessionRequiresConditioningBlockFromArchetype,
} from "../../data/sportSubFocus/subFocusIntentRegistry";
import {
  applyWorkoutStyleToPolicy,
  resolveWorkoutStylePolicy,
} from "./workoutStylePolicy";
import {
  CARDIO_COOLDOWN_TARGETS_BY_INTENT,
  CARDIO_COOLDOWN_TARGETS_BY_SPORT_KEYWORD,
  CARDIO_POLICY_BY_PRIMARY_GOAL,
  CARDIO_SECONDARY_EXERCISE_SHARE_BONUS,
  CARDIO_SECONDARY_SHARE_BONUS,
  CARDIO_WARMUP_TARGETS_BY_INTENT,
  CARDIO_WARMUP_TARGETS_BY_SPORT_KEYWORD,
  SESSION_CARDIO_TARGET_WEIGHT,
  WEEKLY_CARDIO_EMPHASIS_WEIGHT,
} from "./cardioIntentPolicyConfig";

export interface BlockIntentProfile {
  allowConditioningBlock: boolean;
  conditioningRequired: boolean;
  suppressAccessoryBlocks: boolean;
  requiresAccessoryBlocks: boolean;
  fieldDrillConditioningEligible: boolean;
  requiresCooldownBlock: boolean;
  minCooldownItems: number;
  cardioDominant: boolean;
  sessionCardioShare: number;
  targetCardioExerciseShare: number;
  warmupPreferredTargets: string[];
  cooldownPreferredTargets: string[];
  cardioFormatHint: CardioFormatHint;
  preferredBlockFormatsByRole: {
    main: BlockFormat[];
    conditioning: BlockFormat[];
  };
}

function norm(value: string): string {
  return value.toLowerCase().replace(/\s/g, "_");
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = norm(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function getGoalSubFocusSlugs(input: GenerateWorkoutInput, goal: PrimaryGoal): string[] {
  return (input.goal_sub_focus?.[goal] ?? []).map(norm);
}

function getAllCardioIntentSlugs(input: GenerateWorkoutInput): string[] {
  const fromGoals = [
    ...getGoalSubFocusSlugs(input, "conditioning"),
    ...getGoalSubFocusSlugs(input, "endurance"),
  ];
  const fromSportSubFocus = Object.values(input.sport_sub_focus ?? {})
    .flatMap((slugs) => slugs ?? [])
    .map(norm);
  return unique([...fromGoals, ...fromSportSubFocus]);
}

function hasCardioGoal(goal: PrimaryGoal | undefined): boolean {
  return goal === "conditioning" || goal === "endurance";
}

function resolveCardioFormatHint(input: GenerateWorkoutInput, cardioDominant: boolean): CardioFormatHint {
  const slugs = getAllCardioIntentSlugs(input);
  const hasAny = (needles: string[]) => needles.some((needle) => slugs.includes(norm(needle)));

  if (hasAny(["intervals_hiit", "intervals", "threshold_tempo", "hills"])) return "intervals";
  if (hasAny(["durability", "time_circuit"])) return "circuit";
  if (hasAny(["zone2_aerobic_base", "zone2_long_steady", "long_steady", "aerobic_base"])) return "steady";
  if (cardioDominant) return "steady";
  return "steady";
}

function appendTargetsByKeyword(
  output: string[],
  source: string[],
  table: Record<string, string[]>
): void {
  for (const value of source) {
    for (const [keyword, targets] of Object.entries(table)) {
      if (value.includes(keyword)) {
        output.push(...targets);
      }
    }
  }
}

function buildWarmupTargets(input: GenerateWorkoutInput, cardioDominant: boolean, intentSlugs: string[]): string[] {
  const targets: string[] = [];
  const primary = input.primary_goal;
  const sports = (input.sport_slugs ?? []).map(norm);

  if (cardioDominant) {
    targets.push("calves", "hip_flexors", "glutes", "thoracic_spine");
  }
  if (primary === "mobility" || primary === "recovery") {
    targets.push("thoracic_spine", "hip_flexors", "low_back");
  }
  if (sports.some((s) => s.includes("running") || s.includes("soccer") || s.includes("hiking") || s.includes("ski"))) {
    targets.push("calves", "hamstrings", "hip_flexors");
  }
  appendTargetsByKeyword(targets, sports, CARDIO_WARMUP_TARGETS_BY_SPORT_KEYWORD);
  appendTargetsByKeyword(targets, intentSlugs, CARDIO_WARMUP_TARGETS_BY_INTENT);

  return unique(targets);
}

function buildCooldownTargets(input: GenerateWorkoutInput, cardioDominant: boolean, intentSlugs: string[]): string[] {
  const targets: string[] = [];
  const primary = input.primary_goal;
  const sports = (input.sport_slugs ?? []).map(norm);

  if (cardioDominant) {
    targets.push("calves", "hamstrings", "hip_flexors", "thoracic_spine");
  }
  if (primary === "mobility" || primary === "recovery") {
    targets.push("thoracic_spine", "hip_flexors", "hamstrings", "low_back");
  }
  if (sports.some((s) => s.includes("running") || s.includes("soccer") || s.includes("hiking") || s.includes("ski"))) {
    targets.push("calves", "hamstrings", "glutes");
  }
  appendTargetsByKeyword(targets, sports, CARDIO_COOLDOWN_TARGETS_BY_SPORT_KEYWORD);
  appendTargetsByKeyword(targets, intentSlugs, CARDIO_COOLDOWN_TARGETS_BY_INTENT);

  return unique(targets);
}

type HypertrophyConditioningGateInput = {
  primary_goal?: string;
  secondary_goals?: string[];
  goal_sub_focus?: Record<string, string[] | undefined>;
};

/**
 * Hypertrophy-primary sessions omit standalone conditioning unless the user explicitly
 * picked cardio (Sport Conditioning / endurance secondary or conditioning sub-focuses).
 */
export function hypertrophyPrimaryExcludesConditioning(input: HypertrophyConditioningGateInput): boolean {
  if (input.primary_goal !== "hypertrophy") return false;
  const secondary = input.secondary_goals ?? [];
  if (secondary.some(hasCardioGoal)) return false;
  const conditioningSubs = input.goal_sub_focus?.conditioning ?? [];
  if (conditioningSubs.length > 0) return false;
  return true;
}

function sessionHasExplicitConditioningIntent(input: GenerateWorkoutInput): boolean {
  if ((input.secondary_goals ?? []).some(hasCardioGoal)) return true;
  const conditioningSubs = getGoalSubFocusSlugs(input, "conditioning");
  return conditioningSubs.length > 0;
}

/**
 * Whether this session input should **allow** the generator's standalone conditioning finisher for the
 * primary goal (before secondary-goal merges). Calisthenics defaults false unless explicit engine intent;
 * other primaries mirror `CARDIO_POLICY_BY_PRIMARY_GOAL.allowConditioningBlock`.
 *
 * Does **not** encode sport-profile forcing — sport prep adds conditioning in `generateWorkoutSession`
 * when `sportProfileBiasedTowardConditioning` even if base policy disallows optional cardio.
 */
export function shouldIncludeConditioningBlock(input: GenerateWorkoutInput): boolean {
  if (hypertrophyPrimaryExcludesConditioning(input)) return false;

  if (sessionRequiresConditioningBlockFromArchetype(input)) return true;

  if (input.primary_goal !== "calisthenics") {
    return CARDIO_POLICY_BY_PRIMARY_GOAL[input.primary_goal].allowConditioningBlock;
  }
  const secondaryCardio = (input.secondary_goals ?? []).some(hasCardioGoal);
  if (secondaryCardio) return true;
  if ((input.weekly_cardio_emphasis ?? 0) > 0) return true;
  if ((input.session_cardio_target_share ?? 0) > 0) return true;
  if ((input.style_prefs?.conditioning_minutes ?? 0) > 0) return true;
  return false;
}

function preferCircuitSupersetFormats(formats: BlockFormat[]): BlockFormat[] {
  const rest = formats.filter((format) => format !== "circuit" && format !== "superset");
  return ["circuit", "superset", ...rest];
}

function sessionHasEnduranceConditioningSubs(input: GenerateWorkoutInput): boolean {
  const slugs = getAllCardioIntentSlugs(input);
  return slugs.some(isEnduranceConditioningSubFocusSlug);
}

function applySessionFeelToPolicy(
  policy: ConditioningPolicy,
  feel: SessionFeelProfile,
  hasEnduranceConditioningSubs: boolean
): ConditioningPolicy {
  if (feel.emphasis === "strength") return policy;

  const cardioBoost = feel.emphasis === "sports_training" ? 0.1 : 0.05;
  const exerciseShareBoost = feel.emphasis === "sports_training" ? 0.06 : 0.03;

  return {
    ...policy,
    sessionCardioShare: clamp01(policy.sessionCardioShare + cardioBoost),
    targetCardioExerciseShare: clamp01(policy.targetCardioExerciseShare + exerciseShareBoost),
    preferredMainFormats: preferCircuitSupersetFormats(policy.preferredMainFormats),
    preferredConditioningFormats: preferCircuitSupersetFormats(policy.preferredConditioningFormats),
    conditioningRequired:
      policy.conditioningRequired ||
      (feel.emphasis === "sports_training" &&
        hasEnduranceConditioningSubs &&
        policy.allowConditioningBlock),
  };
}

function resolveBasePolicy(input: GenerateWorkoutInput): ConditioningPolicy {
  if (hypertrophyPrimaryExcludesConditioning(input)) {
    return {
      ...CARDIO_POLICY_BY_PRIMARY_GOAL.hypertrophy,
      allowConditioningBlock: false,
      conditioningRequired: false,
    };
  }

  const secondaryGoals = input.secondary_goals ?? [];
  const hasSecondaryCardioGoal = secondaryGoals.some(hasCardioGoal);
  const base = CARDIO_POLICY_BY_PRIMARY_GOAL[input.primary_goal];

  let effectiveBase = base;
  if (
    input.primary_goal === "calisthenics" &&
    shouldIncludeConditioningBlock(input)
  ) {
    effectiveBase = {
      ...base,
      allowConditioningBlock: true,
      sessionCardioShare: clamp01(Math.max(base.sessionCardioShare, 0.18)),
      targetCardioExerciseShare: clamp01(Math.max(base.targetCardioExerciseShare, 0.12)),
    };
  }

  if (!hasSecondaryCardioGoal) return effectiveBase;
  return {
    ...effectiveBase,
    allowConditioningBlock: true,
    conditioningRequired: true,
    sessionCardioShare: clamp01(effectiveBase.sessionCardioShare + CARDIO_SECONDARY_SHARE_BONUS),
    targetCardioExerciseShare: clamp01(effectiveBase.targetCardioExerciseShare + CARDIO_SECONDARY_EXERCISE_SHARE_BONUS),
    preferredMainFormats: ["circuit", ...effectiveBase.preferredMainFormats.filter((f) => f !== "circuit")],
    preferredConditioningFormats: ["circuit", ...effectiveBase.preferredConditioningFormats.filter((f) => f !== "circuit")],
  };
}

export function buildBlockIntentProfile(input: GenerateWorkoutInput): BlockIntentProfile {
  const blockStructure = resolveBlockStructureProfile(input);
  const cooldownPolicy = resolveCooldownPolicy(input);
  const sessionFeel = resolveSessionFeelProfile(input);
  const hasEnduranceConditioningSubs = sessionHasEnduranceConditioningSubs(input);
  const secondaryGoals = input.secondary_goals ?? [];
  const hasSecondaryCardioGoal = secondaryGoals.some(hasCardioGoal);
  const stylePolicy = resolveWorkoutStylePolicy(input.style_prefs?.workout_styles);
  const basePolicy = applyWorkoutStyleToPolicy(
    applySessionFeelToPolicy(
      resolveBasePolicy(input),
      sessionFeel,
      hasEnduranceConditioningSubs
    ),
    stylePolicy
  );
  const weeklyEmphasis = clamp01(input.weekly_cardio_emphasis ?? 0);
  const explicitSessionTarget = clamp01(input.session_cardio_target_share ?? 0);
  const sessionCardioShare = clamp01(
    basePolicy.sessionCardioShare +
      weeklyEmphasis * WEEKLY_CARDIO_EMPHASIS_WEIGHT +
      explicitSessionTarget * SESSION_CARDIO_TARGET_WEIGHT
  );
  const targetCardioExerciseShare = clamp01(
    basePolicy.targetCardioExerciseShare + weeklyEmphasis * 0.1 + explicitSessionTarget * 0.35
  );
  const cardioDominant =
    hasCardioGoal(input.primary_goal) ||
    hasSecondaryCardioGoal ||
    sessionCardioShare >= 0.5 ||
    targetCardioExerciseShare >= 0.35;
  const hypertrophyNoConditioning = hypertrophyPrimaryExcludesConditioning(input);
  const allowConditioningBlock = hypertrophyNoConditioning
    ? false
    : basePolicy.allowConditioningBlock ||
      hasSecondaryCardioGoal ||
      blockStructure.requiresConditioningBlock;
  const conditioningRequired = hypertrophyNoConditioning
    ? false
    : basePolicy.conditioningRequired ||
      blockStructure.requiresConditioningBlock ||
      sessionHasExplicitConditioningIntent(input) ||
      (allowConditioningBlock && (hasSecondaryCardioGoal || sessionCardioShare >= 0.56));
  const intentSlugs = getAllCardioIntentSlugs(input);
  const preferredMainFormats = basePolicy.preferredMainFormats as BlockFormat[];
  const preferredConditioningFormats = basePolicy.preferredConditioningFormats as BlockFormat[];

  return {
    allowConditioningBlock,
    conditioningRequired,
    suppressAccessoryBlocks: blockStructure.suppressAccessoryBlocks,
    requiresAccessoryBlocks: blockStructure.requiresAccessoryBlocks,
    fieldDrillConditioningEligible: blockStructure.fieldDrillConditioningEligible,
    requiresCooldownBlock: cooldownPolicy.requiresCooldownBlock,
    minCooldownItems: cooldownPolicy.minCooldownItems,
    cardioDominant,
    sessionCardioShare,
    targetCardioExerciseShare,
    warmupPreferredTargets: buildWarmupTargets(input, cardioDominant, intentSlugs),
    cooldownPreferredTargets: buildCooldownTargets(input, cardioDominant, intentSlugs),
    cardioFormatHint: resolveCardioFormatHint(input, cardioDominant),
    preferredBlockFormatsByRole: {
      main: preferredMainFormats,
      conditioning: preferredConditioningFormats,
    },
  };
}

export function blockFormatForCardioHint(hint: CardioFormatHint): BlockFormat {
  if (hint === "steady") return "straight_sets";
  return "circuit";
}
