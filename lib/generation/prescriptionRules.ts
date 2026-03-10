/**
 * Evidence-based prescription rules per primary goal.
 * Aligned with ACSM, NSCA, hypertrophy literature (Schoenfeld et al.),
 * and endurance training norms. Used by the daily workout generator.
 *
 * Rep ranges by goal (research summary):
 * - Strength: 1–5 reps (85–100% 1RM), neural adaptations.
 * - Hypertrophy: 6–20 effective; 8–15 typical for efficiency and time under tension.
 * - Body recomp: 10–15 (moderate-high volume, time under tension).
 * - Endurance: 15–25+ (50–65% 1RM), metabolic stress.
 * Exercise-specific overrides (e.g. calves 15–25, isolation 10–20) live in exercises.rep_range_min/max.
 */

import type { BlockFormat } from "../types";

export type EnergyLevel = "low" | "medium" | "high";

export type ConditioningStrategy =
  | "none"
  | "optional_short"
  | "optional_moderate"
  | "mandatory"
  | "primary";

export type GoalTrainingRule = {
  /** Main strength/hypertrophy rep range. */
  repRange: { min: number; max: number };
  /** Main block set range (before energy scaling). */
  setRange: { min: number; max: number };
  /** Rest between sets (seconds). */
  restRange: { min: number; max: number };
  /** Preferred block formats for main work. */
  preferredFormats: BlockFormat[];
  /** When and how much conditioning. */
  conditioningStrategy: ConditioningStrategy;
  /** Conditioning duration range (minutes); used when conditioning is included. */
  conditioningDuration?: { min: number; max: number };
  /** Energy scaling for conditioning duration: [low, medium, high] minutes. */
  conditioningDurationByEnergy?: [number, number, number];
  /** Cues for main strength/hypertrophy work. */
  cueStyle: {
    strength?: string;
    cardio?: string;
    mobility?: string;
  };
  /** Main block: minimum compound lifts when available (e.g. strength = 2). */
  compoundLiftMin?: number;
  /** Supersets only if non-competing (e.g. push+pull). */
  supersetsNonCompetingOnly?: boolean;
  /** Avoid conditioning unless energy is high. */
  conditioningOnlyIfHighEnergy?: boolean;
  /** Accessory: rep range. */
  accessoryRepRange?: { min: number; max: number };
  /** Accessory: set range. */
  accessorySetRange?: { min: number; max: number };
  /** Accessory: rest (seconds). */
  accessoryRestRange?: { min: number; max: number };
  /** Max number of strength exercises in session (e.g. body_recomp 4–6). */
  maxStrengthExercises?: number;
  /** Power block must come before strength (order). */
  powerBeforeStrength?: boolean;
  /** Preferred movement patterns for main block (e.g. compound list). */
  preferredMovementPatterns?: string[];
  /** Main block movement count (e.g. 3–4 movements). */
  mainBlockMovementCount?: { min: number; max: number };
  /** Mobility/recovery: time per movement (seconds). */
  mobilityTimePerMovement?: number;
  /** Mobility: sets (usually 1). */
  mobilitySets?: number;
  /** Light conditioning max minutes (recovery/mobility). */
  lightConditioningMaxMinutes?: number;
  /** Power rep range (athletic_performance, power). */
  powerRepRange?: { min: number; max: number };
  /** Power rest (seconds). */
  powerRestRange?: { min: number; max: number };
  /** Conditioning format preference: circuit, AMRAP, EMOM. */
  conditioningFormats?: BlockFormat[];
  /** Conditioning work duration range (minutes). */
  conditioningWorkDuration?: { min: number; max: number };
  /** Conditioning duration by energy [low, medium, high] (minutes). */
  conditioningWorkDurationByEnergy?: [number, number, number];
  /** Preferred modalities for conditioning (e.g. cyclical). */
  conditioningModalities?: string[];
  /** Structure hint: warmup, main, accessory, conditioning, cooldown. */
  blockOrder?: string[];
};

