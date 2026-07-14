/**
 * Weighted goal/sub-goal alignment scoring (docs/workout-simulation-validation-rules.md).
 * Shared by persona/deep simulation harnesses and the standalone validation script.
 */

import type { Exercise, GenerateWorkoutInput, WorkoutSession } from "./types";
import type { GeneratedWorkout } from "../../lib/types";

export type AlignmentAssignment = {
  exercise_id: string;
  exercise_name: string;
  block_type: string;
  assigned_goal: string;
  assigned_sub_goal?: string;
};

export type WeightedAlignmentCheck = {
  id:
    | "weighted_alignment_primary"
    | "weighted_alignment_order"
    | "weighted_alignment_tolerance"
    | "weighted_alignment_minimum_presence";
  pass: boolean;
  detail: string;
  weight: number;
};

const WARM_COOL = new Set(["warmup", "cooldown", "mobility", "recovery"]);

function isWarmCooldown(blockType: string): boolean {
  return WARM_COOL.has(blockType);
}

export function normalizedTargetWeights(input: GenerateWorkoutInput): Record<string, number> {
  const out: Record<string, number> = {};

  if (input.sport_slugs?.length) {
    const sportW = input.sport_weight ?? 0.55;
    out.sport = sportW;
    const goals = [input.primary_goal, ...(input.secondary_goals ?? [])];
    const remain = 1 - sportW;
    if (goals.length > 0) {
      const per = remain / goals.length;
      for (const g of goals) out[g] = (out[g] ?? 0) + per;
    }
  } else {
    const weights = input.goal_weights;
    const goals = [input.primary_goal, ...(input.secondary_goals ?? [])];
    if (weights && weights.length >= goals.length) {
      goals.forEach((g, i) => {
        out[g] = weights[i] ?? 0;
      });
    } else {
      out[input.primary_goal] = 0.6;
      const secondaries = input.secondary_goals ?? [];
      const rem = secondaries.length > 0 ? 0.4 / secondaries.length : 0;
      for (const g of secondaries) out[g] = rem;
    }
  }

  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  if (sum <= 0) return out;
  for (const k of Object.keys(out)) out[k] = out[k]! / sum;
  return out;
}

