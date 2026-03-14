/**
 * Focus areas for the testing agent. Each focus area defines scenarios (user inputs)
 * that stress a specific part of the algorithm. Tests and decision reports are
 * generated per focus area so you can run or adjust tests by focus.
 */

import type { GenerateWorkoutInput } from "../types";

export type FocusAreaId =
  | "body_part_focus"
  | "injuries"
  | "cooldown_mobility"
  | "power_prescription"
  | "duration_scaling"
  | "equipment_limits"
  | "supersets"
  | "goals_and_conditioning";

export type Scenario = {
  /** Short name for logs and reports. */
  name: string;
  /** User input as would be passed to the generator (app inputs). */
  input: GenerateWorkoutInput;
  /** Optional: what we expect from decisioning (for assertions). */
  expectedDecision?: ExpectedDecision;
};

export type ExpectedDecision = {
  /** Resolved constraints: allowed movement families when body focus is set. */
  allowed_movement_families?: string[] | null;
  /** Min mobility exercises in cooldown (e.g. when mobility is secondary goal). */
  min_cooldown_mobility_exercises?: number;
  /** Session must have this block type (e.g. cooldown). */
  requiredBlockTypes?: string[];
  /** Main work rep range (power: low reps; hypertrophy: moderate). */
  mainRepRange?: { min?: number; max?: number };
  /** Main work rest (power: long rest). */
  mainRestSecondsMin?: number;
  /** Validation must pass. */
  valid?: boolean;
};

export type FocusArea = {
  id: FocusAreaId;
  label: string;
  description: string;
  scenarios: Scenario[];
};

const BASE_EQUIPMENT = [
  "barbell",
  "bench",
  "dumbbells",
  "squat_rack",
  "cable_machine",
  "lat_pulldown",
  "pullup_bar",
  "bodyweight",
] as const;

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    energy_level: "medium",
    available_equipment: [...BASE_EQUIPMENT],
    injuries_or_constraints: [],
    seed: 100,
    ...overrides,
  };
}

