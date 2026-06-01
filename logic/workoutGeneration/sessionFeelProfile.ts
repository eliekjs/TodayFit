import {
  ENDURANCE_CONDITIONING_SUB_FOCUS_SLUGS,
  EXPLOSIVE_PLYOMETRIC_SUB_FOCUS_SLUGS,
  isEnduranceConditioningSportSubFocusSlug,
  isExplosivePlyometricSportSubFocusSlug,
} from "../../data/sportSubFocus/subFocusIntentArchetypes";
import {
  isSpeedAgilityPowerStyleSubFocusSlug,
  SPEED_AGILITY_POWER_STYLE_SUB_FOCUS_SLUGS,
} from "../../data/sportSubFocus/speedAgilitySubFocusShared";
import type { GenerateWorkoutInput, PrimaryGoal } from "./types";
import { workoutStyleFeelScoreBoost } from "./workoutStylePolicy";

export type SessionFeelEmphasis = "strength" | "hybrid" | "sports_training";

export type SessionFeelProfile = {
  emphasis: SessionFeelEmphasis;
  /** 0 = pure strength feel, 1 = pure sports-training feel. */
  feelScore?: number;
};

const STRENGTH_LEAN_PRIMARIES = new Set<PrimaryGoal>(["strength", "hypertrophy", "body_recomp"]);
const SPORTS_LEAN_PRIMARIES = new Set<PrimaryGoal>([
  "athletic_performance",
  "power",
  "conditioning",
  "endurance",
]);

/** Goal sub-focus slugs that imply speed / COD / explosive training (not covered by sport archetype sets). */
const GOAL_EXPLOSIVE_SPEED_COD_SUB_FOCUS_SLUGS = new Set([
  "speed_sprint",
  "agility_cod",
  "power_explosive",
  "vertical_jump",
  "lower_body_power_plyos",
  "olympic_triple_extension",
  "upper_body_power",
  "sprint",
]);

function norm(value: string): string {
  return value.toLowerCase().replace(/\s/g, "_");
}

