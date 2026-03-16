/**
 * Evidence-based prescription rules per primary goal.
 * Aligned with ACSM position stand, NSCA guidelines, and systematic reviews/meta-analyses
 * (rest intervals: Grgic et al. Sports Med 2018; Schoenfeld et al. Frontiers 2024).
 * Used by the daily workout generator.
 *
 * Rep ranges by goal (research summary):
 * - Strength: 1–6 reps (ACSM: heavy loading 1–6 RM); neural adaptations, 3–5 min rest (ACSM).
 * - Hypertrophy: 6–20 effective when near failure (Schoenfeld); 8–15 typical. Rest 1–2 min (ACSM)
 *   or 60–90 s (meta-analyses: minimal difference vs longer; ≥60 s may slightly favor volume).
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
    // ACSM: heavy loading 1–6 RM, 3–5 min rest between sets for intermediate/advanced.
    repRange: { min: 3, max: 6 },
    setRange: { min: 3, max: 5 },
    restRange: { min: 150, max: 300 },
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
    // Evidence-based: hypertrophy similar across 6–20 reps near failure; 8–15 favors efficiency (Schoenfeld). Rest 1–2 min (ACSM); 60–90 s supported by meta-analysis (≥60 s may slightly favor volume).
    repRange: { min: 8, max: 15 },
    setRange: { min: 3, max: 4 },
    restRange: { min: 60, max: 90 },
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
    conditioningOnlyIfHighEnergy: true,
    lightConditioningMaxMinutes: 5,
    mobilityTimePerMovement: 30,
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
    conditioningOnlyIfHighEnergy: true,
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

/**
 * Equipment slugs that benefit from intervals when duration is long (rower, assault bike, ski erg).
 * Research: 30 min straight on ergs is mentally and physically taxing; intervals improve adherence
 * and match common programming (e.g. 4×6 min, 5×5 min). Zone 2 can be split into 3–4 chunks with
 * short rest; HIIT-style uses shorter work bouts. Treadmill/outdoor run can stay continuous for
 * true Zone 2 when desired.
 */
const ERG_EQUIPMENT = new Set(["rower", "assault_bike", "ski_erg", "bike", "indoor_bike"]);

/**
 * Minimum total conditioning minutes above which we use intervals for erg equipment (research:
 * avoid one long continuous block on rower/ski/assault bike).
 */
const CONDITIONING_INTERVAL_THRESHOLD_MIN = 20;

export type ConditioningIntervalStructure = {
  /** Number of work intervals. */
  sets: number;
  /** Seconds of work per interval (use when reps not set). */
  time_seconds?: number;
  /** Reps per set for explosive/plyometric (use instead of time_seconds when set). */
  reps?: number;
  /** Rest between intervals (seconds). */
  rest_seconds: number;
  /** Use "circuit" when sets > 1 so UI shows intervals; "straight_sets" for one block. */
  format: "straight_sets" | "circuit";
  /** Short rationale for prescription (e.g. "Intervals to keep effort manageable."). */
  reasoning?: string;
};

/**
 * Decide whether to prescribe conditioning as one continuous block or as intervals.
 * Research: HIIT and interval rowing are time-efficient and improve adherence; long continuous
 * erg work (e.g. 30 min rower) is often replaced by 4–6 intervals (e.g. 4×6 min + 1 min rest) for
 * endurance, or 5×4 min for body recomp. Zone 2 benefits can be achieved with 3–4 longer chunks.
 */
export function getConditioningIntervalStructure(
  totalMinutes: number,
  goal: string,
  equipmentRequired: string[]
): ConditioningIntervalStructure {
  const isErg = equipmentRequired.some((eq) =>
    ERG_EQUIPMENT.has(eq.toLowerCase().replace(/\s/g, "_"))
  );
  const useIntervals =
    isErg && totalMinutes >= CONDITIONING_INTERVAL_THRESHOLD_MIN;

  if (!useIntervals || totalMinutes < 10) {
    return {
      sets: 1,
      time_seconds: Math.min(totalMinutes * 60, 45 * 60),
      rest_seconds: 0,
      format: "straight_sets",
    };
  }

  // Interval structure: 4–6 rounds, work 4–8 min per round, 60 s rest (research: 1 min rest common).
  const roundCount = totalMinutes <= 22 ? 3 : totalMinutes <= 28 ? 4 : totalMinutes <= 38 ? 5 : 6;
  const restMin = 1;
  const workMin = Math.round((totalMinutes - (roundCount - 1) * restMin) / roundCount);
  const workMinClamped = Math.max(3, Math.min(10, workMin));

  return {
    sets: roundCount,
    time_seconds: workMinClamped * 60,
    rest_seconds: restMin * 60,
    format: "circuit",
    reasoning:
      "Intervals keep effort manageable and match research on erg training (rower, bike, ski erg).",
  };
}

/**
 * Prescription for explosive/plyometric conditioning (e.g. box jumps, jump squats).
 * Uses sets × reps or sets × short time so the athlete does brief efforts with rest, not one long block.
 */
export function getExplosiveConditioningStructure(): ConditioningIntervalStructure {
  return {
    sets: 4,
    reps: 8,
    rest_seconds: 60,
    format: "circuit",
    reasoning: "Explosive movements prescribed as sets of reps with rest between for quality and safety.",
  };
}
