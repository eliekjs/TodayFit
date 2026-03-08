/**
 * Phase 3: Duration-aware session shaping and energy-level adaptation.
 * - Maps duration (min) to tier; constrains blocks and exercises per block.
 * - Maps energy level to fatigue budget and complexity (skill demand, density).
 * Fatigue budget is session-level only (MVP); no weekly accumulation yet.
 */

import type { DurationTier, EnergyLevel, SessionFatigueBudget, FatigueBudgetLevel } from "./types";
import type { StimulusProfileSlug } from "./types";
import type { BlockSpec } from "./types";

/** Duration tiers in minutes. */
export const DURATION_TIERS: DurationTier[] = [20, 30, 45, 60, 75];

/** Clamp duration to nearest tier (round down to avoid overfilling). */
export function getDurationTier(durationMinutes: number): DurationTier {
  if (durationMinutes <= 20) return 20;
  if (durationMinutes <= 30) return 30;
  if (durationMinutes <= 45) return 45;
  if (durationMinutes <= 60) return 60;
  return 75;
}

/** Max number of blocks for a duration tier (fewer blocks in short sessions). */
const MAX_BLOCKS_BY_DURATION: Record<DurationTier, number> = {
  20: 3,
  30: 4,
  45: 5,
  60: 6,
  75: 7,
};

/** Whether conditioning/accessory can be added (e.g. only for 45+ min). */
export function canAddConditioningOrAccessory(durationMinutes: number): boolean {
  return durationMinutes >= 45;
}

/** Prefer supersets for time efficiency in shorter sessions. */
export function preferSupersetsForEfficiency(durationMinutes: number): boolean {
  return durationMinutes <= 45;
}

/** Max total exercises (rough) for duration; used to cap block counts. */
const MAX_EXERCISES_BY_DURATION: Record<DurationTier, number> = {
  20: 6,
  30: 8,
  45: 12,
  60: 16,
  75: 20,
};

export function getMaxExercisesForDuration(durationMinutes: number): number {
  return MAX_EXERCISES_BY_DURATION[getDurationTier(durationMinutes)];
}

export function getMaxBlocksForDuration(durationMinutes: number): number {
  return MAX_BLOCKS_BY_DURATION[getDurationTier(durationMinutes)];
}

/** Trim or cap block specs by duration: fewer blocks, lower max_items per block. */
export function shapeBlockSpecsForDuration(
  blockSpecs: BlockSpec[],
  durationMinutes: number
): BlockSpec[] {
  const tier = getDurationTier(durationMinutes);
  const maxBlocks = MAX_BLOCKS_BY_DURATION[tier];
  const maxExercises = MAX_EXERCISES_BY_DURATION[tier];
  let out = blockSpecs.slice(0, maxBlocks);
  const mainBlockTypes = new Set(["main_strength", "main_hypertrophy", "power", "conditioning"]);
  const totalMax = out.reduce((s, b) => s + b.max_items, 0);
  if (totalMax > maxExercises) {
    out = out.map((b) => {
      const isMain = mainBlockTypes.has(b.block_type);
      const newMax = isMain
        ? Math.min(b.max_items, Math.max(2, Math.ceil(maxExercises / out.length)))
        : Math.min(b.max_items, 3);
      return { ...b, max_items: Math.max(b.min_items, newMax) };
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fatigue budget (session-level MVP)
// ---------------------------------------------------------------------------

/** Numeric budget scale: low ≈ 6, moderate ≈ 12, high ≈ 18. */
const FATIGUE_BUDGET_BY_LEVEL: Record<FatigueBudgetLevel, number> = {
  low: 6,
  moderate: 12,
  high: 18,
};

/** Stimulus profile → expected fatigue level (maps to budget). */
const STIMULUS_FATIGUE_LEVEL: Record<StimulusProfileSlug, FatigueBudgetLevel> = {
  max_strength: "high",
  hypertrophy_accumulation: "high",
  power_speed: "low",
  muscular_endurance: "moderate",
  aerobic_base: "moderate",
  anaerobic_conditioning: "high",
  sport_support_strength: "moderate",
  resilience_stability: "low",
  mobility_recovery: "low",
  mixed_performance: "moderate",
};

export function getFatigueBudgetForStimulus(
  stimulus: StimulusProfileSlug,
  energyLevel: EnergyLevel
): SessionFatigueBudget {
  const level = STIMULUS_FATIGUE_LEVEL[stimulus];
  let adjustedLevel = level;
  if (energyLevel === "low") {
    if (level === "high") adjustedLevel = "moderate";
    else if (level === "moderate") adjustedLevel = "low";
  } else if (energyLevel === "high" && level === "moderate") {
    adjustedLevel = "high";
  }
  const value = FATIGUE_BUDGET_BY_LEVEL[adjustedLevel];
  return { kind: "level", level: adjustedLevel };
}

/** Numeric fatigue budget value for a level (for later exercise filling). */
export function getNumericFatigueBudget(budget: SessionFatigueBudget): number {
  if (budget.kind === "numeric") return budget.value;
  return FATIGUE_BUDGET_BY_LEVEL[budget.level];
}

// ---------------------------------------------------------------------------
// Energy level adaptation
// ---------------------------------------------------------------------------

/** Low energy: reduce coordination demand, fatigue budget, high-skill exercises. */
export function adaptForEnergyLevel(
  energyLevel: EnergyLevel
): {
  /** Scale factor for session fatigue budget (0.5–1.0). */
  fatigueBudgetScale: number;
  /** Prefer machine/bodyweight/resilience options. */
  preferLowerSkillOptions: boolean;
  /** Avoid very dense conditioning or highly neural work. */
  avoidHighDensityOrNeural: boolean;
  /** Allow more optional accessory/conditioning when high. */
  allowExtraVolume: boolean;
} {
  switch (energyLevel) {
    case "low":
      return {
        fatigueBudgetScale: 0.7,
        preferLowerSkillOptions: true,
        avoidHighDensityOrNeural: true,
        allowExtraVolume: false,
      };
    case "high":
      return {
        fatigueBudgetScale: 1.0,
        preferLowerSkillOptions: false,
        avoidHighDensityOrNeural: false,
        allowExtraVolume: true,
      };
    default:
      return {
        fatigueBudgetScale: 1.0,
        preferLowerSkillOptions: false,
        avoidHighDensityOrNeural: false,
        allowExtraVolume: false,
      };
  }
}