export function actualSharesFromAssignments(
  assignments: AlignmentAssignment[]
): Record<string, number> {
  const work = assignments.filter((r) => !isWarmCooldown(r.block_type));
  const counts: Record<string, number> = {};
  for (const r of work) {
    const key = r.assigned_sub_goal ?? r.assigned_goal;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const total = Math.max(1, work.length);
  for (const k of Object.keys(counts)) counts[k] = counts[k]! / total;
  return counts;
}

/** Prefer goal-level shares for order/tolerance when targets are parent goals. */
export function actualGoalSharesFromAssignments(
  assignments: AlignmentAssignment[]
): Record<string, number> {
  const work = assignments.filter((r) => !isWarmCooldown(r.block_type));
  const counts: Record<string, number> = {};
  for (const r of work) counts[r.assigned_goal] = (counts[r.assigned_goal] ?? 0) + 1;
  const total = Math.max(1, work.length);
  for (const k of Object.keys(counts)) counts[k] = counts[k]! / total;
  return counts;
}

function chooseAssignedGoal(
  input: GenerateWorkoutInput,
  ex: Exercise,
  blockType: string,
  sportMatched: boolean
): { goal: string; subGoal?: string } {
  const primarySport = input.sport_slugs?.[0];
  if (primarySport && (blockType === "conditioning" || sportMatched)) {
    return { goal: "sport", subGoal: `sport:${primarySport}` };
  }

  const allGoals = [input.primary_goal, ...(input.secondary_goals ?? [])];
  const goalTags = new Set(ex.tags?.goal_tags ?? []);
  for (const g of allGoals) {
    if (goalTags.has(g === "athletic_performance" ? "athleticism" : (g as never))) {
      return { goal: g };
    }
  }

  if (blockType === "conditioning") return { goal: "conditioning" };
  return { goal: input.primary_goal };
}

export function buildAssignmentReasoningFromSession(
  input: GenerateWorkoutInput,
  session: WorkoutSession | GeneratedWorkout,
  exercisePool: Exercise[]
): AlignmentAssignment[] {
  const byId = new Map(exercisePool.map((e) => [e.id, e]));
  const sportItems = new Map(
    ((session as WorkoutSession).debug?.sport_pattern_transfer?.items ?? []).map((x) => [
      x.exercise_id,
      x,
    ])
  );

  const rows: AlignmentAssignment[] = [];
  for (const block of session.blocks ?? []) {
    for (const it of block.items ?? []) {
      const ex = byId.get(it.exercise_id);
      if (!ex) continue;
      const sportRow = sportItems.get(it.exercise_id);
      const assigned = chooseAssignedGoal(
        input,
        ex,
        block.block_type,
        !!(sportRow as { categories_matched?: string[] } | undefined)?.categories_matched?.length
      );
      rows.push({
        exercise_id: it.exercise_id,
        exercise_name: it.exercise_name ?? it.exercise_id,
        block_type: block.block_type,
        assigned_goal: assigned.goal,
        assigned_sub_goal: assigned.subGoal,
      });
    }
  }
  return rows;
}

export type WeightedAlignmentOptions = {
  /** Absolute |actual - target| tolerance (default 0.15). */
  tolerance?: number;
  /** Min actual share for targets with weight >= minWeightThreshold (default 0.10). */
  minPresenceShare?: number;
  /** Weight threshold that requires minimum presence (default 0.20). */
  minWeightThreshold?: number;
};

/**
 * Build the four weighted_alignment_* checks from target weights vs actual goal shares.
 * Soft intent drift: failures surface without hard-failing the whole simulation score band
 * unless the caller treats them as critical.
 */
export function buildWeightedAlignmentChecks(
  input: GenerateWorkoutInput,
  assignments: AlignmentAssignment[],
  options: WeightedAlignmentOptions = {}
): WeightedAlignmentCheck[] {
  const tolerance = options.tolerance ?? 0.15;
  const minPresenceShare = options.minPresenceShare ?? 0.1;
  const minWeightThreshold = options.minWeightThreshold ?? 0.2;

  const targets = normalizedTargetWeights(input);
  const actual = actualGoalSharesFromAssignments(assignments);
  const orderedTarget = Object.entries(targets)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const orderedActual = Object.entries(actual)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const primaryTarget = orderedTarget[0];
  const primaryActual = orderedActual[0];
  const primaryPass =
    !primaryTarget ||
    Object.keys(targets).length <= 1 ||
    primaryTarget === primaryActual ||
    (actual[primaryTarget] ?? 0) >= Math.max(...Object.values(actual), 0) - 1e-9;

  const checks: WeightedAlignmentCheck[] = [
    {
      id: "weighted_alignment_primary",
      pass: primaryPass,
      detail: `primary_target=${primaryTarget ?? "n/a"} primary_actual=${primaryActual ?? "n/a"}`,
      weight: 5,
    },
    {
      id: "weighted_alignment_order",
      pass: orderedTarget.length === 0 || orderedTarget[0] === orderedActual[0],
      detail: `target_order=${orderedTarget.join(">") || "n/a"} actual_order=${orderedActual.join(">") || "n/a"}`,
      weight: 5,
    },
  ];

  const tolFailures = Object.entries(targets).filter(
    ([k, v]) => Math.abs((actual[k] ?? 0) - v) > tolerance
  );
  checks.push({
    id: "weighted_alignment_tolerance",
    pass: tolFailures.length === 0,
    detail:
      tolFailures.length === 0
        ? `all within +/-${tolerance}`
        : tolFailures
            .map(([k, v]) => `${k}:target=${v.toFixed(2)} actual=${(actual[k] ?? 0).toFixed(2)}`)
            .join("; "),
    weight: 6,
  });

  const presenceFailures = Object.entries(targets).filter(
    ([k, v]) => v >= minWeightThreshold && (actual[k] ?? 0) < minPresenceShare
  );
  checks.push({
    id: "weighted_alignment_minimum_presence",
    pass: presenceFailures.length === 0,
    detail:
      presenceFailures.length === 0
        ? `targets ≥${minWeightThreshold} have ≥${minPresenceShare} share`
        : presenceFailures
            .map(([k, v]) => `${k}:target=${v.toFixed(2)} actual=${(actual[k] ?? 0).toFixed(2)}`)
            .join("; "),
    weight: 4,
  });

  return checks;
}

export function formatWeightedAlignmentSummary(
  checks: WeightedAlignmentCheck[],
  targets: Record<string, number>,
  actual: Record<string, number>
): string {
  return `Weighted alignment: ${checks
    .map((c) => `${c.id}:${c.pass ? "pass" : "fail"}`)
    .join(", ")}. Expected vs actual: ${JSON.stringify(targets)} vs ${JSON.stringify(actual)}.`;
}
