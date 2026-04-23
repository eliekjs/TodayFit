import type { BlockFormat, GenerateWorkoutInput, PrimaryGoal } from "./types";
import type { CardioFormatHint, ConditioningPolicy } from "./cardioIntentPolicyConfig";
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

function resolveBasePolicy(input: GenerateWorkoutInput): ConditioningPolicy {
  const secondaryGoals = input.secondary_goals ?? [];
  const hasSecondaryCardioGoal = secondaryGoals.some(hasCardioGoal);
  const base = CARDIO_POLICY_BY_PRIMARY_GOAL[input.primary_goal];
  if (!hasSecondaryCardioGoal) return base;
  return {
    ...base,
    allowConditioningBlock: true,
    conditioningRequired: true,
    sessionCardioShare: clamp01(base.sessionCardioShare + CARDIO_SECONDARY_SHARE_BONUS),
    targetCardioExerciseShare: clamp01(base.targetCardioExerciseShare + CARDIO_SECONDARY_EXERCISE_SHARE_BONUS),
    preferredMainFormats: ["circuit", ...base.preferredMainFormats.filter((f) => f !== "circuit")],
    preferredConditioningFormats: ["circuit", ...base.preferredConditioningFormats.filter((f) => f !== "circuit")],
  };
}

export function buildBlockIntentProfile(input: GenerateWorkoutInput): BlockIntentProfile {
  const secondaryGoals = input.secondary_goals ?? [];
  const hasSecondaryCardioGoal = secondaryGoals.some(hasCardioGoal);
  const basePolicy = resolveBasePolicy(input);
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
  const allowConditioningBlock = basePolicy.allowConditioningBlock || hasSecondaryCardioGoal;
  const conditioningRequired =
    basePolicy.conditioningRequired ||
    (allowConditioningBlock && (hasSecondaryCardioGoal || sessionCardioShare >= 0.56));
  const intentSlugs = getAllCardioIntentSlugs(input);
  const preferredMainFormats = basePolicy.preferredMainFormats as BlockFormat[];
  const preferredConditioningFormats = basePolicy.preferredConditioningFormats as BlockFormat[];

  return {
    allowConditioningBlock,
    conditioningRequired,
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
