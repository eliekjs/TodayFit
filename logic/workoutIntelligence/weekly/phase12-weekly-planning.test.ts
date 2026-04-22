/**
 * Phase 12: Weekly planning structure for Adaptive Mode.
 * Tests: 3-day/5-day allocation, fatigue distribution, goal-priority allocation,
 * no overloading same region on adjacent days, and that Manual mode stays session-first.
 */

import { describe, it, expect, vi } from "vitest";
import {
  generateAdaptiveWeeklyPlan,
  generateAdaptiveWeekWithDailyGenerator,
} from "./weeklyPlanner";
import {
  weeklySessionToDailyInput,
  workoutSessionToRecentSummary,
  buildRollingTrainingHistory,
} from "./weeklyDailyGeneratorBridge";
import { stressDistribution, lowerBodySpacingOk } from "./weeklyBalanceRules";
import { STUB_EXERCISES } from "../../workoutGeneration/exerciseStub";
import { collectWeekMainLiftExerciseIds } from "../../workoutGeneration/collectWeekMainLiftExerciseIds";
import { generateWorkoutSession } from "../../workoutGeneration/dailyGenerator";
import * as dailyGeneratorModule from "../../workoutGeneration/dailyGenerator";
import { getSimilarExerciseClusterId } from "../../../lib/workoutRules";
import type { WeeklyPlanningInput } from "./weeklyTypes";

const BASE_EQUIPMENT = ["dumbbells", "barbell", "bodyweight", "pullup_bar"];

function baseInput(overrides: Partial<WeeklyPlanningInput> = {}): WeeklyPlanningInput {
  return {
    primary_goal: "hypertrophy",
    days_available_per_week: 4,
    default_session_duration: 45,
    available_equipment: BASE_EQUIPMENT,
    variation_seed: 42,
    ...overrides,
  };
}