/** Keys match PrimaryGoal in logic/workoutGeneration/types. */
export const GOAL_TRAINING_RULES: Record<string, GoalTrainingRule> = {
  strength: {
    repRange: { min: 3, max: 6 },
    setRange: { min: 3, max: 5 },
    restRange: { min: 120, max: 180 },
    preferredFormats: ["straight_sets", "superset"],
    conditioningStrategy: "optional_short",
    conditioningDuration: { min: 6, max: 10 },
    conditioningOnlyIfHighEnergy: true,
    cueStyle: {
      strength: "Heavy load, controlled tempo. Full lockout.",
    },
    compoundLiftMin: 2,
    supersetsNonCompetingOnly: true,
    accessoryRepRange: { min: 8, max: 10 },
    accessorySetRange: { min: 2, max: 3 },
    accessoryRestRange: { min: 60, max: 90 },
    preferredMovementPatterns: ["squat", "hinge", "push", "pull"],
  },

  hypertrophy: {
    // Evidence-based: hypertrophy is similar across 6–20 reps when taken near failure; 8–15 favors classic hypertrophy and allows hard sets per week (Schoenfeld, Stronger by Science).
    repRange: { min: 8, max: 15 },
    setRange: { min: 3, max: 4 },
    restRange: { min: 45, max: 90 },
    preferredFormats: ["superset", "straight_sets"],
    conditioningStrategy: "optional_short",
    conditioningDuration: { min: 5, max: 8 },
    cueStyle: {
      strength: "Controlled tempo. Focus on full range of motion.",
    },
    mainBlockMovementCount: { min: 3, max: 4 },
  },

  body_recomp: {
    repRange: { min: 10, max: 15 },
    setRange: { min: 3, max: 4 },
    restRange: { min: 45, max: 60 },
    preferredFormats: ["superset", "straight_sets"],
    conditioningStrategy: "mandatory",
    conditioningDuration: { min: 20, max: 40 },
    cueStyle: {
      strength: "Lower intensity. Focus on time under tension.",
      cardio: "Steady lower-intensity effort.",
    },
    maxStrengthExercises: 6,
  },

  endurance: {
    // Research: muscular endurance 15–25+ reps at 50–65% 1RM (ACSM/NSCA); we use 15–25 for strength-support work.
    repRange: { min: 15, max: 25 },
    setRange: { min: 2, max: 3 },
    restRange: { min: 45, max: 90 },
    preferredFormats: ["circuit", "straight_sets"],
    conditioningStrategy: "primary",
    conditioningDurationByEnergy: [20, 30, 45],
    cueStyle: {
      strength: "Light support. Posterior chain, core, joint durability.",
      cardio: "Steady aerobic. Zone 2.",
    },
    conditioningModalities: ["running", "rowing", "cycling", "ski_erg", "incline_walk"],
  },

  conditioning: {
    repRange: { min: 8, max: 12 },
    setRange: { min: 2, max: 3 },
    restRange: { min: 30, max: 60 },
    preferredFormats: ["circuit", "amrap", "emom"],
    conditioningStrategy: "primary",
    conditioningWorkDuration: { min: 10, max: 20 },
    conditioningWorkDurationByEnergy: [8, 12, 20],
    cueStyle: {
      strength: "Functional. Kettlebell, sled, med ball, bodyweight.",
    },
    blockOrder: ["warmup", "conditioning", "accessory", "cooldown"],
  },

  mobility: {
    repRange: { min: 1, max: 1 },
    setRange: { min: 1, max: 1 },
    restRange: { min: 0, max: 15 },
    preferredFormats: ["circuit"],
    conditioningStrategy: "optional_short",
    lightConditioningMaxMinutes: 5,
    mobilityTimePerMovement: 50,
    mobilitySets: 1,
    cueStyle: {
      mobility: "Slow, controlled breathing.",
    },
    blockOrder: ["warmup", "mobility_circuit", "optional_light_conditioning", "cooldown"],
  },

  recovery: {
    repRange: { min: 8, max: 12 },
    setRange: { min: 1, max: 2 },
    restRange: { min: 30, max: 60 },
    preferredFormats: ["circuit"],
    conditioningStrategy: "optional_short",
    lightConditioningMaxMinutes: 10,
    cueStyle: {
      mobility: "Mobility, breathing, stability. Light band work.",
    },
    blockOrder: ["warmup", "light_movement", "optional_zone1_cardio", "cooldown"],
  },

  athletic_performance: {
    repRange: { min: 5, max: 8 },
    setRange: { min: 3, max: 4 },
    restRange: { min: 90, max: 120 },
    preferredFormats: ["straight_sets", "superset"],
    conditioningStrategy: "optional_short",
    conditioningDuration: { min: 6, max: 8 },
    powerRepRange: { min: 3, max: 5 },
    powerRestRange: { min: 90, max: 120 },
    powerBeforeStrength: true,
    cueStyle: {
      strength: "Power then strength. Explosive intent.",
    },
  },

  power: {
    repRange: { min: 2, max: 5 },
    setRange: { min: 3, max: 5 },
    restRange: { min: 120, max: 180 },
    preferredFormats: ["straight_sets"],
    conditioningStrategy: "optional_short",
    powerBeforeStrength: true,
    cueStyle: {
      strength: "Explosive. Jumps, throws, Olympic variations, swings.",
    },
    preferredMovementPatterns: ["plyometric", "olympic", "swing", "throw"],
  },

  calisthenics: {
    repRange: { min: 6, max: 12 },
    setRange: { min: 3, max: 4 },
    restRange: { min: 45, max: 90 },
    preferredFormats: ["superset", "straight_sets"],
    conditioningStrategy: "optional_short",
    cueStyle: {
      strength: "Bodyweight control. Full ROM.",
    },
    preferredMovementPatterns: ["push", "pull", "core"],
  },
};

