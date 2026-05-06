/**
 * Post-generation validation: checks that the actual proportion of exercises
 * tagged to each declared intent matches the declared weights within a tolerance.
 *
 * This is a hard-check guardrail that runs inside generateWorkoutSession after annotation.
 * Results are attached to session.debug and also returned for upstream use.
 *
 * The check uses session_intent_links (already computed by annotateSessionIntentLinksOnBlocks)
 * so it reflects the actual annotated exercise-goal assignments, not just tag presence.
 */

import type { WorkoutBlock } from "../../lib/types";
import type { GenerateWorkoutInput } from "./types";

export type IntentProportionCheck = {
  slug: string;
  kind: "sport" | "goal";
  label: string;
  declared_pct: number;
  actual_pct: number;
  delta_pct: number;
  passes: boolean;
};

export type IntentProportionGuardrailResult = {
  checks: IntentProportionCheck[];
  overall_aligned: boolean;
  max_delta_pct: number;
  working_exercise_count: number;
  primary_sport_slug?: string;
  primary_goal_slug?: string;
};

const PREP_BLOCK_TYPES = new Set(["warmup", "cooldown"]);

/** Divergence tolerance: within 20 pp is acceptable (sport intent is dominant but selection is noisy). */
const TOLERANCE_PCT = 20;

function humanLabel(slug: string): string {
  const map: Record<string, string> = {
    rock_climbing: "Climbing",
    alpine_skiing: "Alpine Skiing",
    snowboarding: "Snowboarding",
    trail_running: "Trail Running",
    road_running: "Running",
    hiking_backpacking: "Hiking",
    soccer: "Soccer",
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
  return map[slug] ?? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function countWorkingExercises(blocks: WorkoutBlock[]): {
  total: number;
  sportCounts: Record<string, number>;
  goalCounts: Record<string, number>;
} {
  let total = 0;
  const sportCounts: Record<string, number> = {};
  const goalCounts: Record<string, number> = {};

  for (const block of blocks) {
    if (PREP_BLOCK_TYPES.has(block.block_type)) continue;
    const items = block.supersetPairs ? block.supersetPairs.flat() : (block.items ?? []);
    for (const item of items) {
      total++;
      const links = item.session_intent_links;
      if (!links) continue;
      for (const s of links.sport_slugs ?? []) {
        sportCounts[s] = (sportCounts[s] ?? 0) + 1;
      }
      for (const g of links.goals ?? []) {
        goalCounts[g] = (goalCounts[g] ?? 0) + 1;
      }
    }
  }

  return { total, sportCounts, goalCounts };
}

function countPrimaryIntentBuckets(
  blocks: WorkoutBlock[],
  sports: string[],
  goals: string[]
): {
  total: number;
  sportCounts: Record<string, number>;
  goalCounts: Record<string, number>;
} {
  let total = 0;
  const sportCounts: Record<string, number> = {};
  const goalCounts: Record<string, number> = {};

  for (const block of blocks) {
    if (PREP_BLOCK_TYPES.has(block.block_type)) continue;
    const items = block.supersetPairs ? block.supersetPairs.flat() : (block.items ?? []);
    for (const item of items) {
      total++;
      const links = item.session_intent_links;
      if (!links) continue;
      const sportHit = sports.find((s) => (links.sport_slugs ?? []).includes(s));
      if (sportHit) {
        sportCounts[sportHit] = (sportCounts[sportHit] ?? 0) + 1;
        continue;
      }
      const goalHit = goals.find((g) => (links.goals ?? []).includes(g));
      if (goalHit) {
        goalCounts[goalHit] = (goalCounts[goalHit] ?? 0) + 1;
      }
    }
  }

  return { total, sportCounts, goalCounts };
}

/**
 * Run the proportion guardrail against a set of already-annotated workout blocks.
 * Call after `annotateSessionIntentLinksOnBlocks` has run.
 */
export function runIntentProportionGuardrail(
  blocks: WorkoutBlock[],
  input: GenerateWorkoutInput
): IntentProportionGuardrailResult {
  const checks: IntentProportionCheck[] = [];

  const sportWeight = Math.max(0, Math.min(1, input.sport_weight ?? 0));
  const sports = input.sport_slugs ?? [];
  const goals = [input.primary_goal, ...(input.secondary_goals ?? [])];
  const { total, sportCounts, goalCounts } =
    sportWeight > 0 && sports.length > 0
      ? countPrimaryIntentBuckets(blocks, sports, goals)
      : countWorkingExercises(blocks);

  if (total === 0) {
    return { checks, overall_aligned: true, max_delta_pct: 0, working_exercise_count: 0 };
  }

  const goalWeightFraction = 1 - sportWeight;

  if (sports.length > 0 && sportWeight > 0) {
    const perSportDeclared = sportWeight / sports.length;
    for (const sport of sports) {
      const actualCount = sportCounts[sport] ?? 0;
      const actual_pct = Math.round((actualCount / total) * 100);
      const declared_pct = Math.round(perSportDeclared * 100);
      const delta_pct = Math.abs(actual_pct - declared_pct);
      checks.push({
        slug: sport,
        kind: "sport",
        label: humanLabel(sport),
        declared_pct,
        actual_pct,
        delta_pct,
        passes: delta_pct <= TOLERANCE_PCT,
      });
    }
  }

  const rawGoalWeights =
    input.goal_weights ?? goals.map((_, i) => (i === 0 ? 0.5 : i === 1 ? 0.3 : 0.2));
  const goalWeightSum = rawGoalWeights.slice(0, goals.length).reduce((s, w) => s + w, 0);

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i]!;
    const normGoalW =
      goalWeightSum > 0 ? (rawGoalWeights[i] ?? 0) / goalWeightSum : 1 / goals.length;
    const absWeight = normGoalW * goalWeightFraction;
    const actualCount = goalCounts[goal] ?? 0;
    const actual_pct = Math.round((actualCount / total) * 100);
    const declared_pct = Math.round(absWeight * 100);
    const delta_pct = Math.abs(actual_pct - declared_pct);
    checks.push({
      slug: goal,
      kind: "goal",
      label: humanLabel(goal),
      declared_pct,
      actual_pct,
      delta_pct,
      passes: delta_pct <= TOLERANCE_PCT,
    });
  }

  const max_delta_pct = checks.length > 0 ? Math.max(...checks.map((c) => c.delta_pct)) : 0;
  const overall_aligned = checks.every((c) => c.passes);

  return {
    checks,
    overall_aligned,
    max_delta_pct,
    working_exercise_count: total,
    primary_sport_slug: sports[0],
    primary_goal_slug: goals[0],
  };
}
