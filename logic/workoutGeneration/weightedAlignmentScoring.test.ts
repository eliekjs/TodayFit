/**
 * Unit tests for weighted alignment scoring (Phase 3 G3.4).
 * Run: npx vitest run logic/workoutGeneration/weightedAlignmentScoring.test.ts
 */

import { describe, expect, it } from "vitest";
import type { GenerateWorkoutInput } from "./types";
import {
  actualGoalSharesFromAssignments,
  buildWeightedAlignmentChecks,
  normalizedTargetWeights,
  type AlignmentAssignment,
} from "./weightedAlignmentScoring";

function assignment(
  partial: Partial<AlignmentAssignment> & Pick<AlignmentAssignment, "assigned_goal">
): AlignmentAssignment {
  return {
    exercise_id: partial.exercise_id ?? "ex",
    exercise_name: partial.exercise_name ?? "Ex",
    block_type: partial.block_type ?? "main_strength",
    assigned_goal: partial.assigned_goal,
    assigned_sub_goal: partial.assigned_sub_goal,
  };
}

describe("weightedAlignmentScoring", () => {
  it("normalizes multi-goal weights", () => {
    const input = {
      primary_goal: "hypertrophy",
      secondary_goals: ["strength", "conditioning"],
      goal_weights: [0.5, 0.3, 0.2],
    } as GenerateWorkoutInput;
    const w = normalizedTargetWeights(input);
    expect(w.hypertrophy).toBeCloseTo(0.5);
    expect(w.strength).toBeCloseTo(0.3);
    expect(w.conditioning).toBeCloseTo(0.2);
  });

  it("detects primary / order / tolerance / minimum_presence", () => {
    const input = {
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      goal_weights: [0.7, 0.3],
    } as GenerateWorkoutInput;
    const assignments = [
      assignment({ assigned_goal: "hypertrophy" }),
      assignment({ assigned_goal: "hypertrophy" }),
      assignment({ assigned_goal: "hypertrophy" }),
      assignment({ assigned_goal: "strength" }),
      assignment({ assigned_goal: "warmup", block_type: "warmup" }),
    ];
    const shares = actualGoalSharesFromAssignments(assignments);
    expect(shares.hypertrophy).toBeCloseTo(0.75);
    const checks = buildWeightedAlignmentChecks(input, assignments);
    expect(checks.every((c) => c.pass)).toBe(true);
    expect(checks.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        "weighted_alignment_primary",
        "weighted_alignment_order",
        "weighted_alignment_tolerance",
        "weighted_alignment_minimum_presence",
      ])
    );
  });

  it("fails when secondary with weight ≥0.20 has no presence", () => {
    const input = {
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      goal_weights: [0.7, 0.3],
    } as GenerateWorkoutInput;
    const assignments = [
      assignment({ assigned_goal: "hypertrophy" }),
      assignment({ assigned_goal: "hypertrophy" }),
      assignment({ assigned_goal: "hypertrophy" }),
      assignment({ assigned_goal: "hypertrophy" }),
    ];
    const checks = buildWeightedAlignmentChecks(input, assignments);
    const presence = checks.find((c) => c.id === "weighted_alignment_minimum_presence");
    expect(presence?.pass).toBe(false);
  });
});
