import type { PrimaryGoal } from "./types";

export type CardioFormatHint = "steady" | "intervals" | "circuit";

export type ConditioningPolicy = {
  allowConditioningBlock: boolean;
  conditioningRequired: boolean;
  sessionCardioShare: number;
  targetCardioExerciseShare: number;
  preferredMainFormats: ("straight_sets" | "superset" | "circuit")[];
  preferredConditioningFormats: ("straight_sets" | "superset" | "circuit")[];
};

export const CARDIO_POLICY_BY_PRIMARY_GOAL: Record<PrimaryGoal, ConditioningPolicy> = {
  conditioning: {
    allowConditioningBlock: true,
    conditioningRequired: true,
    sessionCardioShare: 0.78,
    targetCardioExerciseShare: 0.62,
    preferredMainFormats: ["circuit", "superset"],
    preferredConditioningFormats: ["circuit", "straight_sets"],
  },
  endurance: {
    allowConditioningBlock: true,
    conditioningRequired: true,
    sessionCardioShare: 0.74,
    targetCardioExerciseShare: 0.58,
    preferredMainFormats: ["circuit", "superset"],
    preferredConditioningFormats: ["straight_sets", "circuit"],
  },
  mobility: {
    allowConditioningBlock: false,
    conditioningRequired: false,
    sessionCardioShare: 0.12,
    targetCardioExerciseShare: 0.05,
    preferredMainFormats: ["circuit", "straight_sets"],
    preferredConditioningFormats: ["straight_sets"],
  },
  recovery: {
    allowConditioningBlock: false,
    conditioningRequired: false,
    sessionCardioShare: 0.1,
    targetCardioExerciseShare: 0.05,
    preferredMainFormats: ["circuit", "straight_sets"],
    preferredConditioningFormats: ["straight_sets"],
  },
  strength: {
    allowConditioningBlock: true,
    conditioningRequired: false,
    sessionCardioShare: 0.22,
    targetCardioExerciseShare: 0.14,
    preferredMainFormats: ["straight_sets", "superset"],
    preferredConditioningFormats: ["circuit", "straight_sets"],
  },
  power: {
    allowConditioningBlock: true,
    conditioningRequired: false,
    sessionCardioShare: 0.24,
    targetCardioExerciseShare: 0.18,
    preferredMainFormats: ["straight_sets", "superset"],
    preferredConditioningFormats: ["circuit", "straight_sets"],
  },
  hypertrophy: {
    allowConditioningBlock: true,
    conditioningRequired: false,
    sessionCardioShare: 0.2,
    targetCardioExerciseShare: 0.12,
    preferredMainFormats: ["superset", "straight_sets"],
    preferredConditioningFormats: ["circuit", "straight_sets"],
  },
  body_recomp: {
    allowConditioningBlock: true,
    conditioningRequired: false,
    sessionCardioShare: 0.24,
    targetCardioExerciseShare: 0.16,
    preferredMainFormats: ["superset", "circuit"],
    preferredConditioningFormats: ["circuit", "straight_sets"],
  },
  athletic_performance: {
    allowConditioningBlock: true,
    conditioningRequired: false,
    sessionCardioShare: 0.27,
    targetCardioExerciseShare: 0.2,
    preferredMainFormats: ["superset", "circuit"],
    preferredConditioningFormats: ["circuit", "straight_sets"],
  },
  calisthenics: {
    allowConditioningBlock: true,
    conditioningRequired: false,
    sessionCardioShare: 0.2,
    targetCardioExerciseShare: 0.14,
    preferredMainFormats: ["superset", "circuit"],
    preferredConditioningFormats: ["circuit", "straight_sets"],
  },
};

export const CARDIO_SECONDARY_SHARE_BONUS = 0.24;
export const CARDIO_SECONDARY_EXERCISE_SHARE_BONUS = 0.18;
export const WEEKLY_CARDIO_EMPHASIS_WEIGHT = 0.22;
export const SESSION_CARDIO_TARGET_WEIGHT = 0.55;

export const CARDIO_WARMUP_TARGETS_BY_SPORT_KEYWORD: Record<string, string[]> = {
  running: ["calves", "ankles", "hip_flexors", "thoracic_spine"],
  soccer: ["adductors", "calves", "hamstrings", "hip_flexors"],
  hiking: ["calves", "glutes", "hamstrings", "hip_flexors"],
  ski: ["glutes", "adductors", "ankles", "thoracic_spine"],
  cycling: ["hip_flexors", "glutes", "thoracic_spine", "calves"],
  hyrox: ["calves", "hip_flexors", "core", "thoracic_spine"],
};

export const CARDIO_COOLDOWN_TARGETS_BY_SPORT_KEYWORD: Record<string, string[]> = {
  running: ["calves", "hamstrings", "hip_flexors", "glutes"],
  soccer: ["adductors", "calves", "hamstrings", "hip_flexors"],
  hiking: ["calves", "hamstrings", "glutes", "hip_flexors"],
  ski: ["adductors", "glutes", "calves", "low_back"],
  cycling: ["hip_flexors", "glutes", "hamstrings", "thoracic_spine"],
  hyrox: ["calves", "hamstrings", "hip_flexors", "thoracic_spine"],
};

export const CARDIO_WARMUP_TARGETS_BY_INTENT: Record<string, string[]> = {
  zone2_aerobic_base: ["calves", "hip_flexors", "thoracic_spine"],
  zone2_long_steady: ["calves", "hip_flexors", "thoracic_spine"],
  threshold_tempo: ["calves", "hamstrings", "glutes", "core"],
  hills: ["calves", "ankles", "glutes", "hamstrings"],
  durability: ["core", "hip_flexors", "glutes", "thoracic_spine"],
  time_circuit: ["core", "glutes", "hamstrings", "thoracic_spine"],
  intervals_hiit: ["calves", "glutes", "core", "thoracic_spine"],
  intervals: ["calves", "glutes", "core", "thoracic_spine"],
};

export const CARDIO_COOLDOWN_TARGETS_BY_INTENT: Record<string, string[]> = {
  zone2_aerobic_base: ["calves", "hamstrings", "hip_flexors"],
  zone2_long_steady: ["calves", "hamstrings", "hip_flexors"],
  threshold_tempo: ["calves", "hamstrings", "glutes", "low_back"],
  hills: ["calves", "hamstrings", "glutes", "adductors"],
  durability: ["thoracic_spine", "hip_flexors", "glutes", "low_back"],
  time_circuit: ["thoracic_spine", "hip_flexors", "glutes", "hamstrings"],
  intervals_hiit: ["calves", "hip_flexors", "hamstrings", "thoracic_spine"],
  intervals: ["calves", "hip_flexors", "hamstrings", "thoracic_spine"],
};
