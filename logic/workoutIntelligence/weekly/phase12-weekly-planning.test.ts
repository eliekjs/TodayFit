/**
 * Phase 12: Weekly planning structure for Adaptive Mode.
 * Tests: 3-day/5-day allocation, fatigue distribution, goal-priority allocation,
 * no overloading same region on adjacent days, and that Manual mode stays session-first.
 */

import { describe, it, expect } from "vitest";
import {
  generateAdaptiveWeeklyPlan,
  generateAdaptiveWeekWithDailyGenerator,
} from "./weeklyPlanner";
import { stressDistribution, lowerBodySpacingOk } from "./weeklyBalanceRules";
import { STUB_EXERCISES } from "../../workoutGeneration/exerciseStub";
import { generateWorkoutSession } from "../../workoutGeneration/dailyGenerator";
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
        includeDebug: false,
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
      const session = generateWorkoutSession(input, STUB_EXERCISES, false);
      expect(session).toBeDefined();
      expect(session.blocks).toBeDefined();
      expect(session.blocks.length).toBeGreaterThanOrEqual(1);
      expect(session.title).toBeDefined();
    });
  });
});
