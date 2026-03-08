/**
 * Session templates: block specs and metadata per session type.
 * Used by the generator to decide structure before filling exercises.
 * Phase 3: Prefer SessionTemplateV2 and sessionTemplatesV2 for stimulus-driven architecture.
 */

import type { SessionTemplate, BlockSpec } from "./types";

const warmupBlock: BlockSpec = {
  block_type: "warmup",
  format: "circuit",
  min_items: 2,
  max_items: 4,
};

const cooldownBlock: BlockSpec = {
  block_type: "cooldown",
  format: "circuit",
  min_items: 2,
  max_items: 3,
};

export const SESSION_TEMPLATES: Record<string, SessionTemplate> = {
  strength_45: {
    id: "strength_45",
    name: "Strength (45 min)",
    block_specs: [
      warmupBlock,
      { block_type: "main_strength", format: "straight_sets", min_items: 2, max_items: 2 },
      { block_type: "main_strength", format: "superset", min_items: 2, max_items: 4 },
      cooldownBlock,
    ],
    estimated_minutes: 45,
    suitable_goals: ["strength", "power"],
  },
  strength_60: {
    id: "strength_60",
    name: "Strength (60 min)",
    block_specs: [
      warmupBlock,
      { block_type: "main_strength", format: "straight_sets", min_items: 2, max_items: 2 },
      { block_type: "main_strength", format: "superset", min_items: 2, max_items: 4 },
      { block_type: "conditioning", format: "straight_sets", min_items: 0, max_items: 1 },
      cooldownBlock,
    ],
    estimated_minutes: 60,
    suitable_goals: ["strength", "power", "athletic_performance"],
  },
  hypertrophy_45: {
    id: "hypertrophy_45",
    name: "Hypertrophy (45 min)",
    block_specs: [
      warmupBlock,
      { block_type: "main_hypertrophy", format: "superset", min_items: 4, max_items: 6 },
      { block_type: "main_hypertrophy", format: "superset", min_items: 2, max_items: 4 },
      cooldownBlock,
    ],
    estimated_minutes: 45,
    suitable_goals: ["hypertrophy", "body_recomp", "calisthenics", "physique"],
  },
  hypertrophy_60: {
    id: "hypertrophy_60",
    name: "Hypertrophy (60 min)",
    block_specs: [
      warmupBlock,
      { block_type: "main_hypertrophy", format: "superset", min_items: 4, max_items: 6 },
      { block_type: "main_hypertrophy", format: "superset", min_items: 2, max_items: 4 },
      { block_type: "conditioning", format: "straight_sets", min_items: 0, max_items: 1 },
      cooldownBlock,
    ],
    estimated_minutes: 60,
    suitable_goals: ["hypertrophy", "body_recomp", "physique"],
  },
  sport_mixed_60: {
    id: "sport_mixed_60",
    name: "Sport support (60 min)",
    block_specs: [
      warmupBlock,
      { block_type: "main_strength", format: "straight_sets", min_items: 1, max_items: 2 },
      { block_type: "main_strength", format: "superset", min_items: 2, max_items: 4 },
      { block_type: "accessory", format: "circuit", min_items: 2, max_items: 4 },
      { block_type: "conditioning", format: "straight_sets", min_items: 0, max_items: 1 },
      cooldownBlock,
    ],
    estimated_minutes: 60,
    suitable_goals: [],
  },
  endurance_45: {
    id: "endurance_45",
    name: "Endurance (45 min)",
    block_specs: [
      warmupBlock,
      { block_type: "conditioning", format: "straight_sets", min_items: 1, max_items: 1 },
      { block_type: "accessory", format: "circuit", min_items: 2, max_items: 3 },
      cooldownBlock,
    ],
    estimated_minutes: 45,
    suitable_goals: ["endurance", "conditioning"],
  },
  mobility_30: {
    id: "mobility_30",
    name: "Mobility / recovery (30 min)",
    block_specs: [
      warmupBlock,
      { block_type: "cooldown", format: "circuit", min_items: 4, max_items: 8 },
    ],
    estimated_minutes: 30,
    suitable_goals: ["mobility", "recovery"],
  },
};

/** Pick a template by primary goal and duration. */
export function getTemplateForGoalAndDuration(
  primaryGoal: string,
  durationMinutes: number
): SessionTemplate {
  const goal = primaryGoal.toLowerCase().replace(/\s/g, "_");
  const key =
    durationMinutes <= 30
      ? "mobility_30"
      : durationMinutes <= 45
        ? (goal === "strength" || goal === "power" ? "strength_45" : goal === "endurance" || goal === "conditioning" ? "endurance_45" : "hypertrophy_45")
        : durationMinutes <= 60
          ? (goal === "strength" || goal === "power" ? "strength_60" : goal === "endurance" || goal === "conditioning" ? "endurance_45" : "hypertrophy_60")
          : "hypertrophy_60";
  return SESSION_TEMPLATES[key] ?? SESSION_TEMPLATES.strength_60;
}