function effectiveSportWeight(input: GenerateWorkoutInput): number {
  const raw = input.sport_weight ?? input.session_intent?.sport_weight ?? 0;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Mirrors adapter sport-only detection using fields available on `GenerateWorkoutInput`.
 * Sport-only sessions use `strength` as a prescription template with sport_weight ≈ 1.0.
 */
export function isImpliedSportOnlySession(input: GenerateWorkoutInput): boolean {
  if ((input.sport_slugs?.length ?? 0) === 0) return false;
  if (effectiveSportWeight(input) < 0.99) return false;

  const ranked = input.session_intent?.ranked_intent_entries ?? [];
  if (ranked.length > 0) {
    const significantGoalEntries = ranked.filter(
      (entry) =>
        (entry.kind === "goal" || entry.kind === "goal_sub_focus") && (entry.weight ?? 0) >= 0.01
    );
    return significantGoalEntries.length === 0;
  }

  return input.primary_goal === "strength";
}

function collectGoalSubFocusSlugs(input: GenerateWorkoutInput): string[] {
  const fromMap = Object.values(input.goal_sub_focus ?? {}).flatMap((slugs) => slugs ?? []);
  const fromRanked = (input.session_intent?.ranked_intent_entries ?? [])
    .filter((entry) => entry.kind === "goal_sub_focus" && (entry.weight ?? 0) >= 0.01)
    .map((entry) => entry.slug);
  return [...fromMap, ...fromRanked].map(norm);
}

function collectSportSubFocusSlugs(input: GenerateWorkoutInput): string[] {
  const fromMap = Object.values(input.sport_sub_focus ?? {}).flatMap((slugs) => slugs ?? []);
  const fromRanked = (input.session_intent?.ranked_intent_entries ?? [])
    .filter((entry) => entry.kind === "sport_sub_focus" && (entry.weight ?? 0) >= 0.01)
    .map((entry) => entry.slug);
  return [...fromMap, ...fromRanked].map(norm);
}

export function isExplosiveSpeedCodSubFocusSlug(slug: string): boolean {
  const normalized = norm(slug);
  if (GOAL_EXPLOSIVE_SPEED_COD_SUB_FOCUS_SLUGS.has(normalized)) return true;
  if (SPEED_AGILITY_POWER_STYLE_SUB_FOCUS_SLUGS.has(normalized)) return true;
  if (EXPLOSIVE_PLYOMETRIC_SUB_FOCUS_SLUGS.has(normalized)) return true;
  return isSpeedAgilityPowerStyleSubFocusSlug(normalized) || isExplosivePlyometricSportSubFocusSlug(normalized);
}

export function isEnduranceConditioningSubFocusSlug(slug: string): boolean {
  const normalized = norm(slug);
  if (ENDURANCE_CONDITIONING_SUB_FOCUS_SLUGS.has(normalized)) return true;
  return isEnduranceConditioningSportSubFocusSlug(normalized);
}

function hasExplosiveSpeedCodSubs(goalSubs: string[], sportSubs: string[]): boolean {
  return [...goalSubs, ...sportSubs].some(isExplosiveSpeedCodSubFocusSlug);
}

function hasEnduranceConditioningSubs(goalSubs: string[], sportSubs: string[]): boolean {
  return [...goalSubs, ...sportSubs].some(isEnduranceConditioningSubFocusSlug);
}

function hasSignificantSportIntent(input: GenerateWorkoutInput): boolean {
  return (input.sport_slugs?.length ?? 0) > 0 && effectiveSportWeight(input) >= 0.35;
}

function isStrengthLeanPrimary(primary: PrimaryGoal): boolean {
  return STRENGTH_LEAN_PRIMARIES.has(primary);
}

function isSportsLeanPrimary(primary: PrimaryGoal): boolean {
  return SPORTS_LEAN_PRIMARIES.has(primary);
}

function countRankedGoalKinds(input: GenerateWorkoutInput): { strengthLean: number; sportsLean: number } {
  const ranked = input.session_intent?.ranked_intent_entries ?? [];
  let strengthLean = 0;
  let sportsLean = 0;

  for (const entry of ranked) {
    if ((entry.weight ?? 0) < 0.01) continue;
    if (entry.kind === "goal") {
      if (STRENGTH_LEAN_PRIMARIES.has(entry.slug as PrimaryGoal)) strengthLean += entry.weight ?? 0;
      if (SPORTS_LEAN_PRIMARIES.has(entry.slug as PrimaryGoal)) sportsLean += entry.weight ?? 0;
    }
    if (entry.kind === "goal_sub_focus") {
      if (isExplosiveSpeedCodSubFocusSlug(entry.slug) || isEnduranceConditioningSubFocusSlug(entry.slug)) {
        sportsLean += entry.weight ?? 0;
      } else {
        strengthLean += entry.weight ?? 0;
      }
    }
    if (entry.kind === "sport" || entry.kind === "sport_sub_focus") {
      sportsLean += entry.weight ?? 0;
    }
  }

  return { strengthLean, sportsLean };
}

/**
 * Conservative session feel resolver. Defaults to `strength` when uncertain so existing
 * strength-first sessions keep current block-intent behavior.
 */
export function resolveSessionFeelProfile(input: GenerateWorkoutInput): SessionFeelProfile {
  const primary = input.primary_goal;
  const secondaryGoals = input.secondary_goals ?? [];
  const goalSubs = collectGoalSubFocusSlugs(input);
  const sportSubs = collectSportSubFocusSlugs(input);
  const sportWeight = effectiveSportWeight(input);
  const sportOnly = isImpliedSportOnlySession(input);
  const hasExplosiveSpeedCod = hasExplosiveSpeedCodSubs(goalSubs, sportSubs);
  const hasEnduranceCond = hasEnduranceConditioningSubs(goalSubs, sportSubs);
  const hasAthleticSubs = hasExplosiveSpeedCod || hasEnduranceCond;
  const hasSportSlugs = (input.sport_slugs?.length ?? 0) > 0;

  let feelScore = 0;

  if (isSportsLeanPrimary(primary)) {
    feelScore += 0.55;
  } else if (isStrengthLeanPrimary(primary)) {
    feelScore -= 0.15;
  }

  if (secondaryGoals.some(isSportsLeanPrimary)) {
    feelScore += 0.2;
  }

  if (hasExplosiveSpeedCod) feelScore += 0.35;
  if (hasEnduranceCond) feelScore += 0.2;
  if (hasSignificantSportIntent(input)) feelScore += 0.15 + sportWeight * 0.25;

  if (sportOnly && hasExplosiveSpeedCod) {
    feelScore = Math.max(feelScore, 0.82);
  } else if (sportOnly && hasEnduranceCond) {
    feelScore = Math.max(feelScore, 0.65);
  } else if (sportOnly && hasSportSlugs) {
    feelScore = Math.max(feelScore, 0.45);
  }

  if (sportWeight >= 0.85 && hasExplosiveSpeedCod) {
    feelScore = Math.max(feelScore, 0.78);
  }

  const styleBoost = workoutStyleFeelScoreBoost(input.style_prefs?.workout_styles);
  if (styleBoost > 0) feelScore += styleBoost;

  const rankedMix = countRankedGoalKinds(input);
  if (rankedMix.strengthLean >= 0.2 && rankedMix.sportsLean >= 0.2) {
    feelScore = Math.max(0.35, Math.min(0.72, (rankedMix.sportsLean / (rankedMix.strengthLean + rankedMix.sportsLean)) * 0.85));
  }

  const strengthOnlySession =
    isStrengthLeanPrimary(primary) &&
    !secondaryGoals.some(isSportsLeanPrimary) &&
    !hasAthleticSubs &&
    !hasSportSlugs &&
    sportWeight < 0.35 &&
    rankedMix.sportsLean < 0.05;

  if (strengthOnlySession) {
    return { emphasis: "strength", feelScore: Math.max(0, Math.min(0.25, feelScore)) };
  }

  if (feelScore >= 0.62) {
    return { emphasis: "sports_training", feelScore: Math.min(1, feelScore) };
  }
  if (feelScore >= 0.32) {
    return { emphasis: "hybrid", feelScore };
  }

  return { emphasis: "strength", feelScore: Math.max(0, feelScore) };
}
