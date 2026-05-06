/**
 * Utilities for computing and displaying workout focus splits (declared intent and actual exercise mix).
 * Used by: GenerationLoadingScreen (declared intent pie chart), workout screen (actual split display).
 */

import type { GeneratedWorkout, WorkoutBlock } from "./types";
import type { GenerateWorkoutInput, PrimaryGoal } from "../logic/workoutGeneration/types";
import { GOAL_SLUG_TO_LABEL } from "./preferencesConstants";

export type IntentSplitEntry = {
  slug: string;
  label: string;
  /** 0..1 weight */
  weight: number;
  /** 0..100 rounded percentage */
  pct: number;
  kind: "sport" | "goal";
  /** Hex color for pie chart segment */
  color: string;
};

const SPLIT_COLORS = [
  "#2dd4bf", // teal (primary)
  "#3b82f6", // blue (secondary)
  "#a78bfa", // violet
  "#f59e0b", // amber
  "#f472b6", // pink
];

const PREP_BLOCK_TYPES = new Set(["warmup", "cooldown"]);

function colorForIndex(i: number): string {
  return SPLIT_COLORS[i % SPLIT_COLORS.length]!;
}

export function labelForSportSlug(slug: string): string {
  const map: Record<string, string> = {
    rock_climbing: "Climbing",
    climbing: "Climbing",
    alpine_skiing: "Alpine Skiing",
    snowboarding: "Snowboarding",
    backcountry_skiing: "Backcountry Ski",
    xc_skiing: "XC Skiing",
    trail_running: "Trail Running",
    road_running: "Running",
    hiking_backpacking: "Hiking",
    hiking: "Hiking",
    soccer: "Soccer",
    surfing: "Surfing",
    kite_surfing: "Kitesurfing",
    wind_surfing: "Windsurfing",
    mountain_biking: "Mountain Biking",
    hyrox: "Hyrox",
  };
  return (
    map[slug] ??
    GOAL_SLUG_TO_LABEL[slug] ??
    slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const GOAL_LABEL_MAP: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Muscle",
  body_recomp: "Body Recomp",
  endurance: "Endurance",
  conditioning: "Conditioning",
  mobility: "Mobility",
  recovery: "Recovery",
  power: "Power",
  athletic_performance: "Athletic",
  calisthenics: "Calisthenics",
};

export function labelForGoalSlug(slug: string): string {
  return (
    GOAL_LABEL_MAP[slug] ??
    GOAL_SLUG_TO_LABEL[slug] ??
    slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Compute declared intent split from GenerateWorkoutInput.
 * Returns up to 3 entries sorted descending by weight.
 */
export function computeDeclaredIntentSplit(input: GenerateWorkoutInput): IntentSplitEntry[] {
  const sportWeight = Math.max(0, Math.min(1, input.sport_weight ?? 0));
  const goalWeightFraction = 1 - sportWeight;

  const rawEntries: Omit<IntentSplitEntry, "color" | "pct">[] = [];

  // Sports
  const sports = input.sport_slugs ?? [];
  if (sports.length > 0 && sportWeight > 0) {
    const perSport = sportWeight / sports.length;
    for (const sport of sports) {
      rawEntries.push({ slug: sport, label: labelForSportSlug(sport), weight: perSport, kind: "sport" });
    }
  }

  // Goals
  const goals: PrimaryGoal[] = [input.primary_goal, ...(input.secondary_goals ?? [])];
  const rawGoalWeights =
    input.goal_weights ??
    goals.map((_, i) => (i === 0 ? 0.5 : i === 1 ? 0.3 : 0.2));
  const goalWeightSum = rawGoalWeights.slice(0, goals.length).reduce((s, w) => s + w, 0);

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i]!;
    const normGoalW =
      goalWeightSum > 0 ? (rawGoalWeights[i] ?? 0) / goalWeightSum : 1 / goals.length;
    const absWeight = normGoalW * goalWeightFraction;
    if (absWeight < 0.02) continue;
    rawEntries.push({ slug: goal, label: labelForGoalSlug(goal), weight: absWeight, kind: "goal" });
  }

  rawEntries.sort((a, b) => b.weight - a.weight);
  const top3 = rawEntries.slice(0, 3);

  // Convert to percentages and normalize to sum 100
  const sumWeights = top3.reduce((s, e) => s + e.weight, 0);
  let pcts = sumWeights > 0 ? top3.map((e) => Math.round((e.weight / sumWeights) * 100)) : top3.map(() => 0);

  // Fix rounding error
  const pctSum = pcts.reduce((s, p) => s + p, 0);
  if (pctSum !== 100 && pcts.length > 0) {
    pcts[0] = pcts[0]! + (100 - pctSum);
  }

  return top3.map((e, i) => ({ ...e, pct: pcts[i]!, color: colorForIndex(i) }));
}

/**
 * Compute declared intent split from user-facing preferences (before GenerateWorkoutInput is built).
 * Used by loading screens when the full input isn't available.
 */
export function computeDeclaredIntentSplitFromPrefs(opts: {
  sportSlugs: string[];
  goalSlugs: string[];
  sportVsGoalPct: number; // 0..100, sport share
  goalMatchPrimaryPct?: number;
  goalMatchSecondaryPct?: number;
  goalMatchTertiaryPct?: number;
}): IntentSplitEntry[] {
  const sportWeight = Math.max(0, Math.min(100, opts.sportVsGoalPct)) / 100;
  const goalWeightFraction = 1 - sportWeight;

  const fakeInput: Pick<
    GenerateWorkoutInput,
    "sport_slugs" | "sport_weight" | "primary_goal" | "secondary_goals" | "goal_weights"
  > = {
    sport_slugs: opts.sportSlugs,
    sport_weight: sportWeight,
    primary_goal: (opts.goalSlugs[0] as PrimaryGoal) ?? "strength",
    secondary_goals: (opts.goalSlugs.slice(1) as PrimaryGoal[]) ?? [],
    goal_weights: opts.goalSlugs.length > 0
      ? [
          (opts.goalMatchPrimaryPct ?? 50) / 100,
          (opts.goalMatchSecondaryPct ?? 30) / 100,
          (opts.goalMatchTertiaryPct ?? 20) / 100,
        ].slice(0, opts.goalSlugs.length)
      : undefined,
  };

  return computeDeclaredIntentSplit(fakeInput as GenerateWorkoutInput);
}

/**
 * Build a human-readable workout title from the top focus areas.
 * e.g. "Climbing · Body Recomp"
 */
export function buildWorkoutIntentTitle(split: IntentSplitEntry[]): string {
  if (split.length === 0) return "Your Workout";
  const top = split.slice(0, 2);
  return top.map((e) => `${e.label} (${e.pct}%)`).join(" · ");
}

function getWorkingItems(blocks: WorkoutBlock[]) {
  const items: { sport_slugs?: string[]; goals?: string[] }[] = [];
  for (const block of blocks) {
    if (PREP_BLOCK_TYPES.has(block.block_type)) continue;
    const blockItems = block.supersetPairs ? block.supersetPairs.flat() : (block.items ?? []);
    for (const item of blockItems) {
      items.push({
        sport_slugs: item.session_intent_links?.sport_slugs,
        goals: item.session_intent_links?.goals,
      });
    }
  }
  return items;
}

/**
 * Compute actual intent proportions from a generated workout's blocks.
 * Returns split entries with actual percentages (overrides declared weights).
 * Falls back to declared split when no working exercises are found.
 */
export function computeActualIntentSplit(
  workout: GeneratedWorkout,
  declared: IntentSplitEntry[]
): IntentSplitEntry[] {
  const items = getWorkingItems(workout.blocks ?? []);
  const total = items.length;
  if (total === 0) return declared;

  const counts: Record<string, number> = {};
  const declaredSports = declared.filter((d) => d.kind === "sport");
  const declaredGoals = declared.filter((d) => d.kind === "goal");

  for (const item of items) {
    const sportHit = declaredSports.find((d) => (item.sport_slugs ?? []).includes(d.slug));
    if (sportHit) {
      counts[sportHit.slug] = (counts[sportHit.slug] ?? 0) + 1;
      continue;
    }
    const goalHit = declaredGoals.find((d) => (item.goals ?? []).includes(d.slug));
    if (goalHit) {
      counts[goalHit.slug] = (counts[goalHit.slug] ?? 0) + 1;
    }
  }

  const result = declared.map((d) => {
    const count = counts[d.slug] ?? 0;
    return { ...d, weight: count / total };
  });

  result.sort((a, b) => b.weight - a.weight);

  const sumWeights = result.reduce((s, e) => s + e.weight, 0);
  const pcts = sumWeights > 0 ? result.map((e) => Math.round((e.weight / sumWeights) * 100)) : result.map(() => 0);
  const pctSum = pcts.reduce((s, p) => s + p, 0);
  if (pctSum !== 100 && pcts.length > 0) pcts[0] = pcts[0]! + (100 - pctSum);

  return result.map((e, i) => ({ ...e, pct: pcts[i]! }));
}