export const FOCUS_AREAS: FocusArea[] = [
  {
    id: "body_part_focus",
    label: "Body-part focus",
    description: "Strict filtering by upper push/pull, lower, full body. Decisioning: allowed_movement_families and hard_include.",
    scenarios: [
      {
        name: "Upper push only",
        input: baseInput({
          focus_body_parts: ["upper_push"],
          primary_goal: "hypertrophy",
          duration_minutes: 60,
          seed: 201,
        }),
        expectedDecision: {
          allowed_movement_families: ["upper_push"],
          valid: true,
        },
      },
      {
        name: "Upper push + pull",
        input: baseInput({
          focus_body_parts: ["upper_push", "upper_pull"],
          primary_goal: "strength",
          seed: 202,
        }),
        expectedDecision: {
          allowed_movement_families: ["upper_push", "upper_pull"],
          valid: true,
        },
      },
      {
        name: "Lower only",
        input: baseInput({
          focus_body_parts: ["lower"],
          primary_goal: "strength",
          seed: 203,
        }),
        expectedDecision: {
          allowed_movement_families: ["lower_body"],
          valid: true,
        },
      },
      {
        name: "Full body (no strict family)",
        input: baseInput({
          focus_body_parts: ["full_body"],
          seed: 204,
        }),
        expectedDecision: {
          allowed_movement_families: null,
          valid: true,
        },
      },
    ],
  },
  {
    id: "injuries",
    label: "Injuries and restrictions",
    description: "Hard exclude by joint_stress and contraindication; no contraindicated exercises in session.",
    scenarios: [
      {
        name: "Knee pain",
        input: baseInput({
          injuries_or_constraints: ["knee_pain"],
          primary_goal: "strength",
          seed: 301,
        }),
        expectedDecision: {
          valid: true,
        },
      },
      {
        name: "Shoulder restriction",
        input: baseInput({
          injuries_or_constraints: ["shoulder"],
          focus_body_parts: ["upper_push"],
          seed: 302,
        }),
        expectedDecision: {
          allowed_movement_families: ["upper_push"],
          valid: true,
        },
      },
      {
        name: "Lower back + avoid overhead",
        input: baseInput({
          injuries_or_constraints: ["lower_back"],
          style_prefs: { avoid_tags: ["overhead", "lumbar_shear"] },
          seed: 303,
        }),
        expectedDecision: {
          valid: true,
        },
      },
    ],
  },
  {
    id: "cooldown_mobility",
    label: "Cooldown and mobility",
    description: "Secondary goal mobility → required cooldown block with min mobility/stretch exercises.",
    scenarios: [
      {
        name: "Mobility secondary goal",
        input: baseInput({
          primary_goal: "strength",
          secondary_goals: ["mobility"],
          seed: 401,
        }),
        expectedDecision: {
          min_cooldown_mobility_exercises: 2,
          requiredBlockTypes: ["cooldown"],
          valid: true,
        },
      },
      {
        name: "Upper push + mobility (targeted cooldown)",
        input: baseInput({
          focus_body_parts: ["upper_push"],
          primary_goal: "hypertrophy",
          secondary_goals: ["mobility"],
          seed: 402,
        }),
        expectedDecision: {
          allowed_movement_families: ["upper_push"],
          min_cooldown_mobility_exercises: 2,
          requiredBlockTypes: ["cooldown"],
          valid: true,
        },
      },
    ],
  },
  {
    id: "power_prescription",
    label: "Power prescription",
    description: "Power goal → low reps, longer rest in main block.",
    scenarios: [
      {
        name: "Power lower",
        input: baseInput({
          primary_goal: "power",
          focus_body_parts: ["lower"],
          energy_level: "high",
          seed: 501,
        }),
        expectedDecision: {
          mainRepRange: { min: 1, max: 6 },
          mainRestSecondsMin: 90,
          valid: true,
        },
      },
      {
        name: "Power upper",
        input: baseInput({
          primary_goal: "power",
          focus_body_parts: ["upper_push"],
          seed: 502,
        }),
        expectedDecision: {
          mainRepRange: { min: 1, max: 6 },
          mainRestSecondsMin: 90,
          valid: true,
        },
      },
    ],
  },
  {
    id: "duration_scaling",
    label: "Duration scaling",
    description: "Shorter sessions have fewer blocks/exercises; duration appears in title.",
    scenarios: [
      { name: "20 min", input: baseInput({ duration_minutes: 20, primary_goal: "recovery", seed: 601 }) },
      { name: "30 min strength", input: baseInput({ duration_minutes: 30, seed: 602 }) },
      { name: "45 min", input: baseInput({ duration_minutes: 45, seed: 603 }) },
      { name: "60 min hypertrophy", input: baseInput({ duration_minutes: 60, primary_goal: "hypertrophy", seed: 604 }) },
      { name: "75 min", input: baseInput({ duration_minutes: 75, seed: 605 }) },
    ],
  },
  {
    id: "equipment_limits",
    label: "Equipment limits",
    description: "Limited equipment → only exercises using that equipment; constraints reflect allowed_equipment.",
    scenarios: [
      {
        name: "Dumbbells + bench only",
        input: baseInput({
          available_equipment: ["dumbbells", "bench", "bodyweight"],
          primary_goal: "hypertrophy",
          seed: 701,
        }),
      },
      {
        name: "Bodyweight only",
        input: baseInput({
          available_equipment: ["bodyweight"],
          primary_goal: "calisthenics",
          seed: 702,
        }),
      },
      {
        name: "Cardio equipment only",
        input: baseInput({
          available_equipment: ["treadmill", "rower", "assault_bike", "bodyweight"],
          primary_goal: "endurance",
          seed: 703,
        }),
      },
    ],
  },
  {
    id: "supersets",
    label: "Supersets",
    description: "style_prefs.wants_supersets and pairing rules; session may use superset format.",
    scenarios: [
      {
        name: "Supersets wanted",
        input: baseInput({
          style_prefs: { wants_supersets: true },
          primary_goal: "hypertrophy",
          focus_body_parts: ["upper_push", "upper_pull"],
          duration_minutes: 60,
          seed: 801,
        }),
      },
      {
        name: "No supersets",
        input: baseInput({
          style_prefs: { wants_supersets: false },
          primary_goal: "strength",
          seed: 802,
        }),
      },
    ],
  },
  {
    id: "goals_and_conditioning",
    label: "Goals and conditioning",
    description: "Primary/secondary goals and optional conditioning block; title reflects goal.",
    scenarios: [
      {
        name: "Endurance + conditioning minutes",
        input: baseInput({
          primary_goal: "endurance",
          style_prefs: { conditioning_minutes: 15 },
          available_equipment: [...BASE_EQUIPMENT, "treadmill", "rower"],
          seed: 901,
        }),
      },
      {
        name: "Body recomp",
        input: baseInput({
          primary_goal: "body_recomp",
          duration_minutes: 60,
          seed: 902,
        }),
      },
      {
        name: "Athletic performance",
        input: baseInput({
          primary_goal: "athletic_performance",
          energy_level: "high",
          available_equipment: [...BASE_EQUIPMENT, "plyo_box", "kettlebells"],
          seed: 903,
        }),
      },
    ],
  },
];

export function getFocusArea(id: FocusAreaId): FocusArea | undefined {
  return FOCUS_AREAS.find((a) => a.id === id);
}

export function getScenarioInputsForFocus(focusId: FocusAreaId): Scenario[] {
  const area = getFocusArea(focusId);
  return area?.scenarios ?? [];
}
