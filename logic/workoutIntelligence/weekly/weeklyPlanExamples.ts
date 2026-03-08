/**
 * Phase 6: Example weekly plans for documentation and testing.
 * Demonstrates climbing+hypertrophy (5 days), skiing+hypertrophy (4 days), general hypertrophy (4 days).
 */

import { generateAdaptiveWeeklyPlan } from "./weeklyPlanner";
import type { WeeklyPlanningInput, WeeklyPlan } from "./weeklyTypes";

const BASE_EQUIPMENT = [
  "dumbbells",
  "barbell",
  "plates",
  "bench",
  "pullup_bar",
  "bodyweight",
  "cable_machine",
  "lat_pulldown",
  "kettlebells",
];

/** Example: Climbing + hypertrophy, 5 days. */
export function exampleClimbingHypertrophy5Days(): WeeklyPlan {
  const input: WeeklyPlanningInput = {
    primary_goal: "hypertrophy",
    secondary_goals: ["climbing"],
    sports: ["rock_bouldering"],
    days_available_per_week: 5,
    default_session_duration: 55,
    available_equipment: BASE_EQUIPMENT,
    variation_seed: "week_1",
  };
  return generateAdaptiveWeeklyPlan(input);
}

/** Example: Skiing + hypertrophy, 4 days. */
export function exampleSkiingHypertrophy4Days(): WeeklyPlan {
  const input: WeeklyPlanningInput = {
    primary_goal: "hypertrophy",
    secondary_goals: ["ski"],
    sports: ["backcountry_skiing"],
    days_available_per_week: 4,
    default_session_duration: 50,
    available_equipment: BASE_EQUIPMENT,
    variation_seed: "week_1",
  };
  return generateAdaptiveWeeklyPlan(input);
}

/** Example: General hypertrophy + athleticism, 4 days. */
export function exampleGeneralHypertrophy4Days(): WeeklyPlan {
  const input: WeeklyPlanningInput = {
    primary_goal: "hypertrophy",
    secondary_goals: ["athletic_performance"],
    days_available_per_week: 4,
    default_session_duration: 50,
    available_equipment: BASE_EQUIPMENT,
    variation_seed: "week_2",
  };
  return generateAdaptiveWeeklyPlan(input);
}

/** Example: 5 days with preferred days and energy profile. */
export function exampleWithPreferredDaysAndEnergy(): WeeklyPlan {
  const input: WeeklyPlanningInput = {
    primary_goal: "hypertrophy",
    sports: ["rock_bouldering"],
    days_available_per_week: 5,
    preferred_training_days: [0, 1, 3, 4, 5],
    default_session_duration: 55,
    energy_profile_by_day: { 0: "high", 1: "medium", 3: "high", 4: "medium", 5: "low" },
    available_equipment: BASE_EQUIPMENT,
  };
  return generateAdaptiveWeeklyPlan(input);
}