describe("Phase 12: Weekly planning", () => {
  describe("3-day and 5-day weekly allocation", () => {
    it("allocates exactly 3 sessions for 3 days available", () => {
      const plan = generateAdaptiveWeeklyPlan(baseInput({ days_available_per_week: 3 }));
      expect(plan.sessions).toHaveLength(3);
      expect(plan.total_days).toBe(3);
      const dayIndices = [...new Set(plan.sessions.map((s) => s.day_index))];
      expect(dayIndices.length).toBe(3);
    });

    it("allocates exactly 5 sessions for 5 days available", () => {
      const plan = generateAdaptiveWeeklyPlan(baseInput({ days_available_per_week: 5 }));
      expect(plan.sessions).toHaveLength(5);
      expect(plan.total_days).toBe(5);
      const dayIndices = [...new Set(plan.sessions.map((s) => s.day_index))];
      expect(dayIndices.length).toBe(5);
    });
  });

  describe("weekly fatigue distribution", () => {
    it("distributes stress across high/moderate/low", () => {
      const plan = generateAdaptiveWeeklyPlan(baseInput({ days_available_per_week: 5 }));
      const dist = stressDistribution(plan.sessions);
      expect(dist.high + dist.moderate + dist.low).toBe(5);
      expect(dist.high).toBeLessThanOrEqual(5);
      expect(dist.low).toBeLessThanOrEqual(5);
    });

    it("3-day plan has sensible stress spread", () => {
      const plan = generateAdaptiveWeeklyPlan(baseInput({ days_available_per_week: 3 }));
      const dist = stressDistribution(plan.sessions);
      expect(dist.high + dist.moderate + dist.low).toBe(3);
    });
  });

  describe("goal-priority-driven day allocation", () => {
    it("primary goal hypertrophy gets hypertrophy-oriented sessions", () => {
      const plan = generateAdaptiveWeeklyPlan(baseInput({ primary_goal: "hypertrophy", days_available_per_week: 4 }));
      const types = plan.sessions.map((s) => s.session_type);
      const hypertrophyRelated = types.filter(
        (t) =>
          t.includes("hypertrophy") ||
          t === "full_body_strength" ||
          t === "upper_hypertrophy" ||
          t === "lower_hypertrophy"
      );
      expect(hypertrophyRelated.length).toBeGreaterThanOrEqual(1);
    });

    it("primary strength gets strength-oriented sessions", () => {
      const plan = generateAdaptiveWeeklyPlan(baseInput({ primary_goal: "strength", days_available_per_week: 4 }));
      const types = plan.sessions.map((s) => s.session_type);
      const strengthRelated = types.filter(
        (t) =>
          t.includes("strength") ||
          t === "lower_power" ||
          t === "full_body_strength"
      );
      expect(strengthRelated.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("avoidance of overloading same region on adjacent days", () => {
    it("high lower-body sessions are not placed back-to-back (config default)", () => {
      const plan = generateAdaptiveWeeklyPlan(
        baseInput({ primary_goal: "hypertrophy", days_available_per_week: 5 })
      );
      const result = lowerBodySpacingOk(plan.sessions, { min_days_between_high_lower: 1 });
      expect(result.ok).toBe(true);
    });
  });

  describe("generateAdaptiveWeekWithDailyGenerator", () => {
    it("returns WeeklyPlanWithWorkouts with one workout per planned day", () => {
      const result = generateAdaptiveWeekWithDailyGenerator(baseInput({ days_available_per_week: 3 }), {
        exercisePool: STUB_EXERCISES,
      });
      expect(result.days).toHaveLength(3);
      expect(result.week_summary).toBeDefined();
      expect(result.total_days).toBe(3);
      for (const day of result.days) {
        expect(day.workout).toBeDefined();
        expect(day.workout.blocks).toBeDefined();
        expect(Array.isArray(day.workout.blocks)).toBe(true);
        expect(day.planned_session).toBeDefined();
        expect(day.day_index).toBeGreaterThanOrEqual(0);
      }
    });

    it("includes debug snapshot and allocation rationale when present", () => {
      const result = generateAdaptiveWeekWithDailyGenerator(baseInput({ days_available_per_week: 3 }), {
        exercisePool: STUB_EXERCISES,
      });
      expect(result.debug).toBeDefined();
      expect(result.debug?.allocation_rationale).toBeDefined();
      expect(result.debug?.weekly_state_snapshot).toBeDefined();
      expect(result.debug?.weekly_state_snapshot?.stress_distribution).toBeDefined();
    });

    it("passes rolling week_main_strength_lift_ids_used into each daily generation call", () => {
      const observedInputs: Array<{ week_main_strength_lift_ids_used?: string[] }> = [];
      const generateSpy = vi
        .spyOn(dailyGeneratorModule, "generateWorkoutSession")
        .mockImplementation((input) => {
          observedInputs.push({
            week_main_strength_lift_ids_used: input.week_main_strength_lift_ids_used,
          });
          const day = observedInputs.length;
          const exerciseId = day === 1 ? "bench_press" : "barbell_row";
          return {
            title: `Mock day ${day}`,
            estimated_duration_minutes: input.duration_minutes,
            blocks: [
              {
                block_type: "main_strength",
                format: "straight_sets",
                title: "Main",
                reasoning: "mock",
                estimated_minutes: 12,
                items: [
                  {
                    exercise_id: exerciseId,
                    exercise_name: exerciseId,
                    sets: 3,
                    reps: "5",
                    rest_seconds: 120,
                    unilateral: false,
                  },
                ],
              },
            ],
          };
        });

      try {
        generateAdaptiveWeekWithDailyGenerator(
          baseInput({
            primary_goal: "strength",
            days_available_per_week: 2,
          }),
          { exercisePool: STUB_EXERCISES }
        );
      } finally {
        generateSpy.mockRestore();
      }

      expect(observedInputs.length).toBe(2);
      expect(observedInputs[0]?.week_main_strength_lift_ids_used ?? []).toEqual([]);
      expect(observedInputs[1]?.week_main_strength_lift_ids_used ?? []).toContain("bench_press");
    });

    it("produces diverse main-lift outcomes across days when pool allows repeats", () => {
      const input = baseInput({
        primary_goal: "strength",
        days_available_per_week: 3,
        variation_seed: 1,
        available_equipment: [...BASE_EQUIPMENT, "bench", "squat_rack"],
      });

      const plan = generateAdaptiveWeeklyPlan(input);
      const sessionsByDay = [...plan.sessions].sort((a, b) => a.day_index - b.day_index);
      const manualMainLiftIdsByDay: string[][] = [];
      const rollingSummaries: Array<{ exercise_ids: string[]; muscle_groups: string[]; modality: string }> = [];
      const seedBase = typeof input.variation_seed === "number" ? input.variation_seed : 0;

      // Baseline probe: same weekly sessions but without week_main_strength_lift_ids_used carryover.
      for (const session of sessionsByDay) {
        const trainingHistory =
          rollingSummaries.length > 0 ? buildRollingTrainingHistory(rollingSummaries) : undefined;
        const dailyInput = weeklySessionToDailyInput(
          session,
          input,
          rollingSummaries,
          trainingHistory,
          seedBase,
          []
        );
        const workout = generateWorkoutSession(dailyInput, STUB_EXERCISES);
        manualMainLiftIdsByDay.push(collectWeekMainLiftExerciseIds(workout));
        rollingSummaries.push(workoutSessionToRecentSummary(workout, STUB_EXERCISES));
      }

      const manualFlat = manualMainLiftIdsByDay.flat();
      const manualRepeated = new Set(manualFlat.filter((id, idx) => manualFlat.indexOf(id) !== idx));
      expect(manualRepeated.size).toBeGreaterThan(0);

      const weekly = generateAdaptiveWeekWithDailyGenerator(input, {
        exercisePool: STUB_EXERCISES,
      });
      const weeklyMainLiftIdsByDay = weekly.days.map((d) => collectWeekMainLiftExerciseIds(d.workout));
      const weeklyFlat = weeklyMainLiftIdsByDay.flat();
      const weeklyRepeated = new Set(weeklyFlat.filter((id, idx) => weeklyFlat.indexOf(id) !== idx));

      expect(weeklyRepeated.size).toBeLessThan(manualRepeated.size);
      expect(weeklyRepeated.size).toBe(0);
    });

    it("avoids repeating a main-lift similarity cluster across adaptive week days when alternatives exist", () => {
      const syntheticPool = [
        {
          id: "barbell_deadlift",
          name: "Barbell Deadlift",
          movement_pattern: "hinge",
          muscle_groups: ["hamstrings"],
          modality: "strength",
          equipment_required: ["barbell"],
          difficulty: 3,
          time_cost: "medium",
          tags: { goal_tags: ["strength"], energy_fit: ["low", "medium", "high"] },
        },
        {
          id: "trap_bar_deadlift",
          name: "Trap Bar Deadlift",
          movement_pattern: "hinge",
          muscle_groups: ["hamstrings"],
          modality: "strength",
          equipment_required: ["barbell"],
          difficulty: 3,
          time_cost: "medium",
          tags: { goal_tags: ["strength"], energy_fit: ["low", "medium", "high"] },
        },
        {
          id: "barbell_back_squat",
          name: "Barbell Back Squat",
          movement_pattern: "squat",
          muscle_groups: ["quads"],
          modality: "strength",
          equipment_required: ["barbell"],
          difficulty: 3,
          time_cost: "medium",
          tags: { goal_tags: ["strength"], energy_fit: ["low", "medium", "high"] },
        },
        {
          id: "walking_lunge",
          name: "Walking Lunge",
          movement_pattern: "squat",
          muscle_groups: ["quads"],
          modality: "strength",
          equipment_required: ["barbell"],
          difficulty: 3,
          time_cost: "medium",
          tags: { goal_tags: ["strength"], energy_fit: ["low", "medium", "high"] },
        },
        {
          id: "bench_press_barbell",
          name: "Bench Press",
          movement_pattern: "push",
          muscle_groups: ["chest"],
          modality: "strength",
          equipment_required: ["barbell"],
          difficulty: 3,
          time_cost: "medium",
          tags: { goal_tags: ["strength"], energy_fit: ["low", "medium", "high"] },
        },
        {
          id: "db_row",
          name: "Dumbbell Row",
          movement_pattern: "pull",
          muscle_groups: ["lats"],
          modality: "strength",
          equipment_required: ["barbell"],
          difficulty: 3,
          time_cost: "medium",
          tags: { goal_tags: ["strength"], energy_fit: ["low", "medium", "high"] },
        },
      ] as typeof STUB_EXERCISES;

      const weekly = generateAdaptiveWeekWithDailyGenerator(
        baseInput({
          primary_goal: "strength",
          days_available_per_week: 3,
          variation_seed: 1,
          available_equipment: ["barbell"],
        }),
        { exercisePool: syntheticPool }
      );

      const clusterByDay = weekly.days.map((day) =>
        collectWeekMainLiftExerciseIds(day.workout).map((id) => getSimilarExerciseClusterId({ id }))
      );
      const flatClusters = clusterByDay.flat();
      const repeatedClusters = new Set(
        flatClusters.filter((cluster, idx) => flatClusters.indexOf(cluster) !== idx)
      );
      const deadliftFamilySelections = flatClusters.filter((cluster) => cluster === "deadlift_family").length;

      expect(deadliftFamilySelections).toBeGreaterThanOrEqual(1);
      // Non-deadlift main candidates exist in this pool and remain equipment-compatible for all days.
      expect(repeatedClusters.has("deadlift_family")).toBe(false);
    });
  });

  describe("Manual mode unchanged (session-first, no weekly plan)", () => {
    it("generateWorkoutSession still produces a single session without weekly planning", () => {
      const input = {
        duration_minutes: 45 as const,
        primary_goal: "hypertrophy" as const,
        energy_level: "medium" as const,
        available_equipment: BASE_EQUIPMENT,
        injuries_or_constraints: [] as string[],
      };
      const session = generateWorkoutSession(input, STUB_EXERCISES);
      expect(session).toBeDefined();
      expect(session.blocks).toBeDefined();
      expect(session.blocks.length).toBeGreaterThanOrEqual(1);
      expect(session.title).toBeDefined();
    });
  });
});