/**
 * Returns the training rule for a goal. Fallback for unknown goals (hypertrophy-like).
 */
export function getGoalRules(goal: string): GoalTrainingRule {
  const g = goal.toLowerCase().replace(/\s/g, "_");
  return (
    GOAL_TRAINING_RULES[g] ?? {
      ...GOAL_TRAINING_RULES.hypertrophy,
      cueStyle: { strength: "Controlled tempo." },
    }
  );
}

/**
 * Apply energy-level scaling to sets (low: -25%, high: +25%).
 */
export function scaleSetsByEnergy(
  sets: number,
  energy: EnergyLevel
): number {
  if (energy === "low") return Math.max(1, Math.round(sets * 0.75));
  if (energy === "high") return Math.round(sets * 1.25);
  return sets;
}

/**
 * Get conditioning duration in minutes for a goal and energy level.
 */
export function getConditioningDurationMinutes(
  goal: string,
  energy: EnergyLevel
): number | null {
  const rules = getGoalRules(goal);
  if (rules.conditioningDurationByEnergy) {
    const [low, med, high] = rules.conditioningDurationByEnergy;
    const idx = energy === "low" ? 0 : energy === "high" ? 2 : 1;
    return [low, med, high][idx];
  }
  if (rules.conditioningDuration)
    return Math.round(
      (rules.conditioningDuration.min + rules.conditioningDuration.max) / 2
    );
  if (rules.conditioningWorkDurationByEnergy) {
    const [low, med, high] = rules.conditioningWorkDurationByEnergy;
    const idx = energy === "low" ? 0 : energy === "high" ? 2 : 1;
    return [low, med, high][idx];
  }
  if (rules.conditioningWorkDuration)
    return Math.round(
      (rules.conditioningWorkDuration.min + rules.conditioningWorkDuration.max) / 2
    );
  return null;
}
